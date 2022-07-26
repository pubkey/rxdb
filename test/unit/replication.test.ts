/**
 * These tests are for the replication primitives plugin.
 * Notice that not all edge cases are tested because
 * we do that inside of the GraphQL replication plugin.
 */

import assert from 'assert';
import {
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
    fastUnsecureHash,
    lastOfArray,
    rxStorageInstanceToReplicationHandler
} from '../../';

import {
    replicateRxCollection,
    wasLastWriteFromPullReplication,
    getPullReplicationFlag,
    getLastPushCheckpoint
} from '../../plugins/replication';

import type {
    ReplicationPullHandler,
    ReplicationPushHandler,
    RxDocumentData,
    RxReplicationWriteToMasterRow
} from '../../src/types';


type CheckpointType = any;

describe('replication.test.js', () => {
    const REPLICATION_IDENTIFIER_TEST = 'replication-ident-tests';
    const REPLICATION_IDENTIFIER_TEST_HASH = fastUnsecureHash(REPLICATION_IDENTIFIER_TEST);

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
    ): ReplicationPullHandler<TestDocType, CheckpointType> {
        const helper = rxStorageInstanceToReplicationHandler(
            remoteCollection.storageInstance,
            remoteCollection.database.conflictHandler as any,
            remoteCollection.database.hashFunction
        );
        const handler: ReplicationPullHandler<TestDocType, CheckpointType> = async (
            latestPullCheckpoint: CheckpointType | null,
            bulkSize: number
        ) => {
            const result = await helper.masterChangesSince(latestPullCheckpoint, bulkSize);
            return {
                checkpoint: result.checkpoint,
                documents: result.documentsData
            };
        };
        return handler;
    }
    function getPushHandler(
        remoteCollection: RxCollection<TestDocType, {}, {}, {}>
    ): ReplicationPushHandler<TestDocType> {
        const helper = rxStorageInstanceToReplicationHandler(
            remoteCollection.storageInstance,
            remoteCollection.conflictHandler,
            remoteCollection.database.hashFunction
        );
        const handler: ReplicationPushHandler<TestDocType> = async (
            rows: RxReplicationWriteToMasterRow<TestDocType>[]
        ) => {
            console.log('push handler:');
            console.log(JSON.stringify(rows, null, 4));
            const result = await helper.masterWrite(rows);
            return result;
        }
        return handler;
    }
    config.parallel('non-live replication', () => {
        it('should replicate both sides', async () => {
            const { localCollection, remoteCollection } = await getTestCollections({ local: 5, remote: 5 });

            console.log('--- 0');
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

            console.log('--- 1');
            await replicationState.awaitInitialReplication();
            console.log('--- 2');

            const docsRemoteQuery = await remoteCollection.findOne();

            // insert
            const id = 'foobar';
            const docData = schemaObjects.humanWithTimestamp({
                id
            });
            const doc = await localCollection.insert(docData);
            console.log('--- 3');
            await waitUntil(async () => {
                const remoteDoc = await docsRemoteQuery.exec();
                return !!remoteDoc;
            });
            console.log('--- 4');

            // UPDATE
            await doc.atomicPatch({
                age: 100
            });
            console.log('--- 5');
            await waitUntil(async () => {
                const remoteDoc = await docsRemoteQuery.exec(true);
                return remoteDoc.age === 100;
            });
            console.log('--- 6');

            // DELETE
            await wait(100);
            await doc.remove();
            await waitUntil(async () => {
                const remoteDoc = await docsRemoteQuery.exec();
                return !remoteDoc;
            });

            console.log('--- 7');
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
