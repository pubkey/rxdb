import assert from 'assert';
import randomToken from 'random-token';
import clone from 'clone';
import config from './config';
import AsyncTestUtil, { randomNumber } from 'async-test-util';

import * as schemas from '../helper/schemas';
import * as schemaObjects from '../helper/schema-objects';
import * as humansCollection from '../helper/humans-collection';

import {
    isRxCollection,
    isRxQuery,
    isRxDocument,
    createRxDatabase,
    createRxSchema,
    RxError,
    randomCouchString,
    shuffleArray,
    _createRxCollection,
    RxJsonSchema,
    PrimaryProperty,
    RxDatabase,
    addRxPlugin
} from '../../plugins/core';
import { RxDBUpdatePlugin } from '../../plugins/update';
addRxPlugin(RxDBUpdatePlugin);
import { RxDBMigrationPlugin } from '../../plugins/migration';
addRxPlugin(RxDBMigrationPlugin);

import { HumanDocumentType } from '../helper/schema-objects';
import { firstValueFrom } from 'rxjs';

config.parallel('rx-collection.test.js', () => {
    async function getDb(): Promise<RxDatabase> {
        return await createRxDatabase({
            name: randomCouchString(10),
            adapter: 'memory'
        });
    }
    describe('static', () => {
        describe('.addCollections()', () => {
            it('should not crash', async () => {
                const db = await getDb();
                await db.addCollections({
                    one: {
                        schema: schemas.human
                    },
                    two: {
                        schema: schemas.human
                    }
                });
                assert.ok(isRxCollection(db.one));
                assert.ok(isRxCollection(db.two));
                db.destroy();
            });
        });
        describe('.create()', () => {
            describe('positive', () => {
                it('human', async () => {
                    const db = await createRxDatabase({
                        name: randomCouchString(10),
                        adapter: 'memory'
                    });
                    const schema = createRxSchema(schemas.human);
                    const collection = await _createRxCollection({
                        database: db,
                        name: 'humanx',
                        schema
                    }, false);
                    assert.ok(isRxCollection(collection));
                    db.destroy();
                });
                it('use Schema-Object', async () => {
                    const db = await createRxDatabase({
                        name: randomCouchString(10),
                        adapter: 'memory'
                    });
                    const schema = createRxSchema(schemas.human);
                    const collection = await _createRxCollection({
                        database: db,
                        name: 'human',
                        schema
                    }, false);
                    assert.ok(isRxCollection(collection));
                    db.destroy();
                });
                it('should create compound-indexes (keyCompression: false)', async () => {
                    const db = await createRxDatabase({
                        name: randomCouchString(10),
                        adapter: 'memory'
                    });
                    const schemaJSON = clone(schemas.compoundIndex);
                    schemaJSON.keyCompression = false;
                    const schema = createRxSchema(schemaJSON);
                    const col = await _createRxCollection({
                        database: db,
                        name: 'human',
                        schema
                    }, false);
                    const indexes = await col.pouch.getIndexes();
                    assert.strictEqual(indexes.indexes.length, 2);
                    const lastIndexDefFields = indexes.indexes[1].def.fields;
                    assert.deepStrictEqual(
                        lastIndexDefFields, [{
                            'passportId': 'asc'
                        }, {
                            'passportCountry': 'asc'
                        }]
                    );
                    db.destroy();
                });
                it('should create compound-indexes', async () => {
                    const db = await createRxDatabase({
                        name: randomCouchString(10),
                        adapter: 'memory'
                    });
                    const schema = createRxSchema(schemas.compoundIndex);
                    const col = await _createRxCollection({
                        database: db,
                        name: 'human',
                        schema
                    }, false);
                    const indexes = await col.pouch.getIndexes();
                    assert.strictEqual(indexes.indexes.length, 2);
                    const lastIndexDefFields = indexes.indexes[1].def.fields;
                    assert.deepStrictEqual(
                        lastIndexDefFields, [{
                            '|b': 'asc'
                        }, {
                            '|a': 'asc'
                        }]
                    );
                    db.destroy();
                });
                it('should have the version-number in the pouchdb-prefix', async () => {
                    const db = await createRxDatabase({
                        name: randomCouchString(10),
                        adapter: 'memory'
                    });
                    const schema = createRxSchema(schemas.human);
                    const collection = await _createRxCollection({
                        database: db,
                        name: 'human',
                        schema
                    }, false);
                    assert.deepStrictEqual(schema.version, 0);
                    assert.ok(collection.pouch.name.includes('-' + schema.version + '-'));
                    db.destroy();
                });
                it('should not forget the options', async () => {
                    const db = await createRxDatabase({
                        name: randomCouchString(10),
                        adapter: 'memory'
                    });
                    const collection = await db.collection({
                        name: 'human',
                        schema: schemas.human,
                        options: {
                            foo: 'bar'
                        }
                    });
                    assert.strictEqual(collection.options.foo, 'bar');
                    db.destroy();
                });
            });
            describe('negative', () => {
                it('crash if no database-object', async () => {
                    const db = {};
                    const schema = createRxSchema(schemas.human);
                    await AsyncTestUtil.assertThrows(
                        () => _createRxCollection({
                            database: db,
                            name: 'human',
                            schema
                        }, false),
                        TypeError
                    );
                });
                it('crash if no name-object', async () => {
                    const db = await createRxDatabase({
                        name: randomCouchString(10),
                        adapter: 'memory'
                    });
                    const schema = createRxSchema(schemas.human);
                    await AsyncTestUtil.assertThrows(
                        () => _createRxCollection({
                            database: db,
                            name: null,
                            schema
                        }, false),
                        'RxTypeError',
                        'null'
                    );
                    db.destroy();
                });
            });
        });
        describe('.checkCollectionName()', () => {
            describe('positive', () => {
                it('allow not allow lodash', async () => {
                    const db = await createRxDatabase({
                        name: randomCouchString(10),
                        adapter: 'memory'
                    });
                    const schema = createRxSchema(schemas.human);

                    await AsyncTestUtil.assertThrows(
                        () => _createRxCollection({
                            database: db,
                            name: '_foobar',
                            schema
                        }, false),
                        'RxError',
                        'foobar'
                    );
                    db.destroy();
                });
                it('allow numbers', async () => {
                    const db = await createRxDatabase({
                        name: randomCouchString(10),
                        adapter: 'memory'
                    });
                    const schema = createRxSchema(schemas.human);
                    const collection1 = await _createRxCollection({
                        database: db,
                        name: 'fooba4r',
                        schema
                    }, false);
                    assert.ok(isRxCollection(collection1));
                    const collection2 = await _createRxCollection({
                        database: db,
                        name: 'foobar4',
                        schema
                    }, false);
                    assert.ok(isRxCollection(collection2));
                    db.destroy();
                });
            });
            describe('negative', () => {
                it('not allow starting numbers', async () => {
                    const db = await createRxDatabase({
                        name: randomCouchString(10),
                        adapter: 'memory'
                    });
                    const schema = createRxSchema(schemas.human);
                    await AsyncTestUtil.assertThrows(
                        () => _createRxCollection({
                            database: db,
                            name: '0foobar',
                            schema
                        }, false),
                        'RxError'
                    );
                    db.destroy();
                });
                it('not allow uppercase-letters', async () => {
                    const db = await createRxDatabase({
                        name: randomCouchString(10),
                        adapter: 'memory'
                    });
                    const schema = createRxSchema(schemas.human);
                    await AsyncTestUtil.assertThrows(
                        () => _createRxCollection({
                            database: db,
                            name: 'Foobar',
                            schema
                        }, false),
                        'RxError'
                    );
                    await AsyncTestUtil.assertThrows(
                        () => _createRxCollection({
                            database: db,
                            name: 'fooBar',
                            schema
                        }, false),
                        'RxError'
                    );
                    db.destroy();
                });
            });
        });
    });
    describe('instance', () => {
        describe('.insert()', () => {
            describe('positive', () => {
                it('should insert a human', async () => {
                    const db = await createRxDatabase({
                        name: randomCouchString(10),
                        adapter: 'memory'
                    });
                    const collection = await db.collection({
                        name: 'human',
                        schema: schemas.human
                    });
                    await collection.insert(schemaObjects.human());
                    db.destroy();
                });
                it('should insert an object with _id set', async () => {
                    const db = await createRxDatabase({
                        name: randomCouchString(10),
                        adapter: 'memory'
                    });
                    const collection = await db.collection({
                        name: 'idprimary',
                        schema: schemas._idPrimary
                    });
                    await collection.insert(schemaObjects._idPrimary());
                    db.destroy();
                });
                it('should insert human (_id given)', async () => {
                    const db = await createRxDatabase({
                        name: randomCouchString(10),
                        adapter: 'memory'
                    });
                    const collection = await db.collection({
                        name: 'human',
                        schema: schemas.human
                    });
                    const human = schemaObjects.human();
                    human.passportId = randomCouchString(20);
                    await collection.insert(human);
                    db.destroy();
                });
                it('should insert nested human', async () => {
                    const db = await createRxDatabase({
                        name: randomCouchString(10),
                        adapter: 'memory'
                    });
                    const collection = await db.collection({
                        name: 'nestedhuman',
                        schema: schemas.nestedHuman
                    });
                    await collection.insert(schemaObjects.nestedHuman());
                    db.destroy();
                });
                it('should insert more than once', async () => {
                    const db = await createRxDatabase({
                        name: randomCouchString(10),
                        adapter: 'memory'
                    });
                    const collection = await db.collection({
                        name: 'nestedhuman',
                        schema: schemas.nestedHuman
                    });
                    for (let i = 0; i < 10; i++)
                        await collection.insert(schemaObjects.nestedHuman());
                    db.destroy();
                });
                it('should set default values', async () => {
                    const db = await createRxDatabase({
                        name: randomCouchString(10),
                        adapter: 'memory'
                    });
                    const collection = await db.collection({
                        name: 'nestedhuman',
                        schema: schemas.humanDefault
                    });

                    const data = {
                        passportId: 'foobar',
                    };
                    await collection.insert(data);
                    const doc = await collection.findOne().exec();
                    assert.strictEqual(doc.age, 20);

                    db.destroy();
                });
            });
            describe('negative', () => {
                it('should not insert broken human (required missing)', async () => {
                    const db = await createRxDatabase({
                        name: randomCouchString(10),
                        adapter: 'memory'
                    });
                    const collection = await db.collection({
                        name: 'human',
                        schema: schemas.human
                    });
                    const human: any = schemaObjects.human();
                    delete human.firstName;
                    await AsyncTestUtil.assertThrows(
                        () => collection.insert(human),
                        'RxError',
                        'not match schema'
                    );
                    db.destroy();
                });
                it('should not insert when _id given but _id is not primary', async () => {
                    const db = await createRxDatabase({
                        name: randomCouchString(10),
                        adapter: 'memory'
                    });
                    const collection = await db.collection({
                        name: 'humanfinal',
                        schema: schemas.humanFinal
                    });
                    const human: any = schemaObjects.human();
                    human['_id'] = randomCouchString(20);
                    await AsyncTestUtil.assertThrows(
                        () => collection.insert(human),
                        'RxError',
                        'not provide'
                    );
                    db.destroy();
                });
                it('should not insert a non-json object', async () => {
                    const db = await createRxDatabase({
                        name: randomCouchString(10),
                        adapter: 'memory'
                    });
                    const collection = await db.collection({
                        name: 'human',
                        schema: schemas.human
                    });
                    await AsyncTestUtil.assertThrows(
                        () => collection.insert('collection'),
                        TypeError
                    );
                    db.destroy();
                });
                it('should not insert human with additional prop', async () => {
                    const db = await createRxDatabase({
                        name: randomCouchString(10),
                        adapter: 'memory'
                    });
                    const collection = await db.collection({
                        name: 'human',
                        schema: schemas.human
                    });
                    const human: any = schemaObjects.human();
                    human['any'] = randomCouchString(20);
                    await AsyncTestUtil.assertThrows(
                        () => collection.insert(human),
                        'RxError',
                        'not match schema'
                    );
                    db.destroy();
                });
                it('should not insert when primary is missing', async () => {
                    const db = await createRxDatabase({
                        name: randomCouchString(10),
                        adapter: 'memory'
                    });
                    const collection = await db.collection({
                        name: 'human',
                        schema: schemas.primaryHuman
                    });
                    await AsyncTestUtil.assertThrows(
                        () => collection.insert({
                            firstName: 'foo',
                            lastName: 'bar',
                            age: 20
                        }),
                        'RxError',
                        'is required'
                    );
                    db.destroy();
                });
                it('should throw a conflict-error', async () => {
                    const db = await createRxDatabase({
                        name: randomCouchString(10),
                        adapter: 'memory'
                    });
                    const collection = await db.collection({
                        name: 'human',
                        schema: schemas.primaryHuman
                    });
                    const docData = schemaObjects.human();
                    await collection.insert(docData);

                    const err: RxError = await AsyncTestUtil.assertThrows(
                        () => collection.insert(docData),
                        'RxError',
                        'conflict'
                    ) as any;
                    assert.deepStrictEqual(err.parameters.id, docData.passportId);

                    db.destroy();
                });
            });
        });
        describe('.bulkInsert()', () => {
            describe('positive', () => {
                it('should insert some humans', async () => {
                    const db = await createRxDatabase({
                        name: randomCouchString(10),
                        adapter: 'memory'
                    });
                    const collection = await db.collection({
                        name: 'human',
                        schema: schemas.human
                    });
                    const docs = new Array(10).fill(0).map(() => schemaObjects.human());
                    const ret = await collection.bulkInsert(docs);

                    assert.strictEqual(ret.success.length, 10);
                    db.destroy();
                });
            });
            describe('negative', () => {
                it('should throw if one already exists', async () => {
                    const db = await createRxDatabase({
                        name: randomCouchString(10),
                        adapter: 'memory'
                    });
                    const collection = await db.collection({
                        name: 'human',
                        schema: schemas.primaryHuman
                    });
                    const double = schemaObjects.human();
                    double.passportId = 'foobar';
                    await collection.insert(double);
                    const docs = new Array(10).fill(0).map(() => schemaObjects.human());
                    docs.push(double);
                    const ret = await collection.bulkInsert(docs);

                    assert.strictEqual(ret.success.length, 10);
                    assert.strictEqual(ret.error.length, 1);
                    db.destroy();
                });

            });
        });
        describe('.bulkRemove()', () => {
            describe('positive', () => {
                it('should remove some humans', async () => {
                    const c = await humansCollection.create(10);
                    const docList = await c.find().exec();

                    assert.strictEqual(docList.length, 10);

                    const primaryList = docList.map(doc => doc.primary);
                    const ret = await c.bulkRemove(primaryList);
                    assert.strictEqual(ret.success.length, 10);

                    const finalList = await c.find().exec();
                    assert.strictEqual(finalList.length, 0);

                    c.database.destroy();
                });
            });
        });
        describe('.find()', () => {
            describe('find all', () => {
                describe('positive', () => {
                    it('find all', async () => {
                        const c = await humansCollection.create();
                        const docs = await c.find().exec();
                        assert.ok(docs.length >= 10);
                        for (const doc of docs) {
                            assert.ok(isRxDocument(doc));
                        }
                        c.database.destroy();
                    });
                    it('find 2 times', async () => {
                        const c = await humansCollection.create();
                        const docs = await c.find().exec();
                        const docs2 = await c.find().exec();
                        assert.ok(docs.length >= 10);
                        assert.ok(docs2.length >= 10);
                        c.database.destroy();
                    });
                    it('find in serial', async () => {
                        const c = await humansCollection.createPrimary(0);
                        const docData = schemaObjects.simpleHuman();

                        const docs = await c.find().exec();
                        assert.strictEqual(docs.length, 0);
                        await c.insert(docData);
                        const docs2 = await c.find().exec();
                        assert.strictEqual(docs2.length, 1);
                        c.database.destroy();
                    });
                    it('find all by empty object', async () => {
                        const c = await humansCollection.create();
                        const docs = await c.find().exec();
                        assert.ok(docs.length >= 10);
                        for (const doc of docs) {
                            assert.ok(isRxDocument(doc));
                        }
                        c.database.destroy();
                    });
                    it('find nothing with empty collection', async () => {
                        const db = await createRxDatabase({
                            name: randomCouchString(10),
                            adapter: 'memory'
                        });
                        const schema = createRxSchema(schemas.human);
                        const collection = await _createRxCollection({
                            database: db,
                            name: 'humanx',
                            schema
                        }, false);
                        const docs = await collection.find().exec();
                        assert.deepStrictEqual(docs, []);
                        db.destroy();
                    });
                    it('BUG: insert and find very often', async () => {
                        const amount = 10;
                        for (let i = 0; i < amount; i++) {
                            const db = await createRxDatabase({
                                name: randomCouchString(10),
                                adapter: 'memory'
                            });
                            const collection = await db.collection({
                                name: 'human',
                                schema: schemas.human
                            });
                            const human = schemaObjects.human();
                            const passportId = human.passportId;
                            await collection.insert(human);
                            const docs = await collection.find().exec();
                            const doc = docs[0];
                            assert.strictEqual(passportId, doc._data.passportId);
                            db.destroy();
                        }
                    });
                });
                describe('negative', () => {
                    it('should crash with string as query', async () => {
                        const c = await humansCollection.create();
                        await AsyncTestUtil.assertThrows(
                            () => (c as any).find('foobar').exec(),
                            'RxError',
                            'findOne'
                        );
                        c.database.destroy();
                    });
                    it('should crash with array as query', async () => {
                        const c = await humansCollection.create();
                        await AsyncTestUtil.assertThrows(
                            () => (c as any).find([]).exec(),
                            'RxTypeError'
                        );
                        c.database.destroy();
                    });
                });
            });
            describe('$eq', () => {
                describe('positive', () => {
                    it('find first by passportId', async () => {
                        const c = await humansCollection.create();
                        let docs = await c.find().exec();
                        docs = shuffleArray(docs);
                        const last: any = docs.pop();
                        const passportId = last._data.passportId;
                        let doc: any = await c.find({
                            selector: {
                                passportId
                            }
                        }).exec();
                        assert.strictEqual(doc.length, 1);
                        doc = doc[0];
                        assert.deepStrictEqual(doc['data'], last.data);
                        c.database.destroy();
                    });
                    it('find none with random passportId', async () => {
                        const c = await humansCollection.create();
                        const docs = await c.find({
                            selector: {
                                passportId: randomCouchString(10)
                            }
                        }).exec();
                        assert.strictEqual(docs.length, 0);
                        c.database.destroy();
                    });
                    it('find via $eq', async () => {
                        const c = await humansCollection.create();
                        let docs = await c.find().exec();
                        docs = shuffleArray(docs);
                        const last: any = docs.pop();
                        const passportId = last._data.passportId;
                        let doc: any = await c.find({
                            selector: {
                                passportId: {
                                    $eq: passportId
                                }
                            }
                        }).exec();
                        assert.strictEqual(doc.length, 1);
                        doc = doc[0];
                        assert.deepStrictEqual(doc['data'], last.data);
                        c.database.destroy();
                    });
                });
                describe('negative', () => { });
            });
            describe('.or()', () => {
                it('should find the 2 documents with the or-method', async () => {
                    const c = await humansCollection.create(10);
                    // add 2 docs to be found
                    await c.insert({
                        passportId: randomToken(12),
                        firstName: 'foobarAlice',
                        lastName: 'aliceLastName',
                        age: randomNumber(10, 50)
                    });
                    await c.insert({
                        passportId: randomToken(12),
                        firstName: 'foobarBob',
                        lastName: 'bobLastName',
                        age: randomNumber(10, 50)
                    });
                    const query = c.find().or([{
                        firstName: 'foobarAlice'
                    }, {
                        firstName: 'foobarBob'
                    }]);
                    const results = await query.exec();
                    assert.strictEqual(results.length, 2);
                    const foundFirstNames = results.map(doc => doc.firstName);
                    assert.ok(foundFirstNames.includes('foobarAlice'));
                    assert.ok(foundFirstNames.includes('foobarBob'));
                    c.database.destroy();
                });
                it('should find the correct documents via $or on the primary key', async () => {
                    const c = await humansCollection.createPrimary(10);
                    const allDocs = await c.find().exec();
                    const firstFive = allDocs.slice(0, 5);
                    const selector = {
                        $or: firstFive.map(doc => ({ passportId: doc.passportId }))
                    };
                    const found = await c.find({
                        selector
                    }).exec();

                    assert.strictEqual(firstFive.length, found.length);
                    assert.ok(firstFive[0]);
                    const firstId = firstFive[0].passportId;
                    assert.ok(
                        found.map(d => d.passportId).includes(firstId)
                    );
                    c.database.destroy();
                });
            });
            describe('.sort()', () => {
                describe('positive', () => {
                    it('sort by age desc (with own index-search)', async () => {
                        const c = await humansCollection.createAgeIndex();
                        const query = c.find({
                            selector: {
                                age: {
                                    $gt: null
                                }
                            }
                        }).sort({ age: 'desc' });

                        assert.ok(isRxQuery(query));
                        const docs = await query.exec();
                        assert.strictEqual(docs.length, 20);
                        assert.ok(docs[0] && docs[1]);
                        assert.ok(docs[0]._data.age >= docs[1]._data.age);
                        c.database.destroy();
                    });
                    it('sort by age desc (with default index-search)', async () => {
                        const c = await humansCollection.createAgeIndex();
                        const docs = await c.find().sort({
                            age: 'desc'
                        }).exec();
                        assert.strictEqual(docs.length, 20);
                        assert.ok(docs[0] && docs[1]);
                        assert.ok(docs[0]._data.age >= docs[1]._data.age);
                        c.database.destroy();
                    });
                    it('sort by age asc', async () => {
                        const c = await humansCollection.createAgeIndex();
                        const docs = await c.find().sort({
                            age: 'asc'
                        }).exec();
                        assert.strictEqual(docs.length, 20);
                        assert.ok(docs[0] && docs[1]);
                        assert.ok(docs[0]._data.age <= docs[1]._data.age);
                        c.database.destroy();
                    });
                    it('sort by non-top-level-key as index (no keycompression)', async () => {
                        const db = await createRxDatabase({
                            name: randomCouchString(10),
                            adapter: 'memory'
                        });
                        const schemaObj = clone(schemas.humanSubIndex);
                        schemaObj.keyCompression = false;
                        const schema = createRxSchema(schemaObj);
                        const collection = await _createRxCollection({
                            database: db,
                            name: 'human',
                            schema
                        }, false);
                        const objects = new Array(10).fill(0).map(() => {
                            return {
                                passportId: randomCouchString(10),
                                other: {
                                    age: randomNumber(10, 50)
                                }
                            };
                        });
                        await Promise.all(objects.map(o => collection.insert(o)));

                        // do it manually
                        const all = await collection.pouch.find({
                            selector: {
                                'other.age': {
                                    '$gt': 0
                                }
                            },
                            sort: [{
                                'other.age': 'asc'
                            }]
                        });
                        assert.strictEqual(all.docs.length, 10);

                        // with RxQuery
                        const query = collection.find().sort({
                            'other.age': 'asc'
                        });
                        const docs = await query.exec();

                        let lastAge = 0;
                        docs.forEach((doc: any) => {
                            assert.ok(doc.other.age >= lastAge);
                            lastAge = doc.other.age;
                        });
                        db.destroy();
                    });
                    it('sort by non-top-level-key as index', async () => {
                        const db = await createRxDatabase({
                            name: randomCouchString(10),
                            adapter: 'memory'
                        });
                        const schema = createRxSchema(schemas.humanSubIndex);
                        const collection = await _createRxCollection({
                            database: db,
                            name: 'human',
                            schema
                        }, false);
                        const objects = new Array(10).fill(0).map(() => {
                            return {
                                passportId: randomCouchString(10),
                                other: {
                                    age: randomNumber(10, 50)
                                }
                            };
                        });
                        await Promise.all(objects.map(o => collection.insert(o)));

                        // with RxQuery
                        const query = collection.find().sort({
                            'other.age': 'asc'
                        });
                        const docs = await query.exec();

                        let lastAge = 0;
                        docs.forEach((doc: any) => {
                            assert.ok(doc.other.age >= lastAge);
                            lastAge = doc.other.age;
                        });
                        db.destroy();
                    });
                    it('validate results', async () => {
                        const c = await humansCollection.createAgeIndex();

                        const desc = await c.find().sort({
                            age: 'desc'
                        }).exec();
                        const asc = await c.find().sort({
                            age: 'asc'
                        }).exec();
                        const lastDesc = desc[desc.length - 1];
                        assert.ok(lastDesc && asc[0]);
                        assert.strictEqual(lastDesc._data.passportId, asc[0]._data.passportId);
                        c.database.destroy();
                    });
                    it('find the same twice', async () => {
                        const c = await humansCollection.createNested(5);
                        const doc1 = await c.findOne().sort({
                            passportId: 'asc'
                        }).exec(true);
                        const doc2 = await c.findOne().sort({
                            passportId: 'asc'
                        }).exec(true);
                        assert.strictEqual(doc1._data.passportId, doc2._data.passportId);
                        c.database.destroy();
                    });
                    it('sort by compound index with id', async () => {
                        const c = await humansCollection.createIdAndAgeIndex();
                        const query = c.find({
                            selector: {
                                age: {
                                    $gt: 0
                                }
                            }
                        }).sort({
                            age: 'desc',
                            id: 'desc'
                        });

                        assert.ok(isRxQuery(query));
                        const docs = await query.exec();

                        assert.strictEqual(docs.length, 20);
                        assert.ok(docs[0] && docs[1]);
                        assert.ok(
                            docs[0]._data.age > docs[1]._data.age ||
                            (
                                docs[0]._data.age === docs[1]._data.age &&
                                docs[0]._data.id > docs[1]._data.id
                            )
                        );
                        c.database.destroy();
                    });
                });
                describe('negative', () => {
                    it('throw when sort is not index', async () => {
                        const c = await humansCollection.create();
                        await c.find().exec();
                        await AsyncTestUtil.assertThrows(
                            () => c.find({
                                selector: {
                                    age: {
                                        $gt: 0
                                    }
                                }
                            })
                                .sort({
                                    age: 'desc'
                                })
                                .exec(),
                            Error
                        );
                        c.database.destroy();
                    });
                    it('#146 throw when field not in schema (object)', async () => {
                        const c = await humansCollection.createAgeIndex();
                        await AsyncTestUtil.assertThrows(
                            () => c.find().sort({
                                foobar: 'desc'
                            }).exec(),
                            'RxError',
                            'not defined in the schema'
                        );
                        c.database.destroy();
                    });
                    it('#146 throw when field not in schema (string)', async () => {
                        const c = await humansCollection.createAgeIndex();
                        await AsyncTestUtil.assertThrows(
                            () => c.find().sort('foobar').exec(),
                            'RxError',
                            'not defined in the schema'
                        );
                        c.database.destroy();
                    });
                });
            });
            describe('.limit()', () => {
                describe('positive', () => {
                    it('get first', async () => {
                        const c = await humansCollection.create();
                        const docs = await c.find().limit(1).exec();
                        assert.strictEqual(docs.length, 1);
                        assert.ok(isRxDocument(docs[0]));
                        c.database.destroy();
                    });
                    it('get last in order', async () => {
                        const c = await humansCollection.create(20);
                        const docs = await c.find().sort({
                            passportId: 'asc'
                        }).exec();
                        let firstDoc: any = await c.find().sort({
                            passportId: 'asc'
                        }).limit(1).exec();
                        firstDoc = firstDoc[0];
                        let last: any = await c.find().sort({
                            passportId: 'desc'
                        }).limit(1).exec();
                        last = last[0];
                        const lastDoc = docs[(docs.length - 1)];
                        assert.ok(lastDoc);
                        assert.strictEqual(last['_data'].passportId, lastDoc._data.passportId);
                        assert.notStrictEqual(firstDoc['_data'].passportId, last['_data'].passportId);
                        c.database.destroy();
                    });
                    it('reset limit with .limit(null)', async () => {
                        const c = await humansCollection.create();
                        const docs = await c.find().limit(1).limit(null).exec();
                        assert.ok(docs.length > 1);
                        assert.ok(isRxDocument(docs[0]));
                        c.database.destroy();
                    });
                });
            });
            describe('.skip()', () => {
                describe('positive', () => {
                    it('skip first', async () => {
                        const c = await humansCollection.create();
                        const query: any = {
                            selector: {},
                            sort: [
                                { passportId: 'asc' }
                            ]
                        };
                        const docs = await c.find(query).exec();
                        const noFirst = await c.find(query).skip(1).exec();
                        assert.ok(noFirst[0] && docs[1]);
                        assert.strictEqual(noFirst[0]._data.passportId, docs[1]._data.passportId);
                        c.database.destroy();
                    });
                    it('skip first in order', async () => {
                        const c = await humansCollection.create();
                        const docs = await c.find().sort({
                            passportId: 'asc'
                        }).exec();
                        const noFirst = await c.find().sort({
                            passportId: 'asc'
                        }).skip(1).exec();
                        assert.ok(noFirst[0] && docs[1]);
                        assert.strictEqual(noFirst[0]._data.passportId, docs[1]._data.passportId);
                        c.database.destroy();
                    });
                    it('skip first and limit', async () => {
                        const c = await humansCollection.create();
                        const docs: any = await c.find().exec();
                        const second: any = await c.find().skip(1).limit(1).exec();
                        assert.deepStrictEqual(second[0].data, docs[1].data);
                        c.database.destroy();
                    });
                    it('reset skip with .skip(null)', async () => {
                        const c = await humansCollection.create();
                        const docs = await c.find().exec();
                        const noFirst = await c.find().skip(1).skip(null).exec();
                        assert.ok(noFirst[0] && docs[1]);
                        assert.notStrictEqual(noFirst[0]._data.passportId, docs[1]._data.passportId);
                        c.database.destroy();
                    });
                });
            });
            describe('.regex()', () => {
                describe('positive', () => {
                    it('find the one where the regex matches', async () => {
                        const c = await humansCollection.create(10);
                        const matchHuman = schemaObjects.human();
                        matchHuman.firstName = 'FooMatchBar';
                        await c.insert(matchHuman);
                        const docs = await c.find()
                            .where('firstName').regex(/Match/)
                            .exec();
                        assert.strictEqual(docs.length, 1);
                        const firstDoc = docs[0];
                        assert.ok(firstDoc);
                        assert.strictEqual(firstDoc.get('firstName'), matchHuman.firstName);
                        c.database.destroy();
                    });
                    it('case sensitive regex', async () => {
                        const c = await humansCollection.create(10);
                        const matchHuman = schemaObjects.human();
                        matchHuman.firstName = 'FooMatchBar';
                        await c.insert(matchHuman);
                        const docs = await c.find()
                            .where('firstName').regex(/match/i)
                            .exec();

                        assert.strictEqual(docs.length, 1);
                        const firstDoc = docs[0];
                        assert.ok(firstDoc);
                        assert.strictEqual(firstDoc.get('firstName'), matchHuman.firstName);
                        c.database.destroy();
                    });
                    it('regex on index', async () => {
                        const c = await humansCollection.create(10);
                        const matchHuman = schemaObjects.human();
                        matchHuman.passportId = 'FooMatchBar';
                        await c.insert(matchHuman);
                        const docs = await c.find()
                            .where('passportId').regex(/Match/)
                            .exec();

                        assert.strictEqual(docs.length, 1);
                        const firstDoc = docs[0];
                        assert.ok(firstDoc);
                        assert.strictEqual(firstDoc.get('passportId'), matchHuman.passportId);
                        c.database.destroy();
                    });
                });
                describe('negative', () => {
                    /**
                     * @link https://docs.cloudant.com/cloudant_query.html#creating-selector-expressions
                     */
                    it('regex on primary should throw', async () => {
                        const c = await humansCollection.createPrimary(0);
                        await AsyncTestUtil.assertThrows(
                            () => c.find().where('passportId').regex(/Match/).exec(),
                            'RxError',
                            'regex'
                        );
                        c.database.destroy();
                    });
                });
            });
            describe('.remove()', () => {
                it('should remove all documents', async () => {
                    const c = await humansCollection.create(10);
                    const query = c.find();
                    const removed = await query.remove();
                    assert.strictEqual(removed.length, 10);
                    removed.forEach(doc => {
                        assert.ok(isRxDocument(doc));
                        assert.strictEqual(doc.deleted, true);
                    });
                    const docsAfter = await c.find().exec();
                    assert.strictEqual(docsAfter.length, 0);
                    c.database.destroy();
                });
                it('should remove only found documents', async () => {
                    const c = await humansCollection.create(10);
                    const query = c.find().limit(5);
                    const removed = await query.remove();
                    assert.strictEqual(removed.length, 5);
                    removed.forEach(doc => {
                        assert.ok(isRxDocument(doc));
                        assert.strictEqual(doc.deleted, true);
                    });
                    const docsAfter = await c.find().exec();
                    assert.strictEqual(docsAfter.length, 5);
                    c.database.destroy();
                });
                it('remove on findOne', async () => {
                    const c = await humansCollection.create(10);
                    const query = c.findOne();
                    const removed: any = await query.remove();
                    assert.ok(isRxDocument(removed));
                    assert.strictEqual(removed.deleted, true);
                    const docsAfter = await c.find().exec();
                    assert.strictEqual(docsAfter.length, 9);
                    c.database.destroy();
                });
            });
            describe('.update()', () => {
                it('sets a field in all documents', async () => {
                    const c = await humansCollection.create(2);
                    const query = c.find();
                    await query.update({
                        $set: {
                            firstName: 'new first name'
                        }
                    });
                    const docsAfterUpdate = await c.find().exec();
                    for (const doc of docsAfterUpdate)
                        assert.strictEqual(doc._data.firstName, 'new first name');
                    c.database.destroy();
                });
                it('unsets fields in all documents', async () => {
                    const c = await humansCollection.create(10);
                    const query = c.find();
                    await query.update({
                        $unset: {
                            age: ''
                        }
                    });
                    const docsAfterUpdate = await c.find().exec();
                    for (const doc of docsAfterUpdate)
                        assert.strictEqual(doc.age, undefined);
                    c.database.destroy();
                });
            });
        });
        describe('.findOne()', () => {
            describe('positive', () => {
                it('find a single document', async () => {
                    const c = await humansCollection.create();
                    const doc = await c.findOne().exec();
                    assert.ok(isRxDocument(doc));
                    c.database.destroy();
                });
                it('not crash on empty db', async () => {
                    const c = await humansCollection.create(0);
                    const docs = await c.find().limit(1).exec();
                    assert.strictEqual(docs.length, 0);
                    const doc = await c.findOne().exec();
                    assert.strictEqual(doc, null);
                    c.database.destroy();
                });
                it('find different on .skip()', async () => {
                    const c = await humansCollection.create();
                    const doc: any = await c.findOne().exec();
                    const doc2: any = await c.findOne().skip(2).exec();
                    assert.ok(isRxDocument(doc));
                    assert.ok(isRxDocument(doc2));
                    assert.notStrictEqual(doc._data.passportId, doc2._data.passportId);
                    c.database.destroy();
                });
                it('find by primary', async () => {
                    const c = await humansCollection.create();
                    const doc: any = await c.findOne().exec();
                    const _id = doc.primary;
                    assert.strictEqual(typeof _id, 'string');
                    const docById: any = await c.findOne(_id).exec();
                    assert.deepStrictEqual(docById.data, doc.data);
                    c.database.destroy();
                });
                it('find by primary in parallel', async () => {
                    const c = await humansCollection.createPrimary(0);

                    const docData = schemaObjects.simpleHuman();
                    const primary = docData.passportId;

                    const notExist = await c.findOne(primary).exec();
                    assert.strictEqual(notExist, null);

                    const insertedDoc = await c.insert(docData);
                    assert.ok(isRxDocument(insertedDoc));

                    const results = await Promise.all([
                        c.findOne(primary).exec(true),
                        c.findOne(primary).exec(true)
                    ]);
                    assert.ok(isRxDocument(results[0]));

                    assert.ok(results[0] === results[1]);

                    await results[0].atomicSet('firstName', 'foobar');

                    const results2 = await Promise.all([
                        c.findOne(primary).exec(),
                        c.findOne(primary).exec()
                    ]);
                    assert.ok(isRxDocument(results2[0]));
                    assert.ok(results2[0] === results2[1]);

                    c.database.destroy();
                });
                it('BUG: insert and find very often', async function () {
                    this.timeout(5000);
                    const amount = 10;
                    for (let i = 0; i < amount; i++) {
                        const db = await createRxDatabase({
                            name: randomCouchString(10),
                            adapter: 'memory'
                        });
                        const collection = await db.collection({
                            name: 'human',
                            schema: schemas.human
                        });
                        const human = schemaObjects.human();
                        const passportId = human.passportId;
                        await collection.insert(human);
                        const doc = await collection.findOne().exec();
                        assert.strictEqual(passportId, doc._data.passportId);
                        db.destroy();
                    }
                });
            });
            describe('negative', () => {
                it('BUG: should throw when no-string given (number)', async () => {
                    const c = await humansCollection.create();
                    assert.throws(
                        () => (c as any).findOne(5),
                        TypeError
                    );
                    c.database.destroy();
                });
                it('BUG: should throw when no-string given (array)', async () => {
                    const c = await humansCollection.create();
                    assert.throws(
                        () => (c as any).findOne([]),
                        TypeError
                    );
                    c.database.destroy();
                });
            });
        });
        describe('.upsert()', () => {
            describe('positive', () => {
                it('insert when not exists', async () => {
                    const db = await createRxDatabase({
                        name: randomCouchString(10),
                        adapter: 'memory'
                    });
                    const collection = await db.collection({
                        name: 'human',
                        schema: schemas.primaryHuman
                    });
                    const obj = schemaObjects.simpleHuman();
                    obj.firstName = 'foobar';
                    await collection.upsert(obj);
                    const doc = await collection.findOne().exec();
                    assert.strictEqual(doc.firstName, 'foobar');
                    db.destroy();
                });
                it('overwrite exisiting document', async () => {
                    const db = await createRxDatabase({
                        name: randomCouchString(10),
                        adapter: 'memory'
                    });
                    const collection = await db.collection({
                        name: 'human',
                        schema: schemas.primaryHuman
                    });
                    const obj = schemaObjects.simpleHuman();
                    await collection.insert(obj);
                    obj.firstName = 'foobar';
                    await collection.upsert(obj);
                    const doc = await collection.findOne().exec();
                    assert.strictEqual(doc.firstName, 'foobar');
                    db.destroy();
                });
                it('overwrite twice', async () => {
                    const db = await createRxDatabase({
                        name: randomCouchString(10),
                        adapter: 'memory'
                    });
                    const collection = await db.collection({
                        name: 'human',
                        schema: schemas.primaryHuman
                    });
                    const obj = schemaObjects.simpleHuman();
                    await collection.insert(obj);
                    obj.firstName = 'foobar';
                    await collection.upsert(obj);

                    obj.firstName = 'foobar2';
                    await collection.upsert(obj);

                    const doc = await collection.findOne().exec();
                    assert.strictEqual(doc.firstName, 'foobar2');
                    db.destroy();
                });
            });
            describe('negative', () => {
                it('throw when primary missing', async () => {
                    const db = await createRxDatabase({
                        name: randomCouchString(10),
                        adapter: 'memory'
                    });
                    const collection = await db.collection({
                        name: 'human',
                        schema: schemas.primaryHuman
                    });
                    const obj = schemaObjects.simpleHuman();
                    await collection.insert(obj);
                    const cloned: any = clone(obj);

                    cloned.firstName = 'foobar';
                    delete cloned.passportId;
                    await AsyncTestUtil.assertThrows(
                        () => collection.upsert(cloned),
                        'RxError',
                        'without primary'
                    );
                    db.destroy();
                });
                it('throw when schema not matching', async () => {
                    const db = await createRxDatabase({
                        name: randomCouchString(10),
                        adapter: 'memory'
                    });
                    const collection = await db.collection({
                        name: 'human',
                        schema: schemas.primaryHuman
                    });
                    const obj: any = schemaObjects.simpleHuman();
                    obj.firstName = 'foobar';
                    obj['foo'] = 'bar';
                    await AsyncTestUtil.assertThrows(
                        () => collection.upsert(obj),
                        'RxError',
                        'not match'
                    );
                    db.destroy();
                });
            });
        });
        describe('.atomicUpsert()', () => {
            describe('positive', () => {
                it('should work in serial', async () => {
                    const c = await humansCollection.createPrimary(0);
                    const docData = schemaObjects.simpleHuman();
                    const primary = docData.passportId;
                    await c.findOne(primary).exec();
                    await c.atomicUpsert(docData);
                    await c.findOne(primary).exec();
                    const docData2 = clone(docData);
                    docData.firstName = 'foobar';

                    await c.atomicUpsert(docData2);
                    c.database.destroy();
                });
                it('should not crash when upserting the same doc in parallel', async () => {
                    const c = await humansCollection.createPrimary(0);
                    const docData = schemaObjects.simpleHuman();
                    const docs = await Promise.all([
                        c.atomicUpsert(docData),
                        c.atomicUpsert(docData)
                    ]);
                    assert.ok(docs[0] === docs[1]);
                    assert.ok(isRxDocument(docs[0]));
                    c.database.destroy();
                });
                it('should not crash when upserting the same doc in parallel 3 times', async () => {
                    const c = await humansCollection.createPrimary(0);
                    const docData = schemaObjects.simpleHuman();
                    const docs = await Promise.all([
                        c.atomicUpsert(docData),
                        c.atomicUpsert(docData),
                        c.atomicUpsert(docData)
                    ]);
                    assert.ok(docs[0] === docs[1]);
                    assert.ok(isRxDocument(docs[0]));
                    c.database.destroy();
                });
                it('should update the value', async () => {
                    const c = await humansCollection.createPrimary(0);
                    const docData = schemaObjects.simpleHuman();
                    await Promise.all([
                        c.atomicUpsert(docData),
                        c.atomicUpsert(docData),
                        c.atomicUpsert(docData)
                    ]);

                    const docData2 = clone(docData);
                    docData2.firstName = 'foobar';
                    await c.atomicUpsert(docData2);
                    const doc = await c.findOne().exec(true);
                    assert.strictEqual(doc.firstName, 'foobar');

                    c.database.destroy();
                });
                it('should work when upserting to existing document', async () => {
                    const c = await humansCollection.createPrimary(0);
                    const docData = schemaObjects.simpleHuman();
                    await c.insert(docData);
                    const docs = await Promise.all([
                        c.atomicUpsert(docData),
                        c.atomicUpsert(docData),
                        c.atomicUpsert(docData)
                    ]);
                    assert.ok(docs[0] === docs[1]);
                    assert.ok(isRxDocument(docs[0]));
                    c.database.destroy();
                });
                it('should process in the given order', async () => {
                    const c = await humansCollection.createPrimary(0);
                    const docData = schemaObjects.simpleHuman();
                    const order: any[] = [];
                    await Promise.all([
                        c.atomicUpsert(docData).then(() => order.push(0)),
                        c.atomicUpsert(docData).then(() => order.push(1)),
                        c.atomicUpsert(docData).then(() => order.push(2))
                    ]);
                    assert.deepStrictEqual(order, [0, 1, 2]);

                    c.database.destroy();
                });
                it('should work when inserting on a slow storage', async () => {
                    if (!config.platform.isNode()) return;
                    // use a 'slow' adapter because memory might be to fast
                    const leveldown = require('leveldown');
                    const db = await createRxDatabase({
                        name: config.rootPath + 'test_tmp/' + randomCouchString(10),
                        adapter: leveldown
                    });
                    const c = await db.collection({
                        name: 'humans',
                        schema: schemas.primaryHuman
                    });

                    const docData = schemaObjects.simpleHuman();
                    await c.atomicUpsert(docData);
                    await c.atomicUpsert(docData);
                    const docData2 = clone(docData);
                    docData2.firstName = 'foobar1';
                    await c.atomicUpsert(docData2);
                    const docs = await c.find().exec();
                    assert.strictEqual(docs.length, 1);
                    const doc = await c.findOne().exec();
                    assert.strictEqual(doc.firstName, 'foobar1');

                    db.destroy();
                });
                it('should set correct default values', async () => {
                    const db = await createRxDatabase({
                        name: randomCouchString(10),
                        adapter: 'memory'
                    });

                    const schema: RxJsonSchema<HumanDocumentType> = clone(schemas.humanDefault);
                    (schema.properties.passportId as PrimaryProperty).primary = true;

                    const defaultValue = schema.properties.age.default;
                    const collection = await db.collection({
                        name: 'nestedhuman',
                        schema
                    });

                    const doc = await collection.atomicUpsert({
                        passportId: 'foobar',
                        firstName: 'foobar2'
                    });

                    assert.strictEqual(doc.age, defaultValue);

                    // should also set after atomicUpdate when document exists
                    const afterUpdate = await collection.atomicUpsert({
                        passportId: 'foobar',
                        firstName: 'foobar3'
                    });
                    assert.strictEqual(afterUpdate.age, defaultValue);

                    db.destroy();
                });
                it('should completely remove fields that are unset', async () => {
                    const db = await createRxDatabase({
                        name: randomCouchString(10),
                        adapter: 'memory'
                    });
                    const schema: RxJsonSchema<HumanDocumentType> = clone(schemas.humanDefault);
                    (schema.properties.passportId as PrimaryProperty).primary = true;

                    const collection = await db.collection({
                        name: 'nestedhuman',
                        schema
                    });

                    const doc = await collection.atomicUpsert({
                        passportId: 'foobar',
                        firstName: 'foobar2'
                    });
                    assert.strictEqual(doc.firstName, 'foobar2');

                    const afterUpdate = await collection.atomicUpsert({
                        passportId: 'foobar'
                    });
                    assert.strictEqual(typeof afterUpdate.firstName, 'undefined');

                    db.destroy();
                });
            });
            describe('negative', () => {
                it('should throw when not matching schema', async () => {
                    const c = await humansCollection.createPrimary(0);
                    const docData = schemaObjects.simpleHuman();
                    await Promise.all([
                        c.atomicUpsert(docData),
                        c.atomicUpsert(docData),
                        c.atomicUpsert(docData)
                    ]);
                    const docData2 = clone(docData);
                    docData2['firstName'] = 1337 as any;
                    await AsyncTestUtil.assertThrows(
                        () => c.atomicUpsert(docData2),
                        'RxError',
                        'schema'
                    );
                    c.database.destroy();
                });
            });
        });
        describe('.remove()', () => {
            describe('positive', () => {
                it('should not crash', async () => {
                    const c = await humansCollection.createPrimary(0);
                    await c.remove();
                    c.database.destroy();
                });
                it('should be possible to re-create the collection with different schema', async () => {
                    const db = await createRxDatabase({
                        name: randomCouchString(10),
                        adapter: 'memory'
                    });
                    const collection = await db.collection({
                        name: 'human',
                        schema: schemas.primaryHuman
                    });
                    await collection.remove();
                    const otherSchema: any = clone(schemas.primaryHuman);
                    otherSchema.properties['foobar'] = {
                        type: 'string'
                    };
                    await db.collection({
                        name: 'human',
                        schema: otherSchema
                    });
                    db.destroy();
                });
                it('should not contain document when re-creating', async () => {
                    const db = await createRxDatabase({
                        name: randomCouchString(10),
                        adapter: 'memory'
                    });
                    const collection = await db.collection({
                        name: 'human',
                        schema: schemas.primaryHuman
                    });
                    await Promise.all(
                        new Array(5).fill(0)
                            .map(() => collection.insert(schemaObjects.human()))
                    );
                    const allDocs = await collection.find().exec();
                    assert.strictEqual(5, allDocs.length);
                    await collection.remove();

                    const collection2 = await db.collection({
                        name: 'human',
                        schema: schemas.primaryHuman
                    });
                    const noDocs = await collection2.find().exec();
                    assert.strictEqual(0, noDocs.length);
                    db.destroy();
                });
                it('should delete when older versions exist', async () => {
                    const db = await createRxDatabase({
                        name: randomCouchString(10),
                        adapter: 'memory'
                    });
                    const collection = await db.collection({
                        name: 'human',
                        schema: schemas.primaryHuman
                    });
                    await Promise.all(
                        new Array(5).fill(0)
                            .map(() => collection.insert(schemaObjects.human()))
                    );
                    await collection.remove();

                    const otherSchema = clone(schemas.primaryHuman);
                    otherSchema.version = 1;
                    const collection2 = await db.collection({
                        name: 'human',
                        schema: otherSchema,
                        migrationStrategies: {
                            1: function (doc: any) {
                                return doc;
                            }
                        }
                    });
                    const noDocs = await collection2.find().exec();
                    assert.strictEqual(noDocs.length, 0);
                    await Promise.all(
                        new Array(5).fill(0)
                            .map(() => collection2.insert(schemaObjects.human()))
                    );
                    const fiveDocs = await collection2.find().exec();
                    assert.strictEqual(fiveDocs.length, 5);
                    await collection2.remove();


                    const collection0Again = await db.collection({
                        name: 'human',
                        schema: schemas.primaryHuman
                    });
                    const noDocs2 = await collection0Again.find().exec();
                    assert.strictEqual(noDocs2.length, 0);

                    db.destroy();
                });
            });
            describe('negative', () => {
                it('should not be possible to use the cleared collection', async () => {
                    const c = await humansCollection.createPrimary(0);
                    await c.remove();
                    await AsyncTestUtil.assertThrows(
                        () => c.find().exec(),
                        Error
                    );
                    c.database.destroy();
                });
                it('should not have the collection in the collections-list', async () => {
                    const c = await humansCollection.createPrimary(0);
                    const db = c.database;
                    const name = c.name;
                    await c.remove();
                    assert.strictEqual(undefined, db[name]);
                    c.database.destroy();
                });
            });
        });
        describe('.findByIds()', () => {
            it('should not crash', async () => {
                const c = await humansCollection.create();
                const res = await c.findByIds([
                    'foo',
                    'bar'
                ]);
                assert.ok(res);
                c.database.destroy();
            });
            it('should find the documents', async () => {
                const c = await humansCollection.create(5);

                const docs = await c.find().exec();
                const ids = docs.map(d => d.primary);
                const res = await c.findByIds(ids);

                assert.ok(docs[0] && res.has(docs[0].primary));
                assert.strictEqual(res.size, 5);

                c.database.destroy();
            });
            it('should find the documents when they are not in the docCache', async () => {
                const c = await humansCollection.create(5);
                const docs = await c.find().exec();
                const ids = docs.map(d => d.primary);

                // clear docCache
                ids.forEach(id => c._docCache.delete(id));

                const res = await c.findByIds(ids);
                assert.strictEqual(res.size, 5);
                c.database.destroy();
            });
        });
    });
    describe('.findByIds$()', () => {
        it('should not crash and emit a map', async () => {
            const c = await humansCollection.create(5);
            const docs = await c.find().exec();
            const ids = docs.map(d => d.primary);
            const res = await firstValueFrom(c.findByIds$(ids));

            assert.ok(res);
            assert.ok(res instanceof Map);

            c.database.destroy();
        });
        it('should emit the correct initial values', async () => {
            const c = await humansCollection.create(5);

            const docs = await c.find().exec();
            const ids = docs.map(d => d.primary);
            const res = await firstValueFrom(c.findByIds$(ids));

            assert.ok(docs[0] && res.has(docs[0].primary));
            assert.strictEqual(res.size, 5);

            c.database.destroy();
        });
        it('should merge the insert/update/delete event correctly', async () => {
            const c = await humansCollection.createPrimary(5);
            const docs = await c.find().exec();
            const ids = docs.map(d => d.primary);
            ids.push('foobar');
            const obs = c.findByIds$(ids);
            await firstValueFrom(obs);

            // check insert
            const addData = schemaObjects.human();
            addData.passportId = 'foobar';
            await c.insert(addData);
            // insert whose id is not in ids-list should not affect anything
            await c.insert(schemaObjects.human());


            const res2 = await firstValueFrom(obs);
            assert.strictEqual(res2.size, 6);
            assert.ok(res2.has('foobar'));

            // check update
            addData.firstName = 'barfoo';
            await c.upsert(addData);
            const res3 = await firstValueFrom(obs);
            const getDoc = res3.get('foobar');
            assert.ok(getDoc);
            assert.strictEqual(getDoc.firstName, 'barfoo');

            // check delete
            await getDoc.remove();
            const res4 = await firstValueFrom(obs);
            assert.strictEqual(false, res4.has('foobar'));

            c.database.destroy();
        });

    });
    describe('issues', () => {
        it('#528  default value ignored when 0', async () => {
            const schema = {
                version: 0,
                type: 'object',
                properties: {
                    passportId: {
                        type: 'string',
                        primary: true
                    },
                    weight: {
                        type: 'number',
                        default: 0
                    }
                }
            };
            const db = await createRxDatabase({
                name: randomCouchString(10),
                adapter: 'memory'
            });
            const collection = await db.collection({
                name: 'humanx',
                schema
            });
            const doc = await collection.insert({
                passportId: randomCouchString(10)
            });
            assert.strictEqual(doc.weight, 0);
            db.destroy();
        });
        it('#596 Default value not applied when value is undefined', async () => {
            const schema = {
                version: 0,
                type: 'object',
                properties: {
                    passportId: {
                        type: 'string',
                        primary: true
                    },
                    firstName: {
                        type: 'string'
                    },
                    lastName: {
                        type: 'string'
                    },
                    age: {
                        type: 'integer',
                        minimum: 0,
                        maximum: 150
                    },
                    score: {
                        type: 'integer',
                        default: 100
                    }
                }
            };
            const db = await createRxDatabase({
                name: randomCouchString(10),
                adapter: 'memory'
            });
            const collection = await db.collection({
                name: 'humanx',
                schema
            });
            // insert a document
            await collection.insert({
                passportId: 'foobar',
                firstName: 'Bob',
                lastName: 'Kelso',
                age: 56,
                score: undefined
            });
            const myDocument = await collection
                .findOne()
                .where('firstName')
                .eq('Bob')
                .exec();
            assert.strictEqual(myDocument.score, 100);
            db.destroy();
        });
        it('auto_compaction not works on collection-level https://gitter.im/pubkey/rxdb?at=5c42f3dd0721b912a5a4366b', async () => {
            const db = await createRxDatabase({
                name: randomCouchString(10),
                adapter: 'memory'
            });

            // test with auto_compaction
            const collection: any = await db.collection({
                name: 'human_compact',
                schema: schemas.primaryHuman,
                pouchSettings: {
                    auto_compaction: true
                }
            });
            assert.ok(collection.pouch.auto_compaction);
            db.destroy();
        });
        it('#939 creating a collection mutates the given parameters-object', async () => {
            const schema = {
                version: 0,
                type: 'object',
                properties: {
                    passportId: {
                        type: 'string',
                        primary: true
                    },
                    weight: {
                        type: 'number',
                        default: 0
                    }
                }
            };
            const db = await createRxDatabase({
                name: randomCouchString(10),
                adapter: 'memory'
            });

            const collectionParams = {
                name: 'humans',
                schema,
                methods: {
                    foo() {
                        return 'bar';
                    }
                },
                statics: {
                    foo2() {
                        return 'bar2';
                    }
                }
            };
            const cloned = clone(collectionParams);
            await db.collection(
                collectionParams
            );
            assert.deepStrictEqual(Object.keys(cloned), Object.keys(collectionParams));
            assert.deepStrictEqual(cloned, collectionParams);

            await db.destroy();

            // recreating with the same params-object should work
            const db2 = await createRxDatabase({
                name: randomCouchString(10),
                adapter: 'memory'
            });
            await db2.collection(
                collectionParams
            );
            assert.deepStrictEqual(cloned, collectionParams);

            db2.destroy();
        });
    });
});
