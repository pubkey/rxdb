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
    RxCollection,
    ensureNotFalsy,
    randomCouchString,
    now,
    hash,
} from '../../';

import {
    setLastPullDocument,
    getLastPullDocument,
    replicateRxCollection,
    wasLastWriteFromPullReplication,
    setLastWritePullReplication,
    getPullReplicationFlag,
    setLastPushCheckpoint,
    getLastPushCheckpoint,
    getChangesSinceLastPushCheckpoint
} from '../../plugins/replication';

import type {
    ReplicationPullHandler,
    ReplicationPushHandler,
    RxDocumentData,
    RxDocumentWriteData
} from '../../src/types';
import { EXAMPLE_REVISION_1 } from '../helper/revisions';

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
        describe('.wasLastWriteFromPullReplication()', () => {
            it('should be false on non-set flag', async () => {
                const c = await humansCollection.createHumanWithTimestamp(1);
                const doc = await c.findOne().exec(true);

                const wasFromPull = wasLastWriteFromPullReplication(
                    REPLICATION_IDENTIFIER_TEST_HASH,
                    doc.toJSON(true)
                );
                assert.strictEqual(wasFromPull, false);

                c.database.destroy();
            });
            it('should be true for pulled revision', async () => {
                const c = await humansCollection.createHumanWithTimestamp(0);
                const toStorage: RxDocumentData<HumanWithTimestampDocumentType> = Object.assign(
                    schemaObjects.humanWithTimestamp(),
                    {
                        _rev: '1-62080c42d471e3d2625e49dcca3b8e3e',
                        _attachments: {},
                        _deleted: false,
                        _meta: {
                            lwt: now(),
                            [getPullReplicationFlag(REPLICATION_IDENTIFIER_TEST_HASH)]: 1
                        }
                    }
                );

                const wasFromPull = wasLastWriteFromPullReplication(
                    REPLICATION_IDENTIFIER_TEST_HASH,
                    toStorage
                );
                assert.strictEqual(wasFromPull, true);

                c.database.destroy();
            });
        });
    });
    config.parallel('replication-checkpoints', () => {
        describe('.setLastPushCheckpoint()', () => {
            it('should set the last push sequence', async () => {
                const c = await humansCollection.createHumanWithTimestamp(0);
                const ret = await setLastPushCheckpoint(
                    c,
                    REPLICATION_IDENTIFIER_TEST,
                    1
                );
                assert.ok(ret.id.includes(REPLICATION_IDENTIFIER_TEST));
                c.database.destroy();
            });
            it('should be able to run multiple times', async () => {
                const c = await humansCollection.createHumanWithTimestamp(0);
                await setLastPushCheckpoint(
                    c,
                    REPLICATION_IDENTIFIER_TEST,
                    1
                );
                await setLastPushCheckpoint(
                    c,
                    REPLICATION_IDENTIFIER_TEST,
                    2
                );
                c.database.destroy();
            });
        });
        describe('.getLastPushCheckpoint()', () => {
            it('should get undefined if not set before', async () => {
                const c = await humansCollection.createHumanWithTimestamp(0);
                const ret = await getLastPushCheckpoint(
                    c,
                    REPLICATION_IDENTIFIER_TEST
                );
                assert.strictEqual(typeof ret, 'undefined');
                c.database.destroy();
            });
            it('should get the value if set before', async () => {
                const c = await humansCollection.createHumanWithTimestamp(0);
                await setLastPushCheckpoint(
                    c,
                    REPLICATION_IDENTIFIER_TEST,
                    5
                );
                const ret = await getLastPushCheckpoint(
                    c,
                    REPLICATION_IDENTIFIER_TEST
                );
                assert.strictEqual(ret, 5);
                c.database.destroy();
            });
            it('should get the value if set multiple times', async () => {
                const c = await humansCollection.createHumanWithTimestamp(0);
                await setLastPushCheckpoint(
                    c,
                    REPLICATION_IDENTIFIER_TEST,
                    5
                );
                const ret = await getLastPushCheckpoint(
                    c,
                    REPLICATION_IDENTIFIER_TEST
                );
                assert.strictEqual(ret, 5);

                await setLastPushCheckpoint(
                    c,
                    REPLICATION_IDENTIFIER_TEST,
                    10
                );
                const ret2 = await getLastPushCheckpoint(
                    c,
                    REPLICATION_IDENTIFIER_TEST
                );
                assert.strictEqual(ret2, 10);
                c.database.destroy();
            });
        });
        describe('.getChangesSinceLastPushCheckpoint()', () => {
            it('should get all changes', async () => {
                const amount = 5;
                const c = await humansCollection.createHumanWithTimestamp(amount);
                const changesResult = await getChangesSinceLastPushCheckpoint(
                    c,
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
                const changesResult = await getChangesSinceLastPushCheckpoint(
                    c,
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
                const changesResult = await getChangesSinceLastPushCheckpoint(
                    c,
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
                const changesResult = await getChangesSinceLastPushCheckpoint(
                    c,
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
            it('should have resolved the primary', async () => {
                const amount = 5;
                const c = await humansCollection.createHumanWithTimestamp(amount);
                const changesResult = await getChangesSinceLastPushCheckpoint(
                    c,
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
                const toStorageInstance: RxDocumentWriteData<HumanWithTimestampDocumentType> = Object.assign(
                    schemaObjects.humanWithTimestamp(),
                    {
                        _attachments: {},
                        _deleted: false,
                        _meta: {
                            lwt: now()
                        },
                        _rev: EXAMPLE_REVISION_1
                    }
                );
                setLastWritePullReplication(
                    REPLICATION_IDENTIFIER_TEST_HASH,
                    toStorageInstance,
                    1
                );
                const docId = toStorageInstance.id;

                await c.storageInstance.bulkWrite([{
                    document: toStorageInstance
                }], 'replication-test');

                const allDocs = await c.find().exec();

                assert.strictEqual(allDocs.length, amount + 1);
                const changesResult = await getChangesSinceLastPushCheckpoint(
                    c,
                    REPLICATION_IDENTIFIER_TEST_HASH,
                    () => false,
                    10
                );

                assert.strictEqual(changesResult.changedDocs.size, amount);
                const shouldNotBeFound = Array.from(changesResult.changedDocs.values()).find((change) => change.id === docId);
                assert.ok(!shouldNotBeFound);

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
                    REPLICATION_IDENTIFIER_TEST_HASH,
                    docData
                );
                assert.ok(ret.id.includes(REPLICATION_IDENTIFIER_TEST_HASH));
                c.database.destroy();
            });
            it('should be able to run multiple times', async () => {
                const c = await humansCollection.createHumanWithTimestamp(1);
                const doc = await c.findOne().exec(true);
                const docData = doc.toJSON(true);
                await setLastPullDocument(
                    c,
                    REPLICATION_IDENTIFIER_TEST_HASH,
                    docData
                );
                const ret = await setLastPullDocument(
                    c,
                    REPLICATION_IDENTIFIER_TEST_HASH,
                    docData
                );
                assert.ok(ret.id.includes(REPLICATION_IDENTIFIER_TEST_HASH));
                c.database.destroy();
            });
        });
        describe('.getLastPullDocument()', () => {
            it('should return null if no doc set', async () => {
                const c = await humansCollection.createHumanWithTimestamp(0);
                const ret = await getLastPullDocument(
                    c,
                    REPLICATION_IDENTIFIER_TEST_HASH
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
                    REPLICATION_IDENTIFIER_TEST_HASH,
                    docData
                );
                const ret = await getLastPullDocument(
                    c,
                    REPLICATION_IDENTIFIER_TEST_HASH
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
    config.parallel('live replication', () => {
        it('should replicate all writes', async () => {
            const { localCollection, remoteCollection } = await getTestCollections({ local: 0, remote: 0 });

            const replicationState = replicateRxCollection({
                collection: localCollection,
                replicationIdentifier: REPLICATION_IDENTIFIER_TEST,
                live: true,
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

            const docsRemoteQuery = await remoteCollection.findOne();

            // insert
            const id = 'foobar';
            const docData = schemaObjects.humanWithTimestamp({
                id
            });
            const doc = await localCollection.insert(docData);
            await waitUntil(async () => {
                const remoteDoc = await docsRemoteQuery.exec();
                return !!remoteDoc;
            });

            // UPDATE
            await doc.atomicPatch({
                age: 100
            });
            await waitUntil(async () => {
                const remoteDoc = await docsRemoteQuery.exec(true);
                return remoteDoc.age === 100;
            });

            // DELETE
            await wait(100);
            await doc.remove();
            await waitUntil(async () => {
                const remoteDoc = await docsRemoteQuery.exec();
                return !remoteDoc;
            });

            localCollection.database.destroy();
            remoteCollection.database.destroy();
        });
        it('should allow 0 value for liveInterval', async () => {
            const { localCollection, remoteCollection } = await getTestCollections({ local: 0, remote: 0 });
            assert.doesNotThrow(async () => {
                const replicationState = replicateRxCollection({
                    collection: localCollection,
                    replicationIdentifier: REPLICATION_IDENTIFIER_TEST,
                    live: true,
                    liveInterval: 0,
                    pull: {
                        handler: getPullHandler(remoteCollection)
                    },
                    push: {
                        handler: getPushHandler(remoteCollection)
                    }
                });
                await replicationState.awaitInitialReplication();
            });
            localCollection.database.destroy();
            remoteCollection.database.destroy();
        });
        it('should push data even if liveInterval is set to 0', async () => {
            const { localCollection, remoteCollection } = await getTestCollections({ local: 0, remote: 0 });
            let callProof: string | null = null;
            replicateRxCollection({
                collection: localCollection,
                replicationIdentifier: REPLICATION_IDENTIFIER_TEST,
                live: true,
                liveInterval: 0,
                autoStart: false,
                push: {
                    handler() {
                        callProof = 'yeah';
                        return Promise.resolve();
                    }
                },
            });
            // ensure proof is still null once replicateRxCollection()
            assert.strictEqual(callProof, null, 'replicateRxCollection should not trigger a push on init.');

            // insert a new doc to trigger a push
            await localCollection.insert(schemaObjects.humanWithTimestamp());

            /**
             * At some time,
             * the push handler should be called
             */
            await waitUntil(() => callProof === 'yeah');

            localCollection.database.destroy();
            remoteCollection.database.destroy();
        });
    });
    describe('.notifyAboutRemoteChange()', () => {
        it('should only make a request to the remote when the last pull time is older', async () => {
            const { localCollection, remoteCollection } = await getTestCollections({ local: 0, remote: 0 });

            const replicationState = replicateRxCollection({
                collection: localCollection,
                replicationIdentifier: REPLICATION_IDENTIFIER_TEST,
                live: true,
                liveInterval: 0,
                pull: {
                    handler: getPullHandler(remoteCollection)
                },
                push: {
                    handler: async (docs) => {
                        /**
                         * When document data would be send to a remote server,
                         * the server would emit an event over the websocket,
                         * which should trigger a call to notifyAboutRemoteChange()
                         * which is simulated here.
                         */
                        replicationState.notifyAboutRemoteChange();
                        await wait(10);
                        return getPushHandler(remoteCollection)(docs);
                    }
                }
            });
            await replicationState.awaitInitialReplication();

            /**
             * When notifyAboutRemoteChange() is called when no run is happening,
             * it should trigger a new run() cycle. 
             */
            let runCountBefore = replicationState.runCount;
            await replicationState.notifyAboutRemoteChange();
            assert.strictEqual(runCountBefore + 1, replicationState.runCount);

            /**
             * When notifyAboutRemoteChange() is called because
             * the remote has emitted an event, it should not trigger a
             * new run() cycle.
             */
            runCountBefore = replicationState.runCount;
            await localCollection.insert(schemaObjects.humanWithTimestamp());
            await wait(50);
            /**
             * Exactly 1 runCount should be added
             * because notifyAboutRemoteChange() must not have triggered an additional new run() cycle.
             */
            assert.strictEqual(runCountBefore + 1, replicationState.runCount);

            localCollection.database.destroy();
            remoteCollection.database.destroy();
        });
    });
    config.parallel('other', () => {
        describe('autoStart', () => {
            it('should run first replication by default', async () => {
                const replicationState = replicateRxCollection({
                    collection: {
                        database: {},
                        onDestroy: { then() { } }
                    } as RxCollection,
                    replicationIdentifier: REPLICATION_IDENTIFIER_TEST,
                    live: false,
                    autoStart: true,
                    waitForLeadership: false
                });
                await replicationState.awaitInitialReplication();
                assert.strictEqual(replicationState.runCount, 1);
            });
            it('should not run first replication when autoStart is set to false', async () => {
                const replicationState = replicateRxCollection({
                    collection: {
                        database: {},
                        onDestroy: { then() { } }
                    } as RxCollection,
                    replicationIdentifier: REPLICATION_IDENTIFIER_TEST,
                    live: false,
                    autoStart: false,
                    waitForLeadership: false
                });

                await wait(100);

                // by definition awaitInitialReplication would be infinite
                assert.strictEqual(replicationState.runCount, 0);
            });
        });
        describe('.awaitInSync()', () => {
            it('should resolve after some time', async () => {
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
                await replicationState.awaitInSync();

                localCollection.database.destroy();
                remoteCollection.database.destroy();
            });
            it('should never resolve when offline', async () => {
                const { localCollection, remoteCollection } = await getTestCollections({ local: 5, remote: 5 });

                const replicationState = replicateRxCollection({
                    collection: localCollection,
                    replicationIdentifier: REPLICATION_IDENTIFIER_TEST,
                    live: false,
                    pull: {
                        handler: async () => {
                            await wait(100);
                            throw new Error('always error');
                        }
                    },
                    push: {
                        handler: getPushHandler(remoteCollection)
                    }
                });
                let resolved = false;
                replicationState.awaitInSync().then(() => {
                    resolved = true;
                });
                await wait(config.isFastMode() ? 100 : 400);
                assert.strictEqual(resolved, false);

                localCollection.database.destroy();
                remoteCollection.database.destroy();
            });
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

            const originalSequence = await getLastPushCheckpoint(
                localCollection,
                REPLICATION_IDENTIFIER_TEST
            );
            // call .run() often
            for (let i = 0; i < 3; i++) {
                await replicationState.run()
            }

            const newSequence = await getLastPushCheckpoint(
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
                    handler(docs: RxDocumentData<TestDocType>[]) {
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
                    handler() {
                        throw new Error('throw on pull');
                    }
                },
                push: {
                    handler() {
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
                    handler(latestPulledDocument: RxDocumentData<TestDocType> | null) {
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
        /**
         * @link https://github.com/pubkey/rxdb/issues/3727
         */
        it('#3727 should not go into infinite push loop when number of changed requests equals to batchSize', async () => {
            const MAX_PUSH_COUNT = 30 // arbitrary big number
            const { localCollection, remoteCollection } = await getTestCollections({ local: 0, remote: 4 });
            let pushCount = 0;
            const replicationState = replicateRxCollection({
                collection: localCollection,
                replicationIdentifier: REPLICATION_IDENTIFIER_TEST,
                pull: {
                    handler: getPullHandler(remoteCollection)
                },
                push: {
                    batchSize: 5,
                    handler: async (documents) => {
                        pushCount++;

                        if (pushCount > MAX_PUSH_COUNT) {
                            // Exit push cycle. Otherwise test will never end
                            throw new Error('Stop replication');
                        }

                        const ret = await getPushHandler(remoteCollection)(documents);
                        return ret;
                    }
                }
            });

            await replicationState.awaitInitialReplication();
            const docData = schemaObjects.humanWithTimestamp();
            await localCollection.insert(docData)
            await replicationState.run();

            if (pushCount > MAX_PUSH_COUNT) {
                throw new Error('Infinite push loop');
            }

            localCollection.database.destroy();
            remoteCollection.database.destroy();
        });
    });
});
