import assert from 'assert';
import { wait, waitUntil } from 'async-test-util';

import config, { describeParallel } from './config.ts';
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
    ensureNotFalsy
} from '../../plugins/core/index.mjs';

import { replicateRxCollection } from '../../plugins/replication/index.mjs';

import { RxDBCleanupPlugin } from '../../plugins/cleanup/index.mjs';
import { wrappedValidateAjvStorage } from '../../plugins/validate-ajv/index.mjs';
addRxPlugin(RxDBCleanupPlugin);

describeParallel('cleanup.test.js', () => {
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

            db.close();
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

            db.close();
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
            replicateRxCollection({
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

            db.remove();
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

            db.remove();
        });
    });
    describe('issues', () => {
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
