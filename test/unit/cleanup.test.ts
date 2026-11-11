import assert from 'assert';
import { wait, waitUntil } from 'async-test-util';

import config from './config.ts';
import {
    schemaObjects,
    schemas,
    isFastMode,
    HumanDocumentType
} from '../../plugins/test-utils/index.mjs';
import {
    createRxDatabase,
    randomToken,
    addRxPlugin,
    RxCollection,
    RxJsonSchema,
    RxStorage,
    RxStorageInstance,
    RxStorageInstanceCreationParams,
    ensureNotFalsy,
    removeRxDatabase,
    RxStorage
} from '../../plugins/core/index.mjs';

import { replicateRxCollection } from '../../plugins/replication/index.mjs';

import { RxDBCleanupPlugin } from '../../plugins/cleanup/index.mjs';
import { wrappedValidateAjvStorage } from '../../plugins/validate-ajv/index.mjs';
import {
    getRxStorageLocalstorage,
    getLocalStorageMock
} from '../../plugins/storage-localstorage/index.mjs';
import { DEFAULT_CLEANUP_POLICY } from '../../plugins/cleanup/index.mjs';
addRxPlugin(RxDBCleanupPlugin);

describe('cleanup.test.js', () => {
    describe('basics', () => {
        it('should clean up the deleted documents', async () => {
            const db = await createRxDatabase({
                name: randomToken(10),
                storage: config.storage.getStorage(),
                cleanupPolicy: {
                    awaitReplicationsInSync: false,
                    minimumCollectionAge: 0,
                    minimumDeletedTime: 0,
                    runEach: 10,
                    waitForLeadership: false
                }
            });
            const cols = await db.addCollections({
                humans: {
                    schema: schemas.human
                }
            });
            const collection: RxCollection<HumanDocumentType> = cols.humans;
            const notDeleted = await collection.insert(schemaObjects.humanData());
            const doc = await collection.insert(schemaObjects.humanData());
            await doc.remove();

            await waitUntil(async () => {
                await collection.cleanup(0);
                const deletedDocInStorage = await collection.storageInstance.findDocumentsById(
                    [
                        doc.primary,
                        notDeleted.primary
                    ],
                    true
                );
                assert.ok(deletedDocInStorage.find(d => d[collection.schema.primaryPath] === notDeleted.primary));
                const deletedDocStillInStorage = !!deletedDocInStorage.find(d => d[collection.schema.primaryPath] === doc.primary);
                return !deletedDocStillInStorage;
            });

            await db.close();
        });
        it('should work by manually calling RxCollection.cleanup()', async () => {
            const db = await createRxDatabase({
                name: randomToken(10),
                storage: config.storage.getStorage()
            });
            const cols = await db.addCollections({
                humans: {
                    schema: schemas.human
                }
            });
            const collection: RxCollection<HumanDocumentType> = cols.humans;
            const notDeleted = await collection.insert(schemaObjects.humanData());
            const doc = await collection.insert(schemaObjects.humanData());
            await doc.remove();


            await collection.cleanup(0);
            const deletedDocInStorage = await collection.storageInstance.findDocumentsById(
                [
                    doc.primary,
                    notDeleted.primary
                ],
                true
            );
            assert.ok(deletedDocInStorage.length >= 1);

            await db.close();
        });
    });
    describe('cleanup and replication', () => {
        if (!config.storage.hasReplication) {
            return;
        }
        it('should pause the cleanup when a replication is not in sync', async () => {
            const db = await createRxDatabase({
                name: randomToken(10),
                storage: config.storage.getStorage(),
                cleanupPolicy: {
                    awaitReplicationsInSync: true,
                    minimumCollectionAge: 0,
                    minimumDeletedTime: 0,
                    runEach: 10,
                    waitForLeadership: false
                }
            });
            const cols = await db.addCollections({
                humans: {
                    schema: schemas.human
                }
            });

            const collection: RxCollection<HumanDocumentType> = cols.humans;
            const replicationState = replicateRxCollection({
                collection,
                replicationIdentifier: 'my-rep',
                deletedField: '_deleted',
                pull: {
                    async handler() {
                        await wait(50);
                        throw new Error('never success');
                    }
                },
                live: true
            });

            const doc = await collection.insert(schemaObjects.humanData());
            await doc.remove();
            await wait(isFastMode() ? 200 : 500);

            /**
             * The deleted document still be there
             * because the errored replication
             * blocks the cleanup
             */
            const deletedDocInStorage = await collection.storageInstance.findDocumentsById(
                [doc.primary],
                true
            );
            assert.ok(deletedDocInStorage[0]);

            await replicationState.cancel();
            await db.remove();
        });
        /**
         * While the metadata of a replication is append-only
         * we still have to run the cleanup on it because some storages
         * like the memory-mapped storage will do additional stuff like data crunching.
         */
        it('should also run a cleanup on the replication state meta data', async () => {
            const db = await createRxDatabase({
                name: randomToken(10),
                storage: config.storage.getStorage(),
                cleanupPolicy: {
                    awaitReplicationsInSync: true,
                    minimumCollectionAge: 0,
                    minimumDeletedTime: 0,
                    runEach: 10,
                    waitForLeadership: false
                }
            });
            const cols = await db.addCollections({
                humans: {
                    schema: schemas.human
                }
            });

            const collection: RxCollection<HumanDocumentType> = cols.humans;
            const replicationState = replicateRxCollection<HumanDocumentType, any>({
                collection,
                replicationIdentifier: 'my-rep',
                deletedField: '_deleted',
                pull: {
                    handler() {
                        return Promise.resolve({
                            checkpoint: {},
                            documents: []
                        });
                    }
                },
                live: true
            });
            await replicationState.start();

            const replicationMetaInstance = ensureNotFalsy(replicationState.metaInstance);
            const cleanupBefore = replicationMetaInstance.cleanup.bind(replicationMetaInstance);

            let cleanupCalls = 0;
            replicationMetaInstance.cleanup = (x) => {
                cleanupCalls++;
                return cleanupBefore(x);
            };

            await collection.cleanup(0);
            assert.ok(cleanupCalls > 0, 'cleanup call count must be greater zero');

            await replicationState.cancel();
            await db.remove();
        });
    });
    describe('issues', () => {
        it('#8948 must find a document that was re-inserted after the cleanup purged its tombstone', async () => {
            const db = await createRxDatabase({
                name: randomToken(10),
                storage: config.storage.getStorage(),
                eventReduce: true
            });
            const cols = await db.addCollections({
                humans: {
                    schema: schemas.human
                }
            });
            const collection: RxCollection<HumanDocumentType> = cols.humans;

            const docData = schemaObjects.humanData('foobar');
            await collection.insert(docData);
            const doc = await collection.findOne(docData.passportId).exec(true);
            await doc.remove();
            await collection.cleanup(0);

            // the cleanup purged the tombstone, so this write starts a new revision chain
            await collection.insert(docData);

            const byId = await collection.findOne(docData.passportId).exec();
            assert.ok(byId, 'findOne() by primary key must return the re-inserted document');

            const bySelector = await collection.find({
                selector: { passportId: docData.passportId }
            }).exec();
            assert.strictEqual(bySelector.length, 1);

            const latest = collection._docCache.getLatestDocumentDataIfExists(docData.passportId);
            assert.strictEqual(ensureNotFalsy(latest)._deleted, false);

            await db.close();
        });
        /**
         * Runs on the storage of the test config and on the localStorage storage,
         * because the localStorage storage has its own cleanup index.
         */
        const tombstoneBulkStorages: { name: string; getStorage: () => RxStorage<any, any>; }[] = [
            {
                name: config.storage.name,
                getStorage: () => config.storage.getStorage()
            },
            {
                name: 'localstorage with mock',
                getStorage: () => wrappedValidateAjvStorage({
                    storage: getRxStorageLocalstorage({ localStorage: getLocalStorageMock() })
                })
            }
        ];
        tombstoneBulkStorages.forEach(testStorage => it('must not purge a re-inserted document when its tombstone was written in the same bulk write as other tombstones (' + testStorage.name + ')', async () => {
            const db = await createRxDatabase({
                name: randomToken(10),
                storage: testStorage.getStorage()
            });
            const cols = await db.addCollections({
                humans: {
                    schema: schemas.human
                }
            });
            const collection: RxCollection<HumanDocumentType> = cols.humans;

            const ids = ['a', 'b', 'c', 'd'];
            const docsData = ids.map(id => schemaObjects.humanData(id));
            await collection.bulkInsert(docsData);

            // one bulk write, so all tombstones share the same _meta.lwt
            const removeResult = await collection.bulkRemove(ids);
            assert.strictEqual(removeResult.success.length, ids.length);
            assert.strictEqual(removeResult.error.length, 0);

            await collection.insert(docsData[0]);
            await collection.cleanup(0);

            const byId = await collection.findOne('a').exec();
            assert.ok(byId, 'findOne() must return the live document after the cleanup');
            const all = await collection.find().exec();
            assert.deepStrictEqual(all.map(d => d.passportId), ['a']);
            const bySelector = await collection.find({
                selector: { firstName: docsData[0].firstName }
            }).exec();
            assert.deepStrictEqual(bySelector.map(d => d.passportId), ['a']);

            // a second run must not throw
            await collection.cleanup(0);

            // the purged tombstones must not block new writes and later cleanups
            await collection.bulkInsert(docsData.slice(1));
            await collection.bulkRemove(['a', 'c']);
            await collection.cleanup(0);
            const remaining = await collection.find({ sort: [{ passportId: 'asc' }] }).exec();
            assert.deepStrictEqual(remaining.map(d => d.passportId), ['b', 'd']);

            await db.close();
        }));
        it('minimumDeletedTime not respected', async () => {
            const dbName = 'test-cleanup-' + Date.now() + '-' + randomToken(10);
            try {
                await removeRxDatabase(dbName, config.storage.getStorage());
            } catch (err) { }
            const db = await createRxDatabase({
                name: dbName,
                storage: config.storage.getStorage(),
                eventReduce: true,
                multiInstance: false
            });
            const cols = await db.addCollections({
                human: {
                    schema: schemas.human
                }
            });
            const col = cols.human;

            const storageInstance = col.storageInstance.originalStorageInstance;
            const cleanupBefore = storageInstance.cleanup.bind(storageInstance);

            const calls: number[] = [];
            storageInstance.cleanup = (t) => {
                calls.push(t);
                return cleanupBefore(t);
            };

            await col.cleanup(0);
            await col.cleanup(5);
            await col.cleanup();


            assert.strictEqual(calls[0], 0);
            assert.strictEqual(calls[1], 5);
            assert.strictEqual(calls[2], DEFAULT_CLEANUP_POLICY.minimumDeletedTime);

            await col.database.remove();
        });
        it('should correctly loop cleanup when storage cleanup returns false (batched cleanup)', async () => {
            /**
             * Some storages like FoundationDB clean up in batches
             * and return false from cleanup() to indicate more work is needed.
             * The cleanup loop must continue calling cleanup() until all calls return true.
             * @link https://github.com/pubkey/rxdb/issues/cleanup-batched
             */
            const baseStorage = config.storage.getStorage();
            const origCreateStorageInstance = baseStorage.createStorageInstance.bind(baseStorage);

            /**
             * Wrap the storage to simulate batched cleanup:
             * - First cleanup() call returns false without cleaning (more work needed)
             * - Second cleanup() call does the real cleanup and returns true
             */
            const wrappedStorage: typeof baseStorage = Object.assign(
                {},
                baseStorage,
                {
                    createStorageInstance(params: any) {
                        return origCreateStorageInstance(params).then((instance: any) => {
                            const origCleanup = instance.cleanup.bind(instance);
                            let cleanupCallCount = 0;
                            instance.cleanup = function (minimumDeletedTime: number) {
                                cleanupCallCount++;
                                if (cleanupCallCount === 1) {
                                    // simulate batched cleanup: not done yet
                                    return Promise.resolve(false);
                                }
                                return origCleanup(minimumDeletedTime);
                            };
                            return instance;
                        });
                    }
                }
            );

            const db = await createRxDatabase({
                name: randomToken(10),
                storage: wrappedStorage,
                cleanupPolicy: {
                    awaitReplicationsInSync: false,
                    minimumCollectionAge: 200000,
                    minimumDeletedTime: 0,
                    runEach: 200000,
                    waitForLeadership: false
                }
            });
            const cols = await db.addCollections({
                humans: {
                    schema: schemas.human
                }
            });
            const collection: RxCollection<HumanDocumentType> = cols.humans;

            const doc = await collection.insert(schemaObjects.humanData());
            const docPrimary = doc.primary;
            const deletedDoc = await doc.remove();

            /**
             * The storage only purges documents whose _meta.lwt is lower than its own now().
             * When the storage runs in another JavaScript context (like the worker storage),
             * its now() has its own sub-millisecond counter and can return a value lower
             * than the lwt that was set in the main thread during the same millisecond.
             * So wait until the clock has passed the lwt, otherwise the real cleanup call
             * can randomly skip the document.
             */
            const deletedLwt = deletedDoc.toJSON(true)._meta.lwt;
            await waitUntil(() => Date.now() > deletedLwt + 1);

            // cleanup() should loop internally: first call returns false, second does real work
            await collection.cleanup(0);

            // Verify the deleted document was actually cleaned up from storage
            const docsInStorage = await collection.storageInstance.findDocumentsById(
                [docPrimary],
                true
            );
            const deletedDocStillExists = !!docsInStorage.find(
                (d: any) => d[collection.schema.primaryPath] === docPrimary
            );
            assert.strictEqual(
                deletedDocStillExists,
                false,
                'deleted document should be removed after cleanup even when storage returns false on first call'
            );

            await db.close();
        });
        it('cleanup() should return true as stated by the TypeScript return type', async () => {
            /**
             * RxCollection.cleanup() is declared to return Promise<boolean>
             * where true means all cleanable documents have been removed.
             * But the cleanup plugin implementation returns Promise<void> (undefined at runtime),
             * so the return value does not match the declared type.
             */
            const db = await createRxDatabase({
                name: randomToken(10),
                storage: config.storage.getStorage(),
                cleanupPolicy: {
                    awaitReplicationsInSync: false,
                    minimumCollectionAge: 200000,
                    minimumDeletedTime: 0,
                    runEach: 200000,
                    waitForLeadership: false
                }
            });
            const cols = await db.addCollections({
                humans: {
                    schema: schemas.human
                }
            });
            const collection: RxCollection<HumanDocumentType> = cols.humans;

            // insert and delete a document
            const doc = await collection.insert(schemaObjects.humanData());
            await doc.remove();

            // cleanup(0) should return true when done
            const result = await collection.cleanup(0);
            assert.strictEqual(typeof result, 'boolean', 'cleanup() must return a boolean, not ' + typeof result);
            assert.strictEqual(result, true, 'cleanup() must return true when all deleted documents have been cleaned up');

            // also test cleanup without arguments
            const result2 = await collection.cleanup();
            assert.strictEqual(typeof result2, 'boolean', 'cleanup() without args must also return a boolean');
            assert.strictEqual(result2, true);

            await db.close();
        });
        it('a rejected storage cleanup must only reject its own caller and not block later cleanups', async () => {
            /**
             * A user-supplied RxStorage where the first cleanup() call
             * of the humans collection rejects,
             * like it happens on a transient storage error.
             */
            const baseStorage = config.storage.getStorage();
            const humansInstances: RxStorageInstance<any, any, any>[] = [];
            let failNextCleanup = true;
            const failingStorage: RxStorage<any, any> = Object.assign(
                {},
                baseStorage,
                {
                    async createStorageInstance<RxDocType>(
                        params: RxStorageInstanceCreationParams<RxDocType, any>
                    ): Promise<RxStorageInstance<RxDocType, any, any>> {
                        const instance = await baseStorage.createStorageInstance(params);
                        if (params.collectionName !== 'humans') {
                            return instance;
                        }
                        const origCleanup = instance.cleanup.bind(instance);
                        instance.cleanup = (minimumDeletedTime: number) => {
                            if (failNextCleanup) {
                                failNextCleanup = false;
                                return Promise.reject(new Error('injected cleanup failure'));
                            }
                            return origCleanup(minimumDeletedTime);
                        };
                        humansInstances.push(instance);
                        return instance;
                    }
                }
            );

            const dbA = await createRxDatabase<{ humans: RxCollection<HumanDocumentType>; }>({
                name: randomToken(10),
                storage: failingStorage,
                multiInstance: false
            });
            const dbB = await createRxDatabase<{ humans: RxCollection<HumanDocumentType>; }>({
                name: randomToken(10),
                storage: config.storage.getStorage(),
                multiInstance: false
            });
            await dbA.addCollections({ humans: { schema: schemas.human } });
            await dbB.addCollections({ humans: { schema: schemas.human } });
            const collectionA = dbA.humans;
            const collectionB = dbB.humans;

            const docDataA = schemaObjects.humanData('doc-a');
            const docDataB = schemaObjects.humanData('doc-b');
            const docA = await collectionA.insert(docDataA);
            const docB = await collectionB.insert(docDataB);
            await docA.remove();
            await docB.remove();

            // ensure the clock of the storage has passed the write time of the deletes
            await wait(10);

            let firstError: Error | undefined;
            try {
                await collectionA.cleanup(0);
            } catch (err) {
                firstError = err as Error;
            }

            let cleanupResultB: boolean | undefined;
            let cleanupResultA: boolean | undefined;
            let laterError: Error | undefined;
            try {
                cleanupResultB = await collectionB.cleanup(0);
                cleanupResultA = await collectionA.cleanup(0);
            } catch (err) {
                laterError = err as Error;
            }

            const tombstonesA = await humansInstances[0].findDocumentsById([docDataA.passportId], true);
            await collectionA.insert(docDataA);
            await collectionB.insert(docDataB);
            const reInsertedA = await collectionA.findOne(docDataA.passportId).exec();
            const reInsertedB = await collectionB.findOne(docDataB.passportId).exec();

            await dbA.close();
            await dbB.close();

            assert.ok(firstError, 'the caller of the failed cleanup must get the error');
            assert.ok(firstError.message.includes('injected cleanup failure'));
            assert.strictEqual(
                laterError,
                undefined,
                'later cleanup() calls must not reject with the error of a previous cleanup: ' + (laterError ? laterError.message : '')
            );
            assert.strictEqual(cleanupResultB, true);
            assert.strictEqual(cleanupResultA, true);
            assert.strictEqual(tombstonesA.length, 0, 'the tombstone must be purged from the storage');
            assert.ok(reInsertedA);
            assert.ok(reInsertedB);
        });
        it('fields with umlauts and emojis could break the state after cleanup in some storages', async () => {
            type DocType = {
                id: string;
                name: string;
            };
            const db = await createRxDatabase<{ projects: RxCollection<DocType>; }>({
                name: randomToken(10),
                storage: wrappedValidateAjvStorage({
                    storage: config.storage.getStorage()
                }),
                multiInstance: false
            });
            const stringWithStrangeChars = 'umläääut and flag emoji 🏳️‍🌈 and smiley emoji 😃';
            const docData: DocType = {
                id: 'myid with ' + stringWithStrangeChars,
                name: 'field with ' + stringWithStrangeChars
            };
            const schema: RxJsonSchema<DocType> = {
                keyCompression: false,
                version: 0,
                primaryKey: 'id',
                type: 'object',
                properties: {
                    id: {
                        type: 'string',
                        maxLength: 80,
                    },
                    name: {
                        type: 'string',
                    }
                },
                required: ['id', 'name'],
            };
            await db.addCollections({
                projects: {
                    schema
                },
            });
            const collection = db.collections.projects;

            // insert and update a document
            await collection.bulkInsert([docData]);
            await collection.bulkUpsert([docData]);
            await collection.cleanup(0);

            const resultAfterCleanup = await collection.find({ selector: { name: { $ne: 'query1' } } }).exec();
            assert.strictEqual(resultAfterCleanup.length, 1);

            // again with update
            const docData2: DocType = {
                id: 'myid2 with ' + stringWithStrangeChars,
                name: 'field2 with ' + stringWithStrangeChars
            };
            const doc2 = await collection.insert(docData2);
            await doc2.incrementalPatch({ name: 'updated field2 with ' + stringWithStrangeChars });
            await collection.cleanup(0);

            const resultAfterCleanup2 = await collection.find({ selector: { name: { $ne: 'query2' } } }).exec();
            assert.strictEqual(resultAfterCleanup2.length, 2);

            // after delete
            await doc2.getLatest().remove();
            await collection.cleanup(0);

            const resultAfterCleanup3 = await collection.find({ selector: { name: { $ne: 'query3' } } }).exec();
            assert.strictEqual(resultAfterCleanup3.length, 1);

            await db.close();
        });
    });
});
