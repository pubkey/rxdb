import assert from 'assert';

import config, { describeParallel } from './config.ts';
import {
    randomToken,
    now,
    fillWithDefaultSettings,
    createRevision,
    replicateRxStorageInstance,
    awaitRxStorageReplicationFirstInSync,
    normalizeMangoQuery,
    MangoQuery,
    RxConflictHandler,
    RxDocumentData,
    RxStorageInstance,
    RxStorageInstanceReplicationState,
    awaitRxStorageReplicationIdle,
    promiseWait,
    getRxReplicationMetaInstanceSchema,
    RxStorageReplicationMeta,
    rxStorageInstanceToReplicationHandler,
    cancelRxStorageReplication,
    awaitRxStorageReplicationInSync,
    defaultHashSha256,
    getComposedPrimaryKeyOfDocumentData,
    setCheckpoint,
    deepEqual,
    RxJsonSchema,
    RxDocumentWriteData,
    createBlob,
    blobToBase64String,
    RxAttachmentWriteData,
    flatClone,
    requestIdlePromise,
    promiseSeries,
    prepareQuery,
    runXTimes
} from '../../plugins/core/index.mjs';


import {
    RxLocalDocumentData,
    RX_LOCAL_DOCUMENT_SCHEMA
} from '../../plugins/local-documents/index.mjs';
import {
    schemaObjects,
    schemas,
    isFastMode,
    EXAMPLE_REVISION_3,
    HumanDocumentType,
    EXAMPLE_REVISION_2,
    EXAMPLE_REVISION_1
} from '../../plugins/test-utils/index.mjs';
import {
    clone,
    wait,
    waitUntil,
    randomBoolean
} from 'async-test-util';

const testContext = 'replication-protocol.test.ts';

const useParallel = describeParallel;

function ensureReplicationHasNoErrors(replicationState: RxStorageInstanceReplicationState<any>) {
    /**
     * We do not have to unsubscribe because the observable will cancel anyway.
     */
    replicationState.events.error.subscribe(err => {
        // console.error('ensureReplicationHasNoErrors() has error:');
        // console.error(err);
        // console.dir(err.toString());
        throw err;
    });
}

