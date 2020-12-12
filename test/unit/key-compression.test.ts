/**
 * this test is for the keycompression-capabilities of rxdb
 */
import assert from 'assert';
import clone from 'clone';
import config from './config';

import * as schemas from './../helper/schemas';
import * as schemaObjects from './../helper/schema-objects';
import * as humansCollection from './../helper/humans-collection';

import {
    createRxSchema,
    createRxDatabase,
    RxSchema,
    randomCouchString,
    isRxDocument
} from '../../plugins/core';
import {
    KeyCompressor,
    create
} from '../../plugins/key-compression';

config.parallel('key-compression.test.js', () => {

    function createKeyCompressor(schema: RxSchema): KeyCompressor {
        return create(schema) as KeyCompressor;
    }

    describe('.compress()', () => {
        it('normal', () => {
            const k = createKeyCompressor(createRxSchema(schemas.human));
            const human: any = schemaObjects.human();
            const compressed: any = k.compress(human);

            const values = Object.keys(compressed)
                .map(key => compressed[key]);

            Object.keys(human).forEach(key => {
                const value: any = human[key];
                assert.ok(values.includes(value));
            });
        });
        it('primary', () => {
            const k = createKeyCompressor(createRxSchema(schemas.primaryHuman));
            const human: any = schemaObjects.human();
            const compressed: any = k.compress(human);

            const values = Object.keys(compressed)
                .map(key => compressed[key]);

            Object.keys(human).forEach(key => {
                const value = human[key];
                assert.ok(values.includes(value));
            });
        });
        it('should not compress _rev', () => {
            const k = createKeyCompressor(createRxSchema(schemas.primaryHuman));
            const human: any = schemaObjects.human();
            human['_rev'] = 'foobarrev';
            const compressed: any = k.compress(human);

            assert.strictEqual(human['_rev'], 'foobarrev');
            assert.strictEqual(compressed['_rev'], 'foobarrev');
        });
        it('nested', () => {
            const k = createKeyCompressor(createRxSchema(schemas.nestedHuman));
            const human: any = schemaObjects.nestedHuman();
            const compressed: any = k.compress(human);

            const values = Object.keys(compressed)
                .map(key => compressed[key]);

            // check top
            Object.keys(human).forEach(key => {
                const value = human[key];
                if (typeof value !== 'object') {
                    assert.ok(values.includes(value));
                }
            });

            // check nested
            const nestedObj = Object.keys(compressed)
                .map(key => compressed[key])
                .filter(value => typeof value === 'object')
                .pop();
            const nestedValues = Object.keys(nestedObj)
                .map(key => nestedObj[key]);
            Object.keys(human.mainSkill).forEach(key => {
                const value = human.mainSkill[key];
                if (typeof value !== 'object')
                    assert.ok(nestedValues.includes(value));
            });
        });
        it('deep nested', () => {
            const k = createKeyCompressor(createRxSchema(schemas.deepNestedHuman));
            const human: any = schemaObjects.deepNestedHuman();
            const compressed = k.compress(human);

            const json = JSON.stringify(compressed);
            Object.keys(human).forEach(key => {
                const value = human[key];
                if (typeof value !== 'object')
                    assert.ok(json.includes(value));
            });
        });
        it('additional value', () => {
            const k = createKeyCompressor(createRxSchema(schemas.deepNestedHuman));
            const human: any = schemaObjects.deepNestedHuman();
            const additionalValue = {
                foo: 'bar'
            };
            human['foobar'] = additionalValue;
            const compressed = k.compress(human);

            const json = JSON.stringify(compressed);
            Object.keys(human).forEach(key => {
                const value = human[key];
                if (typeof value !== 'object')
                    assert.ok(json.includes(value));
            });
            assert.deepStrictEqual((compressed as any).foobar, additionalValue);
        });

        it('schema with array', () => {
            const k = createKeyCompressor(createRxSchema(schemas.heroArray));
            const human: any = schemaObjects.heroArray();
            const compressed = k.compress(human);
            const json = JSON.stringify(compressed);
            Object.keys(human).forEach(key => {
                const value = human[key];
                if (typeof value !== 'object')
                    assert.ok(json.includes(value));
            });

            // array elements
            human.skills.forEach((skill: any) => {
                assert.ok(json.includes(skill.name));
                assert.ok(json.includes(skill.damage + ''));
            });
        });
    });

    describe('.decompress()', () => {
        it('normal', () => {
            const k = createKeyCompressor(createRxSchema(schemas.human));
            const human = schemaObjects.human();
            const compressed = k.compress(human);
            const decompressed = k.decompress(compressed);
            assert.deepStrictEqual(human, decompressed);
        });
        it('nested', () => {
            const k = createKeyCompressor(createRxSchema(schemas.nestedHuman));
            const human = schemaObjects.nestedHuman();
            const compressed = k.compress(human);

            const decompressed = k.decompress(compressed);
            assert.deepStrictEqual(human, decompressed);
        });
        it('deep nested', () => {
            const k = createKeyCompressor(createRxSchema(schemas.deepNestedHuman));
            const human = schemaObjects.deepNestedHuman();
            const compressed = k.compress(human);

            const decompressed = k.decompress(compressed);
            assert.deepStrictEqual(human, decompressed);
        });
        it('additional value', () => {
            const k = createKeyCompressor(createRxSchema(schemas.deepNestedHuman));
            const human: any = schemaObjects.deepNestedHuman();
            const additionalValue = {
                foo: 'bar'
            };
            human['foobar'] = additionalValue;
            const compressed = k.compress(human);
            const decompressed = k.decompress(compressed);
            assert.deepStrictEqual(human, decompressed);
        });
        it('primary', () => {
            const k = createKeyCompressor(createRxSchema(schemas.primaryHuman));
            const human = schemaObjects.heroArray();
            const compressed = k.compress(human);
            const decompressed = k.decompress(compressed);

            assert.deepStrictEqual(human, decompressed);
        });
        it('schema with array', () => {
            const k = createKeyCompressor(createRxSchema(schemas.heroArray));
            const human = schemaObjects.heroArray();
            const compressed = k.compress(human);
            const decompressed = k.decompress(compressed);
            assert.deepStrictEqual(human, decompressed);
        });
        it('ISSUE: _rev gets undefined', () => {
            const k = createKeyCompressor(createRxSchema(schemas.heroArray));
            const human = schemaObjects.heroArray();
            const compressed: any = k.compress(human);
            compressed['_rev'] = 'foobar';
            const decompressed = k.decompress(compressed);
            assert.strictEqual(decompressed._rev, 'foobar');
        });
    });

    describe('RxQuery().keyCompress()', () => {
        it('transform basic search keys', async () => {
            const c = await humansCollection.create(0);
            const query: any = c.find()
                .where('firstName').eq('myFirstName')
                .keyCompress();
            const jsonString = JSON.stringify(query);
            assert.ok(!jsonString.includes('firstName'));
            assert.ok(jsonString.includes('myFirstName'));
            c.database.destroy();
        });
        it('primary', async () => {
            const c = await humansCollection.createPrimary(0);
            const query: any = c.find()
                .where('passportId').eq('myPassportId')
                .keyCompress();
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
                .keyCompress();

            assert.strictEqual(query.selector.foobar, 5);
            c.database.destroy();
        });
    });
    describe('integration into pouchDB', () => {
        it('should have saved a compressed document', async () => {
            const c = await humansCollection.createPrimary(0);
            const docData = schemaObjects.simpleHuman();
            await c.insert(docData);
            const doc = await c.pouch.get(docData.passportId);

            Object.keys(doc).forEach(key => {
                assert.ok(key.length <= 4);
                assert.strictEqual(typeof doc[key], 'string');
            });
            assert.strictEqual(doc._id, docData.passportId);
            assert.strictEqual(doc['|a'], docData.firstName);
            c.database.destroy();
        });
    });
    describe('disable key-compression', () => {
        describe('.doKeyCompression()', () => {
            it('doKeyCompression(): true', () => {
                const schemaJSON = clone(schemas.human);
                schemaJSON.keyCompression = false;
                const schema = createRxSchema(schemaJSON);
                assert.strictEqual(schema.doKeyCompression(), false);
            });
            it('doKeyCompression(): false', () => {
                const schemaJSON = clone(schemas.human);
                schemaJSON.keyCompression = true;
                const schema = createRxSchema(schemaJSON);
                assert.strictEqual(schema.doKeyCompression(), true);
            });
        });
        describe('.compress()', () => {
            it('do not compress', async () => {
                const col = await humansCollection.createNoCompression(0);
                assert.strictEqual(typeof col._keyCompressor, 'undefined');
                col.database.destroy();
            });
        });
        describe('.decompress()', () => {
            it('do not compress', async () => {
                const col = await humansCollection.createNoCompression(0);
                assert.strictEqual(typeof col._keyCompressor, 'undefined');
                col.database.destroy();
            });
        });
    });
    describe('issues', () => {
        it('#50 compress string array properly', async () => {
            const mySchema = {
                title: 'hero schema',
                version: 0,
                description: 'describes a simple hero',
                type: 'object',
                properties: {
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
                adapter: 'memory'
            });
            const collection = await db.collection({
                name: 'mycollection',
                schema: mySchema
            });
            const docData = {
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
                type: 'object',
                properties: {
                    key: {
                        type: 'string',
                        primary: true
                    },
                    nested: {
                        type: 'object'
                    }
                }
            };

            const db = await createRxDatabase({
                name: randomCouchString(10),
                adapter: 'memory'
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
