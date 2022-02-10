/**
 * These tests are for the replication primitives plugin.
 * Notice that not all edge cases are tested because
 * we do that inside of the GraphQL replication plugin.
 */

import assert from 'assert';
import {
    clone,
    wait,
    waitUntil
} from 'async-test-util';

import config from './config';
import * as schemaObjects from '../helper/schema-objects';
import {
    HumanWithTimestampDocumentType
} from '../helper/schema-objects';
import * as humansCollection from '../helper/humans-collection';

import {
    flatClone,
    getFromMapOrThrow,
    RxCollection,
    ensureNotFalsy,
    randomCouchString,
    now,
    hash,
} from '../../plugins/core';

import {
    setLastPushSequence,
    getLastPushSequence,
    getChangesSinceLastPushSequence,
    createRevisionForPulledDocument,
    setLastPullDocument,
    getLastPullDocument,
    wasRevisionfromPullReplication,
    replicateRxCollection
} from '../../plugins/replication';

import type {
    ReplicationPullHandler,
    ReplicationPushHandler,
    RxDocumentData
} from '../../src/types';

describe('replication.test.js', () => {
    const REPLICATION_IDENTIFIER_TEST = 'replication-ident-tests';
    const REPLICATION_IDENTIFIER_TEST_HASH = hash(REPLICATION_IDENTIFIER_TEST);

    type TestDocType = schemaObjects.HumanWithTimestampDocumentType;
    async function getTestCollections(docsAmount: { local: number, remote: number }): Promise<{
        localCollection: RxCollection<TestDocType, {}, {}, {}>,
        remoteCollection: RxCollection<TestDocType, {}, {}, {}>
    }> {
        const [localCollection, remoteCollection] = await Promise.all([
            humansCollection.createHumanWithTimestamp(docsAmount.local, randomCouchString(10), false),
            humansCollection.createHumanWithTimestamp(docsAmount.remote, randomCouchString(10), false)
        ]);
        return {
            localCollection,
            remoteCollection
        };
    }

    /**
     * Creates a pull handler that always returns
     * all documents.
     */
    function getPullHandler(
        remoteCollection: RxCollection<TestDocType, {}, {}, {}>
    ): ReplicationPullHandler<TestDocType> {
        const handler: ReplicationPullHandler<TestDocType> = async (latestPullDocument) => {
            const minTimestamp = latestPullDocument ? latestPullDocument.updatedAt : 0;
            const docs = await remoteCollection.find({
                selector: {
                    updatedAt: {
                        $gt: minTimestamp
                    }
                },
                sort: [
                    { updatedAt: 'asc' }
                ]
            }).exec();
            const docsData = docs.map(doc => {
                const docData: RxDocumentData<HumanWithTimestampDocumentType> = flatClone(doc.toJSON()) as any;
                docData._deleted = false;
                return docData;
            });

            return {
                documents: docsData,
                hasMoreDocuments: false
            }
        };
        return handler;
    }
    function getPushHandler(
        remoteCollection: RxCollection<TestDocType, {}, {}, {}>
    ): ReplicationPushHandler<TestDocType> {
        const handler: ReplicationPushHandler<TestDocType> = async (docs) => {
            // process deleted
            const deletedIds = docs
                .filter(doc => doc._deleted)
                .map(doc => doc.id);
            const deletedDocs = await remoteCollection.findByIds(deletedIds);
            await Promise.all(
                Array.from(deletedDocs.values()).map(doc => doc.remove())
            );

            // process insert/updated
            const changedDocs = docs
                .filter(doc => !doc._deleted)
                // overwrite the timestamp with the 'server' time
                // because the 'client' cannot be trusted.
                .map(doc => {
                    doc = flatClone(doc);
                    doc.updatedAt = now();
                    return doc;
                });
            await Promise.all(
                changedDocs.map(doc => remoteCollection.atomicUpsert(doc))
            );
        }
        return handler;
    }




    config.parallel('revision-flag', () => {
        describe('.wasRevisionfromPullReplication()', () => {
            it('should be false on random revision', async () => {
                const c = await humansCollection.createHumanWithTimestamp(1);
                const doc = await c.findOne().exec(true);

                const wasFromPull = wasRevisionfromPullReplication(
                    REPLICATION_IDENTIFIER_TEST_HASH,
                    doc.toJSON(true)._rev
                );
                assert.strictEqual(wasFromPull, false);

                c.database.destroy();
            });
            it('should be true for pulled revision', async () => {
                const c = await humansCollection.createHumanWithTimestamp(0);
                const toStorage: any = schemaObjects.humanWithTimestamp();
                toStorage._rev = '1-' + createRevisionForPulledDocument(
                    REPLICATION_IDENTIFIER_TEST_HASH,
                    toStorage
                );
                toStorage._deleted = false;
                await c.storageInstance.bulkAddRevisions([toStorage]);

                const doc = await c.findOne().exec(true);
                const wasFromPull = wasRevisionfromPullReplication(
                    REPLICATION_IDENTIFIER_TEST_HASH,
                    doc.toJSON(true)._rev
                );
                assert.strictEqual(wasFromPull, true);

                c.database.destroy();
            });
        });
    });
    config.parallel('replication-checkpoints', () => {
        describe('.setLastPushSequence()', () => {
            it('should set the last push sequence', async () => {
                const c = await humansCollection.createHumanWithTimestamp(0);
                const ret = await setLastPushSequence(
                    c,
                    REPLICATION_IDENTIFIER_TEST,
                    1
                );
                assert.ok(ret._id.includes(REPLICATION_IDENTIFIER_TEST));
                c.database.destroy();
            });
            it('should be able to run multiple times', async () => {
                const c = await humansCollection.createHumanWithTimestamp(0);
                await setLastPushSequence(
                    c,
                    REPLICATION_IDENTIFIER_TEST,
                    1
                );
                await setLastPushSequence(
                    c,
                    REPLICATION_IDENTIFIER_TEST,
                    2
                );
                c.database.destroy();
            });
        });
        describe('.getLastPushSequence()', () => {
            it('should get null if not set before', async () => {
                const c = await humansCollection.createHumanWithTimestamp(0);
                const ret = await getLastPushSequence(
                    c,
                    REPLICATION_IDENTIFIER_TEST
                );
                assert.strictEqual(ret, 0);
                c.database.destroy();
            });
            it('should get the value if set before', async () => {
                const c = await humansCollection.createHumanWithTimestamp(0);
                await setLastPushSequence(
                    c,
                    REPLICATION_IDENTIFIER_TEST,
                    5
                );
                const ret = await getLastPushSequence(
                    c,
                    REPLICATION_IDENTIFIER_TEST
                );
                assert.strictEqual(ret, 5);
                c.database.destroy();
            });
            it('should get the value if set multiple times', async () => {
                const c = await humansCollection.createHumanWithTimestamp(0);
                await setLastPushSequence(
                    c,
                    REPLICATION_IDENTIFIER_TEST,
                    5
                );
                const ret = await getLastPushSequence(
                    c,
                    REPLICATION_IDENTIFIER_TEST
                );
                assert.strictEqual(ret, 5);

                await setLastPushSequence(
                    c,
                    REPLICATION_IDENTIFIER_TEST,
                    10
                );
                const ret2 = await getLastPushSequence(
                    c,
                    REPLICATION_IDENTIFIER_TEST
                );
                assert.strictEqual(ret2, 10);
                c.database.destroy();
            });
        });
        describe('.getChangesSinceLastPushSequence()', () => {
            it('should get all changes', async () => {
                const amount = 5;
                const c = await humansCollection.createHumanWithTimestamp(amount);
                const changesResult = await getChangesSinceLastPushSequence(
                    c,
                    REPLICATION_IDENTIFIER_TEST,
                    REPLICATION_IDENTIFIER_TEST_HASH,
                    () => false,
                    10
                );
                assert.strictEqual(changesResult.changedDocs.size, amount);
                const firstChange = Array.from(changesResult.changedDocs.values())[0];
                assert.ok(firstChange.doc.name);
                c.database.destroy();
            });
            it('should get only the newest update to documents', async () => {
                const amount = 5;
                const c = await humansCollection.createHumanWithTimestamp(amount);
                const oneDoc = await c.findOne().exec(true);
                await oneDoc.atomicPatch({ age: 1 });
                const changesResult = await getChangesSinceLastPushSequence(
                    c,
                    REPLICATION_IDENTIFIER_TEST,
                    REPLICATION_IDENTIFIER_TEST_HASH,
                    () => false,
                    10
                );
                assert.strictEqual(changesResult.changedDocs.size, amount);
                c.database.destroy();
            });
            it('should not get more changes then the limit', async () => {
                const amount = 30;
                const c = await humansCollection.createHumanWithTimestamp(amount);
                const changesResult = await getChangesSinceLastPushSequence(
                    c,
                    REPLICATION_IDENTIFIER_TEST,
                    REPLICATION_IDENTIFIER_TEST_HASH,
                    () => false,
                    10
                );
                /**
                 * The returned size can be lower then the batchSize
                 * because we skip internal changes like index documents.
                 */
                assert.ok(changesResult.changedDocs.size <= 10);
                c.database.destroy();
            });
            it('should get deletions', async () => {
                const amount = 5;
                const c = await humansCollection.createHumanWithTimestamp(amount);
                const oneDoc = await c.findOne().exec(true);
                await oneDoc.remove();
                const changesResult = await getChangesSinceLastPushSequence(
                    c,
                    REPLICATION_IDENTIFIER_TEST,
                    REPLICATION_IDENTIFIER_TEST_HASH,
                    () => false,
                    10
                );
                assert.strictEqual(changesResult.changedDocs.size, amount);
                const deleted = Array.from(changesResult.changedDocs.values()).find((change) => {
                    return change.doc._deleted === true;
                });

                if (!deleted) {
                    throw new Error('deleted missing');
                }

                assert.ok(deleted.doc._deleted);
                assert.ok(deleted.doc.age);

                c.database.destroy();
            });
            it('should get deletions after an update via addRevisions', async () => {
                const c = await humansCollection.createHumanWithTimestamp(1);
                const oneDoc = await c.findOne().exec(true);
                const id = oneDoc.primary;

                const newDocData: RxDocumentData<HumanWithTimestampDocumentType> = flatClone(oneDoc.toJSON(true));
                newDocData.age = 100;
                newDocData._rev = '2-23099cb8125d2c79db839ae3f1211cf8';
                await c.storageInstance.bulkAddRevisions([newDocData]);

                /**
                 * We wait here because directly after the last write,
                 * it takes some milliseconds until the change is propagated
                 * via the event stream.
                 * This does only happen because we directly access storageInstance.bulkAddRevisions()
                 * and so RxDB does not know about the change.
                 * This problem will not happen during normal RxDB usage.
                 */
                await waitUntil(() => oneDoc.age === 100);
                await oneDoc.remove();

                const changesResult = await getChangesSinceLastPushSequence(
                    c,
                    REPLICATION_IDENTIFIER_TEST,
                    REPLICATION_IDENTIFIER_TEST_HASH,
                    () => false,
                    10
                );
                assert.strictEqual(changesResult.changedDocs.size, 1);
                const docFromChange = getFromMapOrThrow(changesResult.changedDocs, id);
                assert.ok(docFromChange.doc._deleted);
                assert.strictEqual(docFromChange.doc.age, 100);

                c.database.destroy();
            });
            it('should have resolved the primary', async () => {
                const amount = 5;
                const c = await humansCollection.createHumanWithTimestamp(amount);
                const changesResult = await getChangesSinceLastPushSequence(
                    c,
                    REPLICATION_IDENTIFIER_TEST,
                    REPLICATION_IDENTIFIER_TEST_HASH,
                    () => false,
                    10
                );
                const firstChange = Array.from(changesResult.changedDocs.values())[0];

                assert.ok(firstChange.doc.id);
                c.database.destroy();
            });
            it('should have filtered out documents that are already replicated from the remote', async () => {
                const amount = 5;
                const c = await humansCollection.createHumanWithTimestamp(amount);
                const toStorageInstance: RxDocumentData<HumanWithTimestampDocumentType> = schemaObjects.humanWithTimestamp() as any;
                const docId = toStorageInstance.id;
                toStorageInstance._attachments = {};
                toStorageInstance._deleted = false;
                toStorageInstance._rev = '1-' + createRevisionForPulledDocument(
                    REPLICATION_IDENTIFIER_TEST_HASH,
                    toStorageInstance
                );
                await c.storageInstance.bulkAddRevisions([
                    toStorageInstance
                ]);

                const allDocs = await c.find().exec();

                assert.strictEqual(allDocs.length, amount + 1);

                const changesResult = await getChangesSinceLastPushSequence(
                    c,
                    REPLICATION_IDENTIFIER_TEST,
                    REPLICATION_IDENTIFIER_TEST_HASH,
                    () => false,
                    10
                );

                assert.strictEqual(changesResult.changedDocs.size, amount);
                const shouldNotBeFound = Array.from(changesResult.changedDocs.values()).find((change) => change.id === docId);
                assert.ok(!shouldNotBeFound);

                /**
                 * lastSequence must be >= amount
                 * Not == because there might be hidden change documents
                 * like when pouchdb adds one while creating an index.
                 */
                assert.ok(changesResult.lastSequence >= amount);

                c.database.destroy();
            });
        });
        describe('.setLastPullDocument()', () => {
            it('should set the document', async () => {
                const c = await humansCollection.createHumanWithTimestamp(1);
                const doc = await c.findOne().exec(true);
                const docData = doc.toJSON(true);
                const ret = await setLastPullDocument(
                    c,
                    REPLICATION_IDENTIFIER_TEST,
                    docData
                );
                assert.ok(ret._id.includes(REPLICATION_IDENTIFIER_TEST));
                c.database.destroy();
            });
            it('should be able to run multiple times', async () => {
                const c = await humansCollection.createHumanWithTimestamp(1);
                const doc = await c.findOne().exec(true);
                const docData = doc.toJSON(true);
                await setLastPullDocument(
                    c,
                    REPLICATION_IDENTIFIER_TEST,
                    docData
                );
                const ret = await setLastPullDocument(
                    c,
                    REPLICATION_IDENTIFIER_TEST,
                    docData
                );
                assert.ok(ret._id.includes(REPLICATION_IDENTIFIER_TEST));
                c.database.destroy();
            });
        });
        describe('.getLastPullDocument()', () => {
            it('should return null if no doc set', async () => {
                const c = await humansCollection.createHumanWithTimestamp(0);
                const ret = await getLastPullDocument(
                    c,
                    REPLICATION_IDENTIFIER_TEST
                );
                assert.strictEqual(ret, null);
                c.database.destroy();
            });
            it('should return the doc if it was set', async () => {
                const c = await humansCollection.createHumanWithTimestamp(1);
                const doc = await c.findOne().exec(true);
                let docData = doc.toJSON(true);
                docData = clone(docData); // clone to make it mutateable
                (docData as any).name = 'foobar';

                await setLastPullDocument(
                    c,
                    REPLICATION_IDENTIFIER_TEST,
                    docData
                );
                const ret = await getLastPullDocument(
                    c,
                    REPLICATION_IDENTIFIER_TEST
                );
                if (!ret) {
                    throw new Error('last pull document missing');
                }
                assert.strictEqual(ret.name, 'foobar');
                c.database.destroy();
            });
        });
    });
    config.parallel('non-live replication', () => {
        it('should replicate both sides', async () => {
            const { localCollection, remoteCollection } = await getTestCollections({ local: 5, remote: 5 });

            const replicationState = replicateRxCollection({
                collection: localCollection,
                replicationIdentifier: REPLICATION_IDENTIFIER_TEST,
                live: false,
                pull: {
                    handler: getPullHandler(remoteCollection)
                },
                push: {
                    handler: getPushHandler(remoteCollection)
                }
            });
            replicationState.error$.subscribe(err => {
                console.log('got error :');
                console.dir(err);
            });

            await replicationState.awaitInitialReplication();

            const docsLocal = await localCollection.find().exec();
            const docsRemote = await remoteCollection.find().exec();

            assert.strictEqual(
                docsLocal.length,
                docsRemote.length
            );
            assert.strictEqual(
                docsLocal.length,
                10
            );

            localCollection.database.destroy();
            remoteCollection.database.destroy();
        });
    });
    config.parallel('issues', () => {
        it('should not create push checkpoints unnecessarily [PR: #3627]', async () => {
            const { localCollection, remoteCollection } =
                await getTestCollections({ local: 5, remote: 5 });

            const replicationState = replicateRxCollection({
                collection: localCollection,
                replicationIdentifier: REPLICATION_IDENTIFIER_TEST,
                live: false,
                pull: {
                    handler: getPullHandler(remoteCollection),
                },
                push: {
                    handler: getPushHandler(remoteCollection),
                },
            });
            replicationState.error$.subscribe((err) => {
                console.log('got error :');
                console.dir(err);
            });

            await replicationState.awaitInitialReplication();
            await replicationState.run();

            const originalSequence = await getLastPushSequence(
                localCollection,
                REPLICATION_IDENTIFIER_TEST
            );
            // call .run() often
            for (let i = 0; i < 3; i++) {
                await replicationState.run()
            }

            const newSequence = await getLastPushSequence(
                localCollection,
                REPLICATION_IDENTIFIER_TEST
            );
            assert.strictEqual(originalSequence, newSequence);
            localCollection.database.destroy();
            remoteCollection.database.destroy();
        });

        /**
         * When a local write happens while the pull is running,
         * we should drop the pulled documents and first run the push again
         * to ensure we do not loose local writes.
         */
        it('should re-run push if a local write happend between push and pull', async () => {
            const { localCollection, remoteCollection } = await getTestCollections({ local: 0, remote: 0 });

            // write to this document to track pushed and pulled data
            const docData = schemaObjects.humanWithTimestamp();
            docData.age = 0;
            const doc = await localCollection.insert(docData);

            /**
             * To speed up this test,
             * we do some stuff only after the initial replication is done.
             */
            let initalReplicationDone = false;

            /**
             * Track all pushed random values,
             * so we can later ensure that no local write was non-pushed.
             */
            const pushedRandomValues: string[] = [];
            let writeWhilePull = false;

            const replicationState = replicateRxCollection({
                collection: localCollection,
                replicationIdentifier: REPLICATION_IDENTIFIER_TEST,
                live: false,
                pull: {
                    async handler(latestPulledDocument: RxDocumentData<TestDocType> | null) {
                        /**
                         * We simulate a write-while-pull-running
                         * by just doing the write inside of the pull handler.
                         */
                        if (writeWhilePull) {
                            await doc.atomicUpdate(docData => {
                                docData.name = 'write-from-pull-handler';
                                docData.age = docData.age + 1;
                                return docData;
                            });
                            writeWhilePull = false;
                        }
                        return getPullHandler(remoteCollection)(latestPulledDocument);
                    }
                },
                push: {
                    async handler(docs: RxDocumentData<TestDocType>[]) {
                        if (initalReplicationDone) {
                            const randomValue = ensureNotFalsy(docs[0]).name;
                            pushedRandomValues.push(randomValue);
                        }
                        return getPushHandler(remoteCollection)(docs);
                    }
                }
            });
            await replicationState.awaitInitialReplication();
            initalReplicationDone = true;

            await doc.atomicPatch({
                name: 'before-run'
            });
            writeWhilePull = true;
            await replicationState.run();

            assert.strictEqual(
                doc.name,
                'write-from-pull-handler'
            );

            localCollection.database.destroy();
            remoteCollection.database.destroy();
        });
        it('should not stack up run()-calls more then 2', async () => {
            const { localCollection, remoteCollection } = await getTestCollections({ local: 0, remote: 0 });
            const replicationState = replicateRxCollection({
                collection: localCollection,
                replicationIdentifier: REPLICATION_IDENTIFIER_TEST,
                live: false,
                retryTime: 50,
                pull: {
                    async handler() {
                        throw new Error('throw on pull');
                    }
                },
                push: {
                    async handler() {
                        throw new Error('throw on push');
                    }
                }
            });

            // change replicationState._run to count the calls
            const oldRun = replicationState._run.bind(replicationState);
            let count = 0;
            const newRun = function () {
                count++;
                return oldRun();
            };
            replicationState._run = newRun.bind(replicationState);

            const amount = 50;
            // call .run() often
            await Promise.all(
                new Array(amount).fill(0).map(
                    () => replicationState.run()
                )
            );

            await waitUntil(
                () => replicationState.runQueueCount === 0
            );
            assert.ok(count < 10);

            localCollection.database.destroy();
            remoteCollection.database.destroy();
        });
        it('should not stack up failed runs and then run many times', async () => {
            const { localCollection, remoteCollection } = await getTestCollections({ local: 0, remote: 0 });
            let pullCount = 0;
            let throwOnPull = false;
            let startTracking = false;
            const replicationState = replicateRxCollection({
                collection: localCollection,
                replicationIdentifier: REPLICATION_IDENTIFIER_TEST,
                live: false,
                retryTime: 50,
                pull: {
                    async handler(latestPulledDocument: RxDocumentData<TestDocType> | null) {
                        if (throwOnPull) {
                            throw new Error('throwOnPull is true');
                        }
                        if (startTracking) {
                            pullCount = pullCount + 1;
                        }
                        return getPullHandler(remoteCollection)(latestPulledDocument);
                    }
                },
                push: {
                    handler: getPushHandler(remoteCollection)
                }
            });
            await replicationState.awaitInitialReplication();

            // call run() many times but simulate an error on the pull handler.
            throwOnPull = true;

            let t = 0;
            while (t < 100) {
                t++;
                await replicationState.run();
            }

            throwOnPull = false;
            startTracking = true;


            await wait(config.isFastMode() ? 200 : 500);


            if (pullCount > 2) {
                throw new Error('pullCount too height ' + pullCount);
            }

            localCollection.database.destroy();
            remoteCollection.database.destroy();
        });
    });

});
