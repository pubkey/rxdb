import assert from 'assert';
import AsyncTestUtil, { clone } from 'async-test-util';

import { wrappedValidateAjvStorage } from '../../plugins/validate-ajv/index.mjs';
import {
    schemaObjects,
    schemas,
    HumanDocumentType
} from '../../plugins/test-utils/index.mjs';
import {
    createRxDatabase,
    randomToken,
    addRxPlugin,
    RxJsonSchema,
    ensureNotFalsy,
    RxCollection,
    CRDTDocumentField,
    fillWithDefaultSettings,
    defaultHashSha256,
    RxConflictHandlerOutput,
    rxStorageInstanceToReplicationHandler,
    RxReplicationWriteToMasterRow,
    defaultConflictHandler,
    RxConflictHandler
} from '../../plugins/core/index.mjs';



import {
    getCRDTSchemaPart,
    RxDBcrdtPlugin,
    getCRDTConflictHandler
} from '../../plugins/crdt/index.mjs';
addRxPlugin(RxDBcrdtPlugin);
import config, { describeParallel } from './config.ts';
import { replicateRxCollection, RxReplicationState } from '../../plugins/replication/index.mjs';
import { ReplicationPullHandler, ReplicationPushHandler } from '../../plugins/core/index.mjs';

describeParallel('crdt.test.ts', () => {
    type WithCRDTs<RxDocType> = RxDocType & {
        crdts?: CRDTDocumentField<RxDocType>;
    };
    function enableCRDTinSchema<RxDocType>(schema: RxJsonSchema<RxDocType>): RxJsonSchema<WithCRDTs<RxDocType>> {
        const ret: RxJsonSchema<WithCRDTs<RxDocType>> = clone(schema);
        ret.crdt = {
            field: 'crdts'
        };
        ret.properties.crdts = getCRDTSchemaPart();
        return ret;
    }


    async function getCRDTCollection<RxDocType = HumanDocumentType>(
        schema: RxJsonSchema<RxDocType> = schemas.human as any
    ): Promise<RxCollection<WithCRDTs<RxDocType>>> {
        const useSchema = enableCRDTinSchema(schema);
        const db = await createRxDatabase({
            name: randomToken(10),
            /**
             * Use the validator in tests to ensure we do not write
             * broken data.
             */
            storage: wrappedValidateAjvStorage({
                storage: config.storage.getStorage(),
            }),
            multiInstance: false
        });
        await db.addCollections({
            docs: {
                schema: useSchema
            }
        });

        return db.docs;
    }

    describe('collection creation', () => {
        it('should throw if the wrong conflict handler is set', async () => {
            const useSchema = enableCRDTinSchema(schemas.human as any);
            const db = await createRxDatabase({
                name: randomToken(10),
                storage: config.storage.getStorage(),
                multiInstance: false
            });
            await AsyncTestUtil.assertThrows(
                () => db.addCollections({
                    docs: {
                        schema: useSchema,
                        conflictHandler: ((() => { }) as any)
                    }
                }),
                'RxError',
                'CRDT3'
            );
            db.close();
        });
        it('should automatically set the CRDT conflict handler', async () => {
            const collection = await getCRDTCollection();
            assert.ok(collection.conflictHandler !== defaultConflictHandler);
            collection.database.close();
        });
    });


    describe('.insert()', () => {
        it('should insert a document and initialize the crdt state', async () => {
            const collection = await getCRDTCollection();
            const writeData = schemaObjects.humanData();
            const doc = await collection.insert(writeData);
            assert.ok(doc);
            const docData = doc.toJSON(true);
            assert.ok(docData.crdts);
            const firstOp = docData.crdts.operations[0][0];
            assert.ok(firstOp);
            assert.strictEqual(firstOp.body[0].ifMatch?.$set?.passportId, writeData.passportId);

            collection.database.close();
        });
        it('should insert document via bulkInsert', async () => {
            const collection = await getCRDTCollection();
            const writeData = schemaObjects.humanData();
            await collection.bulkInsert([writeData]);
            const doc = await collection.findOne().exec(true);
            assert.ok(doc);
            const docData = doc.toJSON(true);
            assert.ok(docData.crdts);
            const firstOp = docData.crdts.operations[0][0];
            assert.ok(firstOp);
            assert.strictEqual(firstOp.body[0].ifMatch?.$set?.passportId, writeData.passportId);

            collection.database.close();
        });
    });
    describe('.insertCRDT()', () => {
        it('should insert the document', async () => {
            const collection = await getCRDTCollection();
            const writeData = schemaObjects.humanData();

            const doc1 = await collection.insertCRDT({
                ifMatch: {
                    $set: writeData
                }
            });
            const doc2 = await collection.insertCRDT({
                ifMatch: {
                    $set: Object.assign({}, writeData, { firstName: 'foobar' })
                }
            });
            assert.ok(doc1 !== doc2);
            assert.strictEqual(doc2.getLatest().firstName, 'foobar');

            collection.database.close();
        });
        /**
         * @link https://github.com/pubkey/rxdb/pull/5423
         */
        it('should insert the document with undefined argument', async () => {

            let useSchema = clone(schemas.human);
            useSchema.properties.optional_value = {
                type: 'string'
            };
            useSchema = enableCRDTinSchema(useSchema);
            const db = await createRxDatabase({
                name: randomToken(10),
                /**
                 * Use the validator in tests to ensure we do not write
                 * broken data.
                 */
                storage: wrappedValidateAjvStorage({
                    storage: config.storage.getStorage(),
                }),
                multiInstance: false
            });
            await db.addCollections({
                docs: {
                    schema: useSchema
                }
            });
            const collection = db.docs;

            const writeData = schemaObjects.humanData('insert-me');
            (writeData as any).optional_value = undefined;
            const doc1 = await collection.insert(writeData);
            assert.strictEqual(doc1.getLatest().optional_value, undefined);

            collection.database.close();
        });
        it('should respect the if-else logic', async () => {
            const collection = await getCRDTCollection();
            const writeData = schemaObjects.humanData('foobar', 1);

            const doc1 = await collection.insert(writeData);
            const doc2 = await collection.insertCRDT({
                selector: {
                    passportId: {
                        $exists: true
                    }
                },
                ifMatch: {
                    $inc: {
                        age: 1
                    }
                },
                ifNotMatch: {
                    $set: writeData
                }
            });
            assert.ok(doc1 !== doc2);
            assert.strictEqual(doc2.getLatest().age, 2);

            collection.database.close();
        });
    });
    describe('.remove()', () => {
        it('should delete the document via .remove', async () => {
            const collection = await getCRDTCollection();
            const doc = await collection.insert(schemaObjects.humanData('foobar', 1));
            await doc.remove();

            const docsAfter = await collection.find().exec();
            assert.deepStrictEqual(docsAfter.map(d => d.toJSON(true)), []);

            const secondOp = ensureNotFalsy(doc.getLatest().toJSON()).crdts?.operations[1][0];
            assert.ok(secondOp);
            assert.strictEqual(secondOp.body[0].ifMatch?.$set?._deleted, true);

            collection.database.close();
        });
    });

    describe('.incrementalPatch()', () => {
        it('should update the document', async () => {
            const collection = await getCRDTCollection();
            const doc = await collection.insert(schemaObjects.humanData('foobar', 1));
            await doc.incrementalPatch({
                age: 10
            });
            assert.strictEqual(
                doc.getLatest().age,
                10
            );

            const secondOp = ensureNotFalsy(doc.getLatest().toJSON()).crdts?.operations[1][0];
            assert.ok(secondOp);
            assert.strictEqual(secondOp.body[0].ifMatch?.$set?.age, 10);

            collection.database.close();
        });
    });

    /**
     * For some method it is no longer allowed to
     * call them because it might break the document state
     * when the operations are not CRDTs.
     */
    describe('disallowed methods', () => {
        it('should throw the correct errors', async () => {
            const collection = await getCRDTCollection();
            const doc = await collection.insert(schemaObjects.humanData('foobar', 1));

            await AsyncTestUtil.assertThrows(
                () => doc.incrementalModify(d => d),
                'RxError',
                'CRDT2'
            );

            collection.database.close();
        });
    });

    describe('.updateCRDT()', () => {
        return; // TODO
        it('should update the document via CRDT', async () => {
            const collection = await getCRDTCollection();
            const doc = await collection.insert(schemaObjects.humanData('foobar', 1));
            await doc.updateCRDT({
                ifMatch: {
                    $inc: {
                        age: 1
                    }
                }
            });
            assert.strictEqual(
                doc.age,
                2
            );

            const secondOp = ensureNotFalsy(doc.toJSON()).crdts?.operations[1][0];
            assert.ok(secondOp);
            assert.strictEqual(secondOp.body[0].ifMatch?.$inc?.age, 1);

            collection.database.close();
        });
        it('should delete the document via CRDT', async () => {
            const collection = await getCRDTCollection();
            const doc = await collection.insert(schemaObjects.humanData('foobar', 1));
            await doc.updateCRDT({
                ifMatch: {
                    $set: {
                        _deleted: true
                    }
                }
            });

            const docsAfter = await collection.find().exec();
            assert.deepStrictEqual(docsAfter.map(d => d.toJSON(true)), []);

            const secondOp = ensureNotFalsy(doc.toJSON()).crdts?.operations[1][0];
            assert.ok(secondOp);
            assert.strictEqual(secondOp.body[0].ifMatch?.$set?._deleted, true);

            collection.database.close();
        });
    });

    describe('conflict handling', () => {
        const schema = enableCRDTinSchema(fillWithDefaultSettings(schemas.human));
        let conflictHandler: RxConflictHandler<any>;
        describe('init', () => {
            it('init', () => {
                conflictHandler = getCRDTConflictHandler<WithCRDTs<HumanDocumentType>>(
                    defaultHashSha256,
                    schema
                );
            });
        });
        describe('.getCRDTConflictHandler()', () => {
            it('should merge 2 inserts correctly', async () => {
                const writeData = schemaObjects.humanData();
                async function getDoc() {
                    const c = await getCRDTCollection();
                    const doc = await c.insert(writeData);
                    return doc;
                }
                const doc1 = await getDoc();
                const doc2 = await getDoc();

                const mustBeEqual = await conflictHandler.isEqual(
                    doc1.toMutableJSON(true),
                    doc1.toMutableJSON(true)
                    , 'text-crdt'
                );
                assert.strictEqual(mustBeEqual, true);

                const resolved: RxConflictHandlerOutput<any> = await conflictHandler.resolve({
                    newDocumentState: doc1.toMutableJSON(true),
                    realMasterState: doc2.toMutableJSON(true)
                }, 'text-crdt');
                const crdtData: CRDTDocumentField<any> = (resolved as any).crdts;
                assert.strictEqual(crdtData.operations[0].length, 2);

                doc1.collection.database.close();
                doc2.collection.database.close();
            });
        });
        describe('conflicts during replication', () => {
            if (!config.storage.hasReplication) {
                return;
            }
            const REPLICATION_IDENTIFIER_TEST = 'replication-crdt-tests';
            type TestDocType = WithCRDTs<HumanDocumentType>;
            type CheckpointType = any;
            function getPullHandler(
                remoteCollection: RxCollection<TestDocType>
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
                remoteCollection: RxCollection<TestDocType>
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
            function ensureReplicationHasNoErrors(replicationState: RxReplicationState<any, any>) {
                replicationState.error$.subscribe(err => {
                    console.error('ensureReplicationHasNoErrors() has error:');
                    console.dir(err);
                    throw err;
                });
            }
            async function replicateOnce(
                clientCollection: RxCollection<TestDocType>,
                serverCollection: RxCollection<TestDocType>
            ) {
                const pullHandler = getPullHandler(serverCollection);
                const pushHandler = getPushHandler(serverCollection);
                const replicationState = replicateRxCollection({
                    collection: clientCollection,
                    replicationIdentifier: REPLICATION_IDENTIFIER_TEST,
                    live: false,
                    pull: {
                        batchSize: 10,
                        async handler(lastPulledCheckpoint, batchSize) {
                            const ret = await pullHandler(lastPulledCheckpoint, batchSize);
                            return ret;
                        }
                    },
                    push: {
                        batchSize: 10,
                        async handler(docs) {
                            const ret = await pushHandler(docs);
                            return ret;
                        }
                    }
                });
                ensureReplicationHasNoErrors(replicationState);

                await replicationState.awaitInSync();
                await replicationState.cancel();
            }
            it('should merge the +1 increments', async () => {
                const clientACollection = await getCRDTCollection();
                const clientBCollection = await getCRDTCollection();
                const serverCollection = await getCRDTCollection();

                // first replicate the document once
                const writeData = schemaObjects.humanData('foobar', 0);
                await clientACollection.insert(writeData);
                await replicateOnce(clientACollection, serverCollection);

                await replicateOnce(clientBCollection, serverCollection);

                const docA = await clientACollection.findOne().exec(true);
                const docB = await clientBCollection.findOne().exec(true);
                assert.ok(docB);


                // update on both sides while 'offline'
                await Promise.all(
                    [docA, docB].map(doc => doc.updateCRDT({
                        ifMatch: {
                            $inc: {
                                age: 1
                            }
                        }
                    }))
                );

                assert.strictEqual(docA.getLatest().age, 1);
                assert.strictEqual(docB.getLatest().age, 1);

                await replicateOnce(clientACollection, serverCollection);
                await replicateOnce(clientBCollection, serverCollection);
                await replicateOnce(clientACollection, serverCollection);

                assert.strictEqual(docA.getLatest().age, 2);
                assert.strictEqual(docB.getLatest().age, 2);

                // must have both $inc operations
                assert.strictEqual(docA.getLatest().toJSON().crdts?.operations[1].length, 2);
                assert.strictEqual(docB.getLatest().toJSON().crdts?.operations[1].length, 2);

                clientACollection.database.close();
                clientBCollection.database.close();
                serverCollection.database.close();
            });
        });
    });
});
