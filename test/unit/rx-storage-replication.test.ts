import assert from 'assert';

import config from './config';
import * as schemaObjects from '../helper/schema-objects';
import {
    addRxPlugin,
    randomCouchString,
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
    RxConflictHandlerInput,
    getFromObjectOrThrow,
    awaitRxStorageReplicationIdle,
    promiseWait,
    RX_REPLICATION_META_INSTANCE_SCHEMA,
    RxStorageReplicationMeta,
    rxStorageInstanceToReplicationHandler,
    cancelRxStorageReplication,
    awaitRxStorageReplicationInSync
} from '../../';


import {
    RxLocalDocumentData,
    RX_LOCAL_DOCUMENT_SCHEMA
} from '../../plugins/local-documents';
import {
    RxDBKeyCompressionPlugin
} from '../../plugins/key-compression';
addRxPlugin(RxDBKeyCompressionPlugin);
import { RxDBValidatePlugin } from '../../plugins/validate';
addRxPlugin(RxDBValidatePlugin);
import * as schemas from '../helper/schemas';
import deepEqual from 'fast-deep-equal';

import {
    clone,
    wait,
    waitUntil,
    randomBoolean
} from 'async-test-util';
import { HumanDocumentType } from '../helper/schemas';
import { EXAMPLE_REVISION_1, EXAMPLE_REVISION_2 } from '../helper/revisions';

const testContext = 'rx-storage-replication.test.ts';

