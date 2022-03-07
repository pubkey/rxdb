/**
 * this test is for the keycompression-capabilities of rxdb
 */
import assert from 'assert';
import config from './config';

import * as schemaObjects from './../helper/schema-objects';
import * as humansCollection from './../helper/humans-collection';

import {
    createRxDatabase,
    randomCouchString,
    isRxDocument,
    RxJsonSchema,
} from '../../';

import {
    pouchDocumentDataToRxDocumentData
} from '../../plugins/pouchdb';
import { SimpleHumanDocumentType } from './../helper/schema-objects';


config.parallel('key-compression.test.js', () => {
    describe('RxQuery().keyCompress()', () => {
        it('transform basic search keys', async () => {
            const c = await humansCollection.create(0);
            const query: any = c.find()
                .where('firstName').eq('myFirstName')
                .getPreparedQuery();
            const jsonString = JSON.stringify(query);
            assert.ok(!jsonString.includes('firstName'));
            assert.ok(jsonString.includes('myFirstName'));
            c.database.destroy();
        });
        it('primary', async () => {
            if (config.storage.name !== 'pouchdb') {
                return;
            }
            const c = await humansCollection.createPrimary(0);
            const query: any = c.find()
                .where('passportId').eq('myPassportId')
                .getPreparedQuery();
            const jsonString = JSON.stringify(query);

            assert.ok(!jsonString.includes('passportId'));
            assert.ok(jsonString.includes('myPassportId'));
            assert.strictEqual(query.selector._id, 'myPassportId');
            c.database.destroy();
        });
        it('additional attribute', async () => {
            if (config.storage.name !== 'pouchdb') {
                return;
            }
            const c = await humansCollection.create(0);
            const query: any = c.find()
                .where('foobar').eq(5)
                .getPreparedQuery();

            assert.strictEqual(query.selector.foobar, 5);
            c.database.destroy();
        });
    });
    describe('integration into pouchDB', () => {
        it('should have saved a compressed document', async () => {
            if (config.storage.name !== 'pouchdb') {
                return;
            }

            const c = await humansCollection.createPrimary(0);
            const docData = schemaObjects.simpleHuman();
            await c.insert(docData);

            const pouchDoc = await c.internalStorageInstance.internals.pouch.get(docData.passportId);
            const doc = pouchDocumentDataToRxDocumentData<SimpleHumanDocumentType>(c.schema.primaryPath, pouchDoc);
            Object.keys(doc)
                .filter(key => !key.startsWith('_'))
                .filter(key => key !== c.schema.primaryPath)
                .forEach(key => {
                    assert.ok(key.length <= 3);
                    assert.strictEqual(typeof (doc as any)[key], 'string');
                });
            assert.strictEqual(doc[c.schema.primaryPath], docData.passportId);
            assert.strictEqual((doc as any)['|a'], docData.firstName);
            c.database.destroy();
        });
    });
    describe('issues', () => {
        it('#50 compress string array properly', async () => {
            const mySchema: RxJsonSchema<{ likes: any[], id: string }> = {
                title: 'hero schema',
                version: 0,
                description: 'describes a simple hero',
                primaryKey: 'id',
                required: [
                    'id'
                ],
                type: 'object',
                properties: {
                    id: {
                        type: 'string'
                    },
                    likes: {
                        type: 'array',
                        items: {
                            type: 'string'
                        }
                    }
                }
            };

            const db = await createRxDatabase({
                name: 'heroesdb',
                storage: config.storage.getStorage()
            });
            const collections = await db.addCollections({
                mycollection: {
                    schema: mySchema
                }
            });
            const collection = collections.mycollection;
            const docData = {
                id: randomCouchString(12),
                likes: ['abc', '8']
            };
            await collection.insert(docData);
            const doc = await collection.findOne().exec();
            assert.ok(isRxDocument(doc));
            assert.deepStrictEqual(doc.likes, docData.likes);
            db.destroy();
        });
        it('error on nested null', async () => {
            const mySchema = {
                title: 'hero schema',
                version: 0,
                description: 'describes a simple hero',
                primaryKey: 'key',
                required: ['key'],
                type: 'object',
                properties: {
                    key: {
                        type: 'string'
                    },
                    nested: {
                        type: 'object'
                    }
                }
            };

            const db = await createRxDatabase({
                name: randomCouchString(10),
                storage: config.storage.getStorage()
            });
            const collections = await db.addCollections({
                mycollection: {
                    schema: mySchema
                }
            });
            const collection = collections.mycollection;

            const docData = {
                key: 'foobar',
                nested: {
                    lastProvider: null,
                    providers: 0,
                    sync: false,
                    other: {}
                }
            };
            await collection.insert(docData);

            db.destroy();
        });
    });
});
