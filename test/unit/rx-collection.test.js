import assert from 'assert';
import randomInt from 'random-int';
import randomToken from 'random-token';
import clone from 'clone';
import config from './config';
import AsyncTestUtil from 'async-test-util';

import * as schemas from '../helper/schemas';
import * as schemaObjects from '../helper/schema-objects';
import * as humansCollection from '../helper/humans-collection';

import * as RxDB from '../../dist/lib/index';
import * as RxDatabase from '../../dist/lib/rx-database';
import * as RxDocument from '../../dist/lib/rx-document';
import * as RxSchema from '../../dist/lib/rx-schema';
import * as RxCollection from '../../dist/lib/rx-collection';
import * as util from '../../dist/lib/util';


config.parallel('rx-collection.test.js', () => {
    describe('static', () => {
        describe('.create()', () => {
            describe('positive', () => {
                it('human', async () => {
                    const db = await RxDatabase.create({
                        name: util.randomCouchString(10),
                        adapter: 'memory'
                    });
                    const schema = RxSchema.create(schemas.human);
                    const collection = await RxCollection.create({
                        database: db,
                        name: 'humanx',
                        schema
                    });
                    assert.equal(collection.constructor.name, 'RxCollection');
                    db.destroy();
                });
                it('use Schema-Object', async () => {
                    const db = await RxDatabase.create({
                        name: util.randomCouchString(10),
                        adapter: 'memory'
                    });
                    const schema = RxSchema.create(schemas.human);
                    const collection = await RxCollection.create({
                        database: db,
                        name: 'human',
                        schema
                    });
                    assert.equal(collection.constructor.name, 'RxCollection');
                    db.destroy();
                });
                it('index', async () => {
                    const col = await humansCollection.create(1);
                    const indexes = await col.pouch.getIndexes();
                    const compressedKey = col._keyCompressor.table.passportId;
                    const has = indexes.indexes
                        .map(i => i.def.fields[0])
                        .filter(i => !!i[compressedKey]);
                    assert.equal(has.length, 1);
                    col.database.destroy();
                });
                it('should create compound-indexes (keyCompression: false)', async () => {
                    const db = await RxDatabase.create({
                        name: util.randomCouchString(10),
                        adapter: 'memory'
                    });
                    const schemaJSON = clone(schemas.compoundIndex);
                    schemaJSON.keyCompression = false;
                    const schema = RxSchema.create(schemaJSON);
                    const col = await RxCollection.create({
                        database: db,
                        name: 'human',
                        schema
                    });
                    const indexes = await col.pouch.getIndexes();
                    assert.equal(indexes.indexes.length, 2);
                    const lastIndexDefFields = indexes.indexes[1].def.fields;
                    assert.deepEqual(
                        lastIndexDefFields, [{
                            'passportId': 'asc'
                        }, {
                            'passportCountry': 'asc'
                        }]
                    );
                    db.destroy();
                });
                it('should create compound-indexes', async () => {
                    const db = await RxDatabase.create({
                        name: util.randomCouchString(10),
                        adapter: 'memory'
                    });
                    const schema = RxSchema.create(schemas.compoundIndex);
                    const col = await RxCollection.create({
                        database: db,
                        name: 'human',
                        schema
                    });
                    const indexes = await col.pouch.getIndexes();
                    assert.equal(indexes.indexes.length, 2);
                    const lastIndexDefFields = indexes.indexes[1].def.fields;
                    assert.deepEqual(
                        lastIndexDefFields, [{
                            '|b': 'asc'
                        }, {
                            '|a': 'asc'
                        }]
                    );
                    db.destroy();
                });
                it('should have the version-number in the pouchdb-prefix', async () => {
                    const db = await RxDatabase.create({
                        name: util.randomCouchString(10),
                        adapter: 'memory'
                    });
                    const schema = RxSchema.create(schemas.human);
                    const collection = await RxCollection.create({
                        database: db,
                        name: 'human',
                        schema
                    });
                    assert.deepEqual(schema.version, 0);
                    assert.ok(collection.pouch.name.includes('-' + schema.version + '-'));
                    db.destroy();
                });
                it('should not forget the options', async () => {
                    const db = await RxDatabase.create({
                        name: util.randomCouchString(10),
                        adapter: 'memory'
                    });
                    const collection = await db.collection({
                        database: db,
                        name: 'human',
                        schema: schemas.human,
                        options: {
                            foo: 'bar'
                        }
                    });
                    assert.equal(collection.options.foo, 'bar');
                    db.destroy();
                });
            });
            describe('negative', () => {
                it('crash if no Schema-instance', async () => {
                    const db = await RxDatabase.create({
                        name: util.randomCouchString(10),
                        adapter: 'memory'
                    });
                    await AsyncTestUtil.assertThrows(
                        () => RxCollection.create(db, 'human', schemas.human),
                        TypeError
                    );
                    db.destroy();
                });
                it('crash if no database-object', async () => {
                    const db = {};
                    const schema = RxSchema.create(schemas.human);
                    await AsyncTestUtil.assertThrows(
                        () => RxCollection.create({
                            database: db,
                            name: 'human',
                            schema
                        }),
                        TypeError
                    );
                });
                it('crash if no name-object', async () => {
                    const db = await RxDatabase.create({
                        name: util.randomCouchString(10),
                        adapter: 'memory'
                    });
                    const schema = RxSchema.create(schemas.human);
                    await AsyncTestUtil.assertThrows(
                        () => RxCollection.create({
                            database: db,
                            name: null,
                            schema
                        }),
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
                    const db = await RxDatabase.create({
                        name: util.randomCouchString(10),
                        adapter: 'memory'
                    });
                    const schema = RxSchema.create(schemas.human);

                    await AsyncTestUtil.assertThrows(
                        () => RxCollection.create({
                            database: db,
                            name: '_foobar',
                            schema
                        }),
                        'RxError',
                        'foobar'
                    );
                    db.destroy();
                });
                it('allow numbers', async () => {
                    const db = await RxDatabase.create({
                        name: util.randomCouchString(10),
                        adapter: 'memory'
                    });
                    const schema = RxSchema.create(schemas.human);
                    const collection1 = await RxCollection.create({
                        database: db,
                        name: 'fooba4r',
                        schema
                    });
                    assert.equal(collection1.constructor.name, 'RxCollection');
                    const collection2 = await RxCollection.create({
                        database: db,
                        name: 'foobar4',
                        schema
                    });
                    assert.equal(collection2.constructor.name, 'RxCollection');
                    db.destroy();
                });
            });
            describe('negative', () => {
                it('not allow starting numbers', async () => {
                    const db = await RxDatabase.create({
                        name: util.randomCouchString(10),
                        adapter: 'memory'
                    });
                    const schema = RxSchema.create(schemas.human);
                    await AsyncTestUtil.assertThrows(
                        () => RxCollection.create({
                            database: db,
                            name: '0foobar',
                            schema
                        }),
                        'RxError'
                    );
                    db.destroy();
                });
                it('not allow uppercase-letters', async () => {
                    const db = await RxDatabase.create({
                        name: util.randomCouchString(10),
                        adapter: 'memory'
                    });
                    const schema = RxSchema.create(schemas.human);
                    await AsyncTestUtil.assertThrows(
                        () => RxCollection.create({
                            database: db,
                            name: 'Foobar',
                            schema
                        }),
                        'RxError'
                    );
                    await AsyncTestUtil.assertThrows(
                        () => RxCollection.create({
                            database: db,
                            name: 'fooBar',
                            schema
                        }),
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
                    const db = await RxDatabase.create({
                        name: util.randomCouchString(10),
                        adapter: 'memory'
                    });
                    const collection = await db.collection({
                        name: 'human',
                        schema: schemas.human
                    });
                    await collection.insert(schemaObjects.human());
                    db.destroy();
                });
                it('should insert nested human', async () => {
                    const db = await RxDatabase.create({
                        name: util.randomCouchString(10),
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
                    const db = await RxDatabase.create({
                        name: util.randomCouchString(10),
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
                    const db = await RxDatabase.create({
                        name: util.randomCouchString(10),
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
                    assert.equal(doc.age, 20);

                    db.destroy();
                });
            });
            describe('negative', () => {
                it('should not insert broken human (required missing)', async () => {
                    const db = await RxDatabase.create({
                        name: util.randomCouchString(10),
                        adapter: 'memory'
                    });
                    const collection = await db.collection({
                        name: 'human',
                        schema: schemas.human
                    });
                    const human = schemaObjects.human();
                    delete human.firstName;
                    await AsyncTestUtil.assertThrows(
                        () => collection.insert(human),
                        'RxError',
                        'not match schema'
                    );
                    db.destroy();
                });
                it('should not insert broken human (_id given)', async () => {
                    const db = await RxDatabase.create({
                        name: util.randomCouchString(10),
                        adapter: 'memory'
                    });
                    const collection = await db.collection({
                        name: 'human',
                        schema: schemas.human
                    });
                    const human = schemaObjects.human();
                    human._id = util.randomCouchString(20);
                    await AsyncTestUtil.assertThrows(
                        () => collection.insert(human),
                        'RxError',
                        'not provide'
                    );
                    db.destroy();
                });
                it('should not insert a non-json object', async () => {
                    const db = await RxDatabase.create({
                        name: util.randomCouchString(10),
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
                    const db = await RxDatabase.create({
                        name: util.randomCouchString(10),
                        adapter: 'memory'
                    });
                    const collection = await db.collection({
                        name: 'human',
                        schema: schemas.human
                    });
                    const human = schemaObjects.human();
                    human.any = util.randomCouchString(20);
                    await AsyncTestUtil.assertThrows(
                        () => collection.insert(human),
                        'RxError',
                        'not match schema'
                    );
                    db.destroy();
                });
                it('should not insert when primary is missing', async () => {
                    const db = await RxDatabase.create({
                        name: util.randomCouchString(10),
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
                            assert.ok(RxDocument.isInstanceOf(doc));
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
                        assert.equal(docs.length, 0);
                        await c.insert(docData);
                        const docs2 = await c.find().exec();
                        assert.equal(docs2.length, 1);
                        c.database.destroy();
                    });
                    it('find all by empty object', async () => {
                        const c = await humansCollection.create();
                        const docs = await c.find({}).exec();
                        assert.ok(docs.length >= 10);
                        for (const doc of docs) {
                            assert.ok(RxDocument.isInstanceOf(doc));
                        }
                        c.database.destroy();
                    });
                    it('find nothing with empty collection', async () => {
                        const db = await RxDatabase.create({
                            name: util.randomCouchString(10),
                            adapter: 'memory'
                        });
                        const schema = RxSchema.create(schemas.human);
                        const collection = await RxCollection.create({
                            database: db,
                            name: 'humanx',
                            schema
                        });
                        const docs = await collection.find({}).exec();
                        assert.deepEqual(docs, []);
                        db.destroy();
                    });
                    it('BUG: insert and find very often', async () => {
                        const amount = 10;
                        for (let i = 0; i < amount; i++) {
                            const db = await RxDatabase.create({
                                name: util.randomCouchString(10),
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
                            assert.equal(passportId, doc._data.passportId);
                            db.destroy();
                        }
                    });
                });
                describe('negative', () => {
                    it('should crash with string as query', async () => {
                        const c = await humansCollection.create();
                        await AsyncTestUtil.assertThrows(
                            () => c.find('foobar').exec(),
                            'RxError',
                            'findOne'
                        );
                        c.database.destroy();
                    });
                    it('should crash with array as query', async () => {
                        const c = await humansCollection.create();
                        await AsyncTestUtil.assertThrows(
                            () => c.find([]).exec(),
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
                        docs = util.shuffleArray(docs);
                        const last = docs.pop();
                        const passportId = last._data.passportId;
                        let doc = await c.find({
                            passportId
                        }).exec();
                        assert.equal(doc.length, 1);
                        doc = doc[0];
                        assert.deepEqual(doc.data, last.data);
                        c.database.destroy();
                    });
                    it('find none with random passportId', async () => {
                        const c = await humansCollection.create();
                        const docs = await c.find({
                            passportId: util.randomCouchString(10)
                        }).exec();
                        assert.equal(docs.length, 0);
                        c.database.destroy();
                    });
                    it('find via $eq', async () => {
                        const c = await humansCollection.create();
                        let docs = await c.find().exec();
                        docs = util.shuffleArray(docs);
                        const last = docs.pop();
                        const passportId = last._data.passportId;
                        let doc = await c.find({
                            passportId: {
                                $eq: passportId
                            }
                        }).exec();
                        assert.equal(doc.length, 1);
                        doc = doc[0];
                        assert.deepEqual(doc.data, last.data);
                        c.database.destroy();
                    });
                });
                describe('negative', () => {});
            });
            describe('.or()', () => {
                it('should find the 2 documents with the or-method', async () => {
                    const c = await humansCollection.create(10);
                    // add 2 docs to be found
                    await c.insert({
                        passportId: randomToken(12),
                        firstName: 'foobarAlice',
                        lastName: 'aliceLastName',
                        age: randomInt(10, 50)
                    });
                    await c.insert({
                        passportId: randomToken(12),
                        firstName: 'foobarBob',
                        lastName: 'bobLastName',
                        age: randomInt(10, 50)
                    });
                    const query = c.find().or([{
                        firstName: 'foobarAlice'
                    }, {
                        firstName: 'foobarBob'
                    }]);
                    const results = await query.exec();
                    assert.equal(results.length, 2);
                    const foundFirstNames = results.map(doc => doc.firstName);
                    assert.ok(foundFirstNames.includes('foobarAlice'));
                    assert.ok(foundFirstNames.includes('foobarBob'));
                    c.database.destroy();
                });
            });
            describe('.sort()', () => {
                describe('positive', () => {
                    it('sort by age desc (with own index-search)', async () => {
                        const c = await humansCollection.createAgeIndex();
                        const query = c.find({
                            age: {
                                $gt: null
                            }
                        }).sort({
                            age: -1
                        });
                        assert.equal(query.constructor.name, 'RxQuery');
                        const docs = await query.exec();
                        assert.equal(docs.length, 20);
                        assert.ok(docs[0]._data.age >= docs[1]._data.age);
                        c.database.destroy();
                    });
                    it('sort by age desc (with default index-search)', async () => {
                        const c = await humansCollection.createAgeIndex();
                        const docs = await c.find().sort({
                            age: -1
                        }).exec();
                        assert.equal(docs.length, 20);
                        assert.ok(docs[0]._data.age >= docs[1]._data.age);
                        c.database.destroy();
                    });
                    it('sort by age asc', async () => {
                        const c = await humansCollection.createAgeIndex();
                        const docs = await c.find().sort({
                            age: 1
                        }).exec();
                        assert.equal(docs.length, 20);
                        assert.ok(docs[0]._data.age <= docs[1]._data.age);
                        c.database.destroy();
                    });
                    it('sort by non-top-level-key as index (no keycompression)', async () => {
                        const db = await RxDatabase.create({
                            name: util.randomCouchString(10),
                            adapter: 'memory'
                        });
                        const schemaObj = clone(schemas.humanSubIndex);
                        schemaObj.keyCompression = false;
                        const schema = RxSchema.create(schemaObj);
                        const collection = await RxCollection.create({
                            database: db,
                            name: 'human',
                            schema
                        });
                        const objects = new Array(10).fill(0).map(() => {
                            return {
                                passportId: util.randomCouchString(10),
                                other: {
                                    age: randomInt(10, 50)
                                }
                            };
                        });
                        await Promise.all(objects.map(o => collection.insert(o)));

                        // do it manually
                        const all = await collection.pouch.find({
                            selector: {
                                _id: {},
                                'other.age': {
                                    '$gt': 0
                                }
                            },
                            sort: [{
                                'other.age': 'asc'
                            }]
                        });
                        assert.equal(all.docs.length, 10);

                        // with RxQuery
                        const query = collection.find({}).sort({
                            'other.age': 1
                        });
                        const docs = await query.exec();

                        let lastAge = 0;
                        docs.forEach(doc => {
                            assert.ok(doc.other.age >= lastAge);
                            lastAge = doc.other.age;
                        });
                        db.destroy();
                    });
                    it('sort by non-top-level-key as index', async () => {
                        const db = await RxDatabase.create({
                            name: util.randomCouchString(10),
                            adapter: 'memory'
                        });
                        const schema = RxSchema.create(schemas.humanSubIndex);
                        const collection = await RxCollection.create({
                            database: db,
                            name: 'human',
                            schema
                        });
                        const objects = new Array(10).fill(0).map(() => {
                            return {
                                passportId: util.randomCouchString(10),
                                other: {
                                    age: randomInt(10, 50)
                                }
                            };
                        });
                        await Promise.all(objects.map(o => collection.insert(o)));

                        // with RxQuery
                        const query = collection.find({}).sort({
                            'other.age': 1
                        });
                        const docs = await query.exec();

                        let lastAge = 0;
                        docs.forEach(doc => {
                            assert.ok(doc.other.age >= lastAge);
                            lastAge = doc.other.age;
                        });
                        db.destroy();
                    });
                    it('validate results', async () => {
                        const c = await humansCollection.createAgeIndex();

                        const desc = await c.find().sort({
                            age: -1
                        }).exec();
                        const asc = await c.find().sort({
                            age: 1
                        }).exec();
                        const lastDesc = desc[desc.length - 1];
                        assert.equal(lastDesc._data.passportId, asc[0]._data.passportId);
                        c.database.destroy();
                    });
                    it('find the same twice', async () => {
                        const c = await humansCollection.createNested(5);
                        const doc1 = await c.findOne().sort({
                            passportId: 1
                        }).exec();
                        const doc2 = await c.findOne().sort({
                            passportId: 1
                        }).exec();
                        assert.equal(doc1._data.passportId, doc2._data.passportId);
                        c.database.destroy();
                    });
                });
                describe('negative', () => {
                    it('throw when sort is not index', async () => {
                        const c = await humansCollection.create();
                        await c.find({}).exec();
                        await AsyncTestUtil.assertThrows(
                            () => c.find({
                                age: {
                                    $gt: 0
                                }
                            })
                            .sort({
                                age: -1
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
                        assert.equal(docs.length, 1);
                        assert.ok(RxDocument.isInstanceOf(docs[0]));
                        c.database.destroy();
                    });
                    it('get last in order', async () => {
                        const c = await humansCollection.create(20);
                        const docs = await c.find().sort({
                            passportId: 1
                        }).exec();
                        let first = await c.find().sort({
                            passportId: 1
                        }).limit(1).exec();
                        first = first[0];
                        let last = await c.find().sort({
                            passportId: -1
                        }).limit(1).exec();
                        last = last[0];
                        assert.equal(last._data.passportId, docs[(docs.length - 1)]._data.passportId);
                        assert.notEqual(first._data.passportId, last._data.passportId);
                        c.database.destroy();
                    });
                    it('reset limit with .limit(null)', async () => {
                        const c = await humansCollection.create();
                        const docs = await c.find().limit(1).limit(null).exec();
                        assert.ok(docs.length > 1);
                        assert.ok(RxDocument.isInstanceOf(docs[0]));
                        c.database.destroy();
                    });
                });
                describe('negative', () => {
                    it('crash if no integer', async () => {
                        const c = await humansCollection.create(20);
                        await AsyncTestUtil.assertThrows(
                            () => c.find().limit('foobar').exec(),
                            'RxTypeError'
                        );
                        c.database.destroy();
                    });
                });
            });
            describe('.skip()', () => {
                describe('positive', () => {
                    it('skip first', async () => {
                        const c = await humansCollection.create();
                        const docs = await c.find().exec();
                        const noFirst = await c.find().skip(1).exec();
                        assert.equal(noFirst[0]._data.passportId, docs[1]._data.passportId);
                        c.database.destroy();
                    });
                    it('skip first in order', async () => {
                        const c = await humansCollection.create();
                        const docs = await c.find().sort({
                            passportId: 1
                        }).exec();
                        const noFirst = await c.find().sort({
                            passportId: 1
                        }).skip(1).exec();
                        assert.equal(noFirst[0]._data.passportId, docs[1]._data.passportId);
                        c.database.destroy();
                    });
                    it('skip first and limit', async () => {
                        const c = await humansCollection.create();
                        const docs = await c.find().exec();
                        const second = await c.find().skip(1).limit(1).exec();
                        assert.deepEqual(second[0].data, docs[1].data);
                        c.database.destroy();
                    });
                    it('reset skip with .skip(null)', async () => {
                        const c = await humansCollection.create();
                        const docs = await c.find().exec();
                        const noFirst = await c.find().skip(1).skip(null).exec();
                        assert.notEqual(noFirst[0]._data.passportId, docs[1]._data.passportId);
                        c.database.destroy();
                    });
                });
                describe('negative', () => {
                    it('crash if no integer', async () => {
                        const c = await humansCollection.create(20);
                        await AsyncTestUtil.assertThrows(
                            () => c.find().skip('foobar').exec(),
                            'RxTypeError'
                        );
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

                        assert.equal(docs.length, 1);
                        const first = docs[0];
                        assert.equal(first.get('firstName'), matchHuman.firstName);
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

                        assert.equal(docs.length, 1);
                        const first = docs[0];
                        assert.equal(first.get('firstName'), matchHuman.firstName);
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

                        assert.equal(docs.length, 1);
                        const first = docs[0];
                        assert.equal(first.get('passportId'), matchHuman.passportId);
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
                    assert.equal(removed.length, 10);
                    removed.forEach(doc => {
                        assert.ok(RxDocument.isInstanceOf(doc));
                        assert.equal(doc.deleted, true);
                    });
                    const docsAfter = await c.find().exec();
                    assert.equal(docsAfter.length, 0);
                    c.database.destroy();
                });
                it('should remove only found documents', async () => {
                    const c = await humansCollection.create(10);
                    const query = c.find().limit(5);
                    const removed = await query.remove();
                    assert.equal(removed.length, 5);
                    removed.forEach(doc => {
                        assert.ok(RxDocument.isInstanceOf(doc));
                        assert.equal(doc.deleted, true);
                    });
                    const docsAfter = await c.find().exec();
                    assert.equal(docsAfter.length, 5);
                    c.database.destroy();
                });
                it('remove on findOne', async () => {
                    const c = await humansCollection.create(10);
                    const query = c.findOne();
                    const removed = await query.remove();
                    assert.ok(RxDocument.isInstanceOf(removed));
                    assert.equal(removed.deleted, true);
                    const docsAfter = await c.find().exec();
                    assert.equal(docsAfter.length, 9);
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
                        assert.equal(doc._data.firstName, 'new first name');
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
                        assert.equal(doc.age, undefined);
                    c.database.destroy();
                });
            });
        });
        describe('.findOne()', () => {
            describe('positive', () => {
                it('find a single document', async () => {
                    const c = await humansCollection.create();
                    const doc = await c.findOne().exec();
                    assert.ok(RxDocument.isInstanceOf(doc));
                    c.database.destroy();
                });
                it('not crash on empty db', async () => {
                    const c = await humansCollection.create(0);
                    const docs = await c.find().limit(1).exec();
                    assert.equal(docs.length, 0);
                    const doc = await c.findOne().exec();
                    assert.equal(doc, null);
                    c.database.destroy();
                });
                it('find different on .skip()', async () => {
                    const c = await humansCollection.create();
                    const doc = await c.findOne().exec();
                    const doc2 = await c.findOne().skip(2).exec();
                    assert.ok(RxDocument.isInstanceOf(doc));
                    assert.ok(RxDocument.isInstanceOf(doc2));
                    assert.notEqual(doc._data.passportId, doc2._data.passportId);
                    c.database.destroy();
                });
                it('find by primary', async () => {
                    const c = await humansCollection.create();
                    const doc = await c.findOne().exec();
                    const _id = doc.primary;
                    assert.equal(typeof _id, 'string');
                    const docById = await c.findOne(_id).exec();
                    assert.deepEqual(docById.data, doc.data);
                    c.database.destroy();
                });
                it('find by primary in parallel', async () => {
                    const c = await humansCollection.createPrimary(0);

                    const docData = schemaObjects.simpleHuman();
                    const primary = docData.passportId;

                    const notExist = await c.findOne(primary).exec();
                    assert.equal(notExist, null);

                    const insertedDoc = await c.insert(docData);
                    assert.ok(RxDocument.isInstanceOf(insertedDoc));

                    const results = await Promise.all([
                        c.findOne(primary).exec(),
                        c.findOne(primary).exec()
                    ]);
                    assert.ok(RxDocument.isInstanceOf(results[0]));

                    assert.ok(results[0] === results[1]);

                    await results[0].atomicSet('firstName', 'foobar');

                    const results2 = await Promise.all([
                        c.findOne(primary).exec(),
                        c.findOne(primary).exec()
                    ]);
                    assert.ok(RxDocument.isInstanceOf(results2[0]));
                    assert.ok(results2[0] === results2[1]);

                    c.database.destroy();
                });
                it('BUG: insert and find very often', async function() {
                    this.timeout(5000);
                    const amount = 10;
                    for (let i = 0; i < amount; i++) {
                        const db = await RxDatabase.create({
                            name: util.randomCouchString(10),
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
                        assert.equal(passportId, doc._data.passportId);
                        db.destroy();
                    }
                });
            });
            describe('negative', () => {
                it('crash on .limit()', async () => {
                    const c = await humansCollection.create(20);
                    await AsyncTestUtil.assertThrows(
                        () => c.findOne().limit(1).exec(),
                        'RxError',
                        'findOne'
                    );
                    c.database.destroy();
                });
                it('BUG: should throw when no-string given (number)', async () => {
                    const c = await humansCollection.create();
                    assert.throws(
                        () => c.findOne(5),
                        TypeError
                    );
                    c.database.destroy();
                });
                it('BUG: should throw when no-string given (array)', async () => {
                    const c = await humansCollection.create();
                    assert.throws(
                        () => c.findOne([]),
                        TypeError
                    );
                    c.database.destroy();
                });
            });
        });
        describe('.upsert()', () => {
            describe('positive', () => {
                it('insert when not exists', async () => {
                    const db = await RxDatabase.create({
                        name: util.randomCouchString(10),
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
                    assert.equal(doc.firstName, 'foobar');
                    db.destroy();
                });
                it('overwrite exisiting document', async () => {
                    const db = await RxDatabase.create({
                        name: util.randomCouchString(10),
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
                    assert.equal(doc.firstName, 'foobar');
                    db.destroy();
                });
                it('overwrite twice', async () => {
                    const db = await RxDatabase.create({
                        name: util.randomCouchString(10),
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
                    assert.equal(doc.firstName, 'foobar2');
                    db.destroy();
                });
            });
            describe('negative', () => {
                it('throw when primary missing', async () => {
                    const db = await RxDatabase.create({
                        name: util.randomCouchString(10),
                        adapter: 'memory'
                    });
                    const collection = await db.collection({
                        name: 'human',
                        schema: schemas.primaryHuman
                    });
                    const obj = schemaObjects.simpleHuman();
                    await collection.insert(obj);
                    obj.firstName = 'foobar';

                    delete obj.passportId;
                    await AsyncTestUtil.assertThrows(
                        () => collection.upsert(obj),
                        'RxError',
                        'without primary'
                    );
                    db.destroy();
                });
                it('throw when schema not matching', async () => {
                    const db = await RxDatabase.create({
                        name: util.randomCouchString(10),
                        adapter: 'memory'
                    });
                    const collection = await db.collection({
                        name: 'human',
                        schema: schemas.primaryHuman
                    });
                    const obj = schemaObjects.simpleHuman();
                    await collection.insert(obj);
                    obj.firstName = 'foobar';

                    obj.foo = 'bar';
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
                    assert.ok(RxDocument.isInstanceOf(docs[0]));
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
                    assert.ok(RxDocument.isInstanceOf(docs[0]));
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
                    const doc = await c.findOne().exec();
                    assert.equal(doc.firstName, 'foobar');

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
                    assert.ok(RxDocument.isInstanceOf(docs[0]));
                    c.database.destroy();
                });
                it('should process in the given order', async () => {
                    const c = await humansCollection.createPrimary(0);
                    const docData = schemaObjects.simpleHuman();
                    const order = [];
                    await Promise.all([
                        c.atomicUpsert(docData).then(() => order.push(0)),
                        c.atomicUpsert(docData).then(() => order.push(1)),
                        c.atomicUpsert(docData).then(() => order.push(2))
                    ]);
                    assert.deepEqual(order, [0, 1, 2]);

                    c.database.destroy();
                });
                it('should work when inserting on a slow storage', async () => {
                    if (!config.platform.isNode()) return;
                    // use a 'slow' adapter because memory might be to fast
                    const leveldown = require('leveldown');
                    const db = await RxDB.create({
                        name: '../test_tmp/' + util.randomCouchString(10),
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
                    assert.equal(docs.length, 1);
                    const doc = await c.findOne().exec();
                    assert.equal(doc.firstName, 'foobar1');

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
                    docData2.firstName = 1337;
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
                    const db = await RxDatabase.create({
                        name: util.randomCouchString(10),
                        adapter: 'memory'
                    });
                    const collection = await db.collection({
                        name: 'human',
                        schema: schemas.primaryHuman
                    });
                    await collection.remove();
                    const otherSchema = clone(schemas.primaryHuman);
                    otherSchema.properties.foobar = {
                        type: 'string'
                    };
                    await db.collection({
                        name: 'human',
                        schema: otherSchema
                    });
                    db.destroy();
                });
                it('should not contain document when re-creating', async () => {
                    const db = await RxDatabase.create({
                        name: util.randomCouchString(10),
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
                    assert.equal(5, allDocs.length);
                    await collection.remove();

                    const collection2 = await db.collection({
                        name: 'human',
                        schema: schemas.primaryHuman
                    });
                    const noDocs = await collection2.find().exec();
                    assert.equal(0, noDocs.length);
                    db.destroy();
                });
                it('should delete when older versions exist', async () => {
                    const db = await RxDatabase.create({
                        name: util.randomCouchString(10),
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
                            1: function(doc) {
                                return doc;
                            }
                        }
                    });
                    const noDocs = await collection2.find().exec();
                    assert.equal(noDocs.length, 0);
                    await Promise.all(
                        new Array(5).fill(0)
                        .map(() => collection2.insert(schemaObjects.human()))
                    );
                    const fiveDocs = await collection2.find().exec();
                    assert.equal(fiveDocs.length, 5);
                    await collection2.remove();


                    const collection0Again = await db.collection({
                        name: 'human',
                        schema: schemas.primaryHuman
                    });
                    const noDocs2 = await collection0Again.find().exec();
                    assert.equal(noDocs2.length, 0);

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
                    assert.equal(undefined, db[name]);
                    c.database.destroy();
                });
            });
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
            const db = await RxDatabase.create({
                name: util.randomCouchString(10),
                adapter: 'memory'
            });
            const collection = await db.collection({
                name: 'humanx',
                schema
            });
            const doc = await collection.insert({
                passportId: util.randomCouchString(10)
            });
            assert.equal(doc.weight, 0);
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
            const db = await RxDatabase.create({
                name: util.randomCouchString(10),
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
            assert.equal(myDocument.score, 100);
            db.destroy();
        });
    });
    describe('wait a bit', () => {
        it('w8 a bit', async () => {
            AsyncTestUtil.wait(20);
        });
    });
});
