import assert from 'assert';
import {
    default as memdown
} from 'memdown';
import * as _ from 'lodash';

import * as schemas from '../helper/schemas';
import * as schemaObjects from '../helper/schema-objects';
import * as humansCollection from '../helper/humans-collection';

import * as RxDatabase from '../../dist/lib/RxDatabase';
import * as RxSchema from '../../dist/lib/RxSchema';
import * as RxCollection from '../../dist/lib/RxCollection';
import * as util from '../../dist/lib/util';

process.on('unhandledRejection', function(err) {
    throw err;
});

describe('RxCollection.test.js', () => {
    describe('static', () => {
        describe('.create()', () => {
            describe('positive', () => {
                it('human', async() => {
                    const db = await RxDatabase.create({
                        name: util.randomCouchString(10),
                        adapter: memdown
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
                it('use Schema-Object', async() => {
                    const db = await RxDatabase.create({
                        name: util.randomCouchString(10),
                        adapter: memdown
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
                it('index', async() => {
                    const col = await humansCollection.create(1);
                    const indexes = await col.pouch.getIndexes();
                    const compressedKey = col._keyCompressor.table.passportId;
                    const has = indexes.indexes
                        .map(i => i.def.fields[0])
                        .filter(i => !!i[compressedKey]);
                    assert.equal(has.length, 1);
                });
                it('should have the version-number in the pouchdb-prefix', async() => {
                    const db = await RxDatabase.create({
                        name: util.randomCouchString(10),
                        adapter: memdown
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
            });
            describe('negative', () => {
                it('crash if no Schema-instance', async() => {
                    const db = await RxDatabase.create({
                        name: util.randomCouchString(10),
                        adapter: memdown
                    });
                    await util.assertThrowsAsync(
                        () => Collection.create(db, 'human', schemas.human),
                        ReferenceError
                    );
                    db.destroy();
                });
                it('crash if no database-object', async() => {
                    const db = {};
                    const schema = RxSchema.create(schemas.human);
                    await util.assertThrowsAsync(
                        () => RxCollection.create({
                            database: db,
                            name: 'human',
                            schema
                        }),
                        TypeError
                    );
                });
                it('crash if no name-object', async() => {
                    const db = await RxDatabase.create({
                        name: util.randomCouchString(10),
                        adapter: memdown
                    });
                    const schema = RxSchema.create(schemas.human);
                    await util.assertThrowsAsync(
                        () => RxCollection.create({
                            database: db,
                            name: null,
                            schema
                        }),
                        TypeError
                    );
                    db.destroy();
                });
            });
        });
        describe('.checkCollectionName()', () => {
            describe('positive', () => {
                it('allow not allow lodash', async() => {
                    const db = await RxDatabase.create({
                        name: util.randomCouchString(10),
                        adapter: memdown
                    });
                    const schema = RxSchema.create(schemas.human);

                    await util.assertThrowsAsync(
                        () => RxCollection.create({
                            database: db,
                            name: '_foobar',
                            schema
                        }),
                        Error
                    );
                    db.destroy();
                });
                it('allow numbers', async() => {
                    const db = await RxDatabase.create({
                        name: util.randomCouchString(10),
                        adapter: memdown
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
                it('not allow starting numbers', async() => {
                    const db = await RxDatabase.create({
                        name: util.randomCouchString(10),
                        adapter: memdown
                    });
                    const schema = RxSchema.create(schemas.human);
                    await util.assertThrowsAsync(
                        () => RxCollection.create({
                            database: db,
                            name: '0foobar',
                            schema
                        }),
                        Error
                    );
                    db.destroy();
                });
                it('not allow uppercase-letters', async() => {
                    const db = await RxDatabase.create({
                        name: util.randomCouchString(10),
                        adapter: memdown
                    });
                    const schema = RxSchema.create(schemas.human);
                    await util.assertThrowsAsync(
                        () => RxCollection.create({
                            database: db,
                            name: 'Foobar',
                            schema
                        }),
                        Error
                    );
                    await util.assertThrowsAsync(
                        () => RxCollection.create({
                            database: db,
                            name: 'fooBar',
                            schema
                        }),
                        Error
                    );
                    db.destroy();
                });

            });
        });
    });
    describe('instance', () => {
        describe('.insert()', () => {
            describe('positive', () => {
                it('should insert a human', async() => {
                    const db = await RxDatabase.create({
                        name: util.randomCouchString(10),
                        adapter: memdown
                    });
                    const collection = await db.collection({
                        name: 'human',
                        schema: schemas.human
                    });
                    await collection.insert(schemaObjects.human());
                    db.destroy();
                });
                it('should insert nested human', async() => {
                    const db = await RxDatabase.create({
                        name: util.randomCouchString(10),
                        adapter: memdown
                    });
                    const collection = await db.collection({
                        name: 'nestedhuman',
                        schema: schemas.nestedHuman
                    });
                    await collection.insert(schemaObjects.nestedHuman());
                    db.destroy();
                });
                it('should insert more than once', async() => {
                    const db = await RxDatabase.create({
                        name: util.randomCouchString(10),
                        adapter: memdown
                    });
                    const collection = await db.collection({
                        name: 'nestedhuman',
                        schema: schemas.nestedHuman
                    });
                    for (let i = 0; i < 10; i++)
                        await collection.insert(schemaObjects.nestedHuman());
                    db.destroy();
                });
            });
            describe('negative', () => {
                it('should not insert broken human (required missing)', async() => {
                    const db = await RxDatabase.create({
                        name: util.randomCouchString(10),
                        adapter: memdown
                    });
                    const collection = await db.collection({
                        name: 'human',
                        schema: schemas.human
                    });
                    const human = schemaObjects.human();
                    delete human.firstName;
                    await util.assertThrowsAsync(
                        () => collection.insert(human),
                        Error
                    );
                    db.destroy();
                });
                it('should not insert broken human (_id given)', async() => {
                    const db = await RxDatabase.create({
                        name: util.randomCouchString(10),
                        adapter: memdown
                    });
                    const collection = await db.collection({
                        name: 'human',
                        schema: schemas.human
                    });
                    const human = schemaObjects.human();
                    human._id = util.randomCouchString(20);
                    await util.assertThrowsAsync(
                        () => collection.insert(human),
                        Error
                    );
                    db.destroy();
                });
                it('should not insert a non-json object', async() => {
                    const db = await RxDatabase.create({
                        name: util.randomCouchString(10),
                        adapter: memdown
                    });
                    const collection = await db.collection({
                        name: 'human',
                        schema: schemas.human
                    });
                    await util.assertThrowsAsync(
                        () => collection.insert(Collection),
                        ReferenceError
                    );
                    db.destroy();
                });
                it('should not insert human with additional prop', async() => {
                    const db = await RxDatabase.create({
                        name: util.randomCouchString(10),
                        adapter: memdown
                    });
                    const collection = await db.collection({
                        name: 'human',
                        schema: schemas.human
                    });
                    const human = schemaObjects.human();
                    human.any = util.randomCouchString(20);
                    await util.assertThrowsAsync(
                        () => collection.insert(human),
                        Error
                    );
                    db.destroy();
                });
            });
        });
        describe('.find()', () => {
            describe('find all', () => {
                describe('positive', () => {
                    it('find all', async() => {
                        const c = await humansCollection.create();
                        const docs = await c.find().exec();
                        assert.ok(docs.length >= 10);
                        for (let doc of docs)
                            assert.equal(doc.constructor.name, 'RxDocument');
                    });
                    it('find all by empty object', async() => {
                        const c = await humansCollection.create();
                        const docs = await c.find({}).exec();
                        assert.ok(docs.length >= 10);
                        for (let doc of docs)
                            assert.equal(doc.constructor.name, 'RxDocument');
                    });
                    it('find nothing with empty collection', async() => {
                        const db = await RxDatabase.create({
                            name: util.randomCouchString(10),
                            adapter: memdown
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
                    it('BUG: insert and find very often', async() => {
                        const amount = 10;
                        for (let i = 0; i < amount; i++) {
                            let db = await RxDatabase.create({
                                name: util.randomCouchString(10),
                                adapter: memdown
                            });
                            let collection = await db.collection({
                                name: 'human',
                                schema: schemas.human
                            });
                            let human = schemaObjects.human();
                            let passportId = human.passportId;
                            await collection.insert(human);
                            let docs = await collection.find().exec();
                            let doc = docs[0];
                            assert.equal(passportId, doc._data.passportId);
                            db.destroy();
                        }
                    });
                });
                describe('negative', () => {
                    it('should crash with string as query', async() => {
                        const c = await humansCollection.create();
                        await util.assertThrowsAsync(
                            () => c.find('foobar').exec(),
                            Error
                        );
                    });
                    it('should crash with array as query', async() => {
                        const c = await humansCollection.create();
                        await util.assertThrowsAsync(
                            () => c.find([]).exec(),
                            TypeError
                        );
                    });
                });
            });
            describe('$eq', () => {
                describe('positive', () => {
                    it('find first by passportId', async() => {
                        const c = await humansCollection.create();
                        let docs = await c.find().exec();
                        docs = _.shuffle(docs);
                        const last = docs.pop();
                        const passportId = last._data.passportId;
                        let doc = await c.find({
                            passportId
                        }).exec();
                        assert.equal(doc.length, 1);
                        doc = doc[0];
                        assert.deepEqual(doc.data, last.data);
                    });
                    it('find none with random passportId', async() => {
                        const c = await humansCollection.create();
                        const docs = await c.find({
                            passportId: util.randomCouchString(10)
                        }).exec();
                        assert.equal(docs.length, 0);
                    });
                    it('find via $eq', async() => {
                        const c = await humansCollection.create();
                        let docs = await c.find().exec();
                        docs = _.shuffle(docs);
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
                    });
                });
                describe('negative', () => {});
            });
            describe('.sort()', () => {
                describe('positive', () => {
                    it('sort by age desc (with own index-search)', async() => {
                        const c = await humansCollection.createAgeIndex();
                        const docs = await c.find({
                            age: {
                                $gt: null
                            }
                        }).sort({
                            age: -1
                        }).exec();
                        assert.equal(docs.length, 20);
                        assert.ok(docs[0]._data.age >= docs[1]._data.age);
                    });
                    it('sort by age desc (with default index-search)', async() => {
                        const c = await humansCollection.createAgeIndex();
                        const docs = await c.find().sort({
                            age: -1
                        }).exec();
                        assert.equal(docs.length, 20);
                        assert.ok(docs[0]._data.age >= docs[1]._data.age);
                    });
                    it('sort by age asc', async() => {
                        const c = await humansCollection.createAgeIndex();
                        const docs = await c.find().sort({
                            age: 1
                        }).exec();
                        assert.equal(docs.length, 20);
                        assert.ok(docs[0]._data.age <= docs[1]._data.age);
                    });
                    it('validate results', async() => {
                        const c = await humansCollection.createAgeIndex();
                        const desc = await c.find().sort({
                            age: -1
                        }).exec();
                        const asc = await c.find().sort({
                            age: 1
                        }).exec();
                        const last_desc = desc[desc.length - 1];
                        assert.equal(last_desc._data.passportId, asc[0]._data.passportId);
                    });
                    it('find the same twice', async() => {
                        const c = await humansCollection.createNested(5);
                        const doc1 = await c.findOne().sort({
                            passportId: 1
                        }).exec();
                        const doc2 = await c.findOne().sort({
                            passportId: 1
                        }).exec();
                        assert.equal(doc1._data.passportId, doc2._data.passportId);
                    });
                });
                describe('negative', () => {
                    it('throw when sort is not index', async() => {
                        const c = await humansCollection.create();
                        const docs = await c.find({}).exec();
                        await util.assertThrowsAsync(
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
                    });
                });
            });
            describe('.limit()', () => {
                describe('positive', () => {
                    it('get first', async() => {
                        const c = await humansCollection.create();
                        const docs = await c.find().limit(1).exec();
                        assert.equal(docs.length, 1);
                        assert.equal(docs[0].constructor.name, 'RxDocument');
                    });
                    it('get last in order', async() => {
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
                    });
                    it('reset limit with .limit(null)', async() => {
                        const c = await humansCollection.create();
                        const docs = await c.find().limit(1).limit(null).exec();
                        assert.ok(docs.length > 1);
                        assert.equal(docs[0].constructor.name, 'RxDocument');
                    });
                });
                describe('negative', () => {
                    it('crash if no integer', async() => {
                        const c = await humansCollection.create(20);
                        await util.assertThrowsAsync(
                            () => c.find().limit('foobar').exec(),
                            TypeError
                        );
                    });
                });
            });
            describe('.skip()', () => {
                describe('positive', () => {
                    it('skip first', async() => {
                        const c = await humansCollection.create();
                        const docs = await c.find().exec();
                        const noFirst = await c.find().skip(1).exec();
                        assert.equal(noFirst[0]._data.passportId, docs[1]._data.passportId);
                    });
                    it('skip first in order', async() => {
                        const c = await humansCollection.create();
                        const docs = await c.find().sort({
                            passportId: 1
                        }).exec();
                        const noFirst = await c.find().sort({
                            passportId: 1
                        }).skip(1).exec();
                        assert.equal(noFirst[0]._data.passportId, docs[1]._data.passportId);
                    });
                    it('skip first and limit', async() => {
                        const c = await humansCollection.create();
                        const docs = await c.find().exec();
                        const second = await c.find().skip(1).limit(1).exec();
                        assert.deepEqual(second[0].data, docs[1].data);
                    });
                    it('reset skip with .skip(null)', async() => {
                        const c = await humansCollection.create();
                        const docs = await c.find().exec();
                        const noFirst = await c.find().skip(1).skip(null).exec();
                        assert.notEqual(noFirst[0]._data.passportId, docs[1]._data.passportId);
                    });
                });
                describe('negative', () => {
                    it('crash if no integer', async() => {
                        const c = await humansCollection.create(20);
                        await util.assertThrowsAsync(
                            () => c.find().skip('foobar').exec(),
                            TypeError
                        );
                    });
                });
            });

            describe('.regex()', () => {
                describe('positive', () => {
                    it('find the one where the regex matches', async() => {
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
                    });
                    it('regex on index', async() => {
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
                    });
                });
                describe('negative', () => {
                    /**
                     * @link https://docs.cloudant.com/cloudant_query.html#creating-selector-expressions
                     */
                    it('regex on primary should throw', async() => {
                        const c = await humansCollection.createPrimary(0);
                        await util.assertThrowsAsync(
                            () => c.find().where('passportId').regex(/Match/).exec(),
                            Error
                        );
                    });
                });
            });

            describe('.remove()', () => {
                it('should remove all documents', async() => {
                    const c = await humansCollection.create(10);
                    const query = c.find();
                    const removed = await query.remove();
                    assert.equal(removed.length, 10);
                    removed.forEach(doc => {
                        assert.equal(doc.constructor.name, 'RxDocument');
                        assert.equal(doc.deleted, true);
                    });
                    const docsAfter = await c.find().exec();
                    assert.equal(docsAfter.length, 0);
                });
                it('should remove only found documents', async() => {
                    const c = await humansCollection.create(10);
                    const query = c.find().limit(5);
                    const removed = await query.remove();
                    assert.equal(removed.length, 5);
                    removed.forEach(doc => {
                        assert.equal(doc.constructor.name, 'RxDocument');
                        assert.equal(doc.deleted, true);
                    });
                    const docsAfter = await c.find().exec();
                    assert.equal(docsAfter.length, 5);
                });
                it('remove on findOne', async() => {
                    const c = await humansCollection.create(10);
                    const query = c.findOne();
                    const removed = await query.remove();
                    assert.equal(removed.constructor.name, 'RxDocument');
                    assert.equal(removed.deleted, true);
                    const docsAfter = await c.find().exec();
                    assert.equal(docsAfter.length, 9);
                });
            });
        });


        describe('.findOne()', () => {
            describe('positive', () => {
                it('find a single document', async() => {
                    const c = await humansCollection.create();
                    const doc = await c.findOne().exec();
                    assert.equal(doc.constructor.name, 'RxDocument');
                });
                it('not crash on empty db', async() => {
                    const c = await humansCollection.create(0);
                    const docs = await c.find().limit(1).exec();
                    assert.equal(docs.length, 0);
                    const doc = await c.findOne().exec();
                    assert.equal(doc, null);
                });
                it('find different on .skip()', async() => {
                    const c = await humansCollection.create();
                    const doc = await c.findOne().exec();
                    const doc2 = await c.findOne().skip(2).exec();
                    assert.equal(doc.constructor.name, 'RxDocument');
                    assert.equal(doc2.constructor.name, 'RxDocument');
                    assert.notEqual(doc._data.passportId, doc2._data.passportId);
                });
                it('find by primary', async() => {
                    const c = await humansCollection.create();
                    const doc = await c.findOne().exec();
                    const _id = doc.getPrimary();
                    assert.equal(typeof _id, 'string');
                    const docById = await c.findOne(_id).exec();
                    assert.deepEqual(docById.data, doc.data);
                });
                it('BUG: insert and find very often', async() => {
                    const amount = 10;
                    for (let i = 0; i < amount; i++) {
                        let db = await RxDatabase.create({
                            name: util.randomCouchString(10),
                            adapter: memdown
                        });
                        let collection = await db.collection({
                            name: 'human',
                            schema: schemas.human
                        });
                        let human = schemaObjects.human();
                        let passportId = human.passportId;
                        await collection.insert(human);
                        let docs = await collection.find().exec();
                        if (!docs[0]) console.log('docs[0]: null');
                        let doc = await collection.findOne().exec();
                        if (!doc) console.log('doc: null');
                        assert.equal(passportId, doc._data.passportId);
                    }
                });
            });
            describe('negative', () => {
                it('crash on .limit()', async() => {
                    const c = await humansCollection.create(20);
                    await util.assertThrowsAsync(
                        () => c.findOne().limit(1).exec(),
                        Error
                    );
                });
                it('BUG: should throw when no-string given (number)', async() => {
                    const c = await humansCollection.create();
                    assert.throws(
                        () => c.findOne(5),
                        TypeError
                    );
                    c.database.destroy();
                });
                it('BUG: should throw when no-string given (array)', async() => {
                    const c = await humansCollection.create();
                    assert.throws(
                        () => c.findOne([]),
                        TypeError
                    );
                    c.database.destroy();
                });

            });
        });
    });
    describe('wait a bit', () => {
        it('w8 a bit', (done) => {
            setTimeout(done, 20);
        });
    });
});
