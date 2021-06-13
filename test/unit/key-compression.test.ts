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
} from '../../plugins/core';

import {
    getRxStoragePouch
} from '../../plugins/pouchdb';


config.parallel('key-compression.test.js', () => {
    describe('RxQuery().keyCompress()', () => {
        it('transform basic search keys', async () => {
            const c = await humansCollection.create(0);
            const query: any = c.find()
                .where('firstName').eq('myFirstName')
                .toJSON();
            const jsonString = JSON.stringify(query);
            assert.ok(!jsonString.includes('firstName'));
            assert.ok(jsonString.includes('myFirstName'));
            c.database.destroy();
        });
        it('primary', async () => {
            const c = await humansCollection.createPrimary(0);
            const query: any = c.find()
                .where('passportId').eq('myPassportId')
                .toJSON();
            const jsonString = JSON.stringify(query);
            assert.ok(!jsonString.includes('passportId'));
            assert.ok(jsonString.includes('myPassportId'));
            assert.strictEqual(query.selector._id, 'myPassportId');
            c.database.destroy();
        });
        it('additional attribute', async () => {
            const c = await humansCollection.create(0);
            const query: any = c.find()
                .where('foobar').eq(5)
                .toJSON();

            assert.strictEqual(query.selector.foobar, 5);
            c.database.destroy();
        });
    });
    describe('integration into pouchDB', () => {
        it('should have saved a compressed document', async () => {
            const c = await humansCollection.createPrimary(0);
            const docData = schemaObjects.simpleHuman();
            await c.insert(docData);
            const doc = await c.storageInstance.internals.pouch.get(docData.passportId);

            Object.keys(doc)
                .filter(key => !key.startsWith('_'))
                .forEach(key => {
                    assert.ok(key.length <= 4);
                    assert.strictEqual(typeof doc[key], 'string');
                });
            assert.strictEqual(doc._id, docData.passportId);
            assert.strictEqual(doc['|a'], docData.firstName);
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
                storage: getRxStoragePouch('memory')
            });
            const collection = await db.collection({
                name: 'mycollection',
                schema: mySchema
            });
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
                storage: getRxStoragePouch('memory')
            });
            const collection = await db.collection({
                name: 'mycollection',
                schema: mySchema
            });

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
