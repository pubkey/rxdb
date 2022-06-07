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
    RxConflictHandlerInput
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
    waitUntil
} from 'async-test-util';
import { HumanDocumentType } from '../helper/schemas';

config.parallel('rx-storage-replication.test.js (implementation: ' + config.storage.name + ')', () => {
    const THROWING_CONFLICT_HANDLER: RxConflictHandler<HumanDocumentType> = () => {
        throw new Error('THROWING_CONFLICT_HANDLER');
    }
    const HIGHER_AGE_CONFLICT_HANDLER: RxConflictHandler<HumanDocumentType> = (i: RxConflictHandlerInput<HumanDocumentType>) => {
        const docA = i.newDocumentState;
        const docB = i.parentDocumentState;
        const ageA = docA.age ? docA.age : 0;
        const ageB = docB.age ? docB.age : 0;
        if (ageA > ageB) {
            return Promise.resolve({
                resolvedDocumentState: docA
            });
        } else if (ageB > ageA) {
            return Promise.resolve({
                resolvedDocumentState: docB
            });
        } else {
            console.error('EQUAL AGE !!!');
            throw new Error('equal age');
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
            replicationState.input.parent.close(),
            replicationState.input.child.close()
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
            assert.deepStrictEqual(withoutMetaA, withoutMetaB);
        })
    }

    describe('helpers', () => {

    });
    describe('up', () => {
        it('it should write the initial data and also the ongoing insert', async () => {
            const parent = await createRxStorageInstance(1);
            const child = await createRxStorageInstance(0);

            const replicationState = replicateRxStorageInstance({
                identifier: randomCouchString(10),
                parent,
                child,
                bulkSize: 100,
                conflictHandler: THROWING_CONFLICT_HANDLER
            });
            await awaitRxStorageReplicationFirstInSync(replicationState);

            // check inital doc
            const docsOnChild = await runQuery(child);
            assert.strictEqual(docsOnChild.length, 1);

            // check ongoing doc
            await parent.bulkWrite([{
                document: getDocData()
            }]);

            await waitUntil(async () => {
                const docsOnChild2 = await runQuery(child);
                return docsOnChild2.length === 2;
            });

            cleanUp(replicationState);
        });
    });
    describe('down', () => {
        it('it should write the initial data and also the ongoing insert', async () => {
            const parent = await createRxStorageInstance(0);
            const child = await createRxStorageInstance(1);


            const replicationState = replicateRxStorageInstance({
                identifier: randomCouchString(10),
                parent,
                child,
                bulkSize: 100,
                conflictHandler: THROWING_CONFLICT_HANDLER
            });
            await awaitRxStorageReplicationFirstInSync(replicationState);

            // check inital doc
            const docsOnParent = await runQuery(parent);
            assert.strictEqual(docsOnParent.length, 1);

            // check ongoing doc
            await child.bulkWrite([{
                document: getDocData()
            }]);

            await waitUntil(async () => {
                const docsOnParent2 = await runQuery(parent);
                return docsOnParent2.length === 2;
            });

            cleanUp(replicationState);
        });
    });
    describe('conflict handling', () => {
        it('both have inserted the exact same document -> no conflict handler must be called', async () => {
            const parent = await createRxStorageInstance(0);
            const child = await createRxStorageInstance(0);
            const instances = [parent, child];

            const document = getDocData();

            await Promise.all(
                instances
                    .map(instance => instance.bulkWrite([{ document }]))
            );

            const replicationState = replicateRxStorageInstance({
                identifier: randomCouchString(10),
                parent,
                child,
                bulkSize: 100,
                conflictHandler: THROWING_CONFLICT_HANDLER
            });
            await awaitRxStorageReplicationFirstInSync(replicationState);

            await ensureEqualState(parent, child);

            const parentDocs = await runQuery(parent);
            assert.ok(parentDocs[0]._rev.startsWith('1-'));


            await cleanUp(replicationState);
        });
        it('both have inserted the same document with different properties', async () => {
            const parent = await createRxStorageInstance(0);
            const child = await createRxStorageInstance(0);
            const instances = [parent, child];

            const document = getDocData();

            await Promise.all(
                instances
                    .map(async (instance, idx) => {
                        const docData = Object.assign({}, document, {
                            firstName: idx === 0 ? 'parent' : 'child',
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
                parent,
                child,
                bulkSize: 100,
                conflictHandler: HIGHER_AGE_CONFLICT_HANDLER
            });
            await awaitRxStorageReplicationFirstInSync(replicationState);
            await ensureEqualState(parent, child);

            // revision must be 2 because it had to resolve a conflict.
            const parentDocs = await runQuery(parent);
            assert.ok(parentDocs[0]._rev.startsWith('2-'));



            /**
             * Ensure it only contains the _meta fields that we really need.
             */
            const parentDoc = (await runQuery(parent))[0];
            // should only have the 'lwt' and the revision from the upstream.
            assert.strictEqual(Object.keys(parentDoc._meta).length, 2)

            const childDoc = (await runQuery(child))[0];
            // should only have the 'lwt' and the revision from the upstream AND the current state of the parent.
            assert.strictEqual(Object.keys(childDoc._meta).length, 3)

            cleanUp(replicationState);
        });
        it('both have updated the document with different values', async () => {
            const parent = await createRxStorageInstance(0);
            const child = await createRxStorageInstance(0);
            const instances = [parent, child];

            const document = getDocData();

            await Promise.all(
                instances
                    .map(async (instance, idx) => {
                        // insert
                        const docData = Object.assign({}, document, {
                            firstName: idx === 0 ? 'parent' : 'child',
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
                        const updateResult = await instance.bulkWrite([{
                            previous: docData,
                            document: newDocData
                        }]);
                        assert.deepStrictEqual(updateResult.error, {});
                    })
            );


            const replicationState = replicateRxStorageInstance({
                identifier: randomCouchString(10),
                parent,
                child,
                bulkSize: 100,
                conflictHandler: HIGHER_AGE_CONFLICT_HANDLER
            });

            await awaitRxStorageReplicationFirstInSync(replicationState);
            await ensureEqualState(parent, child);

            cleanUp(replicationState);
        });
    });
});
