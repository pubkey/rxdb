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
            console.log(JSON.stringify(collection.schema.jsonSchema, null, 4));
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
            console.log(doc.toJSON());
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


            console.log('8888888888888888');
            console.dir(await collection.storageInstance.findDocumentsById(['foobar'], true));

            const docsAfter = await collection.find().exec();
            assert.deepStrictEqual(docsAfter.map(d => d.toJSON(true)), []);

            console.log(doc.toJSON(true));
            const secondOp = ensureNotFalsy(doc.toJSON()).crdts?.operations[1][0];
            console.dir(secondOp);
            assert.ok(secondOp);
            assert.strictEqual(secondOp.body[0].ifMatch?.$inc?.age, 1);

            process.exit();
            collection.database.destroy();
        });
    });
});
