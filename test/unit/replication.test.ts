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

import config, { describeParallel } from './config.ts';
import {
    schemaObjects,
    schemas,
    humansCollection,
    isFastMode,
    ensureReplicationHasNoErrors,
    randomStringWithSpecialChars,
    isDeno,
    getPullHandler,
    getPushHandler,
    ensureEqualState,
    getPullStream
} from '../../plugins/test-utils/index.mjs';

import {
    wrappedValidateAjvStorage
} from '../../plugins/validate-ajv/index.mjs';
import {
    wrappedValidateZSchemaStorage
} from '../../plugins/validate-z-schema/index.mjs';

import {
    RxCollection,
    ensureNotFalsy,
    randomToken,
    normalizeMangoQuery,
    RxError,
    RxTypeError,
    createRxDatabase,
    RxReplicationPullStreamItem,
    lastOfArray,
    RxJsonSchema,
    createBlob,
    RxAttachmentCreator,
    requestIdlePromise,
    prepareQuery,
    addRxPlugin,
    getLastCheckpointDoc,
    defaultConflictHandler
} from '../../plugins/core/index.mjs';

import {
    RxReplicationState,
    replicateRxCollection
} from '../../plugins/replication/index.mjs';

import type {
    ReplicationPullHandlerResult,
    RxReplicationWriteToMasterRow,
    RxStorage,
    RxStorageDefaultCheckpoint,
    WithDeleted
} from '../../plugins/core/index.mjs';
import { firstValueFrom, map, Subject, timer } from 'rxjs';
import type { HumanWithCompositePrimary, HumanWithTimestampDocumentType } from '../../src/plugins/test-utils/schema-objects.ts';
import { RxDBAttachmentsPlugin } from '../../plugins/attachments/index.mjs';
import { RxDBMigrationSchemaPlugin } from '../../plugins/migration-schema/index.mjs';
import { RxDBCleanupPlugin } from '../../plugins/cleanup/index.mjs';

type CheckpointType = any;
type TestDocType = HumanWithTimestampDocumentType;



