import assert from 'assert';
import AsyncTestUtil, { wait, waitUntil, randomString, clone } from 'async-test-util';

import * as humansCollection from '../helper/humans-collection';
import { wrappedValidateAjvStorage } from '../../plugins/validate-ajv';
import * as schemas from '../helper/schemas';
import * as schemaObjects from '../helper/schema-objects';
import {
    createRxDatabase,
    randomCouchString,
    addRxPlugin,
    RxJsonSchema,
    ensureNotFalsy,
    RxCollection,
    CRDTDocumentField
} from '../../';



import {
    getCRDTSchemaPart,
    RxDDcrdtPlugin
} from '../../plugins/crdt';
addRxPlugin(RxDDcrdtPlugin);
import config from './config';

config.parallel('crdt.test.js', () => {
    type WithCRDTs<RxDocType> = RxDocType & {
        crdts?: CRDTDocumentField<RxDocType>
    };
    function enableCRDTinSchema<RxDocType>(schema: RxJsonSchema<RxDocType>): RxJsonSchema<WithCRDTs<RxDocType>> {
        const ret: RxJsonSchema<WithCRDTs<RxDocType>> = clone(schema);
        ret.crdt = {
            field: 'crdts',
            maxOperations: 100,
            maxTTL: 1000 * 60 * 60
        };
        ret.properties.crdts = getCRDTSchemaPart();
        return ret;
    }


    async function getCRDTCollection<RxDocType = schemas.HumanDocumentType>(
        schema: RxJsonSchema<RxDocType> = schemas.human as any
    ): Promise<RxCollection<WithCRDTs<RxDocType>>> {
        const useSchema = enableCRDTinSchema(schema);
        const db = await createRxDatabase({
            name: randomCouchString(10),
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


    describe('.insert()', () => {
        it('should insert a document and initialize the crdt state', async () => {
            const collection = await getCRDTCollection();
            const writeData = schemaObjects.human();
            const doc = await collection.insert(writeData);
            assert.ok(doc);
            const docData = doc.toJSON(true);
            assert.ok(docData.crdts);
            const firstOp = docData.crdts.operations[0][0];
            assert.ok(firstOp);
            assert.strictEqual(firstOp.body[0].ifMatch?.$set?.passportId, writeData.passportId);

            collection.database.destroy();
        });
        it('should insert document via bulkInsert', async () => {
            const collection = await getCRDTCollection();
            console.log(JSON.stringify(collection.schema.jsonSchema, null, 4));
            const writeData = schemaObjects.human();
            await collection.bulkInsert([writeData]);
            const doc = await collection.findOne().exec(true);
            assert.ok(doc);
            const docData = doc.toJSON(true);
            assert.ok(docData.crdts);
            const firstOp = docData.crdts.operations[0][0];
            assert.ok(firstOp);
            assert.strictEqual(firstOp.body[0].ifMatch?.$set?.passportId, writeData.passportId);

            collection.database.destroy();
        });
    });
    describe('.remove()', () => {
        it('should delete the document via .remove', async () => {
            const collection = await getCRDTCollection();
            const doc = await collection.insert(schemaObjects.human('foobar', 1));
            await doc.remove();

            const docsAfter = await collection.find().exec();
            assert.deepStrictEqual(docsAfter.map(d => d.toJSON(true)), []);

            console.log(doc.toJSON(true));
            const secondOp = ensureNotFalsy(doc.toJSON()).crdts?.operations[1][0];
            console.dir(secondOp);
            assert.ok(secondOp);
            assert.strictEqual(secondOp.body[0].ifMatch?.$set?._deleted, true);

            collection.database.destroy();
        });
    });

    describe('.atomicPatch()', () => {
        it('should update the document', async () => {
            const collection = await getCRDTCollection();
            const doc = await collection.insert(schemaObjects.human('foobar', 1));
            await doc.atomicPatch({
                age: 10
            });
            assert.strictEqual(
                doc.age,
                10
            );

            const secondOp = ensureNotFalsy(doc.toJSON()).crdts?.operations[1][0];
            assert.ok(secondOp);
            assert.strictEqual(secondOp.body[0].ifMatch?.$set?.age, 10);

            collection.database.destroy();
        });
    });

    /**
     * For some method it is no longer allowed to
     * call them because it might break the document state
     * when the operations are not CRDTs.
     */
    describe('dissallowed methods', () => {
        it('should throw the correct errors', async () => {
            const collection = await getCRDTCollection();
            const doc = await collection.insert(schemaObjects.human('foobar', 1));

            await AsyncTestUtil.assertThrows(
                () => doc.atomicUpdate(d => d),
                'RxError',
                'CRDT2'
            );

            collection.database.destroy();
        });
    });

    describe('.updateCRDT()', () => {
        it('should update the document via CRDT', async () => {
            const collection = await getCRDTCollection();
            const doc = await collection.insert(schemaObjects.human('foobar', 1));
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

            collection.database.destroy();
        });
        it('should delete the document via CRDT', async () => {
            const collection = await getCRDTCollection();
            const doc = await collection.insert(schemaObjects.human('foobar', 1));
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

            collection.database.destroy();
        });
    });
});
