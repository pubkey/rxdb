import assert from 'assert';
import {
    default as randomToken
} from 'random-token';
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
                    const db = await RxDatabase.create(randomToken(10), memdown);
                    const schema = RxSchema.create(schemas.human);
                    const collection = await RxCollection.create(db, 'humanx', schema);
                    assert.equal(collection.constructor.name, 'RxCollection');
                });
                it('use Schema-Object', async() => {
                    const db = await RxDatabase.create(randomToken(10), memdown);
                    const schema = RxSchema.create(schemas.human);
                    const collection = await RxCollection.create(db, 'human', schema);
                    assert.equal(collection.constructor.name, 'RxCollection');
                });
            });
            describe('negative', () => {
                it('crash if no Schema-instance', async() => {
                    const db = await RxDatabase.create(randomToken(10), memdown);
                    await util.assertThrowsAsync(
                        () => Collection.create(db, 'human', schemas.human),
                        Error
                    );
                });
                it('crash if no database-object', async() => {
                    const db = {};
                    const schema = RxSchema.create(schemas.human);
                    await util.assertThrowsAsync(
                        () => RxCollection.create(db, 'human', schema),
                        Error
                    );
                });
                it('crash if no name-object', async() => {
                    const db = await RxDatabase.create(randomToken(10), memdown);
                    const schema = RxSchema.create(schemas.human);
                    await util.assertThrowsAsync(
                        () => RxCollection.create(db, null, schema),
                        Error
                    );
                });
            });
        });
    });
    describe('instance', () => {
        describe('.insert()', () => {
            describe('positive', () => {
                it('should insert a human', async() => {
                    const db = await RxDatabase.create(randomToken(10), memdown);
                    const collection = await db.collection('human', schemas.human);
                    await collection.insert(schemaObjects.human());
                });
                it('should insert nested human', async() => {
                    const db = await RxDatabase.create(randomToken(10), memdown);
                    const collection = await db.collection('nestedHuman', schemas.nestedHuman);
                    await collection.insert(schemaObjects.nestedHuman());
                });
                it('should insert more than once', async() => {
                    const db = await RxDatabase.create(randomToken(10), memdown);
                    const collection = await db.collection('nestedHuman', schemas.nestedHuman);
                    for (let i = 0; i < 10; i++)
                        await collection.insert(schemaObjects.nestedHuman());
                });
            });
            describe('negative', () => {
                it('should not insert broken human (required missing)', async() => {
                    const db = await RxDatabase.create(randomToken(10), memdown);
                    const collection = await db.collection('human', schemas.human);
                    const human = schemaObjects.human();
                    delete human.firstName;
                    await util.assertThrowsAsync(
                        () => collection.insert(human),
                        Error
                    );
                });
                it('should not insert broken human (_id given)', async() => {
                    const db = await RxDatabase.create(randomToken(10), memdown);
                    const collection = await db.collection('human', schemas.human);
                    const human = schemaObjects.human();
                    human._id = randomToken(20);
                    await util.assertThrowsAsync(
                        () => collection.insert(human),
                        Error
                    );
                });
                it('should not insert a non-json object', async() => {
                    const db = await RxDatabase.create(randomToken(10), memdown);
                    const collection = await db.collection('human', schemas.human);
                    await util.assertThrowsAsync(
                        () => collection.insert(Collection),
                        Error
                    );
                });
                it('should not insert human with additional prop', async() => {
                    const db = await RxDatabase.create(randomToken(10), memdown);
                    const collection = await db.collection('human', schemas.human);
                    const human = schemaObjects.human();
                    human.any = randomToken(20);
                    await util.assertThrowsAsync(
                        () => collection.insert(human),
                        Error
                    );
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
                        const db = await RxDatabase.create(randomToken(10), memdown);
                        const schema = RxSchema.create(schemas.human);
                        const collection = await RxCollection.create(db, 'humanx', schema);
                        const docs = await collection.find({}).exec();
                        assert.deepEqual(docs, []);
                    });
                    it('BUG: insert and find very often', async() => {
                        const amount = 10;
                        for (let i = 0; i < amount; i++) {
                            let db = await RxDatabase.create(randomToken(10), memdown);
                            let collection = await db.collection('human', schemas.human);
                            let human = schemaObjects.human();
                            let passportId = human.passportId;
                            await collection.insert(human);
                            let docs = await collection.find().exec();
                            let doc = docs[0];
                            assert.equal(passportId, doc.data.passportId);
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
                            Error
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
                        const passportId = last.data.passportId;
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
                            passportId: randomToken(10)
                        }).exec();
                        assert.equal(docs.length, 0);
                    });
                    it('find via $eq', async() => {
                        const c = await humansCollection.create();
                        let docs = await c.find().exec();
                        docs = _.shuffle(docs);
                        const last = docs.pop();
                        const passportId = last.data.passportId;
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
            describe('.select()', () => {
                describe('positive', () => {
                    it('get firstName only', async() => {
                        const c = await humansCollection.create();
                        const docs = await c.find({})
                            .select({
                                firstName: 1
                            })
                            .exec();
                        const firstData = docs[0].data;
                        assert.equal(Object.keys(firstData).length, 1);
                        assert.equal(typeof firstData.firstName, 'string');
                    });
                    it('get no fields', async() => {
                        const c = await humansCollection.create();
                        const docs = await c.find({})
                            .select({})
                            .exec();
                        const firstData = docs[0].data;
                        assert.deepEqual(firstData, {});
                    });
                    it('dont crash on undefined field', async() => {
                        const c = await humansCollection.create();
                        const docs = await c.find({})
                            .select({
                                foobar: 1
                            })
                            .exec();
                        const firstData = docs[0].data;
                        assert.deepEqual(firstData, {});
                    });
                    it('assure it always has an _id', async() => {
                        const c = await humansCollection.create();
                        const docs = await c.find({})
                            .select({
                                foobar: 1
                            })
                            .exec();
                        const first = docs[0];
                        assert.equal(typeof first.rawData._id, 'string');
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
                        assert.ok(docs[0].data.age >= docs[1].data.age);
                    });
                    it('sort by age desc (with default index-search)', async() => {
                        const c = await humansCollection.createAgeIndex();
                        const docs = await c.find().sort({
                            age: -1
                        }).exec();
                        assert.equal(docs.length, 20);
                        assert.ok(docs[0].data.age >= docs[1].data.age);
                    });
                    it('sort by age asc', async() => {
                        const c = await humansCollection.createAgeIndex();
                        const docs = await c.find().sort({
                            age: 1
                        }).exec();
                        assert.equal(docs.length, 20);
                        assert.ok(docs[0].data.age <= docs[1].data.age);
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
                        assert.equal(last_desc.data.passportId, asc[0].data.passportId);
                    });
                    it('find the same twice', async() => {
                        const c = await humansCollection.createNested(5);
                        const doc1 = await c.findOne().sort({
                            passportId: 1
                        }).exec();
                        const doc2 = await c.findOne().sort({
                            passportId: 1
                        }).exec();
                        assert.equal(doc1.data.passportId, doc2.data.passportId);
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
                        assert.equal(last.data.passportId, docs[(docs.length - 1)].data.passportId);
                        assert.notEqual(first.data.passportId, last.data.passportId);
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
                            Error
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
                        assert.equal(noFirst[0].data.passportId, docs[1].data.passportId);
                    });
                    it('skip first in order', async() => {
                        const c = await humansCollection.create();
                        const docs = await c.find().sort({
                            passportId: 1
                        }).exec();
                        const noFirst = await c.find().sort({
                            passportId: 1
                        }).skip(1).exec();
                        assert.equal(noFirst[0].data.passportId, docs[1].data.passportId);
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
                        assert.notEqual(noFirst[0].data.passportId, docs[1].data.passportId);
                    });
                });
                describe('negative', () => {
                    it('crash if no integer', async() => {
                        const c = await humansCollection.create(20);
                        await util.assertThrowsAsync(
                            () => c.find().skip('foobar').exec(),
                            Error
                        );
                    });
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
                    assert.notEqual(doc.data.passportId, doc2.data.passportId);
                });
                it('find by _id', async() => {
                    const c = await humansCollection.create();
                    const doc = await c.findOne().exec();
                    const _id = doc.rawData._id;
                    assert.equal(typeof _id, 'string');
                    const docById = await c.findOne(_id).exec();
                    assert.deepEqual(docById.data, doc.data);
                });
                it('BUG: insert and find very often', async() => {
                    const amount = 10;
                    for (let i = 0; i < amount; i++) {
                        let db = await RxDatabase.create(randomToken(10), memdown);
                        let collection = await db.collection('human', schemas.human);
                        let human = schemaObjects.human();
                        let passportId = human.passportId;
                        await collection.insert(human);
                        let docs = await collection.find().exec();
                        if (!docs[0]) console.log('docs[0]: null');
                        let doc = await collection.findOne().exec();
                        if (!doc) console.log('doc: null');
                        assert.equal(passportId, doc.data.passportId);
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
            });
        });
    });
    describe('wait a bit', () => {
        it('w8 a bit', (done) => {
            setTimeout(done, 20);
        });
    });
});