export const REPLICATION_IDENTIFIER_TEST = 'replication-ident-tests';
describe('replication.test.ts', () => {
    addRxPlugin(RxDBAttachmentsPlugin);
    addRxPlugin(RxDBMigrationSchemaPlugin);
    addRxPlugin(RxDBCleanupPlugin);

    if (!config.storage.hasReplication) {
        return;
    }
    async function getTestCollections(docsAmount: { local: number; remote: number; }): Promise<{
        localCollection: RxCollection<TestDocType, {}, {}, {}>;
        remoteCollection: RxCollection<TestDocType, {}, {}, {}>;
    }> {
        const localCollection = await humansCollection.createHumanWithTimestamp(0, randomToken(10), false);
        const remoteCollection = await humansCollection.createHumanWithTimestamp(0, randomToken(10), false);

        if (docsAmount.local > 0) {
            await localCollection.bulkInsert(
                new Array(docsAmount.local)
                    .fill(0)
                    .map(() => schemaObjects.humanWithTimestampData({
                        id: randomStringWithSpecialChars(8, 12) + '-local'
                    }))
            );
        }
        if (docsAmount.remote > 0) {
            await remoteCollection.bulkInsert(
                new Array(docsAmount.remote)
                    .fill(0)
                    .map(() => schemaObjects.humanWithTimestampData({
                        id: randomStringWithSpecialChars(8, 12) + '-remote'
                    }))
            );
        }

        return {
            localCollection,
            remoteCollection
        };
    }

    let storageWithValidation: RxStorage<any, any>;
    describe('init', () => {
        it('create storage', () => {
            storageWithValidation = wrappedValidateAjvStorage({
                storage: config.storage.getStorage()
            });
        });
    });
    describeParallel('non-live replication', () => {
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
            ensureReplicationHasNoErrors(replicationState);

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

            await localCollection.database.close();
            await remoteCollection.database.close();
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
                        await wait(isFastMode() ? 10 : 100);
                        doc = clone(doc);
                        doc.name = 'pull-modified';
                        return doc;
                    }
                },
                push: {
                    handler: getPushHandler(remoteCollection),
                    modifier: async (doc) => {
                        await wait(isFastMode() ? 10 : 100);
                        doc = clone(doc);
                        doc.name = 'push-modified';
                        return doc;
                    }
                }
            });
            ensureReplicationHasNoErrors(replicationState);
            await replicationState.awaitInitialReplication();
            await replicationState.awaitInSync();

            const docsLocal = await localCollection.find().exec();
            const docsRemote = await remoteCollection.find().exec();

            const pushModifiedRemote = docsRemote.filter(d => d.name === 'push-modified');
            assert.strictEqual(pushModifiedRemote.length, docsPerSide);

            const pullModifiedLocal = docsLocal.filter(d => d.name === 'pull-modified');

            /**
             * Pushed documents will be also pull modified
             * when they are fetched from the master again.
             * So here we just do a $gte check instead of a strict equal.
             */
            assert.ok(pullModifiedLocal.length >= docsPerSide);

            localCollection.database.close();
            remoteCollection.database.close();
        });
        it('should skip the document when the push-modifier returns null', async () => {
            const { localCollection, remoteCollection } = await getTestCollections({
                local: 0,
                remote: 0
            });
            await localCollection.bulkInsert(
                new Array(10).fill(0).map((_v, idx) => {
                    return schemaObjects.humanWithTimestampData({
                        name: 'from-local',
                        age: idx + 1
                    });
                })
            );
            const replicationState = replicateRxCollection<HumanWithTimestampDocumentType, any>({
                collection: localCollection,
                replicationIdentifier: REPLICATION_IDENTIFIER_TEST,
                live: false,
                pull: {
                    handler: getPullHandler(remoteCollection)
                },
                push: {
                    handler: getPushHandler(remoteCollection),
                    modifier: (doc) => {
                        // skip every second document
                        if (doc.age % 2 === 0) {
                            return null;
                        }
                        return doc;
                    }
                }
            });
            ensureReplicationHasNoErrors(replicationState);
            await replicationState.awaitInitialReplication();

            const docsRemote = await remoteCollection.find().exec();
            assert.strictEqual(docsRemote.length, 5);

            localCollection.database.close();
            remoteCollection.database.close();
        });
        it('should not save pulled documents that do not match the schema', async () => {
            const amount = 5;
            const { localCollection, remoteCollection } = await getTestCollections({ local: 0, remote: amount });

            // // add onee that still matches the schema
            // await remoteCollection.insert({
            //     id: 'matches-schema',
            //     name: 'foobar',
            //     updatedAt: 1001,
            //     age: 0
            // });

            /**
             * Use collection with different schema
             * to provoke validation errors.
             */
            const otherSchema = clone(schemas.humanWithTimestamp);
            otherSchema.properties.age.maximum = 0;
            const otherSchemaCollection = await humansCollection.createBySchema(
                otherSchema,
                undefined,
                storageWithValidation
            );

            const replicationState = replicateRxCollection({
                collection: otherSchemaCollection as any,
                replicationIdentifier: REPLICATION_IDENTIFIER_TEST,
                live: true,
                pull: {
                    handler: getPullHandler(remoteCollection)
                },
                push: {
                    handler: getPushHandler(remoteCollection)
                },
                retryTime: 100
            });
            const errors: (RxError | RxTypeError)[] = [];
            replicationState.error$.subscribe(err => errors.push(err));
            await replicationState.awaitInitialReplication();

            await wait(isFastMode() ? 0 : 100);

            const docsLocal = await otherSchemaCollection.find().exec();
            assert.strictEqual(docsLocal.length, 0);


            // assert.strictEqual(errors.length, amount);
            assert.ok(JSON.stringify(errors[0].parameters).includes('maximum'));

            const pullCheckpointAfter = await getLastCheckpointDoc(
                ensureNotFalsy(replicationState.internalReplicationState),
                'down'
            );

            // when all pulls failed, it should not have the checkpoint updated
            assert.ok(!pullCheckpointAfter);

            localCollection.database.close();
            remoteCollection.database.close();
            otherSchemaCollection.database.close();
        });
        it('should not update the push checkpoint when the conflict handler returns invalid documents that do not match the schema', async () => {
            const localCollection = await humansCollection.createHumanWithTimestamp(0, randomToken(10), false, undefined, {
                isEqual: defaultConflictHandler.isEqual,
                resolve(i) {
                    const ret = clone(i.realMasterState);
                    ret.additionalField = 'foobar';
                    return ret;
                }
            });
            const remoteCollection = await humansCollection.createHumanWithTimestamp(0, randomToken(10), false);

            // add one that conflicts
            await Promise.all([localCollection, remoteCollection].map((c, i) => c.insert({
                id: 'conflicting-doc',
                name: 'myname',
                updatedAt: 1001,
                age: i
            })));

            const replicationState = replicateRxCollection({
                collection: localCollection as any,
                replicationIdentifier: REPLICATION_IDENTIFIER_TEST,
                live: true,
                pull: {
                    handler: getPullHandler(remoteCollection)
                },
                push: {
                    handler: getPushHandler(remoteCollection)
                },
                retryTime: 100
            });
            const errors: (RxError | RxTypeError)[] = [];
            replicationState.error$.subscribe(err => errors.push(err));
            await replicationState.awaitInitialReplication();
            await replicationState.awaitInSync();

            await wait(isFastMode() ? 0 : 100);

            assert.ok(errors.length > 0);
            assert.ok(JSON.stringify(errors[0].parameters).includes('additionalField'));

            // when handling the push failed, it should not have the checkpoint updated
            const pushCheckpointAfter = await getLastCheckpointDoc(
                ensureNotFalsy(replicationState.internalReplicationState),
                'up'
            );
            assert.ok(!pushCheckpointAfter);


            localCollection.database.close();
            remoteCollection.database.close();
        });
        it('should never resolve awaitInitialReplication() on erroring replication', async () => {
            const { localCollection, remoteCollection } = await getTestCollections({ local: 10, remote: 10 });
            const replicationState = replicateRxCollection({
                collection: localCollection,
                replicationIdentifier: REPLICATION_IDENTIFIER_TEST,
                live: true,
                pull: {
                    handler: async () => {
                        await wait(0);
                        throw new Error('must throw on pull');
                    }
                },
                push: {
                    handler: async () => {
                        await wait(0);
                        throw new Error('must throw on push');
                    }
                },
                retryTime: 100
            });
            await firstValueFrom(replicationState.error$);

            let hasResolved = false;
            replicationState.awaitInitialReplication().then(() => {
                hasResolved = true;
            });
            await wait(isFastMode() ? 200 : 500);
            assert.strictEqual(hasResolved, false);

            await localCollection.database.close();
            await remoteCollection.database.close();
        });
        it('should never resolve awaitInitialReplication() on canceled replication', async () => {
            const { localCollection, remoteCollection } = await getTestCollections({ local: 10, remote: 10 });
            const replicationState = replicateRxCollection({
                collection: localCollection,
                replicationIdentifier: REPLICATION_IDENTIFIER_TEST,
                live: true,
                retryTime: 100,
                autoStart: true,
                pull: {
                    handler: async () => {
                        await wait(0);
                        throw new Error('must throw on pull');
                    }
                },
                push: {
                    handler: async () => {
                        await wait(0);
                        throw new Error('must throw on push');
                    }
                }
            });
            await firstValueFrom(replicationState.error$);
            let hasResolved = false;
            replicationState.awaitInitialReplication().then(() => {
                hasResolved = true;
            });
            await replicationState.cancel();

            await wait(isFastMode() ? 200 : 500);
            assert.strictEqual(hasResolved, false);

            localCollection.database.close();
            remoteCollection.database.close();
        });
    });
    describeParallel('live replication', () => {
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
            ensureReplicationHasNoErrors(replicationState);

            await replicationState.awaitInitialReplication();
            const docsRemoteQuery = await remoteCollection.findOne();

            // insert
            const id = 'foobar';
            const docData = schemaObjects.humanWithTimestampData({
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

            localCollection.database.close();
            remoteCollection.database.close();
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
                        return getPushHandler(remoteCollection)(docs as any);
                    },
                    batchSize
                }
            });
            ensureReplicationHasNoErrors(replicationState);

            /**
             * Insert many documents at once to
             * produce an eventBulk that contains many documents
             */
            await localCollection.bulkInsert(
                new Array(10).fill(0).map((() => schemaObjects.humanWithTimestampData()))
            );

            await replicationState.awaitInSync();

            const docsOnRemote = await remoteCollection.find().exec();
            assert.strictEqual(
                docsOnRemote.length,
                10
            );

            localCollection.database.close();
            remoteCollection.database.close();
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
            ensureReplicationHasNoErrors(replicationState);

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

            localCollection.database.close();
            remoteCollection.database.close();
        });
    });
    describeParallel('other', () => {
        describe('autoStart', () => {
            it('should run first replication by default', async () => {
                const { localCollection, remoteCollection } = await getTestCollections({ local: 0, remote: 0 });
                const replicationState = replicateRxCollection({
                    collection: localCollection,
                    replicationIdentifier: REPLICATION_IDENTIFIER_TEST,
                    live: false,
                    autoStart: true,
                    waitForLeadership: false,
                    pull: {
                        handler: getPullHandler(remoteCollection)
                    }
                });
                await replicationState.awaitInitialReplication();
                assert.ok(
                    ensureNotFalsy(replicationState.internalReplicationState).stats.down.downstreamResyncOnce > 0
                );

                localCollection.database.close();
                remoteCollection.database.close();
            });
            it('should not run first replication when autoStart is set to false', async () => {
                const { localCollection, remoteCollection } = await getTestCollections({ local: 0, remote: 0 });
                const replicationState = replicateRxCollection({
                    collection: localCollection,
                    replicationIdentifier: REPLICATION_IDENTIFIER_TEST,
                    live: false,
                    autoStart: false,
                    waitForLeadership: false,
                    pull: {
                        handler: getPullHandler(remoteCollection)
                    }
                });

                await wait(100);


                // not replicated
                assert.ok(!replicationState.internalReplicationState);

                localCollection.database.close();
                remoteCollection.database.close();
            });
        });
        describe('.awaitInSync()', () => {
            it('should resolve after some time', async () => {
                const { localCollection, remoteCollection } = await getTestCollections({ local: 5, remote: 5 });

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
                await replicationState.awaitInSync();

                localCollection.database.close();
                remoteCollection.database.close();
            });
            it('should never resolve when offline', async () => {
                const { localCollection, remoteCollection } = await getTestCollections({ local: 5, remote: 5 });

                const replicationState = replicateRxCollection({
                    collection: localCollection,
                    replicationIdentifier: REPLICATION_IDENTIFIER_TEST,
                    live: true,
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
                await wait(isFastMode() ? 100 : 400);
                assert.strictEqual(resolved, false);

                localCollection.database.close();
                remoteCollection.database.close();
            });
        });
        it('should clean up the replication meta storage when the get collection gets removed', async () => {
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
            ensureReplicationHasNoErrors(replicationState1);
            await replicationState1.awaitInitialReplication();

            async function docsInMeta(repState: typeof replicationState1): Promise<number> {
                const metaInstance = ensureNotFalsy(repState.metaInstance);
                const prepared = prepareQuery(
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
            await localCollection.database.close();

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
            ensureReplicationHasNoErrors(replicationState2);

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

            localCollection2.database.close();
            remoteCollection.database.close();
        });
        it('should respect the initial push checkpoint', async () => {
            const { localCollection, remoteCollection } = await getTestCollections({ local: 0, remote: 0 });

            let lastLocalCheckpoint: any;
            localCollection.checkpoint$.subscribe(checkpoint => lastLocalCheckpoint = checkpoint);
            await localCollection.insert(schemaObjects.humanWithTimestampData());
            assert.ok(lastLocalCheckpoint, 'must have last local checkpoint');
            const replicationState = replicateRxCollection({
                collection: localCollection,
                replicationIdentifier: REPLICATION_IDENTIFIER_TEST,
                live: true,
                pull: {
                    handler: getPullHandler(remoteCollection)
                },
                push: {
                    handler: getPushHandler(remoteCollection),
                    initialCheckpoint: lastLocalCheckpoint
                }
            });


            ensureReplicationHasNoErrors(replicationState);
            await replicationState.awaitInitialReplication();

            const lastCheckpoint = await getLastCheckpointDoc(ensureNotFalsy(replicationState.internalReplicationState), 'up');
            assert.ok(lastCheckpoint);

            const remoteDocs = await remoteCollection.find().exec();
            assert.deepEqual(remoteDocs.length, 0, 'must not have remote docs');

            localCollection.database.close();
            remoteCollection.database.close();
        });
        it('should respect the initial pull checkpoint', async () => {
            const { localCollection, remoteCollection } = await getTestCollections({ local: 0, remote: 0 });

            let lastRemoteCheckpoint: any;
            remoteCollection.checkpoint$.subscribe(checkpoint => lastRemoteCheckpoint = checkpoint);
            await remoteCollection.insert(schemaObjects.humanWithTimestampData());

            const replicationState = replicateRxCollection({
                collection: localCollection,
                replicationIdentifier: REPLICATION_IDENTIFIER_TEST,
                live: true,
                pull: {
                    handler: getPullHandler(remoteCollection),
                    initialCheckpoint: lastRemoteCheckpoint
                },
                push: {
                    handler: getPushHandler(remoteCollection),
                }
            });
            ensureReplicationHasNoErrors(replicationState);
            await replicationState.awaitInitialReplication();

            const localDocs = await localCollection.find().exec();
            assert.deepEqual(localDocs.length, 0);

            localCollection.database.close();
            remoteCollection.database.close();
        });
    });
    describeParallel('RxReplicationState.remove()', () => {
        it('should remove the replication state and start the replication from scratch', async () => {
            const { localCollection, remoteCollection } = await getTestCollections({ local: 1, remote: 1 });
            const calledCheckpoints: any[] = [];
            const startReplication = async () => {
                const replicationState = replicateRxCollection({
                    collection: localCollection,
                    replicationIdentifier: REPLICATION_IDENTIFIER_TEST,
                    live: true,
                    pull: {
                        handler: (checkpoint, batchSize) => {
                            calledCheckpoints.push(checkpoint);
                            return getPullHandler(remoteCollection)(checkpoint, batchSize);
                        },
                    },
                    push: {
                        handler: getPushHandler(remoteCollection),
                    }
                });
                await replicationState.awaitInSync();
                return replicationState;
            };
            const currentReplicationState = await startReplication();
            await currentReplicationState.remove();

            await startReplication();

            assert.deepStrictEqual(calledCheckpoints, [undefined, undefined]);

            localCollection.database.close();
            remoteCollection.database.close();
        });
        it('should not crash when calling remove directly after start (without await)', async () => {
            const { localCollection, remoteCollection } = await getTestCollections({ local: 1, remote: 1 });
            const calledCheckpoints: any[] = [];
            const startReplication = () => {
                const replicationState = replicateRxCollection({
                    collection: localCollection,
                    replicationIdentifier: REPLICATION_IDENTIFIER_TEST,
                    autoStart: false,
                    live: true,
                    pull: {
                        handler: (checkpoint, batchSize) => {
                            calledCheckpoints.push(checkpoint);
                            return getPullHandler(remoteCollection)(checkpoint, batchSize);
                        },
                    },
                    push: {
                        handler: getPushHandler(remoteCollection),
                    }
                });
                return replicationState;
            };

            const currentReplicationState = await startReplication();
            currentReplicationState.start();
            await currentReplicationState.remove();

            localCollection.database.close();
            remoteCollection.database.close();
        });
        it('should not crash when calling remove directly after start (with await)', async () => {
            const { localCollection, remoteCollection } = await getTestCollections({ local: 1, remote: 1 });
            const calledCheckpoints: any[] = [];
            const startReplication = () => {
                const replicationState = replicateRxCollection({
                    collection: localCollection,
                    replicationIdentifier: REPLICATION_IDENTIFIER_TEST,
                    autoStart: false,
                    live: true,
                    pull: {
                        handler: (checkpoint, batchSize) => {
                            calledCheckpoints.push(checkpoint);
                            return getPullHandler(remoteCollection)(checkpoint, batchSize);
                        },
                    },
                    push: {
                        handler: getPushHandler(remoteCollection),
                    }
                });
                return replicationState;
            };
            const currentReplicationState = await startReplication();
            await currentReplicationState.start();
            await currentReplicationState.remove();

            localCollection.database.close();
            remoteCollection.database.close();
        });
    });
    describeParallel('attachment replication', () => {
        if (!config.storage.hasAttachments) {
            return;
        }
        /**
         * Here we use a RxDatabase insteaf of the plain RxStorageInstance.
         * This makes handling attachment easier
         */
        it('attachments replication: up and down with streaming', async () => {
            const localCollection = await humansCollection.createAttachments(3);
            const remoteCollection = await humansCollection.createAttachments(3);

            const localDocs = await localCollection.find().exec();
            const remoteDocs = await remoteCollection.find().exec();

            const replicationState = replicateRxCollection({
                collection: localCollection,
                replicationIdentifier: REPLICATION_IDENTIFIER_TEST,
                live: true,
                pull: {
                    handler: getPullHandler(remoteCollection),
                    stream$: getPullStream(remoteCollection)
                },
                push: {
                    handler: getPushHandler(remoteCollection),
                }
            });
            ensureReplicationHasNoErrors(replicationState);
            await replicationState.awaitInitialReplication();

            function getRandomAttachment(
                id = randomToken(10),
                size = 20
            ): RxAttachmentCreator {
                const attachmentData = randomToken(size);
                const dataBlob = createBlob(attachmentData, 'text/plain');
                return {
                    id,
                    data: dataBlob,
                    type: 'text/plain'
                };
            }

            await replicationState.awaitInitialReplication();
            await ensureEqualState(localCollection, remoteCollection, 'first sync');

            // add attachments
            await remoteDocs[0].getLatest().putAttachment(getRandomAttachment('master1'));
            await localDocs[0].getLatest().putAttachment(getRandomAttachment('fork1'));

            await Promise.all([
                remoteDocs[1].getLatest().putAttachment(getRandomAttachment()),
                remoteDocs[2].getLatest().putAttachment(getRandomAttachment()),
                localDocs[1].getLatest().putAttachment(getRandomAttachment()),
                localDocs[2].getLatest().putAttachment(getRandomAttachment())
            ]);

            await replicationState.reSync();
            await replicationState.awaitInSync();
            await requestIdlePromise();
            await ensureEqualState(localCollection, remoteCollection, 'after adding');

            // add more attachments to docs that already have attachments
            await remoteDocs[0].getLatest().putAttachment(getRandomAttachment('master2'));
            await localDocs[0].getLatest().putAttachment(getRandomAttachment('fork2'));

            await replicationState.reSync();
            await replicationState.awaitInSync();
            await ensureEqualState(localCollection, remoteCollection, 'after add more');

            // overwrite attachments
            await remoteDocs[0].getLatest().putAttachment(getRandomAttachment('master1', 5));
            await localDocs[0].getLatest().putAttachment(getRandomAttachment('fork1', 5));

            await replicationState.reSync();
            await replicationState.awaitInSync();
            await ensureEqualState(localCollection, remoteCollection, 'after overwrite');


            /**
             * The meta instance should not contain attachments data
             */
            const metaStorage = ensureNotFalsy(replicationState.metaInstance);
            const preparedQuery = prepareQuery(
                metaStorage.schema,
                normalizeMangoQuery(
                    metaStorage.schema,
                    {}
                )
            );
            const result = await metaStorage.query(preparedQuery);
            const metaDocs = result.documents;
            metaDocs.forEach(doc => {
                if (doc.isCheckpoint !== '1' && doc.docData._attachments) {
                    Object.values(doc.docData._attachments).forEach((attachment) => {
                        if ((attachment as RxAttachmentCreator).data) {
                            throw new Error('meta doc contains attachment data');
                        }
                    });
                }
            });

            await localCollection.database.close();
            await remoteCollection.database.close();
        });
    });
    describeParallel('start/pause/restart', () => {
        it('should sync again after pause->restart', async () => {
            const startDocsAmount = 2;
            const { localCollection, remoteCollection } = await getTestCollections({ local: startDocsAmount, remote: startDocsAmount });
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
            ensureReplicationHasNoErrors(replicationState);
            await replicationState.awaitInitialReplication();
            await replicationState.awaitInSync();

            await replicationState.pause();

            const insertAfterPauseId = 'insert after pause';
            await localCollection.insert(schemaObjects.humanWithTimestampData({ id: insertAfterPauseId + '-local' }));

            // should not have been synced
            await wait(isFastMode() ? 10 : 50);
            let remoteDocs = await remoteCollection.find().exec();
            assert.deepEqual(remoteDocs.length, startDocsAmount * 2);

            // restart after local write
            await replicationState.start();
            await replicationState.awaitInSync();
            remoteDocs = await remoteCollection.find().exec();
            assert.deepEqual(remoteDocs.length, (startDocsAmount * 2) + 1);

            // restart after remote write
            await replicationState.pause();
            await remoteCollection.insert(schemaObjects.humanWithTimestampData({ id: insertAfterPauseId + '-remote' }));
            await wait(isFastMode() ? 10 : 50);
            let localDocs = await localCollection.find().exec();
            assert.deepEqual(localDocs.length, (startDocsAmount * 2) + 1);
            await replicationState.start();
            await replicationState.awaitInSync();
            localDocs = await localCollection.find().exec();
            assert.deepEqual(localDocs.length, (startDocsAmount * 2) + 2);

            localCollection.database.close();
            remoteCollection.database.close();
        });
    });
    describeParallel('pull-only', () => {
        it('should not store document metadata on pull only replications', async () => {
            const startDocsAmount = 2;
            const { localCollection, remoteCollection } = await getTestCollections({ local: startDocsAmount, remote: startDocsAmount });

            const replicationState = replicateRxCollection({
                collection: localCollection,
                replicationIdentifier: REPLICATION_IDENTIFIER_TEST,
                live: true,
                pull: {
                    handler: getPullHandler(remoteCollection)
                }
            });
            ensureReplicationHasNoErrors(replicationState);
            await replicationState.awaitInitialReplication();
            await replicationState.awaitInSync();
            await remoteCollection.insert(schemaObjects.humanWithTimestampData({ id: 'insert-after-sync' }));
            await replicationState.awaitInSync();


            const metaInstance = ensureNotFalsy(replicationState.metaInstance);
            const prepared = prepareQuery(
                metaInstance.schema,
                normalizeMangoQuery(
                    metaInstance.schema,
                    {}
                )
            );
            const result = await metaInstance.query(prepared);

            const nonCheckpointMetaDocs = result.documents.filter(d => d.isCheckpoint === '0');
            assert.deepStrictEqual(nonCheckpointMetaDocs, [], 'must not have non-checkpoint meta documents');

            localCollection.database.close();
            remoteCollection.database.close();
        });
    });
    describeParallel('issues', () => {
        it('#7587 should correctly handle short primary key lengths', async () => {
            type CollectionCheckpoint = { Checkpoint: number; };

            type Doc = {
                id: string;
                firstName: string;
                lastName: string;
                age: number;
            };

            const mySchema = {
                version: 0,
                primaryKey: 'id',
                type: 'object',
                properties: {
                    id: {
                        type: 'string',
                        maxLength: 1,
                    },
                    firstName: {
                        type: 'string',
                    },
                    lastName: {
                        type: 'string',
                    },
                    age: {
                        type: 'integer',
                        minimum: 0,
                        maximum: 150,
                    },
                },
            };

            const name = randomToken(10);

            // create a database
            const db = await createRxDatabase({
                name,
                storage: config.storage.getStorage(),
                eventReduce: true,
                ignoreDuplicate: true,
            });
            const { mycollection }: { mycollection: RxCollection<Doc>; } =
                await db.addCollections({
                    mycollection: {
                        schema: mySchema,
                    },
                });

            const syncSubj = new Subject<{
                docs: Array<WithDeleted<Doc>>;
                checkpoint: number;
            }>();

            const dummyPull = {
                batchSize: 10,
                async handler(
                    lastPulledCheckpoint: CollectionCheckpoint | undefined
                ): Promise<
                    ReplicationPullHandlerResult<Doc, CollectionCheckpoint>
                > {
                    if (!lastPulledCheckpoint) {
                        return {
                            documents: [
                                {
                                    id: 'd',
                                    firstName: 'Bob',
                                    lastName: 'Kelso',
                                    age: 56,
                                    _deleted: false
                                }
                            ],
                            checkpoint: {
                                Checkpoint: 1
                            }
                        };
                    }
                    // no new data
                    return await {
                        documents: [],
                        checkpoint: lastPulledCheckpoint,
                    };
                },
                stream$: syncSubj.asObservable().pipe(
                    map((sync) => ({
                        documents: sync.docs,
                        checkpoint: { Checkpoint: sync.checkpoint },
                    }))
                ),
            };

            let lastCheckpoint: number | null = null;
            const dummyPush = {
                batchSize: 10,
                handler(
                    rows: RxReplicationWriteToMasterRow<Doc>[]
                ): Promise<WithDeleted<Doc>[]> {
                    // simply send the write rows back as synced data
                    lastCheckpoint = (lastCheckpoint ?? 0) + 1;
                    syncSubj.next({
                        docs: rows.map((r) => ({
                            id: r.newDocumentState.id,
                            firstName: r.newDocumentState.firstName,
                            lastName: r.newDocumentState.lastName,
                            age: r.newDocumentState.age,
                            _deleted: r.newDocumentState._deleted,
                        })),
                        checkpoint: lastCheckpoint,
                    });
                    // no conflicts
                    return Promise.resolve([]);
                },
            };

            const repl = new RxReplicationState<Doc, CollectionCheckpoint>(
                'repltest-' + db.name,
                mycollection,
                '_deleted',
                dummyPull,
                dummyPush,
                true,
                5000
            );
            repl.start();

            // insert a document
            await mycollection.insert({
                id: 'f',
                firstName: 'Bob',
                lastName: 'Kelso',
                age: 56,
            });

            // The bug appears here, the following call will throw an error, the error comes from
            // https://github.com/pubkey/rxdb/blob/3ab3124eed2cf952c58ebb0b26955a3d3879cff2/src/replication-protocol/checkpoint.ts#L130
            // and the error is that the key `up|1` is too long, since the meta instance has a maximum
            // key length of 1 + 2 = 3.
            await repl.awaitInSync();

            // clean up afterwards
            db.close();
        });
        /**
         * @link https://discord.com/channels/969553741705539624/1407063219062702111
         */
        it('not re-running push when canceled during reload', async () => {
            const identifier = randomToken(10);
            const databaseName = randomToken(10);
            const collection1 = await humansCollection.createHumanWithTimestamp(0, databaseName, false);
            let pushedOne = false;
            const replicationState1 = replicateRxCollection({
                collection: collection1,
                replicationIdentifier: identifier,
                live: true,
                retryTime: 2_000,
                pull: {
                    handler: async (_lastPulledCheckpoint, _batchSize) => {
                        await wait(0);

                        return {
                            documents: [],
                            checkpoint: 'CHECKPOINT',
                        };
                    },
                    stream$: timer(0, 600_000).pipe(
                        map(() => {
                            return 'RESYNC';
                        })
                    ),
                },
                push: {
                    batchSize: 1,
                    handler: async (_docsToSync: any) => {
                        pushedOne = true;

                        // reload sometime while waiting - the callback isn't retried again
                        await new Promise((resolve) => setTimeout(resolve, 9999999));
                        return [];
                    },
                },
            });
            await replicationState1.awaitInSync();
            await wait(10);
            const checkpointAfter = await getLastCheckpointDoc(
                ensureNotFalsy(replicationState1.internalReplicationState),
                'up'
            );
            assert.ok(!checkpointAfter);

            await collection1.insert(
                schemaObjects.humanWithTimestampData()
            );
            await waitUntil(() => pushedOne === true);

            await collection1.database.close();

            const collection2 = await humansCollection.createHumanWithTimestamp(0, databaseName, false);
            let pushedTwo = false;
            replicateRxCollection({
                collection: collection2,
                replicationIdentifier: identifier,
                live: true,
                retryTime: 2_000,
                pull: {
                    handler: async (_lastPulledCheckpoint, _batchSize) => {
                        await wait(0);
                        return {
                            documents: [],
                            checkpoint: 'CHECKPOINT',
                        };
                    },
                    stream$: timer(0, 600_000).pipe(
                        map(() => {
                            return 'RESYNC';
                        })
                    ),
                },
                push: {
                    batchSize: 1,
                    handler: async (_docsToSync: any) => {
                        pushedTwo = true;

                        // reload sometime while waiting - the callback isn't retried again
                        await new Promise((resolve) => setTimeout(resolve, 9999999));
                        return [];
                    },
                },
            });
            await waitUntil(() => pushedTwo === true);
            await collection2.database.close();
        });
        it('#7261 should update document via replication stream AFTER migration', async () => {
            const dbName = randomToken(10);
            const storage = wrappedValidateZSchemaStorage({ storage: config.storage.getStorage() });
            const identifier = 'items-pull';
            const migrationStrategies = {
                1: (oldDoc: any) => oldDoc,
            };

            const schemaV1: RxJsonSchema<any> = {
                title: 'TestSchema',
                version: 0,
                type: 'object',
                primaryKey: 'id',
                properties: {
                    id: { type: 'string', maxLength: 50 },
                    foo: { type: 'string' },
                },
                required: ['id'],
            };

            const schemaV2: RxJsonSchema<any> = {
                title: 'TestSchema',
                version: 1,
                type: 'object',
                primaryKey: 'id',
                properties: {
                    id: { type: 'string', maxLength: 50 },
                    foo: { type: 'string' },
                    bar: { type: 'string' },
                },
                required: ['id'],
            };

            // start and stop V1
            const dbV1 = await createRxDatabase({
                name: dbName,
                storage: storage,
                multiInstance: false
            });

            await dbV1.addCollections({
                items: { schema: schemaV1 },
            });

            let collection = dbV1.items;
            await collection.insert({ id: 'a', foo: 'initial' });

            let pullStream$ = new Subject<any>();
            const replicationStateBefore = replicateRxCollection({
                collection,
                replicationIdentifier: identifier,
                live: true,
                pull: {
                    handler: async () => {
                        await wait(0);
                        return { documents: [], checkpoint: null };
                    },
                    stream$: pullStream$.asObservable(),
                    modifier: (d) => {
                        return d;
                    },
                },
                push: {
                    handler: async () => {
                        await wait(0);
                        return [];
                    }
                }
            });
            ensureReplicationHasNoErrors(replicationStateBefore);

            await replicationStateBefore.awaitInitialReplication();

            let sub1 = replicationStateBefore.received$.subscribe((_doc) => { });

            const preDoc = { id: 'a', foo: 'changed-before' };
            pullStream$.next({ documents: [preDoc], checkpoint: {} });

            await replicationStateBefore.awaitInSync();

            let emitted: any[] = [];
            let sub2 = collection
                .findOne('a')
                .$.subscribe((doc) => {
                    emitted.push(doc);
                });

            await waitUntil(() => emitted.length === 1);
            assert.deepStrictEqual(emitted.pop().toJSON(), preDoc);

            await replicationStateBefore.cancel();
            sub1.unsubscribe();
            sub2.unsubscribe();
            await dbV1.close();

            // start v2
            const dbV2 = await createRxDatabase({
                name: dbName,
                storage: storage,
                multiInstance: false
            });

            await dbV2.addCollections({
                items: {
                    schema: schemaV2,
                    migrationStrategies: migrationStrategies,
                },
            });
            pullStream$ = new Subject<any>();
            collection = dbV2.items;

            const replicationStateAfter = replicateRxCollection({
                collection,
                replicationIdentifier: identifier,
                live: true,
                pull: {
                    handler: async () => {
                        await wait(0);
                        return ({ documents: [], checkpoint: null });
                    },
                    stream$: pullStream$.asObservable(),
                    modifier: (d) => {
                        return d;
                    },
                },
            });
            ensureReplicationHasNoErrors(replicationStateAfter);

            await replicationStateAfter.awaitInitialReplication();
            sub1 = replicationStateAfter.received$.subscribe((_doc) => {
            });

            emitted = [];
            sub2 = collection.findOne('a').$.subscribe((doc) => {
                emitted.push(doc);
            });

            const postDoc = { id: 'a', foo: 'changed-after' };
            pullStream$.next({ documents: [postDoc], checkpoint: {} });
            await replicationStateAfter.awaitInSync();
            await waitUntil(() => {
                return emitted.length === 2;
            });
            assert.deepStrictEqual(emitted.pop().toJSON(), postDoc);

            await replicationStateAfter.cancel();
            sub1.unsubscribe();
            sub2.unsubscribe();
            await dbV2.close();
        });
        it('#7264 Replication pause ensureNotFalsy() throws', async () => {
            // create a schema
            const mySchema = {
                version: 0,
                primaryKey: 'passportId',
                type: 'object',
                properties: {
                    passportId: {
                        type: 'string',
                        maxLength: 100,
                    },
                    firstName: {
                        type: 'string',
                    },
                    lastName: {
                        type: 'string',
                    },
                    age: {
                        type: 'integer',
                        minimum: 0,
                        maximum: 150,
                    },
                },
            };

            /**
             * Always generate a random database-name
             * to ensure that different test runs do not affect each other.
             */
            const name = randomToken(10);

            // create a database
            const db = await createRxDatabase({
                name,
                storage: config.storage.getStorage()
            });
            // create a collection
            const collections = await db.addCollections({
                mycollection: {
                    schema: mySchema,
                },
            });
            const replicationState = replicateRxCollection({
                collection: collections.mycollection,
                replicationIdentifier: 'my-collection-http-replication',
                waitForLeadership: false,
                live: true,
                pull: {
                    handler: async () => {
                        await wait(0);
                        return {
                            checkpoint: null,
                            documents: [],
                        };
                    },
                },
                push: {
                    handler: async () => {
                        await wait(0);
                        return [];
                    },
                },
            });

            await replicationState.pause();

            db.close();
            replicationState.cancel();


        });
        it('#7187 real-time query ignoring the latest changes after deleting and purging data', async () => {
            if (
                config.storage.name.includes('random-delay') ||
                isDeno
            ) {
                return;
            }
            const batches = [
                [
                    { id: 'foobar', firstName: 'name1' },
                    { id: 'foobar2', firstName: 'name2' }
                ]
            ];

            // create a schema
            const mySchema = {
                version: 0,
                primaryKey: 'id',
                type: 'object',
                properties: {
                    id: {
                        type: 'string',
                        maxLength: 100
                    },
                    firstName: {
                        type: 'string'
                    }
                }
            };

            /**
             * Always generate a random database-name
             * to ensure that different test runs do not affect each other.
             */
            const name = randomToken(10);

            // create a database
            let db = await createDatabase();

            // Start replication, wait until it's done
            const firstRep = await createReplication();
            await firstRep.awaitInitialReplication();

            // Close the database and recreate it
            await db.close();
            db = await createDatabase();

            await db.mycollection.find().remove();
            await db.mycollection.cleanup(0); // If we comment out this line, the test will pass

            const secondRep = await createReplication(false);
            await secondRep.start();
            await secondRep.remove();

            // Re-create replication and wait until it's done
            let items: any[] = [];
            const itemsQuery = await db.mycollection.find();
            itemsQuery.$.subscribe(docs => {
                const mutableDocs = docs.map(doc => doc.toMutableJSON());
                items = mutableDocs;
            });

            const thirdRep = await createReplication();
            await thirdRep.awaitInSync();

            // Add a new batch that represents a document update in the database
            batches.push([
                { id: 'foobar', firstName: 'MODIFIED' },
            ]);

            // Resync and wait until it's done
            await thirdRep.reSync();
            await thirdRep.awaitInSync();
            await wait(50);

            const newQueryResult = await db.mycollection.find({ selector: { id: { $ne: randomToken(10) } } }).exec();
            assert.deepStrictEqual(
                newQueryResult.map(d => d.toJSON()),
                [
                    {
                        id: 'foobar',
                        firstName: 'MODIFIED'
                    },
                    {
                        id: 'foobar2',
                        firstName: 'name2'
                    }
                ],
                'uncached query result must know about MODIFIED'
            );

            // THIS FAILS !!!
            assert.strictEqual(items.find(item => item.id === 'foobar').firstName, 'MODIFIED', 'should have found the modified item');
            assert.strictEqual(items.length, 2);

            // clean up afterwards
            db.close();

            function createReplication(autoStart = true) {
                const replicationState = replicateRxCollection<any, { index: number; }>({
                    replicationIdentifier: name + 'test-replication',
                    collection: db.mycollection,
                    autoStart,
                    pull: {
                        batchSize: 3,
                        handler: async (checkpoint) => {
                            await wait(10);
                            const index = checkpoint?.index ?? 0;
                            const batchDocs = batches[index];
                            return {
                                documents: batchDocs || [],
                                checkpoint: batchDocs ? { index: index + 1 } : checkpoint as any,
                            };
                        }
                    },
                    push: {
                        handler: async () => {
                            await wait(0);
                            return [];
                        },
                    }
                });
                ensureReplicationHasNoErrors(replicationState);
                return replicationState;
            }

            async function createDatabase() {
                const database = await createRxDatabase({
                    name,
                    /**
                     * By calling config.storage.getStorage(),
                     * we can ensure that all variations of RxStorage are tested in the CI.
                     */
                    storage: config.storage.getStorage(),
                    cleanupPolicy: {
                        minimumDeletedTime: 0,
                    },
                    localDocuments: true,
                });

                // create a collection
                await database.addCollections({
                    mycollection: {
                        schema: mySchema
                    }
                });
                return database;
            }
        });
        it('upstreamInitialSync() running on all data instead of continuing from checkpoint', async () => {
            const { localCollection, remoteCollection } = await getTestCollections({
                local: 0,
                remote: 30
            });

            let replicationState = replicateRxCollection({
                collection: localCollection,
                replicationIdentifier: REPLICATION_IDENTIFIER_TEST,
                live: true,
                pull: {
                    handler: getPullHandler(remoteCollection),
                    batchSize: 10
                },
                push: {
                    handler: getPushHandler(remoteCollection),
                    batchSize: 10
                }
            });
            ensureReplicationHasNoErrors(replicationState);
            await replicationState.awaitInitialReplication();
            await replicationState.awaitInSync();

            /**
             * After the replication is in sync,
             * our up-checkpoint should have the last remote document
             * as id. This ensure that restarting the replication
             * will not lead to having all pulled documents fetched from
             * the storage and be checked again.
             */
            const lastRemoteDoc = await remoteCollection.findOne({ sort: [{ id: 'desc' }] }).exec(true);
            const checkpointAfter = await getLastCheckpointDoc<HumanWithTimestampDocumentType, RxStorageDefaultCheckpoint>(
                ensureNotFalsy(replicationState.internalReplicationState),
                'up'
            );
            assert.ok(checkpointAfter);

            /**
             * Some RxStorages like the 'sharding' storage
             * do not have a normal checkpoint but instead
             * stack up multiple checkpoints from their shards.
             * So if that is the case, we cannot run this test here.
             */
            if (
                Array.isArray(checkpointAfter) ||
                !checkpointAfter.id
            ) {
                await localCollection.database.close();
                await remoteCollection.database.close();
                return;
            }

            assert.strictEqual(ensureNotFalsy(checkpointAfter).id, lastRemoteDoc.id);
            await replicationState.cancel();

            /**
             * Restarting the collection should not pull or push any more documents
             */
            replicationState = replicateRxCollection({
                collection: localCollection,
                replicationIdentifier: REPLICATION_IDENTIFIER_TEST,
                live: true,
                pull: {
                    async handler(a, b) {
                        const pullResult = await getPullHandler(remoteCollection)(a, b);
                        if (pullResult.documents.length > 0) {
                            throw new Error('must not pull any documents');
                        }
                        return pullResult;
                    },
                    batchSize: 10
                },
                push: {
                    handler() {
                        throw new Error('must not push');
                    },
                    batchSize: 10
                }
            });
            ensureReplicationHasNoErrors(replicationState);
            await replicationState.awaitInitialReplication();
            await replicationState.awaitInSync();

            await localCollection.database.close();
            await remoteCollection.database.close();
        });
        it('#4190 Composite Primary Keys broken on replicated collections', async () => {
            const db = await createRxDatabase({
                name: randomToken(10),
                storage: config.storage.getStorage(),
                eventReduce: true,
                ignoreDuplicate: true
            });
            const collections = await db.addCollections({
                mycollection: {
                    schema: schemas.humanCompositePrimary
                }
            });
            const mycollection: RxCollection<HumanWithCompositePrimary> = collections.mycollection;

            const pullStream$ = new Subject<RxReplicationPullStreamItem<any, CheckpointType>>();
            let fetched = false;
            const replicationState = replicateRxCollection({
                replicationIdentifier: 'replicate-' + randomToken(10),
                collection: mycollection,
                pull: {
                    // eslint-disable-next-line require-await
                    handler: async (lastCheckpoint) => {
                        const docs: HumanWithCompositePrimary[] = (fetched) ?
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
                                    updatedAt: Date.now()
                                }
                        };
                    },
                    batchSize: 1,
                    stream$: pullStream$.asObservable()
                },
            });
            ensureReplicationHasNoErrors(replicationState);

            await replicationState.awaitInitialReplication();

            // clean up afterwards
            db.close();
        });
        it('#4315 Id length limit reached with composite key', async () => {
            const primaryKeyLength = 500;
            async function getCollection(): Promise<RxCollection<TestDocType>> {
                const db = await createRxDatabase({
                    name: randomToken(10),
                    storage: storageWithValidation,
                    eventReduce: true,
                    ignoreDuplicate: true
                });
                const schema: RxJsonSchema<TestDocType> = clone(schemas.humanWithTimestamp);
                schema.properties.id.maxLength = primaryKeyLength;
                const collections = await db.addCollections({
                    mycollection: {
                        schema
                    }
                });
                const mycollection: RxCollection<TestDocType> = collections.mycollection;
                return mycollection;
            }

            const remoteCollection = await getCollection();
            const localCollection = await getCollection();


            const docA = schemaObjects.humanWithTimestampData({
                id: randomToken(primaryKeyLength)
            });
            await remoteCollection.insert(docA);
            const docB = schemaObjects.humanWithTimestampData({
                id: randomToken(primaryKeyLength)
            });
            await localCollection.insert(docB);

            const pullHandler = getPullHandler(remoteCollection);
            const pushHandler = getPushHandler(remoteCollection);
            const batchSize = 10;
            const replicationState = replicateRxCollection({
                collection: localCollection,
                replicationIdentifier: REPLICATION_IDENTIFIER_TEST,
                live: false,
                pull: {
                    batchSize,
                    handler: (lastPulledCheckpoint: CheckpointType, pullBatchSize: number) => {
                        return pullHandler(lastPulledCheckpoint, pullBatchSize);
                    }
                },
                push: {
                    batchSize,
                    handler: (docs) => {
                        return pushHandler(docs);
                    }
                }
            });
            ensureReplicationHasNoErrors(replicationState);


            await replicationState.awaitInitialReplication();

            const docsLocal = await localCollection.find().exec();
            const docsRemote = await remoteCollection.find().exec();

            assert.strictEqual(docsLocal.length, 2);
            assert.strictEqual(docsRemote.length, 2);


            remoteCollection.database.close();
            localCollection.database.close();
        });
        it('#5571 Replication observation mode ignored when push handler is waiting for response from backend', async () => {
            const serverCollection = await humansCollection.create(0);
            const clientCollection = await humansCollection.create(0);
            const replicationState = replicateRxCollection({
                replicationIdentifier: 'replicate-' + randomToken(10),
                collection: clientCollection,
                pull: {
                    handler: (lastPulledCheckpoint: CheckpointType, pullBatchSize: number) => {
                        return getPullHandler(serverCollection)(lastPulledCheckpoint, pullBatchSize);
                    },
                    stream$: getPullStream(serverCollection).pipe(
                    )
                },
                push: {
                    handler: async (rows) => {
                        // simulate that the server is modifying the pushed document.
                        rows = rows.map(row => {
                            row = clone(row);
                            row.newDocumentState.lastName = 'server-modified';
                            return row;
                        });
                        const resultPromise = getPushHandler(serverCollection)(rows);
                        await wait(50);
                        const result = await resultPromise;
                        return result;
                    }
                },
            });
            ensureReplicationHasNoErrors(replicationState);
            await replicationState.awaitInitialReplication();

            await clientCollection.insert(schemaObjects.humanData('first'));
            await replicationState.awaitInSync();

            const docOnClient = await clientCollection.findOne().exec(true);
            assert.strictEqual(docOnClient.lastName, 'server-modified');

            serverCollection.database.close();
            clientCollection.database.close();
        });
    });
});
