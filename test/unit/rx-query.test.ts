import assert from 'assert';
import AsyncTestUtil from 'async-test-util';
import config from './config';
import clone from 'clone';

import {
    first
} from 'rxjs/operators';

import {
    isRxQuery,
    createRxDatabase
} from '../../';
import * as humansCollection from './../helper/humans-collection';
import * as schemaObjects from '../helper/schema-objects';
import * as schemas from './../helper/schemas';

import {
    RxJsonSchema,
    promiseWait,
    randomCouchString
} from '../../';

config.parallel('rx-query.test.js', () => {
    describe('.toJSON()', () => {
        it('should produce the correct selector-object', async () => {
            const col = await humansCollection.create(0);
            const q = col.find()
                .where('name').ne('Alice')
                .where('age').gt(18).lt(67)
                .limit(10)
                .sort('-age');
            const queryObj = q.toJSON();
            assert.deepStrictEqual(queryObj, {
                selector: {
                    name: {
                        '$ne': 'Alice'
                    },
                    age: {
                        '$gt': 18,
                        '$lt': 67
                    }
                },
                sort: [{
                    age: 'desc'
                }],
                limit: 10
            });
            col.database.destroy();
        });
    });
    describe('.toString()', () => {
        it('should get a valid string-representation', async () => {
            const col = await humansCollection.create(0);
            const q = col.find()
                .where('name').ne('Alice')
                .where('age').gt(18).lt(67)
                .limit(10)
                .sort('-age');
            const str = q.toString();
            const mustString = '{"op":"find","other":{"queryBuilderPath":"age"},"query":{"limit":10,"selector":{"_id":{},"age":{"$gt":18,"$lt":67},"name":{"$ne":"Alice"}},"sort":[{"age":"desc"}]}}';
            assert.strictEqual(str, mustString);
            const str2 = q.toString();
            assert.strictEqual(str2, mustString);

            col.database.destroy();
        });
        it('ISSUE #190: should contain the regex', async () => {
            const col = await humansCollection.create(0);
            const queryWithoutRegex = col.find();
            const queryWithRegex = queryWithoutRegex.where('color').regex(new RegExp(/foobar/g));
            const queryString = queryWithRegex.toString();

            assert.ok(queryString.includes('foobar'));
            col.database.destroy();
        });
        it('same queries should return the same string', async () => {
            const col1 = await humansCollection.create(0);
            const col2 = await humansCollection.create(0);

            const query1 = col1.find()
                .where('age').gt(10)
                .where('name').ne('foobar')
                .sort('passportId').toString();

            const query2 = col2.find()
                .where('age').gt(10)
                .where('name').ne('foobar')
                .sort('passportId').toString();

            assert.strictEqual(query1, query2);
            col1.database.destroy();
            col2.database.destroy();
        });
        it('same queries should return the same string even if on same collection', async () => {
            const col = await humansCollection.create(0);

            const query1 = col.find()
                .where('age').gt(10)
                .where('name').ne('foobar')
                .sort('passportId').toString();

            const query2 = col.find()
                .where('age').gt(10)
                .where('name').ne('foobar')
                .sort('passportId').toString();

            assert.strictEqual(query1, query2);
            col.database.destroy();
        });
    });
    describe('immutable', () => {
        it('should not be the same object (sort)', async () => {
            const col = await humansCollection.create(0);
            const q = col.find()
                .where('name').ne('Alice')
                .where('age').gt(18).lt(67)
                .limit(10)
                .sort('-age');
            const q2 = q.sort('name');
            assert.ok(isRxQuery(q2));
            assert.notStrictEqual(q, q2);
            col.database.destroy();
        });
        it('should not be the same object (where)', async () => {
            const col = await humansCollection.create(0);
            const q = col.find()
                .where('name').ne('Alice')
                .where('age').gt(18).lt(67)
                .limit(10)
                .sort('-age');
            const q2 = q.where('name').eq('foobar');
            assert.ok(isRxQuery(q2));
            assert.notStrictEqual(q, q2);
            assert.ok(q.id < q2.id);
            col.database.destroy();
        });
    });
    describe('QueryCache.js', () => {
        it('return the same object', async () => {
            const col = await humansCollection.create(0);
            const q = col.find()
                .where('name').ne('Alice')
                .where('age').gt(18).lt(67)
                .limit(10)
                .sort('-age');
            const q2 = col.find()
                .where('name').ne('Alice')
                .where('age').gt(18).lt(67)
                .limit(10)
                .sort('-age');

            assert.deepStrictEqual(q, q2);
            assert.strictEqual(q.id, q2.id);
            col.database.destroy();
        });
        it('should return the same object after exec', async () => {
            const col = await humansCollection.createPrimary(0);
            const docData = schemaObjects.simpleHuman();
            await col.insert(docData);
            const query = col.findOne(docData.passportId);
            await query.exec();
            const query2 = col.findOne(docData.passportId);
            await query2.exec();
            assert.strictEqual(query.id, query2.id);
            col.database.destroy();
        });
        it('should have the correct amount of cached queries', async () => {
            const col = await humansCollection.create(0);
            const q3 = col.find()
                .where('name').ne('Bob');
            assert.ok(q3);
            const q = col.find()
                .where('name').ne('Alice');
            assert.ok(q);
            const q2 = col.find()
                .where('name').ne('Bob');
            assert.ok(q2);
            assert.strictEqual(col._queryCache._map.size, 4);
            col.database.destroy();
        });
        it('return another object', async () => {
            const col = await humansCollection.create(0);
            const q = col.find()
                .where('name').ne('Alice')
                .where('age').gt(18).lt(67)
                .limit(10)
                .sort('-age');
            const q2 = col.find()
                .where('name').ne('foobar')
                .where('age').gt(18).lt(67)
                .limit(10)
                .sort('-age');

            assert.notStrictEqual(q, q2);
            assert.notStrictEqual(q.id, q2.id);
            col.database.destroy();
        });
        it('ISSUE: ensure its the same query', async () => {
            const col = await humansCollection.create(0);

            const query1 = col.find()
                .where('age').gt(10)
                .where('name').ne('foobar')
                .sort('passportId');

            const query2 = col.find()
                .where('age').gt(10)
                .where('name').ne('foobar')
                .sort('passportId');

            assert.ok(query1 === query2);
            col.database.destroy();
        });

        it('should distinguish between different sort-orders', async () => {
            const col = await humansCollection.create(0);
            const q = col.find()
                .where('name').ne('Alice')
                .where('age').gt(18).lt(67)
                .limit(10)
                .sort('-age')
                .sort('name');
            const q2 = col.find()
                .where('name').ne('Alice')
                .where('age').gt(18).lt(67)
                .limit(10)
                .sort('name')
                .sort('-age');

            assert.notStrictEqual(q, q2);
            assert.notStrictEqual(q.id, q2.id);
            col.database.destroy();
        });
    });
    describe('doesDocMatchQuery()', () => {
        it('should match', async () => {
            const col = await humansCollection.create(0);
            const q = col.find().where('firstName').ne('foobar');
            const docData = schemaObjects.human();
            assert.ok(q.doesDocumentDataMatch(docData));
            col.database.destroy();
        });
        it('should not match', async () => {
            const col = await humansCollection.create(0);
            const q = col.find().where('firstName').ne('foobar');
            const docData = schemaObjects.human();
            docData.firstName = 'foobar';
            assert.strictEqual(false, q.doesDocumentDataMatch(docData));
            col.database.destroy();
        });
        it('should match ($gt)', async () => {
            const col = await humansCollection.create(0);
            const q = col.find().where('age').gt(1);
            const docData = schemaObjects.human();
            docData.age = 5;
            assert.ok(q.doesDocumentDataMatch(docData));
            col.database.destroy();
        });
        it('should not match ($gt)', async () => {
            const col = await humansCollection.create(0);
            const q = col.find().where('age').gt(100);
            const docData = schemaObjects.human();
            docData.age = 5;
            assert.strictEqual(false, q.doesDocumentDataMatch(docData));
            col.database.destroy();
        });
        it('BUG: this should match', async () => {
            const col = await humansCollection.create(0);
            const q = col.find();

            const docData = {
                color: 'green',
                hp: 100,
                maxHP: 767,
                name: 'asdfsadf',
                _rev: '1-971bfd0b8749eb33b6aae7f6c0dc2cd4'
            };

            assert.strictEqual(true, q.doesDocumentDataMatch(docData));
            col.database.destroy();
        });
        it('BUG should not match regex', async () => {
            const col = await humansCollection.create(0);
            const q = col.find({
                selector: {
                    $and: [{
                        color: {
                            $regex: new RegExp('f', 'i')
                        }
                    }]
                }
            });

            const docData = {
                color: 'green',
                hp: 100,
                maxHP: 767,
                name: 'asdfsadf',
                _rev: '1-971bfd0b8749eb33b6aae7f6c0dc2cd4'
            };

            assert.strictEqual(false, q.doesDocumentDataMatch(docData));
            col.database.destroy();
        });
    });
    describe('.exec()', () => {
        it('reusing exec should not make a execOverDatabase', async () => {
            const col = await humansCollection.create(2);
            const q = col.find().where('name').ne('Alice');


            let results = await q.exec();
            assert.strictEqual(results.length, 2);
            assert.strictEqual(q._execOverDatabaseCount, 1);

            await promiseWait(5);
            results = await q.exec();
            assert.strictEqual(results.length, 2);
            assert.strictEqual(q._execOverDatabaseCount, 1);

            col.database.destroy();
        });
        it('should execOverDatabase when still subscribed and changeEvent comes in', async () => {
            const col = await humansCollection.create(2);

            // it is assumed that this query can never handled by event-reduce
            const query = col.find().sort('-passportId').limit(1);

            const fired: any[] = [];
            const sub1 = query.$.subscribe(res => {
                fired.push(res);
            });

            await AsyncTestUtil.waitUntil(() => fired.length === 1);
            assert.strictEqual(query._execOverDatabaseCount, 1);
            assert.strictEqual(query._latestChangeEvent, 2);

            const addObj = schemaObjects.human();
            addObj.passportId = 'zzzzzzzz';
            await col.insert(addObj);
            assert.strictEqual(query.collection._changeEventBuffer.counter, 3);

            await AsyncTestUtil.waitUntil(() => query._latestChangeEvent === 3);
            assert.strictEqual(query._latestChangeEvent, 3);

            await AsyncTestUtil.waitUntil(() => fired.length === 2);
            assert.strictEqual(fired[1].pop().passportId, addObj.passportId);
            sub1.unsubscribe();
            col.database.destroy();
        });
        it('reusing exec should execOverDatabase when change happened that cannot be optimized', async () => {
            const col = await humansCollection.create(2);

            // it is assumed that this query can never handled by event-reduce
            const q = col.find()
                .where('firstName').ne('AliceFoobar')
                .sort('_id')
                .skip(1);

            let results = await q.exec();
            assert.strictEqual(results.length, 1);
            assert.strictEqual(q._execOverDatabaseCount, 1);
            assert.strictEqual(q._latestChangeEvent, 2);

            const addDoc = schemaObjects.human();

            // set _id to first value to force a re-exec-over database
            (addDoc as any)._id = '1-aaaaaaaaaaaaaaaaaaaaaaaaaaa';
            addDoc.firstName = 'NotAliceFoobar';

            await col.insert(addDoc);
            assert.strictEqual(q.collection._changeEventBuffer.counter, 3);

            assert.strictEqual(q._latestChangeEvent, 2);

            await promiseWait(1);
            results = await q.exec();
            assert.strictEqual(results.length, 2);
            assert.strictEqual(q._execOverDatabaseCount, 2);

            col.database.destroy();
        });
        it('querying fast should still return the same RxDocument', async () => {
            if (!config.platform.isNode()) return;
            // use a 'slow' adapter because memory might be to fast
            const leveldown = require('leveldown');
            const db = await createRxDatabase({
                name: config.rootPath + 'test_tmp/' + randomCouchString(10),
                adapter: leveldown
            });
            const c = await db.collection({
                name: 'humans',
                schema: schemas.human
            });
            await c.insert(schemaObjects.human());

            const query1 = c.findOne().where('age').gt(0);
            const query2 = c.findOne().where('age').gt(1);
            const docs = await Promise.all([
                query1.exec(),
                query2.exec()
            ]);
            assert.ok(docs[0] === docs[1]);

            db.destroy();
        });
        it('should not make more requests then needed', async () => {
            const col = await humansCollection.createPrimary(0);
            const docData = schemaObjects.simpleHuman();
            const otherData = () => {
                const data = clone(docData);
                data.firstName = AsyncTestUtil.randomString();
                return data;
            };
            await col.insert(docData);


            const emitted = [];
            const query = col.findOne(docData.passportId);
            query.$.subscribe((data: any) => emitted.push(data.toJSON()));

            await AsyncTestUtil.waitUntil(() => emitted.length === 1);
            assert.strictEqual(query._execOverDatabaseCount, 1);

            const doc = await query.exec();
            assert.ok(doc);
            assert.strictEqual(query._execOverDatabaseCount, 1);

            await col.upsert(otherData());
            await AsyncTestUtil.waitUntil(() => emitted.length === 2);
            assert.strictEqual(query._execOverDatabaseCount, 1);

            await col.atomicUpsert(otherData());
            await AsyncTestUtil.waitUntil(() => emitted.length === 3);
            assert.strictEqual(query._execOverDatabaseCount, 1);

            await Promise.all(
                new Array(2)
                    .fill(0)
                    .map(() => otherData())
                    .map(data => col.atomicUpsert(data))
            );
            await AsyncTestUtil.waitUntil(() => emitted.length === 5);
            assert.strictEqual(query._execOverDatabaseCount, 1);

            await Promise.all(
                new Array(10)
                    .fill(0)
                    .map(() => otherData())
                    .map(data => col.atomicUpsert(data))
            );
            await AsyncTestUtil.waitUntil(() => emitted.length === 15);
            assert.strictEqual(query._execOverDatabaseCount, 1);

            col.database.destroy();
        });
        it('should not make more requests then needed on atomic upsert', async () => {
            const col = await humansCollection.createPrimary(0);
            const docData = schemaObjects.simpleHuman();
            let count = 0;
            const otherData = () => {
                const data = clone(docData);
                data.firstName = '' + count;
                count++;
                return data;
            };

            const emitted = [];
            const query = col.findOne(docData.passportId);
            query.$.subscribe(doc => {
                if (!doc) emitted.push(null);
                else emitted.push(doc.toJSON());
            });

            await Promise.all(
                new Array(10)
                    .fill(0)
                    .map(() => otherData())
                    .map(data => col.atomicUpsert(data))
            );

            assert.strictEqual(query._execOverDatabaseCount, 1);
            col.database.destroy();
        });
        it('exec from other database-instance', async () => {
            const dbName = randomCouchString(10);
            const schema = schemas.averageSchema();
            const db = await createRxDatabase({
                name: dbName,
                eventReduce: true,
                adapter: 'memory'
            });
            const col = await db.collection({
                name: 'human',
                schema
            });

            await Promise.all(
                new Array(10)
                    .fill(0)
                    .map(() => schemaObjects.averageSchema())
                    .map(data => col.insert(data))
            );

            await db.destroy();

            const db2 = await createRxDatabase({
                name: dbName,
                adapter: 'memory',
                eventReduce: true,
                ignoreDuplicate: true
            });
            const col2 = await db2.collection({
                name: 'human',
                schema
            });

            const allDocs = await col2.find().exec();
            assert.strictEqual(allDocs.length, 10);

            db2.destroy();
        });
        it('exec(true) should throw if missing', async () => {
            const c = await humansCollection.create(0);

            AsyncTestUtil.assertThrows(
                () => c.findOne().exec(true),
                'RxError',
                'throwIfMissing'
            );

            c.database.destroy();
        });
        it('exec(true) should throw used with non-findOne', async () => {
            const c = await humansCollection.create(0);
            AsyncTestUtil.assertThrows(
                () => c.find().exec(true),
                'RxError',
                'findOne'
            );
            c.database.destroy();
        });
    });
    describe('update', () => {
        describe('positive', () => {
            it('updates a value on a query', async () => {
                const c = await humansCollection.create(2);
                const query = c.find();
                await query.update({
                    $set: {
                        firstName: 'new first name'
                    }
                });
                const docs = await query.exec();
                for (const doc of docs)
                    assert.strictEqual(doc._data.firstName, 'new first name');
                c.database.destroy();
            });
            it('$unset a value on a query', async () => {
                const c = await humansCollection.create(2);
                const query = c.find();
                await query.update({
                    $unset: {
                        age: ''
                    }
                });
                const docs = await query.exec();
                for (const doc of docs)
                    assert.strictEqual(doc._data.age, undefined);
                c.database.destroy();
            });
            it('dont crash when findOne with no result', async () => {
                const c = await humansCollection.create(2);
                const query = c.findOne().where('agt').gt(1000000);
                await query.update({
                    $set: {
                        firstName: 'new first name'
                    }
                });
                const doc = await query.exec();
                assert.strictEqual(doc, null);
                c.database.destroy();
            });
        });
        describe('negative', () => {
            it('should throw if schema does not match', async () => {
                const schema = {
                    $id: '#child-def',
                    version: 0,
                    type: 'object',
                    properties: {
                        childProperty: {
                            type: 'string',
                            enum: ['A', 'B', 'C']
                        }
                    }
                };
                const db = await createRxDatabase({
                    name: randomCouchString(10),
                    adapter: 'memory'
                });
                const col = await db.collection({
                    name: 'humans',
                    schema
                });
                await col.insert({
                    childProperty: 'A'
                });
                await AsyncTestUtil.assertThrows(
                    () => col.find().update({
                        $set: {
                            childProperty: 'Z'
                        }
                    }),
                    'RxError',
                    'schema'
                );
                db.destroy();
            });
        });
    });
    describe('issues', () => {
        describe('#157 Cannot sort on field(s) "XXX" when using the default index', () => {
            it('schema example 1', async () => {
                const schema: RxJsonSchema = {
                    keyCompression: false,
                    version: 0,
                    type: 'object',
                    properties: {
                        user_id: {
                            type: 'string',
                            primary: true
                        },
                        user_pwd: {
                            type: 'string',
                        },
                        last_login: {
                            type: 'number'
                        },
                        status: {
                            type: 'string'
                        }
                    },
                    required: ['user_pwd', 'last_login', 'status'],
                    encrypted: [
                        'user_pwd'
                    ]
                };
                const db = await createRxDatabase({
                    name: randomCouchString(10),
                    adapter: 'memory',
                    password: randomCouchString(20)
                });
                const collection = await db.collection({
                    name: randomCouchString(10),
                    schema
                });

                const query = collection
                    .findOne()
                    .where('status')
                    .eq('foobar');

                const resultDoc = await query.exec();
                assert.strictEqual(resultDoc, null);

                const queryAll = collection
                    .find()
                    .where('status')
                    .eq('foobar');

                const resultsAll = await queryAll.exec();
                assert.strictEqual(resultsAll.length, 0);
                db.destroy();
            });
            it('schema example 2', async () => {
                const schema: RxJsonSchema = {
                    keyCompression: false,
                    version: 0,
                    type: 'object',
                    properties: {
                        value: {
                            type: 'number'
                        }
                    },
                    indexes: ['value']
                };
                const db = await createRxDatabase({
                    name: randomCouchString(10),
                    adapter: 'memory',
                    password: randomCouchString(20)
                });
                const collection = await db.collection({
                    name: randomCouchString(10),
                    schema
                });

                const queryAll = collection
                    .find()
                    .sort({
                        value: 'desc'
                    });

                const resultsAll = await queryAll.exec();
                assert.strictEqual(resultsAll.length, 0);
                db.destroy();
            });
        });
        it('#267 query for null-fields', async () => {
            const c = await humansCollection.create(2);
            const foundDocs = await c.find({
                selector: {
                    foobar: null
                }
            }).exec();
            assert.ok(Array.isArray(foundDocs));
            c.database.destroy();
        });
        it('#278 queryCache breaks when pointer out of bounds', async () => {
            if (!config.platform.isNode()) return; // dont do this on browsers because firefox takes too long

            const c = await humansCollection.createPrimary(0);

            // insert 100
            await Promise.all(
                new Array(100)
                    .fill(0)
                    .map(() => schemaObjects.human())
                    .map(data => c.insert(data))
            );

            // make and exec query
            const query = c.find();
            const docs = await query.exec();
            assert.strictEqual(docs.length, 100);

            // produces changeEvents
            await Promise.all(
                new Array(300) // higher than ChangeEventBuffer.limit
                    .fill(0)
                    .map(() => schemaObjects.human())
                    .map(data => c.insert(data))
            );

            // re-exec query
            const docs2 = await query.exec();
            assert.strictEqual(docs2.length, 400);

            // try same with upserts
            const docData = new Array(200)
                .fill(0)
                .map(() => schemaObjects.human());
            for (const doc of docData) {
                await c.insert(doc);
            }

            const docs3 = await query.exec();
            assert.strictEqual(docs3.length, 600);

            const docData2 = clone(docData);
            docData2.forEach((doc: any) => doc.lastName = doc.lastName + '1');

            for (const doc of docData2) {
                await c.upsert(doc);
            }

            const docs4 = await query.exec();
            assert.strictEqual(docs4.length, 600);

            c.database.destroy();
        });
        it('#393 Deleting all items with a sorted subscribe throws error', async () => {
            // TODO it seams like this fails randomly
            // further investigation needed
            return;
            /*
            const schema = {
                primaryPath: '_id',
                keyCompression: false,
                properties: {
                    id: {
                        primary: true,
                        type: 'string'
                    },
                    title: {
                        index: true,
                        type: 'string'
                    },
                    integration: {
                        type: 'string'
                    },
                    type: {
                        index: true,
                        type: 'string'
                    },
                    bodyTEMP: {
                        type: 'string'
                    },
                    data: {
                        type: 'object'
                    },
                    parentId: {
                        type: 'string'
                    },
                    author: {
                        type: 'string'
                    },
                    created: {
                        index: true,
                        type: 'string'
                    },
                    updated: {
                        index: true,
                        type: 'string'
                    },
                    orgName: {
                        type: 'string'
                    },
                    bucket: {
                        type: 'string'
                    },
                    url: {
                        unique: true,
                        type: 'string'
                    },
                    createdAt: {
                        format: 'date-time',
                        type: 'string',
                        index: true
                    },
                    updatedAt: {
                        format: 'date-time',
                        type: 'string',
                        index: true
                    }
                },
                type: 'object',
                required: [
                    'title',
                    'integration',
                    'type',
                    'created',
                    'updated'
                ],
                title: 'things',
                version: 0
            };

            const name = util.randomCouchString(10);
            const db = await RxDB.create({
                name,
                adapter: 'memory',
                ignoreDuplicate: true
            });
            const col = await db.collection({
                name: 'humans',
                schema
            });
            const db2 = await RxDB.create({
                name,
                adapter: 'memory',
                ignoreDuplicate: true
            });
            const col2 = await db2.collection({
                name: 'humans',
                schema
            });

            const destroyAll = async function(collection) {
                const remove = async item => {
                    try {
                        await item.remove();
                    } catch (e) {
                        // loop on document conflicts to delete all revisions
                        await remove(item);
                    }
                    return true;
                };
                const all = await collection.find().exec();
                if (!all) return;

                return await Promise.all(all.map(remove));
            };

            const generateDocData = () => {
                return {
                    id: AsyncTestUtil.randomString(10),
                    title: AsyncTestUtil.randomString(10),
                    integration: AsyncTestUtil.randomString(10),
                    type: AsyncTestUtil.randomString(10),
                    created: AsyncTestUtil.randomString(10),
                    updated: AsyncTestUtil.randomString(10),
                    bucket: 'foobar',
                    createdAt: '2002-10-02T10:00:00-05:00',
                    updatedAt: '2002-10-02T10:00:00-05:00'
                };
            };

            await Promise.all(
                new Array(10)
                .fill(0)
                .map(() => generateDocData())
                .map(data => col.insert(data))
            );

            const emitted = [];
            const sub = col2.find()
                .limit(8)
                .where('bucket').eq('foobar')
                .sort({
                    updatedAt: 'desc'
                })
                .$.subscribe(res => {
                    emitted.push(res);
                });

            await destroyAll(col);

            // w8 until empty array on other tab
            await AsyncTestUtil.waitUntil(() => {
                const last = emitted[emitted.length - 1];
                return last && last.length === 0;
            });

            sub.unsubscribe();
            db.destroy();
            db2.destroy();
            */
        });
        it('#585 sort by sub-path not working', async () => {
            const schema = {
                version: 0,
                type: 'object',
                keyCompression: false,
                properties: {
                    id: {
                        type: 'string',
                        primary: true
                    },
                    info: {
                        type: 'object',
                        properties: {
                            title: {
                                type: 'string'
                            },
                        },
                    }
                },
                indexes: ['info.title']
            };
            const db = await createRxDatabase({
                name: randomCouchString(10),
                adapter: 'memory'
            });
            const col = await db.collection({
                name: 'humans',
                schema
            });

            await col.pouch.createIndex({
                index: {
                    fields: ['info']
                }
            });
            await col.pouch.createIndex({
                index: {
                    fields: ['info.title']
                }
            });

            await col.insert({
                id: '1',
                info: {
                    title: 'bbtest'
                }
            });
            await col.insert({
                id: '2',
                info: {
                    title: 'aatest'
                }
            });
            await col.insert({
                id: '3',
                info: {
                    title: 'cctest'
                }
            });

            const foundDocs = await col
                .find()
                .sort('info.title')
                .exec();
            assert.strictEqual(foundDocs.length, 3);
            assert.strictEqual(foundDocs[0].info.title, 'aatest');

            const foundDocsDesc = await col
                .find()
                .sort('-info.title')
                .exec();
            assert.strictEqual(foundDocsDesc.length, 3);
            assert.strictEqual(foundDocsDesc[0].info.title, 'cctest');

            db.destroy();
        });
        it('#609 default index on _id when better possible', async () => {
            const mySchema: RxJsonSchema = {
                version: 0,
                keyCompression: false,
                type: 'object',
                properties: {
                    name: {
                        type: 'string'
                    },
                    passportId: {
                        type: 'string'
                    }
                },
                indexes: ['passportId']
            };
            const collection = await humansCollection.createBySchema(mySchema);

            await collection.insert({
                name: 'abc',
                passportId: 'foobar'
            });

            // first query, no sort
            const q1 = collection.findOne({
                selector: {
                    passportId: 'foofbar'
                }
            });
            const explained1 = await collection.pouch.explain(q1.toJSON());
            assert.ok(explained1.index.ddoc);
            assert.ok(explained1.index.ddoc.startsWith('_design/idx-'));

            // second query, with sort
            const q2 = collection.findOne({
                selector: {
                    passportId: 'foofbar'
                }
            }).sort('passportId');
            const explained2 = await collection.pouch.explain(q2.toJSON());
            assert.ok(explained2.index.ddoc);
            assert.ok(explained2.index.ddoc.startsWith('_design/idx-'));

            collection.database.destroy();
        });
        it('#698 Same query producing a different result', async () => {
            const mySchema: RxJsonSchema = {
                version: 0,
                keyCompression: false,
                type: 'object',
                properties: {
                    event_id: {
                        type: 'number'
                    },
                    user_id: {
                        type: 'string'
                    },
                    created_at: {
                        type: 'number'
                    }
                },
                indexes: ['created_at']
            };
            const collection = await humansCollection.createBySchema(mySchema);

            await collection.insert({
                event_id: 1,
                user_id: '6',
                created_at: 1337
            });
            await collection.insert({
                event_id: 2,
                user_id: '6',
                created_at: 1337
            });


            /* eslint-disable */
            const selector = {
                $and: [{
                    event_id: {
                        $eq: 2
                    }
                }, {
                    user_id: {
                        $eq: '6'
                    }
                },
                {
                    created_at: {
                        $gt: null
                    }
                }, {
                    user_id: {
                        $eq: '6'
                    }
                },
                {
                    created_at: {
                        $gt: null
                    }
                }
                ]
            };
            /* eslint-enable */

            const resultDocs1 = await collection
                .find({
                    selector
                })
                .sort({
                    created_at: 'desc'
                })
                .exec();
            const resultData1: any[] = resultDocs1.map(doc => doc.toJSON());

            const resultDocs2 = await collection
                .find()
                .where('event_id').eq(2)
                .where('user_id').eq('6')
                .where('created_at').gt(null)
                .sort({
                    created_at: 'desc'
                })
                .exec();
            const resultData2 = resultDocs2.map(doc => doc.toJSON());


            assert.strictEqual(resultData1.length, 1);
            assert.strictEqual(resultData1[0]['event_id'], 2);
            assert.deepStrictEqual(resultData1, resultData2);

            collection.database.destroy();
        });
        it('698#issuecomment-402604237 mutating a returned array should not affect exec-calls afterwards', async () => {
            const c = await humansCollection.create(2);
            const query = c.find();

            // exec-calls
            const result1: any = await query.exec();
            assert.strictEqual(result1.length, 2);
            result1.push({
                foo: 'bar'
            });
            const result2 = await query.exec();
            assert.strictEqual(result2.length, 2);

            c.database.destroy();

            // subscriptions
            const c2 = await humansCollection.create(2);
            const query2 = c2.find();
            const res1: any = await query2.$
                .pipe(
                    first()
                ).toPromise();
            res1.push({
                foo: 'bar'
            });
            const res2 = await query2.$
                .pipe(
                    first()
                ).toPromise();
            assert.strictEqual(res2.length, 2);

            c2.database.destroy();
        });
        it('#724 find() does not find all matching documents', async () => {
            const db = await createRxDatabase({
                name: randomCouchString(10),
                adapter: 'memory'
            });
            const schema = {
                version: 0,
                type: 'object',
                properties: {
                    roomId: {
                        type: 'string'
                    },
                    sessionId: {
                        type: 'string'
                    }
                }
            };
            const roomsession = await db.collection({
                name: 'roomsession',
                schema
            });
            const roomId = 'roomId';
            const sessionId = 'sessionID';
            await roomsession.insert({
                roomId,
                sessionId
            });

            const foundByRoomId = await roomsession.findOne({
                selector: {
                    roomId
                }
            }).exec();
            const foundByRoomAndSessionId = await roomsession.findOne({
                selector: {
                    roomId,
                    sessionId
                }
            }).exec();
            const foundBySessionId = await roomsession.findOne({
                selector: {
                    sessionId
                }
            }).exec();

            assert(foundByRoomId !== null); // fail
            assert(foundByRoomAndSessionId !== null); // fail
            assert(foundBySessionId !== null); // pass
            assert(foundBySessionId.roomId === roomId && foundBySessionId.sessionId === sessionId); // pass

            db.destroy();
        });
        it('#815 Allow null value for strings', async () => {
            // create a schema
            const mySchema = {
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
                        type: ['string', 'null']
                    },
                    age: {
                        type: 'integer',
                        minimum: 0,
                        maximum: 150
                    }
                }
            };

            // generate a random database-name
            const name = randomCouchString(10);

            // create a database
            const db = await createRxDatabase({
                name,
                adapter: 'memory',
                eventReduce: true,
                ignoreDuplicate: true
            });
            // create a collection
            const collection = await db.collection({
                name: 'mycollection',
                schema: mySchema
            });

            // insert a document
            await collection.insert({
                passportId: 'foobar',
                firstName: 'Bob1',
                age: 56
            });
            await collection.insert({
                passportId: 'foobaz',
                firstName: 'Bob2',
                lastName: null,
                age: 56
            });

            const queryOK = collection.find();
            const docsOK = await queryOK.exec();
            assert.strictEqual(docsOK.length, 2);

            const selector = {
                lastName: null
            };

            const pouchResult = await collection.pouch.find({
                selector
            });
            const pouchDocs = pouchResult.docs;
            const query = collection.find({
                selector
            });
            const docs = await query.exec();

            assert.strictEqual(pouchDocs.length, docs.length);
            assert.strictEqual(pouchDocs[0].firstName, docs[0].firstName);

            db.destroy();
        });
        /**
         * via gitter at 11 November 2019 10:10
         */
        it('gitter: query with regex does not return correct results', async () => {
            // create a schema
            const mySchema = {
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
                        type: ['string', 'null']
                    }
                }
            };
            const db = await createRxDatabase({
                name: randomCouchString(10),
                adapter: 'memory',
                eventReduce: true,
                ignoreDuplicate: true
            });

            // create a collection
            const collection = await db.collection({
                name: 'mycollection',
                schema: mySchema
            });

            // insert documents
            await collection.bulkInsert([
                {
                    passportId: 'doc1',
                    firstName: 'John',
                    lastName: 'Doe'
                }, {
                    passportId: 'doc2',
                    firstName: 'Martin',
                    lastName: 'Smith'
                }
            ]);
            const allDocs = await collection.find().exec();
            assert.strictEqual(allDocs.length, 2);

            // test 1 with RegExp object
            const regexp = new RegExp('^Doe$', 'i');
            const result1 = await collection.find({
                selector: {
                    lastName: { $regex: regexp }
                }
            }).exec();

            // test 2 with regex string
            const result2 = await collection.find({
                selector: {
                    lastName: { $regex: '^Doe$' }
                }
            }).exec();


            // both results should only have the doc1
            assert.strictEqual(result1.length, 1);
            assert.strictEqual(result1[0].passportId, 'doc1');
            assert.deepStrictEqual(
                result1.map(d => d.toJSON()),
                result2.map(d => d.toJSON())
            );

            db.destroy();
        });
        it('#2071 RxCollection.findOne().exec() returns deleted document while find().exec() not', async () => {
            const c = await humansCollection.create(1);

            // delete it
            const doc = await c.findOne();
            await doc.remove();

            // now find() returns empty array
            const docs = await c.find().exec();
            assert.strictEqual(docs.length, 0);

            // findOne() still returns the deleted object
            const doc2 = await c.findOne().exec();
            assert.strictEqual(doc2, null);

            c.database.destroy();
        });
        it('#2213 prepareQuery should handle all comparison operators', async () => {
            const collection = await humansCollection.createAgeIndex(0);
            await collection.insert({
                passportId: 'foobar',
                firstName: 'Bob',
                lastName: 'Kelso',
                age: 56
            });

            await collection.insert({
                passportId: 'foobar2',
                firstName: 'Bob2',
                lastName: 'Kelso2',
                age: 58
            });

            const myDocument = await collection.findOne({
                selector: {
                    age: {
                        $gte: 57,
                    },
                },
                sort: [{ age: 'asc' }]
            }).exec(true);

            assert.strictEqual(myDocument.age, 58);

            collection.database.destroy();
        });
    });
});
