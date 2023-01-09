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
import * as schemas from '../helper/schemas';
import * as humansCollection from '../helper/humans-collection';

import {
    wrappedValidateAjvStorage
} from '../../plugins/validate-ajv';

import {
    RxCollection,
    ensureNotFalsy,
    randomCouchString,
    rxStorageInstanceToReplicationHandler,
    normalizeMangoQuery,
    RxError,
    RxTypeError,
    createRxDatabase,
    RxReplicationPullStreamItem,
    lastOfArray
} from '../../';

import {
    replicateRxCollection
} from '../../plugins/replication';

import type {
    ReplicationPullHandler,
    ReplicationPushHandler,
    RxReplicationWriteToMasterRow
} from '../../src/types';
import { Subject } from 'rxjs';


type CheckpointType = any;

describe('replication.test.js', () => {
    const REPLICATION_IDENTIFIER_TEST = 'replication-ident-tests';

    type TestDocType = schemaObjects.HumanWithTimestampDocumentType;
    async function getTestCollections(docsAmount: { local: number; remote: number; }): Promise<{
        localCollection: RxCollection<TestDocType, {}, {}, {}>;
        remoteCollection: RxCollection<TestDocType, {}, {}, {}>;
    }> {
        const localCollection = await humansCollection.createHumanWithTimestamp(docsAmount.local, randomCouchString(10), false);
        const remoteCollection = await humansCollection.createHumanWithTimestamp(docsAmount.remote, randomCouchString(10), false);
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
            remoteCollection.database.token
        );
        const handler: ReplicationPullHandler<TestDocType, CheckpointType> = async (
            latestPullCheckpoint: CheckpointType | null,
            batchSize: number
        ) => {
            const result = await helper.masterChangesSince(latestPullCheckpoint, batchSize);
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
            remoteCollection.database.token
        );
        const handler: ReplicationPushHandler<TestDocType> = async (
            rows: RxReplicationWriteToMasterRow<TestDocType>[]
        ) => {
            const result = await helper.masterWrite(rows);
            return result;
        };
        return handler;
    }
    config.parallel('non-live replication', () => {
        it('should replicate both sides', async () => {
            const docsPerSide = 15;
            const { localCollection, remoteCollection } = await getTestCollections({
                local: docsPerSide,
                remote: docsPerSide
            });


            const batchSize = 12;
            const pullHandler = getPullHandler(remoteCollection);
            const pushHandler = getPushHandler(remoteCollection);
            const replicationState = replicateRxCollection({
                collection: localCollection,
                replicationIdentifier: REPLICATION_IDENTIFIER_TEST,
                live: false,
                pull: {
                    batchSize,
                    handler: (lastPulledCheckpoint: CheckpointType, pullBatchSize: number) => {
                        // ensure the batchSize from the settings is respected
                        assert.strictEqual(pullBatchSize, batchSize);
                        return pullHandler(lastPulledCheckpoint, pullBatchSize);
                    }
                },
                push: {
                    batchSize,
                    handler: (docs) => {
                        if (docs.length > batchSize) {
                            throw new Error('push got more docs then the batch size');
                        }
                        return pushHandler(docs);
                    }
                }
            });
            replicationState.error$.subscribe(err => {
                console.log('got error :');
                console.log(JSON.stringify(err, null, 4));
                throw err;
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
                docsPerSide * 2
            );

            localCollection.database.destroy();
            remoteCollection.database.destroy();
        });
        it('should allow asynchronous push and pull modifiers', async () => {
            const docsPerSide = 5;
            const { localCollection, remoteCollection } = await getTestCollections({
                local: docsPerSide,
                remote: docsPerSide
            });
            const replicationState = replicateRxCollection({
                collection: localCollection,
                replicationIdentifier: REPLICATION_IDENTIFIER_TEST,
                live: false,
                pull: {
                    handler: getPullHandler(remoteCollection),
                    modifier: async (doc) => {
                        await wait(config.isFastMode() ? 10 : 100);
                        doc = clone(doc);
                        doc.name = 'pull-modified';
                        return doc;
                    }
                },
                push: {
                    handler: getPushHandler(remoteCollection),
                    modifier: async (doc) => {
                        await wait(config.isFastMode() ? 10 : 100);
                        doc = clone(doc);
                        doc.name = 'push-modified';
                        return doc;
                    }
                }
            });
            await replicationState.awaitInitialReplication();

            const docsLocal = await localCollection.find().exec();
            const docsRemote = await remoteCollection.find().exec();

            const pushModifiedRemote = docsRemote.filter(d => d.name === 'push-modified');
            assert.strictEqual(pushModifiedRemote.length, docsPerSide);

            const pullModifiedLocal = docsLocal.filter(d => d.name === 'pull-modified');
            /**
             * Pushed documents will be also pull modified
             * when they are fetched from the master again.
             * So here we just do a gte check instead of a strict equal.
             */
            assert.ok(pullModifiedLocal.length >= docsPerSide);

            localCollection.database.destroy();
            remoteCollection.database.destroy();
        });
        it('should not save pulled documents that do not match the schema', async () => {
            const amount = 5;
            const { localCollection, remoteCollection } = await getTestCollections({ local: 0, remote: amount });

            /**
             * Use collection with different schema
             * to provoke validation errors.
             */
            const otherSchema = clone(schemas.humanWithTimestamp);
            otherSchema.properties.age.maximum = 0;
            const otherSchemaCollection = await humansCollection.createBySchema(
                otherSchema,
                undefined,
                wrappedValidateAjvStorage({
                    storage: config.storage.getStorage()
                })
            );

            const replicationState = replicateRxCollection({
                collection: otherSchemaCollection as any,
                replicationIdentifier: REPLICATION_IDENTIFIER_TEST,
                live: false,
                pull: {
                    handler: getPullHandler(remoteCollection)
                },
                push: {
                    handler: getPushHandler(remoteCollection)
                }
            });
            const errors: (RxError | RxTypeError)[] = [];
            replicationState.error$.subscribe(err => errors.push(err));
            await replicationState.awaitInitialReplication();

            await wait(config.isFastMode() ? 0 : 100);

            const docsLocal = await otherSchemaCollection.find().exec();
            assert.strictEqual(docsLocal.length, 0);


            assert.strictEqual(errors.length, amount);
            assert.ok(JSON.stringify(errors[0].parameters).includes('maximum'));


            localCollection.database.destroy();
            remoteCollection.database.destroy();
            otherSchemaCollection.database.destroy();
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
            let doc = await localCollection.insert(docData);
            await waitUntil(async () => {
                const remoteDoc = await docsRemoteQuery.exec();
                return !!remoteDoc;
            });

            // UPDATE
            doc = await doc.incrementalPatch({
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
        /**
         * @link https://github.com/pubkey/rxdb/issues/3994
         */
        it('#3994 should respect the push.batchSize', async () => {
            const { localCollection, remoteCollection } = await getTestCollections({ local: 0, remote: 0 });

            const batchSize = 2;
            const replicationState = replicateRxCollection({
                collection: localCollection,
                replicationIdentifier: REPLICATION_IDENTIFIER_TEST,
                live: true,
                pull: {
                    handler: getPullHandler(remoteCollection)
                },
                push: {
                    handler: (docs) => {
                        if (docs.length === 0 || docs.length > batchSize) {
                            throw new Error('push.batchSize(' + batchSize + ') not respected ' + docs.length);
                        }
                        return getPushHandler(remoteCollection)(docs);
                    },
                    batchSize
                }
            });
            replicationState.error$.subscribe(err => {
                console.log('got error :');
                console.dir(err);
                throw err;
            });

            /**
             * Insert many documents at once to
             * produce an eventBulk that contains many documents
             */
            await localCollection.bulkInsert(
                new Array(10).fill(0).map((() => schemaObjects.humanWithTimestamp()))
            );

            await replicationState.awaitInSync();

            const docsOnRemote = await remoteCollection.find().exec();
            assert.strictEqual(
                docsOnRemote.length,
                10
            );

            localCollection.database.destroy();
            remoteCollection.database.destroy();
        });
        it('should emit active$ when a replication cycle is running', async () => {
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
                throw err;
            });

            const values: boolean[] = [];
            replicationState.active$.subscribe((active) => {
                values.push(active);
            });

            await replicationState.awaitInitialReplication();
            assert.strictEqual(
                values.length > 0,
                true
            );
            assert.strictEqual(
                values.includes(true),
                true
            );
            assert.strictEqual(
                values[values.length - 1],
                false
            );

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
        it('should clean up the replication meta storage the get collection gets removed', async () => {
            const { localCollection, remoteCollection } = await getTestCollections({ local: 5, remote: 5 });
            const localDbName = localCollection.database.name;

            const replicationState1 = replicateRxCollection({
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
            await replicationState1.awaitInitialReplication();

            async function docsInMeta(repState: typeof replicationState1): Promise<number> {
                const metaInstance = ensureNotFalsy(repState.metaInstance);
                const prepared = repState.collection.database.storage.statics.prepareQuery(
                    metaInstance.schema,
                    normalizeMangoQuery(
                        metaInstance.schema,
                        {}
                    )
                );
                const result = await metaInstance.query(prepared);
                return result.documents.length;
            }

            await localCollection.remove();
            await localCollection.database.destroy();


            const localCollection2 = await humansCollection.createHumanWithTimestamp(0, localDbName, false);

            let continueReplication: Function | null = undefined as any;
            const continues = new Promise(res => {
                continueReplication = res;
            });

            const replicationState2 = replicateRxCollection({
                collection: localCollection2,
                replicationIdentifier: REPLICATION_IDENTIFIER_TEST,
                live: true,
                pull: {
                    handler: async (chkpt, bSize) => {
                        await continues;
                        return getPullHandler(remoteCollection)(chkpt, bSize);
                    }
                },
                push: {
                    handler: async (docs) => {
                        await continues;
                        return getPushHandler(remoteCollection)(docs);
                    }
                },
                autoStart: false
            });
            await replicationState2.start();
            const docsInMetaAfter = await docsInMeta(replicationState2);

            /**
             * Because in the localCollection2 we do not insert any documents,
             * there must be less documents in the meta collection
             * because it only contains the checkpoints.
             */
            assert.strictEqual(docsInMetaAfter, 0);
            ensureNotFalsy(continueReplication)();

            /**
             * the re-created collection should have re-run the replication
             * and contain all documents from the remove.
             */
            await replicationState2.awaitInitialReplication();
            const localDocs = await localCollection2.find().exec();
            const remoteDocs = await remoteCollection.find().exec();

            assert.deepStrictEqual(
                localDocs.map(d => d.toJSON()),
                remoteDocs.map(d => d.toJSON())
            );

            localCollection2.database.destroy();
            remoteCollection.database.destroy();
        });
    });
    config.parallel('issues', () => {
        it('#4190 Composite Primary Keys broken on replicated collections', async () => {
            const db = await createRxDatabase({
                name: randomCouchString(10),
                storage: config.storage.getStorage(),
                eventReduce: true,
                ignoreDuplicate: true
            });
            const collections = await db.addCollections({
                mycollection: {
                    schema: schemas.humanCompositePrimary
                }
            });
            const mycollection: RxCollection<schemaObjects.HumanWithCompositePrimary> = collections.mycollection;

            const pullStream$ = new Subject<RxReplicationPullStreamItem<any, CheckpointType>>();
            let fetched = false;
            const replicationState = replicateRxCollection({
                replicationIdentifier: 'replicate-' + randomCouchString(10),
                collection: mycollection,
                pull: {
                    // eslint-disable-next-line require-await
                    handler: async (lastCheckpoint) => {
                        const docs: schemaObjects.HumanWithCompositePrimary[] = (fetched) ?
                            [] :
                            [schemaObjects.humanWithCompositePrimary()];
                        fetched = true;
                        const lastDoc = lastOfArray(docs);
                        return {
                            documents: docs,
                            checkpoint: !lastDoc
                                ? lastCheckpoint
                                : {
                                    id: mycollection.schema.getPrimaryOfDocumentData(lastDoc),
                                    updatedAt: new Date().getTime()
                                }
                        };
                    },
                    batchSize: 1,
                    stream$: pullStream$.asObservable()
                },
            });

            replicationState.error$.subscribe((err) => {
                throw Error(err.message);
            });

            await replicationState.awaitInitialReplication();

            // clean up afterwards
            db.destroy();
        });
    });
});