const useParallel = config.storage.name === 'dexie-worker' ? describe : config.parallel;
useParallel('rx-storage-replication.test.ts (implementation: ' + config.storage.name + ')', () => {
    const THROWING_CONFLICT_HANDLER: RxConflictHandler<HumanDocumentType> = (input, context) => {

        if (deepEqual(input.newDocumentState, input.realMasterState)) {
            return Promise.resolve({
                isEqual: true
            });
        }

        console.log(JSON.stringify(input, null, 4));
        throw new Error('THROWING_CONFLICT_HANDLER: This handler should never be called. (context: ' + context + ')');
    }
    const HIGHER_AGE_CONFLICT_HANDLER: RxConflictHandler<HumanDocumentType> = (
        input: RxConflictHandlerInput<HumanDocumentType>,
        context: string
    ) => {

        if (deepEqual(input.newDocumentState, input.realMasterState)) {
            return Promise.resolve({
                isEqual: true
            });
        }

        const docA = input.newDocumentState;
        const docB = input.realMasterState;

        // if (!i.assumedMasterDocumentState) {
        //     return Promise.resolve({
        //         resolvedDocumentState: i.newDocumentState
        //     });
        // }

        const ageA = docA.age ? docA.age : 0;
        const ageB = docB.age ? docB.age : 0;
        if (ageA > ageB) {
            return Promise.resolve({
                isEqual: false,
                documentData: clone(docA)
            });
        } else if (ageB > ageA) {
            const documentData: typeof docB = clone(docB);
            // flag the conflict solution  document state the for easier debugging
            documentData.lastName = 'resolved-conflict-' + randomCouchString(5);
            return Promise.resolve({
                isEqual: false,
                documentData
            });
        } else {
            console.error('EQUAL AGE (' + ageA + ') !!! ' + context);
            console.log(JSON.stringify(input, null, 4));
            throw new Error('equal age ' + ageA + ' ctxt: ' + context);
        }
    }
    function getDocData(partial: Partial<HumanDocumentType> = {}): RxDocumentData<HumanDocumentType> {
        const docData = Object.assign(
            schemaObjects.human(),
            partial
        );
        const withMeta = Object.assign(
            {
                _deleted: false,
                _attachments: {},
                _meta: {
                    lwt: now()
                },
                _rev: ''
            },
            docData
        );
        withMeta._rev = createRevision(withMeta)
        return withMeta;
    }
    async function createRxStorageInstance(
        documentAmount: number = 0,
        databaseName: string = randomCouchString(12),
        collectionName: string = randomCouchString(12)
    ): Promise<RxStorageInstance<HumanDocumentType, any, any>> {

        const storageInstance = await config.storage.getStorage().createStorageInstance<HumanDocumentType>({
            databaseInstanceToken: randomCouchString(10),
            databaseName,
            collectionName,
            schema: fillWithDefaultSettings(schemas.human),
            options: {},
            multiInstance: true
        });

        if (documentAmount > 0) {
            await storageInstance.bulkWrite(
                new Array(documentAmount)
                    .fill(0)
                    .map(() => ({ document: getDocData() })),
                testContext
            )
        }

        return storageInstance;
    }
    async function createMetaInstance(): Promise<RxStorageInstance<RxStorageReplicationMeta, any, any>> {
        const instance = await config.storage.getStorage().createStorageInstance<RxStorageReplicationMeta>({
            databaseInstanceToken: randomCouchString(10),
            databaseName: randomCouchString(12),
            collectionName: randomCouchString(12),
            schema: RX_REPLICATION_META_INSTANCE_SCHEMA,
            options: {},
            multiInstance: true
        });
        return instance;
    }
    async function runQuery<RxDocType>(
        storageInstance: RxStorageInstance<RxDocType, any, any>,
        mangoQuery: MangoQuery<RxDocType> = {}
    ): Promise<RxDocumentData<RxDocType>[]> {
        const preparedQuery = storageInstance.storage.statics.prepareQuery(
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

        await Promise.all([
            masterInstance.close(),
            replicationState.input.forkInstance.close(),
            replicationState.input.metaInstance.close()
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
            }
            try {
                assert.deepStrictEqual(
                    cleanDocToCompare(docA),
                    cleanDocToCompare(docB)
                );
            } catch (err) {
                console.log('## ERROR: State not equal');
                console.log(JSON.stringify(docA, null, 4));
                console.log(JSON.stringify(docB, null, 4));
                throw new Error('STATE not equal');
            }
        });
    }

    describe('helpers', () => {

    });
    describe('down', () => {
        it('it should write the initial data and also the ongoing insert', async () => {
            const masterInstance = await createRxStorageInstance(1);
            const forkInstance = await createRxStorageInstance(0);
            const metaInstance = await createMetaInstance();

            const replicationState = replicateRxStorageInstance({
                identifier: randomCouchString(10),
                replicationHandler: rxStorageInstanceToReplicationHandler(masterInstance, THROWING_CONFLICT_HANDLER),
                forkInstance,
                metaInstance,
                bulkSize: 100,
                conflictHandler: THROWING_CONFLICT_HANDLER
            });
            await awaitRxStorageReplicationFirstInSync(replicationState);

            // check inital doc
            const docsOnFork = await runQuery(forkInstance);
            assert.strictEqual(docsOnFork.length, 1);

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
            const metaInstance = await createMetaInstance();


            const replicationState = replicateRxStorageInstance({
                identifier: randomCouchString(10),
                replicationHandler: rxStorageInstanceToReplicationHandler(masterInstance, THROWING_CONFLICT_HANDLER),
                forkInstance,
                metaInstance,
                bulkSize: 100,
                conflictHandler: THROWING_CONFLICT_HANDLER
            });
            await awaitRxStorageReplicationFirstInSync(replicationState);

            // check inital doc
            const docsOnMaster = await runQuery(masterInstance);
            assert.strictEqual(docsOnMaster.length, 1);



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
        it('should replicate the insert and the update', async () => {
            const masterInstance = await createRxStorageInstance(0);
            const forkInstance = await createRxStorageInstance(1);
            const metaInstance = await createMetaInstance();

            const replicationState = replicateRxStorageInstance({
                identifier: randomCouchString(10),
                replicationHandler: rxStorageInstanceToReplicationHandler(masterInstance, HIGHER_AGE_CONFLICT_HANDLER),
                forkInstance,
                metaInstance,
                bulkSize: 100,
                conflictHandler: HIGHER_AGE_CONFLICT_HANDLER
            });

            const passportId = 'foobar';
            const docData = getDocData({
                passportId,
                age: 1
            });

            const writeResult = await forkInstance.bulkWrite([{
                document: docData
            }], testContext);
            assert.deepStrictEqual(writeResult.error, {});
            const previous = getFromObjectOrThrow(writeResult.success, passportId);

            // wait until it is replicated to the master
            await waitUntil(async () => {
                const docsAfterUpdate = await masterInstance.findDocumentsById([passportId], false);
                return docsAfterUpdate[passportId];
            });

            const updateData: typeof docData = clone(docData);
            updateData.firstName = 'xxx';
            updateData.age = 2;
            updateData._rev = EXAMPLE_REVISION_2;
            updateData._meta.lwt = now();

            const updateResult = await forkInstance.bulkWrite([{
                previous,
                document: updateData
            }], testContext);
            assert.deepStrictEqual(updateResult.error, {});

            // wait until the change is replicated to the master
            await waitUntil(async () => {
                const docsAfterUpdate = await masterInstance.findDocumentsById([passportId], false);
                return docsAfterUpdate[passportId].firstName === 'xxx';
            });
            await ensureEqualState(masterInstance, forkInstance);


            await cleanUp(replicationState, masterInstance);
        });
    });
    describe('different configurations', () => {
        it('should be able to replicate A->Master<-B', async () => {
            const masterInstance = await createRxStorageInstance(0);
            const forkInstanceA = await createRxStorageInstance(0);
            const metaInstanceA = await createMetaInstance();
            const forkInstanceB = await createRxStorageInstance(0);
            const metaInstanceB = await createMetaInstance();

            const replicationStateAtoMaster = replicateRxStorageInstance({
                identifier: randomCouchString(10),
                replicationHandler: rxStorageInstanceToReplicationHandler(masterInstance, THROWING_CONFLICT_HANDLER),
                forkInstance: forkInstanceA,
                metaInstance: metaInstanceA,
                bulkSize: 100,
                conflictHandler: THROWING_CONFLICT_HANDLER
            });

            const replicationStateBtoMaster = replicateRxStorageInstance({
                identifier: randomCouchString(10),
                replicationHandler: rxStorageInstanceToReplicationHandler(masterInstance, THROWING_CONFLICT_HANDLER),
                forkInstance: forkInstanceB,
                metaInstance: metaInstanceB,
                bulkSize: 100,
                conflictHandler: THROWING_CONFLICT_HANDLER
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
                    const foundDoc = getFromObjectOrThrow(foundAgain, writeData.passportId);
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
            const metaInstanceA = await createMetaInstance();
            const forkInstanceB = await createRxStorageInstance(0);
            const metaInstanceB = await createMetaInstance();
            const forkInstanceC = await createRxStorageInstance(0);
            const metaInstanceC = await createMetaInstance();

            const replicationStateAtoB = replicateRxStorageInstance({
                identifier: randomCouchString(10),
                replicationHandler: rxStorageInstanceToReplicationHandler(forkInstanceB, THROWING_CONFLICT_HANDLER),
                forkInstance: forkInstanceA,
                metaInstance: metaInstanceA,
                bulkSize: 100,
                conflictHandler: THROWING_CONFLICT_HANDLER
            });
            const replicationStateBtoC = replicateRxStorageInstance({
                identifier: randomCouchString(10),
                replicationHandler: rxStorageInstanceToReplicationHandler(forkInstanceC, THROWING_CONFLICT_HANDLER),
                forkInstance: forkInstanceB,
                metaInstance: metaInstanceB,
                bulkSize: 100,
                conflictHandler: THROWING_CONFLICT_HANDLER
            });
            const replicationStateCtoMaster = replicateRxStorageInstance({
                identifier: randomCouchString(10),
                replicationHandler: rxStorageInstanceToReplicationHandler(masterInstance, THROWING_CONFLICT_HANDLER),
                forkInstance: forkInstanceC,
                metaInstance: metaInstanceC,
                bulkSize: 100,
                conflictHandler: THROWING_CONFLICT_HANDLER
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
                        const foundDoc = getFromObjectOrThrow(foundAgain, writeData.passportId);
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
                        const foundDoc = getFromObjectOrThrow(foundAgain, writeDataMaster.passportId);
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


            const databaseName = randomCouchString(12);
            const collectionName = randomCouchString(12);

            const masterInstanceA = await createRxStorageInstance(0, databaseName, collectionName);
            const masterInstanceB = await createRxStorageInstance(0, databaseName, collectionName);

            const forkInstanceA = await createRxStorageInstance(0);
            const metaInstanceA = await createMetaInstance();
            const forkInstanceB = await createRxStorageInstance(0);
            const metaInstanceB = await createMetaInstance();


            const replicationStateAtoMaster = replicateRxStorageInstance({
                identifier: randomCouchString(10),
                replicationHandler: rxStorageInstanceToReplicationHandler(masterInstanceA, THROWING_CONFLICT_HANDLER),
                forkInstance: forkInstanceA,
                metaInstance: metaInstanceA,
                bulkSize: 100,
                conflictHandler: THROWING_CONFLICT_HANDLER
            });
            const replicationStateBtoMaster = replicateRxStorageInstance({
                identifier: randomCouchString(10),
                replicationHandler: rxStorageInstanceToReplicationHandler(masterInstanceB, THROWING_CONFLICT_HANDLER),
                forkInstance: forkInstanceB,
                metaInstance: metaInstanceB,
                bulkSize: 100,
                conflictHandler: THROWING_CONFLICT_HANDLER
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
                    const foundDoc = getFromObjectOrThrow(foundAgain, writeData.passportId);
                    assert.strictEqual(foundDoc.passportId, writeData.passportId);
                    return true;
                } catch (err) {
                    return false;
                }
            }, 10 * 1000, 100);

            await cleanUp(replicationStateAtoMaster, masterInstanceA);
            await cleanUp(replicationStateBtoMaster, masterInstanceB);
        });
    });
    describe('conflict handling', () => {
        it('both have inserted the exact same document -> no conflict handler must be called', async () => {
            const masterInstance = await createRxStorageInstance(0);
            const forkInstance = await createRxStorageInstance(0);
            const metaInstance = await createMetaInstance();
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
                identifier: randomCouchString(10),
                replicationHandler: rxStorageInstanceToReplicationHandler(masterInstance, THROWING_CONFLICT_HANDLER),
                forkInstance,
                metaInstance,
                bulkSize: 100,
                conflictHandler: THROWING_CONFLICT_HANDLER
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
            const metaInstance = await createMetaInstance();
            const instances = [masterInstance, forkInstance];

            const document = getDocData();



            await Promise.all(
                instances
                    .map(async (instance, idx) => {
                        const docData = Object.assign({}, clone(document), {
                            firstName: idx === 0 ? 'master' : 'fork',
                            age: idx
                        });
                        docData._rev = createRevision(docData);
                        docData._meta.lwt = now();
                        await instance.bulkWrite([{
                            document: docData
                        }], testContext)
                    })
            );

            const replicationState = replicateRxStorageInstance({
                identifier: randomCouchString(10),
                replicationHandler: rxStorageInstanceToReplicationHandler(
                    masterInstance,
                    HIGHER_AGE_CONFLICT_HANDLER
                ),
                forkInstance,
                metaInstance,
                bulkSize: 100,
                conflictHandler: HIGHER_AGE_CONFLICT_HANDLER
            });

            await awaitRxStorageReplicationFirstInSync(replicationState);
            await ensureEqualState(masterInstance, forkInstance);

            // revision must be 2 because it had to resolve a conflict.
            const masterDocs = await runQuery(masterInstance);

            assert.ok(masterDocs[0]._rev.startsWith('2-'));

            /**
             * Ensure it only contains the _meta fields that we really need.
             */
            const masterDoc = (await runQuery(masterInstance))[0];
            // should only have the 'lwt'
            assert.strictEqual(Object.keys(masterDoc._meta).length, 1);

            // const forkDoc = (await runQuery(forkInstance))[0];
            // should only have the 'lwt' AND the current state of the master.
            // assert.strictEqual(Object.keys(forkDoc._meta).length, 3); // TODO

            cleanUp(replicationState, masterInstance);
        });
        it('both have updated the document with different values', async () => {
            const masterInstance = await createRxStorageInstance(0);
            const forkInstance = await createRxStorageInstance(0);
            const metaInstance = await createMetaInstance();
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
                        docData._rev = createRevision(docData);
                        docData._meta.lwt = now();
                        await instance.bulkWrite([{
                            document: docData
                        }], testContext);

                        // update
                        const newDocData = clone(docData);
                        newDocData.age = newDocData.age + 1;
                        newDocData._rev = createRevision(newDocData, docData);
                        newDocData._meta.lwt = now();
                        const updateResult = await instance.bulkWrite([{
                            previous: docData,
                            document: newDocData
                        }], testContext);
                        assert.deepStrictEqual(updateResult.error, {});
                    })
            );


            const replicationState = replicateRxStorageInstance({
                identifier: randomCouchString(10),
                replicationHandler: rxStorageInstanceToReplicationHandler(masterInstance, HIGHER_AGE_CONFLICT_HANDLER),
                forkInstance,
                metaInstance,
                bulkSize: 100,
                conflictHandler: HIGHER_AGE_CONFLICT_HANDLER
            });

            await awaitRxStorageReplicationFirstInSync(replicationState);
            await ensureEqualState(masterInstance, forkInstance);

            cleanUp(replicationState, masterInstance);
        });
        it('doing many writes on the fork should not lead to many writes on the master', async () => {
            const writeAmount = config.isFastMode() ? 5 : 100;

            const masterInstance = await createRxStorageInstance(0);
            const forkInstance = await createRxStorageInstance(0);
            const metaInstance = await createMetaInstance();

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
                identifier: randomCouchString(10),
                replicationHandler: rxStorageInstanceToReplicationHandler(masterInstance, HIGHER_AGE_CONFLICT_HANDLER),
                forkInstance,
                metaInstance,
                bulkSize: Math.ceil(writeAmount / 4),
                conflictHandler: HIGHER_AGE_CONFLICT_HANDLER,
                /**
                 * To give the fork some time to do additional writes
                 * before the persistence is running,
                 * we await 50 milliseconds.
                 */
                waitBeforePersist: () => promiseWait(70)
            });

            // insert
            const document = getDocData();
            document.passportId = 'foobar-x';
            const docId = document.passportId;
            const docData = Object.assign({}, clone(document), {
                age: 0
            });
            docData._rev = createRevision(docData);
            docData._meta.lwt = now();
            const insertResult = await forkInstance.bulkWrite([{
                document: docData
            }], testContext);
            assert.deepStrictEqual(insertResult.error, {});


            let updateId = 10;
            async function updateDocOnce() {
                let done = false;
                while (!done) {
                    if (randomBoolean()) {
                        await wait(0);
                    }
                    const current = await forkInstance.findDocumentsById([docId], true);
                    const currentDocState = getFromObjectOrThrow(current, docId);
                    const newDocState = clone(currentDocState);
                    newDocState._meta.lwt = now();
                    newDocState.lastName = randomCouchString(12);
                    newDocState.age = updateId++;
                    newDocState._rev = createRevision(newDocState, currentDocState);

                    const writeRow = {
                        previous: currentDocState,
                        document: newDocState
                    };
                    const writeResult = await forkInstance.bulkWrite([writeRow], testContext);
                    if (Object.keys(writeResult.success).length > 0) {
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
            if (!config.isFastMode()) {
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
    describe('stability', () => {
        it('do many writes while replication is running', async () => {
            if (config.storage.name === 'lokijs') {
                // TODO this test fails in about 1/20 times in lokijs
                return;
            }

            const writeAmount = config.isFastMode() ? 5 : 30;

            const masterInstance = await createRxStorageInstance(0);
            const forkInstance = await createRxStorageInstance(0);
            const metaInstance = await createMetaInstance();

            const instances = [masterInstance, forkInstance];
            const replicationState = replicateRxStorageInstance({
                identifier: randomCouchString(10),
                replicationHandler: rxStorageInstanceToReplicationHandler(masterInstance, HIGHER_AGE_CONFLICT_HANDLER),
                forkInstance,
                metaInstance,
                bulkSize: Math.ceil(writeAmount / 4),
                conflictHandler: HIGHER_AGE_CONFLICT_HANDLER
            });

            // insert
            const document = getDocData();
            document.passportId = 'foobar';
            const docId = document.passportId;
            await Promise.all(
                instances
                    .map(async (instance, idx) => {
                        // insert
                        const docData = Object.assign({}, clone(document), {
                            firstName: idx === 0 ? 'master' : 'fork',
                            age: idx
                        });
                        docData._rev = createRevision(docData);
                        docData._meta.lwt = now();
                        const insertResult = await instance.bulkWrite([{
                            document: docData
                        }], testContext);
                        assert.deepStrictEqual(insertResult.error, {});
                    })
            );
            await awaitRxStorageReplicationIdle(replicationState);
            await ensureEqualState(masterInstance, forkInstance);

            // do many updates
            let updateId = 10;
            async function updateDocOnce(
                instance: RxStorageInstance<HumanDocumentType, any, any>,
                flag: string
            ) {
                let done = false;
                while (!done) {
                    if (randomBoolean()) {
                        await wait(0);
                    }
                    const current = await instance.findDocumentsById([docId], true);
                    const currentDocState = getFromObjectOrThrow(current, docId);
                    const newDocState = clone(currentDocState);
                    newDocState._meta.lwt = now();
                    newDocState.lastName = randomCouchString(12);
                    newDocState.firstName = flag;
                    newDocState.age = updateId++;
                    newDocState._rev = createRevision(newDocState, currentDocState);

                    const writeResult = await instance.bulkWrite([{
                        previous: currentDocState,
                        document: newDocState
                    }], testContext);
                    if (Object.keys(writeResult.success).length > 0) {
                        done = true;
                    }
                }
            }

            const promises: Promise<any>[] = [];
            new Array(writeAmount)
                .fill(0)
                .forEach(() => {
                    instances.forEach((instance, idx) => {
                        promises.push(
                            updateDocOnce(
                                instance,
                                idx === 0 ? 'master' : 'fork'
                            )
                        );
                    })
                });
            await Promise.all(promises);




            await awaitRxStorageReplicationIdle(replicationState);

            await ensureEqualState(masterInstance, forkInstance);


            assert.strictEqual(
                replicationState.stats.down.downstreamResyncOnce,
                1
            );

            cleanUp(replicationState, masterInstance);

            // process.exit();
        });
    });
    describe('issues', () => {
        it('should be able to replicate local documents', async () => {
            const masterInstance = await config.storage.getStorage().createStorageInstance<RxLocalDocumentData>({
                databaseInstanceToken: randomCouchString(10),
                databaseName: randomCouchString(10),
                collectionName: randomCouchString(10),
                schema: RX_LOCAL_DOCUMENT_SCHEMA,
                options: {},
                multiInstance: true
            });
            const forkInstance = await config.storage.getStorage().createStorageInstance<RxLocalDocumentData>({
                databaseInstanceToken: randomCouchString(10),
                databaseName: randomCouchString(10),
                collectionName: randomCouchString(10),
                schema: RX_LOCAL_DOCUMENT_SCHEMA,
                options: {},
                multiInstance: true
            });
            const metaInstance = await createMetaInstance();

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
                identifier: randomCouchString(10),
                replicationHandler: rxStorageInstanceToReplicationHandler(masterInstance, THROWING_CONFLICT_HANDLER as any),
                forkInstance,
                metaInstance,
                bulkSize: 100,
                conflictHandler: THROWING_CONFLICT_HANDLER as any
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
            const writeAmount = config.isFastMode() ? 40 : 200;

            const masterInstance = await createRxStorageInstance(0);
            const forkInstance = await createRxStorageInstance(0);
            const metaInstance = await createMetaInstance();

            await masterInstance.bulkWrite(
                new Array(writeAmount)
                    .fill(0)
                    .map(() => ({ document: getDocData() })),
                testContext
            );

            const replicationState = replicateRxStorageInstance({
                identifier: randomCouchString(10),
                replicationHandler: rxStorageInstanceToReplicationHandler(masterInstance, THROWING_CONFLICT_HANDLER),
                forkInstance,
                metaInstance,
                /**
                 * Must be smaller then the amount of document
                 */
                bulkSize: 20,
                conflictHandler: THROWING_CONFLICT_HANDLER
            });

            await awaitRxStorageReplicationFirstInSync(replicationState);
            await cleanUp(replicationState, masterInstance);
        });
    });
});