useParallel(testContext + ' (implementation: ' + config.storage.name + ')', () => {
    if (!config.storage.hasReplication) {
        return;
    }

    function withoutMeta(d: any) {
        d = flatClone(d);
        delete d._meta;
        delete d._rev;
        return d;
    }
    const THROWING_CONFLICT_HANDLER: RxConflictHandler<HumanDocumentType> = {
        isEqual(a, b) {
            return deepEqual(withoutMeta(a), withoutMeta(b));
        },
        resolve() {
            throw new Error('THROWING_CONFLICT_HANDLER: This handler should never be called. (context: ' + context + ')');
        }
    };

    const HIGHER_AGE_CONFLICT_HANDLER: RxConflictHandler<HumanDocumentType> = {
        isEqual(a, b) {
            return deepEqual(a, b);
        },
        resolve(input) {
            const docA = input.newDocumentState;
            const docB = input.realMasterState;

            if ((docA as any)._deleted !== (docB as any)._deleted) {
                return input.newDocumentState;
            }

            const ageA = docA.age ? docA.age : 0;
            const ageB = docB.age ? docB.age : 0;
            if (ageA > ageB) {

                // flag the conflict solution  document state the for easier debugging
                const documentData = clone(docA);
                documentData.lastName = 'resolved-conflict-' + randomToken(5);
                return documentData;
            } else if (ageB > ageA) {
                const documentData: typeof docB = clone(docB);
                // flag the conflict solution  document state the for easier debugging
                documentData.lastName = 'resolved-conflict-' + randomToken(5);
                return documentData;
            } else {
                console.error('EQUAL AGE (' + ageA + ') ' + context);
                console.log(JSON.stringify(input, null, 4));
                throw new Error('equal age ' + ageA + ' ctxt: ' + context);
            }
        }
    };


    function getDocData(partial: Partial<RxDocumentData<HumanDocumentType>> = {}): RxDocumentData<HumanDocumentType> {
        const docData = Object.assign(
            schemaObjects.humanData(),
            partial
        );
        const withMeta: RxDocumentData<HumanDocumentType> = Object.assign(
            {
                _deleted: false,
                _meta: {
                    lwt: now()
                },
                _rev: '',
                _attachments: partial._attachments ? partial._attachments : {}
            },
            docData
        );
        withMeta._rev = createRevision(randomToken(10));
        return withMeta;
    }
    async function getAttachmentWriteData(): Promise<RxAttachmentWriteData> {
        const attachmentData = randomToken(20);
        const dataBlob = createBlob(attachmentData, 'text/plain');
        const dataString = await blobToBase64String(dataBlob);
        return {
            data: dataString,
            length: attachmentData.length,
            type: 'text/plain',
            digest: await defaultHashSha256(dataString)
        };
    }
    async function createRxStorageInstance(
        documentAmount: number = 0,
        databaseName: string = randomToken(12),
        collectionName: string = randomToken(12),
        attachments = false
    ): Promise<RxStorageInstance<HumanDocumentType, any, any>> {


        const schema: RxJsonSchema<HumanDocumentType> = clone(schemas.human);
        if (attachments) {
            schema.attachments = {};
        }

        const storageInstance = await config.storage.getStorage().createStorageInstance<HumanDocumentType>({
            databaseInstanceToken: randomToken(10),
            databaseName,
            collectionName,
            schema: fillWithDefaultSettings(schema),
            options: {},
            multiInstance: true,
            devMode: true
        });

        if (documentAmount > 0) {
            const writeRows = await Promise.all(
                new Array(documentAmount)
                    .fill(0)
                    .map(async () => {
                        const document: RxDocumentWriteData<HumanDocumentType> = getDocData();
                        if (attachments) {
                            document._attachments = {
                                [randomToken(5) + '.txt']: await getAttachmentWriteData()
                            };
                        }
                        return { document };
                    })
            );
            await storageInstance.bulkWrite(
                writeRows,
                testContext
            );
        }

        return storageInstance;
    }
    async function createMetaInstance<RxDocType>(parentSchema: RxJsonSchema<RxDocumentData<RxDocType>>): Promise<RxStorageInstance<RxStorageReplicationMeta<RxDocType, any>, any, any>> {
        const instance = await config.storage.getStorage().createStorageInstance<RxStorageReplicationMeta<RxDocType, any>>({
            databaseInstanceToken: randomToken(10),
            databaseName: randomToken(12),
            collectionName: randomToken(12),
            schema: getRxReplicationMetaInstanceSchema(parentSchema, false),
            options: {},
            multiInstance: true,
            devMode: true
        });
        return instance;
    }
    async function runQuery<RxDocType>(
        storageInstance: RxStorageInstance<RxDocType, any, any>,
        mangoQuery: MangoQuery<RxDocType> = {}
    ): Promise<RxDocumentData<RxDocType>[]> {
        const preparedQuery = prepareQuery(
            storageInstance.schema,
            normalizeMangoQuery(
                storageInstance.schema,
                mangoQuery
            )
        );
        const result = await storageInstance.query(preparedQuery);
        return result.documents;
    }

    async function cleanUp(
        replicationState: RxStorageInstanceReplicationState<any>,
        masterInstance: RxStorageInstance<any, any, any, any>
    ) {

        /**
         * For the tests we first await the replication to be in sync
         * which failed some times.
         */
        await awaitRxStorageReplicationInSync(replicationState);

        await cancelRxStorageReplication(replicationState);

        /**
         * Here we should run .remove()
         * on all instances to ensure we do not fill up the
         * browser storage limits.
         */
        await Promise.all([
            masterInstance.close(),
            replicationState.input.forkInstance.close(),
            replicationState.input.metaInstance.remove()
        ]).catch(() => {
            /**
             * Closing the instances might error
             * when they are used in multiple replications
             * that have already closed them.
             */
        });
    }

    async function ensureEqualState<RxDocType>(
        instanceA: RxStorageInstance<RxDocType, any, any>,
        instanceB: RxStorageInstance<RxDocType, any, any>
    ) {
        await requestIdlePromise();
        const [resA, resB] = await Promise.all([
            runQuery(instanceA),
            runQuery(instanceB)
        ]);

        resA.forEach((docA, idx) => {
            const docB = resB[idx];
            const cleanDocToCompare = (doc: RxDocumentData<RxDocType>) => {
                return Object.assign({}, doc, {
                    _meta: undefined,
                    _rev: undefined
                });
            };
            try {
                assert.deepStrictEqual(
                    cleanDocToCompare(docA),
                    cleanDocToCompare(docB)
                );
            } catch (err) {
                console.log('## ERROR: State not equal (docs count: ' + resA.length + ')');
                console.log(JSON.stringify({ col: instanceA.collectionName, docA }, null, 4));
                console.log(JSON.stringify({ col: instanceB.collectionName, docB }, null, 4));
                throw new Error('STATE not equal');
            }
        });
    }

    describe('helpers', () => {
        describe('checkpoint', () => {
            /**
             * @link https://github.com/pubkey/rxdb/pull/3627
             */
            it('#3627 should not write a duplicate checkpoint', async () => {
                const masterInstance = await createRxStorageInstance(1);
                const forkInstance = await createRxStorageInstance(0);
                const metaInstance = await createMetaInstance(forkInstance.schema);

                const writeResult = await masterInstance.bulkWrite([{
                    document: getDocData()
                }], testContext);
                assert.deepStrictEqual(writeResult.error, []);

                const replicationState = replicateRxStorageInstance({
                    identifier: randomToken(10),
                    replicationHandler: rxStorageInstanceToReplicationHandler(
                        masterInstance,
                        THROWING_CONFLICT_HANDLER,
                        randomToken(10)
                    ),
                    forkInstance,
                    metaInstance,
                    pullBatchSize: 100,
                    pushBatchSize: 100,
                    conflictHandler: THROWING_CONFLICT_HANDLER,
                    hashFunction: defaultHashSha256
                });
                await awaitRxStorageReplicationFirstInSync(replicationState);
                await awaitRxStorageReplicationInSync(replicationState);

                const checkpointDocId = getComposedPrimaryKeyOfDocumentData(
                    metaInstance.schema,
                    {
                        isCheckpoint: '1',
                        itemId: 'down'
                    }
                );
                let checkpointDocBefore: any;
                while (!checkpointDocBefore) {
                    const response = await replicationState.input.metaInstance.findDocumentsById(
                        [checkpointDocId],
                        false
                    );
                    if (response[0]) {
                        checkpointDocBefore = response[0];
                        break;
                    }
                    await wait(200);
                }

                await setCheckpoint(
                    replicationState,
                    'down',
                    clone(checkpointDocBefore.data)
                );

                const checkpointDocAfterResult = await replicationState.input.metaInstance.findDocumentsById(
                    [checkpointDocId],
                    false
                );
                const checkpointDocAfter = checkpointDocAfterResult[0];

                assert.strictEqual(
                    checkpointDocAfter._rev,
                    checkpointDocBefore._rev
                );

                await cleanUp(replicationState, masterInstance);
            });
        });

    });
    describe('down', () => {
        it('it should write the initial data and also the ongoing insert', async () => {
            const masterInstance = await createRxStorageInstance(1);
            const forkInstance = await createRxStorageInstance(0);
            const metaInstance = await createMetaInstance(forkInstance.schema);

            const replicationState = replicateRxStorageInstance({
                identifier: randomToken(10),
                replicationHandler: rxStorageInstanceToReplicationHandler(
                    masterInstance,
                    THROWING_CONFLICT_HANDLER,
                    randomToken(10)
                ),
                forkInstance,
                metaInstance,
                pullBatchSize: 100,
                pushBatchSize: 100,
                conflictHandler: THROWING_CONFLICT_HANDLER,
                hashFunction: defaultHashSha256
            });
            await awaitRxStorageReplicationFirstInSync(replicationState);

            // check initial doc
            const docsOnFork = await runQuery(forkInstance);
            assert.strictEqual(docsOnFork.length, 1);

            // ensure ._meta.lwt is set correctly
            const firstDoc = docsOnFork[0];
            assert.ok(firstDoc._meta.lwt > 10);

            // check ongoing doc
            await masterInstance.bulkWrite([{
                document: getDocData()
            }], testContext);

            await waitUntil(async () => {
                const docsOnFork2 = await runQuery(forkInstance);
                return docsOnFork2.length === 2;
            });

            await cleanUp(replicationState, masterInstance);
        });
    });
    describe('up', () => {
        it('it should write the initial data and also the ongoing insert', async () => {
            const masterInstance = await createRxStorageInstance(0);
            const forkInstance = await createRxStorageInstance(1);
            const metaInstance = await createMetaInstance(forkInstance.schema);

            const replicationState = replicateRxStorageInstance({
                identifier: randomToken(10),
                replicationHandler: rxStorageInstanceToReplicationHandler(masterInstance, THROWING_CONFLICT_HANDLER, randomToken(10)),
                forkInstance,
                metaInstance,
                pullBatchSize: 100,
                pushBatchSize: 100,
                conflictHandler: THROWING_CONFLICT_HANDLER,
                hashFunction: defaultHashSha256
            });
            await awaitRxStorageReplicationFirstInSync(replicationState);

            // check initial doc
            const docsOnMaster = await runQuery(masterInstance);
            assert.strictEqual(docsOnMaster.length, 1);

            // ensure ._meta.lwt is set correctly
            const firstDoc = docsOnMaster[0];
            assert.ok(firstDoc._meta.lwt > 10);

            // check ongoing doc
            await forkInstance.bulkWrite([{
                document: getDocData()
            }], testContext);

            await waitUntil(async () => {
                const docsOnMaster2 = await runQuery(masterInstance);
                return docsOnMaster2.length === 2;
            });

            await cleanUp(replicationState, masterInstance);
        });
        it('should replicate the insert and the update and the delete', async () => {
            const masterInstance = await createRxStorageInstance(0);
            const forkInstance = await createRxStorageInstance(1);
            const metaInstance = await createMetaInstance(forkInstance.schema);

            const replicationState = replicateRxStorageInstance({
                identifier: randomToken(10),
                replicationHandler: rxStorageInstanceToReplicationHandler(masterInstance, HIGHER_AGE_CONFLICT_HANDLER, randomToken(10)),
                forkInstance,
                metaInstance,
                pullBatchSize: 100,
                pushBatchSize: 100,
                conflictHandler: HIGHER_AGE_CONFLICT_HANDLER,
                hashFunction: defaultHashSha256
            });

            const passportId = 'foobar';

            // INSERT

            const docData = getDocData({
                passportId,
                age: 1
            });

            const writeResult = await forkInstance.bulkWrite([{
                document: docData
            }], testContext);
            assert.deepStrictEqual(writeResult.error, []);
            let previous = docData;

            // wait until it is replicated to the master
            await waitUntil(async () => {
                const docsAfterUpdate = await masterInstance.findDocumentsById([passportId], false);
                return docsAfterUpdate[0];
            });

            // UPDATE

            const updateData: typeof docData = clone(docData);
            updateData.firstName = 'xxx';
            updateData.age = 2;
            updateData._rev = EXAMPLE_REVISION_2;
            updateData._meta.lwt = now();

            const updateResult = await forkInstance.bulkWrite([{
                previous,
                document: updateData
            }], testContext);
            assert.deepStrictEqual(updateResult.error, []);
            previous = updateData;

            // wait until the change is replicated to the master
            await waitUntil(async () => {
                const docsAfterUpdate = await masterInstance.findDocumentsById([passportId], false);
                return docsAfterUpdate[0].firstName === 'xxx';
            });
            await ensureEqualState(masterInstance, forkInstance);

            // DELETE
            const deleteData: typeof docData = clone(docData);
            deleteData._rev = EXAMPLE_REVISION_3;
            deleteData._deleted = true;
            deleteData._meta.lwt = now();
            const deleteResult = await forkInstance.bulkWrite([{
                previous,
                document: deleteData
            }], testContext);
            assert.deepStrictEqual(deleteResult.error, []);

            // wait until the change is replicated to the master
            await waitUntil(async () => {
                const docsAfterUpdate = await masterInstance.findDocumentsById([passportId], false);
                return !docsAfterUpdate[0];
            });
            await ensureEqualState(masterInstance, forkInstance);

            await cleanUp(replicationState, masterInstance);
        });
    });
    describe('different configurations', () => {
        it('should be able to replicate A->Master<-B', async () => {
            const masterInstance = await createRxStorageInstance(0);
            const forkInstanceA = await createRxStorageInstance(0);
            const metaInstanceA = await createMetaInstance(forkInstanceA.schema);
            const forkInstanceB = await createRxStorageInstance(0);
            const metaInstanceB = await createMetaInstance(forkInstanceB.schema);

            const replicationStateAtoMaster = replicateRxStorageInstance({
                identifier: randomToken(10),
                replicationHandler: rxStorageInstanceToReplicationHandler(masterInstance, THROWING_CONFLICT_HANDLER, randomToken(10)),
                forkInstance: forkInstanceA,
                metaInstance: metaInstanceA,
                pullBatchSize: 100,
                pushBatchSize: 100,
                conflictHandler: THROWING_CONFLICT_HANDLER,
                hashFunction: defaultHashSha256
            });

            const replicationStateBtoMaster = replicateRxStorageInstance({
                identifier: randomToken(10),
                replicationHandler: rxStorageInstanceToReplicationHandler(masterInstance, THROWING_CONFLICT_HANDLER, randomToken(10)),
                forkInstance: forkInstanceB,
                metaInstance: metaInstanceB,
                pullBatchSize: 100,
                pushBatchSize: 100,
                conflictHandler: THROWING_CONFLICT_HANDLER,
                hashFunction: defaultHashSha256
            });

            // insert a document on A
            const writeData = getDocData();
            await forkInstanceA.bulkWrite(
                [{ document: writeData }],
                testContext
            );

            // find the document on B
            await waitUntil(async () => {
                try {
                    const foundAgain = await forkInstanceB.findDocumentsById([writeData.passportId], false);
                    const foundDoc = foundAgain[0];
                    assert.strictEqual(foundDoc.passportId, writeData.passportId);
                    return true;
                } catch (err) {
                    return false;
                }
            }, 10 * 1000, 100);

            await cleanUp(replicationStateAtoMaster, masterInstance);
            await cleanUp(replicationStateBtoMaster, masterInstance);
        });
        it('should be able to replicate A->B->C->Master', async () => {
            const masterInstance = await createRxStorageInstance(0);
            const forkInstanceA = await createRxStorageInstance(0);
            const metaInstanceA = await createMetaInstance(forkInstanceA.schema);
            const forkInstanceB = await createRxStorageInstance(0);
            const metaInstanceB = await createMetaInstance(forkInstanceB.schema);
            const forkInstanceC = await createRxStorageInstance(0);
            const metaInstanceC = await createMetaInstance(forkInstanceC.schema);

            const replicationStateAtoB = replicateRxStorageInstance({
                identifier: randomToken(10),
                replicationHandler: rxStorageInstanceToReplicationHandler(forkInstanceB, THROWING_CONFLICT_HANDLER, randomToken(10)),
                forkInstance: forkInstanceA,
                metaInstance: metaInstanceA,
                pullBatchSize: 100,
                pushBatchSize: 100,
                conflictHandler: THROWING_CONFLICT_HANDLER,
                hashFunction: defaultHashSha256
            });
            const replicationStateBtoC = replicateRxStorageInstance({
                identifier: randomToken(10),
                replicationHandler: rxStorageInstanceToReplicationHandler(forkInstanceC, THROWING_CONFLICT_HANDLER, randomToken(10)),
                forkInstance: forkInstanceB,
                metaInstance: metaInstanceB,
                pullBatchSize: 100,
                pushBatchSize: 100,
                conflictHandler: THROWING_CONFLICT_HANDLER,
                hashFunction: defaultHashSha256
            });
            const replicationStateCtoMaster = replicateRxStorageInstance({
                identifier: randomToken(10),
                replicationHandler: rxStorageInstanceToReplicationHandler(masterInstance, THROWING_CONFLICT_HANDLER, randomToken(10)),
                forkInstance: forkInstanceC,
                metaInstance: metaInstanceC,
                pullBatchSize: 100,
                pushBatchSize: 100,
                conflictHandler: THROWING_CONFLICT_HANDLER,
                hashFunction: defaultHashSha256
            });

            // insert a document on A
            const writeData = getDocData();
            await forkInstanceA.bulkWrite(
                [{ document: writeData }],
                testContext
            );

            async function waitUntilADocExists(
                instance: typeof forkInstanceA
            ) {
                await waitUntil(async () => {
                    try {
                        const foundAgain = await instance.findDocumentsById([writeData.passportId], false);
                        const foundDoc = foundAgain[0];
                        assert.strictEqual(foundDoc.passportId, writeData.passportId);
                        return true;
                    } catch (err) {
                        return false;
                    }
                }, 10 * 1000, 50);
            }

            await Promise.all([
                waitUntilADocExists(forkInstanceA),
                waitUntilADocExists(forkInstanceB),
                waitUntilADocExists(forkInstanceC),
                waitUntilADocExists(masterInstance)
            ]);

            // insert a document on Master
            const writeDataMaster = getDocData();
            await masterInstance.bulkWrite(
                [{ document: writeDataMaster }],
                testContext
            );

            async function waitUntilMasterDocExists(
                instance: typeof forkInstanceA
            ) {
                await waitUntil(async () => {
                    try {
                        const foundAgain = await instance.findDocumentsById([writeDataMaster.passportId], false);
                        const foundDoc = foundAgain[0];
                        assert.strictEqual(foundDoc.passportId, writeDataMaster.passportId);
                        return true;
                    } catch (err) {
                        return false;
                    }
                }, 10 * 1000, 50);
            }

            // find the document on C
            await waitUntilMasterDocExists(forkInstanceC);
            // find the document on B
            await waitUntilMasterDocExists(forkInstanceB);
            // find the document on A
            await waitUntilMasterDocExists(forkInstanceA);

            await cleanUp(replicationStateAtoB, masterInstance);
            await cleanUp(replicationStateBtoC, masterInstance);
            await cleanUp(replicationStateCtoMaster, masterInstance);
        });
        it('on multi instance it should be able to mount on top of the same storage config with a different instance', async () => {
            if (!config.storage.hasMultiInstance) {
                return;
            }


            const databaseName = randomToken(12);
            const collectionName = randomToken(12);

            const masterInstanceA = await createRxStorageInstance(0, databaseName, collectionName);
            const masterInstanceB = await createRxStorageInstance(0, databaseName, collectionName);

            const forkInstanceA = await createRxStorageInstance(0);
            const metaInstanceA = await createMetaInstance(forkInstanceA.schema);
            const forkInstanceB = await createRxStorageInstance(0);
            const metaInstanceB = await createMetaInstance(forkInstanceB.schema);


            const replicationStateAtoMaster = replicateRxStorageInstance({
                identifier: randomToken(10),
                replicationHandler: rxStorageInstanceToReplicationHandler(masterInstanceA, THROWING_CONFLICT_HANDLER, randomToken(10)),
                forkInstance: forkInstanceA,
                metaInstance: metaInstanceA,
                pullBatchSize: 100,
                pushBatchSize: 100,
                conflictHandler: THROWING_CONFLICT_HANDLER,
                hashFunction: defaultHashSha256
            });
            const replicationStateBtoMaster = replicateRxStorageInstance({
                identifier: randomToken(10),
                replicationHandler: rxStorageInstanceToReplicationHandler(masterInstanceB, THROWING_CONFLICT_HANDLER, randomToken(10)),
                forkInstance: forkInstanceB,
                metaInstance: metaInstanceB,
                pullBatchSize: 100,
                pushBatchSize: 100,
                conflictHandler: THROWING_CONFLICT_HANDLER,
                hashFunction: defaultHashSha256
            });

            // insert a document on A
            const writeData = getDocData();
            await forkInstanceA.bulkWrite(
                [{ document: writeData }],
                testContext
            );


            // find the document on B
            await waitUntil(async () => {
                try {
                    const foundAgain = await forkInstanceB.findDocumentsById([writeData.passportId], false);
                    const foundDoc = foundAgain[0];
                    assert.strictEqual(foundDoc.passportId, writeData.passportId);
                    return true;
                } catch (err) {
                    return false;
                }
            }, 10 * 1000, 100);

            await cleanUp(replicationStateAtoMaster, masterInstanceA);
            await cleanUp(replicationStateBtoMaster, masterInstanceB);
        });
        it('should respect the given local start checkpoint', async () => {
            const masterInstance = await createRxStorageInstance(0);
            const forkInstance = await createRxStorageInstance(0);
            const metaInstance = await createMetaInstance(forkInstance.schema);

            let lastForkCheckpoint: any;
            forkInstance.changeStream().subscribe(cE => lastForkCheckpoint = cE.checkpoint);
            await forkInstance.bulkWrite(
                [{ document: getDocData() }],
                testContext
            );

            const replicationState = replicateRxStorageInstance({
                identifier: randomToken(10),
                replicationHandler: rxStorageInstanceToReplicationHandler(masterInstance, HIGHER_AGE_CONFLICT_HANDLER, randomToken(10)),
                forkInstance,
                metaInstance,
                pullBatchSize: 100,
                pushBatchSize: 100,
                conflictHandler: HIGHER_AGE_CONFLICT_HANDLER,
                hashFunction: defaultHashSha256,
                initialCheckpoint: {
                    upstream: lastForkCheckpoint
                }
            });
            await awaitRxStorageReplicationFirstInSync(replicationState);

            const masterDocs = await runQuery(masterInstance);
            assert.strictEqual(masterDocs.length, 0);

            await cleanUp(replicationState, masterInstance);
        });
    });
    describe('conflict handling', () => {
        it('both have inserted the exact same document -> no conflict handler must be called', async () => {
            const masterInstance = await createRxStorageInstance(0);
            const forkInstance = await createRxStorageInstance(0);
            const metaInstance = await createMetaInstance(forkInstance.schema);
            const instances = [masterInstance, forkInstance];

            const document = getDocData();

            await Promise.all(
                instances
                    .map(instance => instance.bulkWrite(
                        [{ document }],
                        testContext
                    ))
            );

            const replicationState = replicateRxStorageInstance({
                identifier: randomToken(10),
                replicationHandler: rxStorageInstanceToReplicationHandler(masterInstance, THROWING_CONFLICT_HANDLER, randomToken(10)),
                forkInstance,
                metaInstance,
                pullBatchSize: 100,
                pushBatchSize: 100,
                conflictHandler: THROWING_CONFLICT_HANDLER,
                hashFunction: defaultHashSha256
            });
            await awaitRxStorageReplicationFirstInSync(replicationState);

            await ensureEqualState(masterInstance, forkInstance);

            const masterDocs = await runQuery(masterInstance);
            assert.ok(masterDocs[0]._rev.startsWith('1-'));

            await cleanUp(replicationState, masterInstance);
        });
        it('both have inserted the same document with different properties', async () => {
            const masterInstance = await createRxStorageInstance(0);
            const forkInstance = await createRxStorageInstance(0);
            const metaInstance = await createMetaInstance(forkInstance.schema);
            const instances = [masterInstance, forkInstance];
            const document = getDocData();
            await Promise.all(
                instances
                    .map(async (instance, idx) => {
                        const docData = Object.assign({}, clone(document), {
                            firstName: idx === 0 ? 'master' : 'fork',
                            age: idx
                        });
                        docData._rev = createRevision(randomToken(10));
                        docData._meta.lwt = now();
                        await instance.bulkWrite([{
                            document: docData
                        }], testContext);
                    })
            );

            const replicationState = replicateRxStorageInstance({
                identifier: randomToken(10),
                replicationHandler: rxStorageInstanceToReplicationHandler(
                    masterInstance,
                    HIGHER_AGE_CONFLICT_HANDLER,
                    randomToken(10)
                ),
                forkInstance,
                metaInstance,
                pullBatchSize: 100,
                pushBatchSize: 100,
                conflictHandler: HIGHER_AGE_CONFLICT_HANDLER,
                hashFunction: defaultHashSha256
            });

            await awaitRxStorageReplicationFirstInSync(replicationState);
            await ensureEqualState(masterInstance, forkInstance);

            // revision must be 2 because it had to resolve a conflict.
            const masterDocs = await runQuery(masterInstance);

            assert.ok(masterDocs[0]._rev.startsWith('2-'));

            cleanUp(replicationState, masterInstance);
        });
        it('both have updated the document with different values', async () => {
            const masterInstance = await createRxStorageInstance(0);
            const forkInstance = await createRxStorageInstance(0);
            const metaInstance = await createMetaInstance(forkInstance.schema);
            const instances = [masterInstance, forkInstance];

            const document = getDocData();

            await Promise.all(
                instances
                    .map(async (instance, idx) => {
                        // insert
                        const docData = Object.assign({}, clone(document), {
                            firstName: idx === 0 ? 'master' : 'fork',
                            age: idx
                        });
                        docData._rev = createRevision(randomToken(10), docData);
                        docData._meta.lwt = now();
                        await instance.bulkWrite([{
                            document: docData
                        }], testContext);

                        // update
                        const newDocData = clone(docData);
                        newDocData.age = newDocData.age + 1;
                        newDocData._rev = createRevision(randomToken(10), docData);
                        newDocData._meta.lwt = now();
                        const updateResult = await instance.bulkWrite([{
                            previous: docData,
                            document: newDocData
                        }], testContext);
                        assert.deepStrictEqual(updateResult.error, []);
                    })
            );


            const replicationState = replicateRxStorageInstance({
                identifier: randomToken(10),
                replicationHandler: rxStorageInstanceToReplicationHandler(masterInstance, HIGHER_AGE_CONFLICT_HANDLER, randomToken(10)),
                forkInstance,
                metaInstance,
                pullBatchSize: 100,
                pushBatchSize: 100,
                conflictHandler: HIGHER_AGE_CONFLICT_HANDLER,
                hashFunction: defaultHashSha256
            });

            await awaitRxStorageReplicationFirstInSync(replicationState);
            await ensureEqualState(masterInstance, forkInstance);

            cleanUp(replicationState, masterInstance);
        });
        it('doing many writes on the fork should not lead to many writes on the master', async () => {
            if (config.storage.name === 'sqlite-trial') {
                return;
            }
            const writeAmount = isFastMode() ? 5 : 50;

            const masterInstance = await createRxStorageInstance(0);
            const forkInstance = await createRxStorageInstance(0);
            const metaInstance = await createMetaInstance(forkInstance.schema);

            /**
            * Wrap bulkWrite() to count the calls
            */
            let writesOnMaster = 0;
            let writesOnFork = 0;
            const masterBulkWriteBefore = masterInstance.bulkWrite.bind(masterInstance);
            masterInstance.bulkWrite = (i) => {
                writesOnMaster++;
                return masterBulkWriteBefore(i, testContext);
            };
            const forkBulkWriteBefore = forkInstance.bulkWrite.bind(forkInstance);
            forkInstance.bulkWrite = (i) => {
                writesOnFork++;
                return forkBulkWriteBefore(i, testContext);
            };


            const replicationState = replicateRxStorageInstance({
                identifier: randomToken(10),
                replicationHandler: rxStorageInstanceToReplicationHandler(masterInstance, HIGHER_AGE_CONFLICT_HANDLER, randomToken(10)),
                forkInstance,
                metaInstance,
                pullBatchSize: Math.ceil(writeAmount / 4),
                pushBatchSize: Math.ceil(writeAmount / 4),
                conflictHandler: HIGHER_AGE_CONFLICT_HANDLER,
                /**
                 * To give the fork some time to do additional writes
                 * before the persistence is running,
                 * we await 50 milliseconds.
                 */
                waitBeforePersist: () => promiseWait(70),
                hashFunction: defaultHashSha256
            });

            // insert
            const document = getDocData();
            document.passportId = 'foobar-x';
            const docId = document.passportId;
            const docData = Object.assign({}, clone(document), {
                age: 0
            });
            docData._rev = createRevision(randomToken(10), docData);
            docData._meta.lwt = now();
            const insertResult = await forkInstance.bulkWrite([{
                document: docData
            }], testContext);
            assert.deepStrictEqual(insertResult.error, []);


            let updateId = 10;
            async function updateDocOnce() {
                let done = false;
                while (!done) {
                    if (randomBoolean()) {
                        await wait(0);
                    }
                    const current = await forkInstance.findDocumentsById([docId], true);
                    const currentDocState = current[0];
                    const newDocState = clone(currentDocState);
                    newDocState._meta.lwt = now();
                    newDocState.lastName = randomToken(12);
                    newDocState.age = updateId++;
                    newDocState._rev = createRevision(randomToken(10), currentDocState);

                    const writeRow = {
                        previous: currentDocState,
                        document: newDocState
                    };
                    const writeResult = await forkInstance.bulkWrite([writeRow], testContext);
                    if (writeResult.error.length === 0) {
                        done = true;
                    }
                }
            }


            let writesDone = 0;
            while (writeAmount > writesDone) {
                writesDone++;
                await updateDocOnce();
            }

            /**
             * Check write amounts.
             * Comparing the write amount in fast mode
             * makes no sense because we do too less writes
             * to make a difference.
             */
            if (!isFastMode()) {
                assert.ok(
                    /**
                     * Here we do a '<=' instead of just a '<'
                     * because on firefox this randomly fails
                     * because firefox IndexedDB is so slow.
                     */
                    writesOnMaster <= writeAmount,
                    'Writes on master(' + writesOnMaster + ') not smaller then writeAmount (' + writeAmount + ')'
                );
                assert.ok(
                    writesOnMaster < writesOnFork,
                    'Writes on master(' + writesOnMaster + ') not smaller then writes on fork (' + writesOnFork + ')'
                );
            }

            cleanUp(replicationState, masterInstance);
        });
    });
    describe('attachment replication', () => {
        if (!config.storage.hasAttachments) {
            return;
        }
        it('push-only: should replicate the attachments to master', async () => {
            const masterInstance = await createRxStorageInstance(0, undefined, undefined, true);
            const forkInstance = await createRxStorageInstance(1, undefined, undefined, true);
            const metaInstance = await createMetaInstance(forkInstance.schema);


            const replicationState = replicateRxStorageInstance({
                identifier: randomToken(10),
                replicationHandler: rxStorageInstanceToReplicationHandler(masterInstance, THROWING_CONFLICT_HANDLER, randomToken(10)),
                forkInstance,
                metaInstance,
                pullBatchSize: 100,
                pushBatchSize: 100,
                conflictHandler: THROWING_CONFLICT_HANDLER,
                hashFunction: defaultHashSha256
            });
            await awaitRxStorageReplicationFirstInSync(replicationState);
            await ensureEqualState(masterInstance, forkInstance);

            cleanUp(replicationState, masterInstance);
        });
        it('pull-only: should replicate the attachments to fork', async () => {
            const masterInstance = await createRxStorageInstance(1, undefined, undefined, true);
            const forkInstance = await createRxStorageInstance(0, undefined, undefined, true);
            const metaInstance = await createMetaInstance(forkInstance.schema);

            const replicationState = replicateRxStorageInstance({
                identifier: randomToken(10),
                replicationHandler: rxStorageInstanceToReplicationHandler(masterInstance, THROWING_CONFLICT_HANDLER, randomToken(10)),
                forkInstance,
                metaInstance,
                pullBatchSize: 100,
                pushBatchSize: 100,
                conflictHandler: THROWING_CONFLICT_HANDLER,
                hashFunction: defaultHashSha256
            });
            await awaitRxStorageReplicationFirstInSync(replicationState);
            await ensureEqualState(masterInstance, forkInstance);

            cleanUp(replicationState, masterInstance);
        });
    });
    describe('stability', () => {
        let updateId = 0;
        async function updateDocOnce(
            instance: RxStorageInstance<HumanDocumentType, any, any>,
            docId: string,
            waitOneTick: boolean,
            setTo?: number
        ) {
            if (typeof setTo === 'undefined') {
                setTo = updateId++;
            }
            let done = false;
            if (waitOneTick) {
                // console.log('wait');
                await wait(0);
            }
            while (!done) {
                const current = await instance.findDocumentsById([docId], true);
                const currentDocState = current[0];
                const newDocState: typeof currentDocState = clone(currentDocState);
                newDocState._meta.lwt = now();
                newDocState.firstName = instance.collectionName;
                newDocState.lastName = randomToken(10);
                newDocState.age = setTo;
                newDocState._rev = createRevision(randomToken(10), currentDocState);

                const writeResult = await instance.bulkWrite([{
                    previous: currentDocState,
                    document: newDocState
                }], testContext);
                if (writeResult.error.length === 0) {
                    done = true;
                } else {
                    // console.log('-- one write conflict age:' + newDocState.age + ' (' + instance.collectionName + ')');
                    // console.dir(writeResult.error);
                }
            }
        }

        it('BUG: writes to both sides can make it not end up with the correct state', async () => {
            updateId = 0;

            const masterInstance = await createRxStorageInstance(0, undefined, 'masterInstance');
            const forkInstance = await createRxStorageInstance(0, undefined, 'forkInstance');
            const metaInstance = await createMetaInstance(forkInstance.schema);
            await ensureEqualState(masterInstance, forkInstance);

            const instances = [
                masterInstance,
                forkInstance,
            ];


            // insert
            const document = getDocData({ passportId: 'foobar' });
            const docId = document.passportId;
            for (const instance of instances) {
                // insert
                const docData = Object.assign({}, clone(document), {
                    firstName: 'insert-' + instance.collectionName,
                    age: updateId++
                });
                docData._rev = createRevision(randomToken(10), docData);
                docData._meta.lwt = now();
                const insertResult = await instance.bulkWrite([{
                    document: docData
                }], testContext);
                assert.deepStrictEqual(insertResult.error, []);
            }

            // start replication
            const conflictHandler = HIGHER_AGE_CONFLICT_HANDLER;
            const replicationState = replicateRxStorageInstance({
                identifier: randomToken(10),
                replicationHandler: rxStorageInstanceToReplicationHandler(masterInstance, conflictHandler, randomToken(10)),
                forkInstance,
                metaInstance,
                pullBatchSize: 8,
                pushBatchSize: 8,
                conflictHandler,
                hashFunction: defaultHashSha256,
            });
            // TODO why does this throw an an error with the foundationdb RxStorage?
            // ensureReplicationHasNoErrors(replicationState);
            await awaitRxStorageReplicationIdle(replicationState);

            // master must contain a resolved conflict
            const docsMaster = await runQuery(masterInstance);
            assert.ok(docsMaster[0].lastName.includes('resolved-conflict'));
            await ensureEqualState(masterInstance, forkInstance);



            await Promise.all([
                updateDocOnce(masterInstance, docId, false, 10),
            ]);

            await awaitRxStorageReplicationIdle(replicationState);

            await ensureEqualState(masterInstance, forkInstance);
            assert.strictEqual(
                replicationState.stats.down.downstreamResyncOnce,
                1
            );

            cleanUp(replicationState, masterInstance);
        });
        runXTimes(isFastMode() ? 2 : 5, n => {
            if (config.storage.name === 'sqlite-trial') {
                return;
            }
            it('do many writes while replication is running (' + n + ')', async () => {
                updateId = 0;
                const writeAmount = isFastMode() ? 2 : 10;
                const masterInstance = await createRxStorageInstance(0, undefined, 'masterInstance');
                const forkInstance = await createRxStorageInstance(0, undefined, 'forkInstance');
                const metaInstance = await createMetaInstance(forkInstance.schema);

                const instances = [masterInstance, forkInstance];
                const conflictHandler = HIGHER_AGE_CONFLICT_HANDLER;
                const replicationState = replicateRxStorageInstance({
                    identifier: randomToken(10),
                    replicationHandler: rxStorageInstanceToReplicationHandler(masterInstance, conflictHandler, randomToken(10)),
                    forkInstance,
                    metaInstance,
                    pullBatchSize: Math.ceil(writeAmount / 4),
                    pushBatchSize: Math.ceil(writeAmount / 4),
                    conflictHandler,
                    hashFunction: defaultHashSha256,
                });
                // TODO why does this throw an an error with the foundationdb RxStorage?
                // ensureReplicationHasNoErrors(replicationState);

                // insert
                const document = getDocData();
                document.passportId = 'foobar';
                const docId = document.passportId;
                await promiseSeries(
                    instances
                        .map((instance) => async () => {
                            // insert
                            const docData = Object.assign({}, clone(document), {
                                firstName: instance.collectionName,
                                age: updateId++
                            });
                            docData._rev = createRevision(randomToken(10), docData);
                            docData._meta.lwt = now();
                            const insertResult = await instance.bulkWrite([{
                                document: docData
                            }], testContext);
                            assert.deepStrictEqual(insertResult.error, []);
                        })
                );
                await awaitRxStorageReplicationIdle(replicationState);
                await ensureEqualState(masterInstance, forkInstance);


                const promises: Promise<any>[] = [];
                new Array(writeAmount)
                    .fill(0)
                    .forEach(() => {
                        instances.forEach((instance) => {
                            promises.push(
                                updateDocOnce(instance, docId, randomBoolean())
                            );
                        });
                    });
                await Promise.all(promises);

                await awaitRxStorageReplicationIdle(replicationState);

                await ensureEqualState(masterInstance, forkInstance);
                assert.strictEqual(
                    replicationState.stats.down.downstreamResyncOnce,
                    1
                );

                cleanUp(replicationState, masterInstance);
            });
        });
    });
    describe('issues', () => {
        it('should be able to replicate local documents', async () => {
            const masterInstance = await config.storage.getStorage().createStorageInstance<RxLocalDocumentData>({
                databaseInstanceToken: randomToken(10),
                databaseName: randomToken(10),
                collectionName: randomToken(10),
                schema: RX_LOCAL_DOCUMENT_SCHEMA,
                options: {},
                multiInstance: true,
                devMode: true
            });
            const forkInstance = await config.storage.getStorage().createStorageInstance<RxLocalDocumentData>({
                databaseInstanceToken: randomToken(10),
                databaseName: randomToken(10),
                collectionName: randomToken(10),
                schema: RX_LOCAL_DOCUMENT_SCHEMA,
                options: {},
                multiInstance: true,
                devMode: true
            });
            const metaInstance = await createMetaInstance(forkInstance.schema);

            // add master doc
            // check ongoing doc
            await forkInstance.bulkWrite([{
                document: {
                    id: 'master',
                    data: {
                        foo: 'bar'
                    },
                    _deleted: false,
                    _attachments: {},
                    _meta: {
                        lwt: now()
                    },
                    _rev: EXAMPLE_REVISION_1
                }
            }], testContext);


            const replicationState = replicateRxStorageInstance<RxLocalDocumentData>({
                identifier: randomToken(10),
                replicationHandler: rxStorageInstanceToReplicationHandler(masterInstance, THROWING_CONFLICT_HANDLER as any, randomToken(10)),
                forkInstance,
                metaInstance,
                pullBatchSize: 100,
                pushBatchSize: 100,
                conflictHandler: THROWING_CONFLICT_HANDLER as any,
                hashFunction: defaultHashSha256
            });
            await awaitRxStorageReplicationFirstInSync(replicationState);

            const docsOnMaster = await runQuery(masterInstance);
            assert.strictEqual(docsOnMaster.length, 1);

            // check ongoing doc
            await forkInstance.bulkWrite([{
                document: {
                    id: 'fork',
                    data: {
                        foo: 'bar'
                    },
                    _deleted: false,
                    _attachments: {},
                    _meta: {
                        lwt: now()
                    },
                    _rev: EXAMPLE_REVISION_1
                }
            }], testContext);

            await waitUntil(async () => {
                const docsOnMaster2 = await runQuery(masterInstance);
                return docsOnMaster2.length === 2;
            });

            await cleanUp(replicationState, masterInstance);
        });
        it('should not stuck when replicating many document in the initial replication', async () => {
            if (config.storage.name === 'sqlite-trial') {
                return;
            }
            const writeAmount = isFastMode() ? 40 : 200;

            const masterInstance = await createRxStorageInstance(0);
            const forkInstance = await createRxStorageInstance(0);
            const metaInstance = await createMetaInstance(forkInstance.schema);

            await masterInstance.bulkWrite(
                new Array(writeAmount)
                    .fill(0)
                    .map(() => ({ document: getDocData() })),
                testContext
            );

            const replicationState = replicateRxStorageInstance({
                identifier: randomToken(10),
                replicationHandler: rxStorageInstanceToReplicationHandler(masterInstance, THROWING_CONFLICT_HANDLER, randomToken(10)),
                forkInstance,
                metaInstance,
                /**
                 * Must be smaller then the amount of document
                 */
                pullBatchSize: 100,
                pushBatchSize: 100,
                conflictHandler: THROWING_CONFLICT_HANDLER,
                hashFunction: defaultHashSha256
            });
            ensureReplicationHasNoErrors(replicationState);

            await awaitRxStorageReplicationFirstInSync(replicationState);
            await cleanUp(replicationState, masterInstance);
        });
    });
});
