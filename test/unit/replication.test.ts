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
import * as humansCollection from '../helper/humans-collection';

import {
    RxCollection,
    ensureNotFalsy,
    randomCouchString,
    fastUnsecureHash,
    rxStorageInstanceToReplicationHandler
} from '../../';

import {
    replicateRxCollection} from '../../plugins/replication';

import type {
    ReplicationPullHandler,
    ReplicationPushHandler,
    RxReplicationWriteToMasterRow
} from '../../src/types';


type CheckpointType = any;

describe('replication.test.js', () => {
    const REPLICATION_IDENTIFIER_TEST = 'replication-ident-tests';

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
            return result;
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
            const replicationState = replicateRxCollection({
                collection: localCollection,
                replicationIdentifier: REPLICATION_IDENTIFIER_TEST,
                live: true,
                liveInterval: 0,
                autoStart: false,
                push: {
                    handler() {
                        callProof = 'yeah';
                        return Promise.resolve([]);
                    }
                },
            });
            // ensure proof is still null once replicateRxCollection()
            assert.strictEqual(callProof, null, 'replicateRxCollection should not trigger a push on init.');

            // insert a new doc to trigger a push
            await localCollection.insert(schemaObjects.humanWithTimestamp());

            await replicationState.start();
            /**
             * At some time,
             * the push handler should be called
             */
            await waitUntil(() => callProof === 'yeah');

            localCollection.database.destroy();
            remoteCollection.database.destroy();
        });
    });
    config.parallel('other', () => {
        describe('autoStart', () => {
            it('should run first replication by default', async () => {
                const { localCollection, remoteCollection } = await getTestCollections({ local: 0, remote: 0 });
                const replicationState = replicateRxCollection({
                    collection: localCollection,
                    replicationIdentifier: REPLICATION_IDENTIFIER_TEST,
                    live: false,
                    autoStart: true,
                    waitForLeadership: false
                });
                await replicationState.awaitInitialReplication();
                assert.ok(
                    ensureNotFalsy(replicationState.internalReplicationState).stats.down.downstreamResyncOnce > 0
                );

                localCollection.database.destroy();
                remoteCollection.database.destroy();
            });
            it('should not run first replication when autoStart is set to false', async () => {
                const { localCollection, remoteCollection } = await getTestCollections({ local: 0, remote: 0 });
                const replicationState = replicateRxCollection({
                    collection: localCollection,
                    replicationIdentifier: REPLICATION_IDENTIFIER_TEST,
                    live: false,
                    autoStart: false,
                    waitForLeadership: false
                });

                await wait(100);


                // not replicated
                assert.ok(!replicationState.internalReplicationState);

                localCollection.database.destroy();
                remoteCollection.database.destroy();
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

    });
});
