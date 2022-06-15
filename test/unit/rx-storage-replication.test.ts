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
    promiseWait
} from '../../';

import {
    RxDBKeyCompressionPlugin
} from '../../plugins/key-compression';
addRxPlugin(RxDBKeyCompressionPlugin);
import { RxDBValidatePlugin } from '../../plugins/validate';
addRxPlugin(RxDBValidatePlugin);
import * as schemas from '../helper/schemas';

import {
    clone,
    wait,
    waitUntil,
    randomBoolean
} from 'async-test-util';
import { HumanDocumentType } from '../helper/schemas';

config.parallel('rx-storage-replication.test.js (implementation: ' + config.storage.name + ')', () => {
    const THROWING_CONFLICT_HANDLER: RxConflictHandler<HumanDocumentType> = () => {
        throw new Error('THROWING_CONFLICT_HANDLER: This handler should never be called.');
    }
    const HIGHER_AGE_CONFLICT_HANDLER: RxConflictHandler<HumanDocumentType> = async (i: RxConflictHandlerInput<HumanDocumentType>) => {
        const docA = i.newDocumentStateInMaster;
        const docB = i.currentForkDocumentState;

        // if (!i.assumedMasterDocumentState) {
        //     return Promise.resolve({
        //         resolvedDocumentState: i.newDocumentState
        //     });
        // }

        const ageA = docA.age ? docA.age : 0;
        const ageB = docB.age ? docB.age : 0;
        if (ageA > ageB) {
            return {
                resolvedDocumentState: docA
            };
        } else if (ageB > ageA) {
            return {
                resolvedDocumentState: docB
            };
        } else {
            console.error('EQUAL AGE (' + ageA + ') !!!');
            console.log(JSON.stringify(i, null, 4));
            throw new Error('equal age ' + ageA);
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
        documentAmount: number = 0
    ): Promise<RxStorageInstance<HumanDocumentType, any, any>> {

        const storageInstance = await config.storage.getStorage().createStorageInstance<HumanDocumentType>({
            databaseName: randomCouchString(12),
            collectionName: randomCouchString(12),
            schema: fillWithDefaultSettings(schemas.human),
            options: {},
            multiInstance: false
        });

        if (documentAmount > 0) {
            await storageInstance.bulkWrite(
                new Array(documentAmount)
                    .fill(0)
                    .map(() => ({ document: getDocData() }))
            )
        }

        return storageInstance;
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

    async function cleanUp(replicationState: RxStorageInstanceReplicationState<any>) {
        replicationState.canceled.next(true);
        await Promise.all([
            replicationState.input.masterInstance.close(),
            replicationState.input.forkInstance.close()
        ]);
        if (replicationState.input.checkPointInstance) {
            await replicationState.input.checkPointInstance.close();
        }
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
            const withoutMetaA = Object.assign({}, docA, {
                _meta: undefined
            });
            const withoutMetaB = Object.assign({}, docB, {
                _meta: undefined
            });
            try {
                assert.deepStrictEqual(withoutMetaA, withoutMetaB);
            } catch (err) {
                console.log('## ERROR: State not equal');
                console.log(JSON.stringify(docA, null, 4));
                console.log(JSON.stringify(docB, null, 4));
            }
        })
    }

    describe('helpers', () => {

    });
    describe('down', () => {
        it('it should write the initial data and also the ongoing insert', async () => {
            const masterInstance = await createRxStorageInstance(1);
            const forkInstance = await createRxStorageInstance(0);

            const replicationState = replicateRxStorageInstance({
                identifier: randomCouchString(10),
                masterInstance,
                forkInstance,
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
            }]);

            await waitUntil(async () => {
                const docsOnFork2 = await runQuery(forkInstance);
                return docsOnFork2.length === 2;
            });

            cleanUp(replicationState);
        });
    });
    describe('up', () => {
        it('it should write the initial data and also the ongoing insert', async () => {
            const masterInstance = await createRxStorageInstance(0);
            const forkInstance = await createRxStorageInstance(1);


            const replicationState = replicateRxStorageInstance({
                identifier: randomCouchString(10),
                masterInstance,
                forkInstance,
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
            }]);

            await waitUntil(async () => {
                const docsOnMaster2 = await runQuery(masterInstance);
                return docsOnMaster2.length === 2;
            });

            cleanUp(replicationState);
        });
    });
    describe('conflict handling', () => {
        it('both have inserted the exact same document -> no conflict handler must be called', async () => {
            const masterInstance = await createRxStorageInstance(0);
            const forkInstance = await createRxStorageInstance(0);
            const instances = [masterInstance, forkInstance];

            const document = getDocData();

            await Promise.all(
                instances
                    .map(instance => instance.bulkWrite([{ document }]))
            );

            const replicationState = replicateRxStorageInstance({
                identifier: randomCouchString(10),
                masterInstance,
                forkInstance,
                bulkSize: 100,
                conflictHandler: THROWING_CONFLICT_HANDLER
            });
            await awaitRxStorageReplicationFirstInSync(replicationState);

            await ensureEqualState(masterInstance, forkInstance);

            const masterDocs = await runQuery(masterInstance);
            assert.ok(masterDocs[0]._rev.startsWith('1-'));


            await cleanUp(replicationState);
        });
        it('both have inserted the same document with different properties', async () => {
            const masterInstance = await createRxStorageInstance(0);
            const forkInstance = await createRxStorageInstance(0);
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
                        }])
                    })
            );

            const replicationState = replicateRxStorageInstance({
                identifier: randomCouchString(10),
                masterInstance,
                forkInstance,
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
            // should only have the 'lwt' and the revision from the upstream.
            assert.strictEqual(Object.keys(masterDoc._meta).length, 2)

            const forkDoc = (await runQuery(forkInstance))[0];
            // should only have the 'lwt' AND the current state of the master.
            assert.strictEqual(Object.keys(forkDoc._meta).length, 3);

            cleanUp(replicationState);
        });
        it('both have updated the document with different values', async () => {
            const masterInstance = await createRxStorageInstance(0);
            const forkInstance = await createRxStorageInstance(0);
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
                        }]);

                        // update
                        const newDocData = clone(docData);
                        newDocData.age = newDocData.age + 1;
                        newDocData._rev = createRevision(newDocData, docData);
                        newDocData._meta.lwt = now();
                        const updateResult = await instance.bulkWrite([{
                            previous: docData,
                            document: newDocData
                        }]);
                        assert.deepStrictEqual(updateResult.error, {});
                    })
            );


            const replicationState = replicateRxStorageInstance({
                identifier: randomCouchString(10),
                masterInstance,
                forkInstance,
                bulkSize: 100,
                conflictHandler: HIGHER_AGE_CONFLICT_HANDLER
            });

            await awaitRxStorageReplicationFirstInSync(replicationState);
            await ensureEqualState(masterInstance, forkInstance);

            cleanUp(replicationState);
        });
        it('doing many writes on the fork should not lead to many writes on the master', async () => {
            const writeAmount = config.isFastMode() ? 5 : 100;

            const masterInstance = await createRxStorageInstance(0);
            const forkInstance = await createRxStorageInstance(0);

            /**
            * Wrap bulkWrite() to count the calls
            */
            let writesOnMaster = 0;
            let writesOnFork = 0;
            const masterBulkWriteBefore = masterInstance.bulkWrite.bind(masterInstance);
            masterInstance.bulkWrite = (i) => {
                writesOnMaster++;
                return masterBulkWriteBefore(i);
            };
            const forkBulkWriteBefore = forkInstance.bulkWrite.bind(forkInstance);
            forkInstance.bulkWrite = (i) => {
                writesOnFork++;
                return forkBulkWriteBefore(i);
            };


            const replicationState = replicateRxStorageInstance({
                identifier: randomCouchString(10),
                masterInstance,
                forkInstance,
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
            document.passportId = 'foobar';
            const docId = document.passportId;
            const docData = Object.assign({}, clone(document), {
                age: 0
            });
            docData._rev = createRevision(docData);
            docData._meta.lwt = now();
            const insertResult = await forkInstance.bulkWrite([{
                document: docData
            }]);
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

                    const writeResult = await forkInstance.bulkWrite([{
                        previous: currentDocState,
                        document: newDocState
                    }]);
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
                    writesOnMaster < writeAmount,
                    'Writes on master(' + writesOnMaster + ') not smaller then writeAmount (' + writeAmount + ')'
                );
                assert.ok(
                    writesOnMaster < writesOnFork,
                    'Writes on master(' + writesOnMaster + ') not smaller then writes on fork (' + writesOnFork + ')'
                );
            }

            cleanUp(replicationState);
        });
    });
    describe('stability', () => {
        it('do many writes while replication is running', async () => {
            const writeAmount = config.isFastMode() ? 5 : 30;

            const masterInstance = await createRxStorageInstance(0);
            const forkInstance = await createRxStorageInstance(0);

            const instances = [masterInstance, forkInstance];
            const replicationState = replicateRxStorageInstance({
                identifier: randomCouchString(10),
                masterInstance,
                forkInstance,
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
                        }]);
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
                    }]);
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

            cleanUp(replicationState);
        });
    });
});
