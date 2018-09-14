import assert from 'assert';
import AsyncTestUtil from 'async-test-util';
import config from './config';
import clone from 'clone';

import {
    first
} from 'rxjs/operators';

import RxDB from '../../dist/lib/index';
import * as RxDatabase from '../../dist/lib/rx-database';
import * as humansCollection from './../helper/humans-collection';
import * as schemaObjects from '../helper/schema-objects';
import * as schemas from './../helper/schemas';
import * as util from '../../dist/lib/util';

config.parallel('rx-query.test.js', () => {
    describe('mquery', () => {
        describe('basic', () => {
            it('should distinguish between different sort-orders', async () => {
                // TODO I don't know if this is defined in the couchdb-spec
                /*
                const q1 = new MQuery();
                q1.sort('age');
                q1.sort('name');

                const q2 = new MQuery();
                q2.sort('name');
                q2.sort('age');

                */
            });
        });
        describe('.clone()', () => {
            it('should clone the mquery', async () => {
                const col = await humansCollection.create(0);
                const q = col.find()
                    .where('name').ne('Alice')
                    .where('age').gt(18).lt(67)
                    .limit(10)
                    .sort('-age');
                const mquery = q.mquery;
                const cloned = mquery.clone();

                assert.deepEqual(mquery.options, cloned.options);
                assert.deepEqual(mquery._conditions, cloned._conditions);
                assert.deepEqual(mquery._fields, cloned._fields);
                assert.deepEqual(mquery._path, cloned._path);
                col.database.destroy();
            });
        });
    });
    describe('.toJSON()', () => {
        it('should produce the correct selector-object', async () => {
            const col = await humansCollection.create(0);
            const q = col.find()
                .where('name').ne('Alice')
                .where('age').gt(18).lt(67)
                .limit(10)
                .sort('-age');
            const queryObj = q.toJSON();
            assert.deepEqual(queryObj, {
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
    describe('._clone()', () => {
        it('should deep-clone the query', async () => {
            const col = await humansCollection.create(0);
            const q = col.find()
                .where('name').ne('Alice')
                .where('age').gt(18).lt(67)
                .limit(10)
                .sort('-age');
            const cloned = q._clone();
            assert.equal(q.constructor.name, 'RxQuery');
            assert.equal(cloned.constructor.name, 'RxQuery');
            assert.deepEqual(q.mquery._conditions, cloned.mquery._conditions);
            assert.deepEqual(q.mquery._fields, cloned.mquery._fields);
            assert.deepEqual(q.mquery._path, cloned.mquery._path);
            assert.deepEqual(q.mquery.options, cloned.mquery.options);
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
            const mustString = '{"_conditions":{"_id":{},"age":{"$gt":18,"$lt":67},"name":{"$ne":"Alice"}},"_path":"age","op":"find","options":{"limit":10,"sort":{"age":-1}}}';
            assert.equal(str, mustString);
            const str2 = q.toString();
            assert.equal(str2, mustString);

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

            assert.equal(query1, query2);
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

            assert.equal(query1, query2);
            col.database.destroy();
        });
        it('same queries should have same string even when in different-selector-order', async () => {
            const col = await humansCollection.create(0);

            const query1 = col.find()
                .where('age').gt(10)
                .where('name').ne('foobar')
                .sort('passportId').toString();

            const query2 = col.find()
                .where('name').ne('foobar')
                .where('age').gt(10)
                .sort('passportId').toString();

            assert.equal(query1, query2);
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
            assert.equal(q2.constructor.name, 'RxQuery');
            assert.notEqual(q, q2);
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
            assert.equal(q2.constructor.name, 'RxQuery');
            assert.notEqual(q, q2);
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

            assert.deepEqual(q, q2);
            assert.equal(q.id, q2.id);
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
            assert.equal(query.id, query2.id);
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
            assert.equal(col._queryCache._map.size, 4);
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

            assert.notEqual(q, q2);
            assert.notEqual(q.id, q2.id);
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
        it('ensure its the same query when selector-order is different', async () => {
            const col = await humansCollection.create(0);

            const query1 = col.find()
                .where('age').gt(10)
                .where('name').ne('foobar')
                .sort('passportId');

            const query2 = col.find()
                .where('name').ne('foobar')
                .where('age').gt(10)
                .sort('passportId');

            assert.ok(query1 === query2);
            col.database.destroy();
        });

        it('TODO should distinguish between different sort-orders', async () => {
            // TODO I don't know if this is defined in the couchdb-spec
            /*
            return;

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


            assert.notEqual(q, q2);
            assert.notEqual(q.id, q2.id);
            col.database.destroy();
            */
        });
    });

    describe('.exec()', () => {
        it('reusing exec should not make a execOverDatabase', async () => {
            const col = await humansCollection.create(2);
            const q = col.find().where('name').ne('Alice');


            let results = await q.exec();
            assert.equal(results.length, 2);
            assert.equal(q._execOverDatabaseCount, 1);

            await util.promiseWait(5);
            results = await q.exec();
            assert.equal(results.length, 2);
            assert.equal(q._execOverDatabaseCount, 1);

            col.database.destroy();
        });
        it('should execOverDatabase when still subscribed and changeEvent comes in', async () => {
            const col = await humansCollection.create(2);

            // it is assumed that this query can never handled by the QueryChangeDetector
            const query = col.find().sort('-passportId').limit(1);

            const fired = [];
            const sub1 = query.$.subscribe(res => {
                fired.push(res);
            });

            await AsyncTestUtil.waitUntil(() => fired.length === 1);
            assert.equal(query._execOverDatabaseCount, 1);
            assert.equal(query._latestChangeEvent, 2);

            const addObj = schemaObjects.human();
            addObj.passportId = 'zzzzzzzz';
            await col.insert(addObj);
            assert.equal(query.collection._changeEventBuffer.counter, 3);

            await AsyncTestUtil.waitUntil(() => query._latestChangeEvent === 3);
            assert.equal(query._latestChangeEvent, 3);

            await AsyncTestUtil.waitUntil(() => fired.length === 2);
            assert.equal(fired[1].pop().passportId, addObj.passportId);
            sub1.unsubscribe();
            col.database.destroy();
        });
        it('reusing exec should execOverDatabase when change happened', async () => {
            const col = await humansCollection.create(2);

            // it is assumed that this query can never handled by the QueryChangeDetector
            const q = col.find().where('firstName').ne('Alice').limit(1).skip(1);

            let results = await q.exec();
            assert.equal(results.length, 1);
            assert.equal(q._execOverDatabaseCount, 1);
            assert.equal(q._latestChangeEvent, 2);

            const addDoc = schemaObjects.human();
            addDoc.firstName = 'Alice';

            await col.insert(addDoc);
            assert.equal(q.collection._changeEventBuffer.counter, 3);
            assert.equal(q._latestChangeEvent, 2);

            await util.promiseWait(1);
            results = await q.exec();
            assert.equal(results.length, 1);
            assert.equal(q._execOverDatabaseCount, 2);

            col.database.destroy();
        });
        it('querying fast should still return the same RxDocument', async () => {
            if (!config.platform.isNode()) return;
            // use a 'slow' adapter because memory might be to fast
            const leveldown = require('leveldown');
            const db = await RxDB.create({
                name: '../test_tmp/' + util.randomCouchString(10),
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
            const query = col.findOne(docData.pass);
            query.$.subscribe(doc => emitted.push(doc.toJSON()));

            await AsyncTestUtil.waitUntil(() => emitted.length === 1);
            assert.equal(query._execOverDatabaseCount, 1);

            const doc = await query.exec();
            assert.ok(doc);
            assert.equal(query._execOverDatabaseCount, 1);

            await col.upsert(otherData());
            await AsyncTestUtil.waitUntil(() => emitted.length === 2);
            assert.equal(query._execOverDatabaseCount, 1);

            await col.atomicUpsert(otherData());
            await AsyncTestUtil.waitUntil(() => emitted.length === 3);
            assert.equal(query._execOverDatabaseCount, 1);

            await Promise.all(
                new Array(2)
                .fill(0)
                .map(() => otherData())
                .map(data => col.atomicUpsert(data))
            );
            await AsyncTestUtil.waitUntil(() => emitted.length === 5);
            assert.equal(query._execOverDatabaseCount, 1);

            await Promise.all(
                new Array(10)
                .fill(0)
                .map(() => otherData())
                .map(data => col.atomicUpsert(data))
            );
            await AsyncTestUtil.waitUntil(() => emitted.length === 15);
            assert.equal(query._execOverDatabaseCount, 1);

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
            const query = col.findOne(docData.pass);
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

            assert.equal(query._execOverDatabaseCount, 1);
            col.database.destroy();
        });
        it('exec from other database-instance', async () => {
            const dbName = util.randomCouchString(10);
            const schema = schemas.averageSchema();
            const db = await RxDB.create({
                name: dbName,
                queryChangeDetection: true,
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

            const db2 = await RxDB.create({
                name: dbName,
                adapter: 'memory',
                queryChangeDetection: true,
                ignoreDuplicate: true
            });
            const col2 = await db2.collection({
                name: 'human',
                schema
            });

            const allDocs = await col2.find().exec();
            assert.equal(allDocs.length, 10);

            db2.destroy();
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
                    assert.equal(doc._data.firstName, 'new first name');
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
                    assert.equal(doc._data.age, undefined);
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
                assert.equal(doc, null);
                c.database.destroy();
            });
        });
        describe('negative', () => {
            it('should throw if schema does not match', async () => {
                const schema = {
                    $id: '#child-def',
                    version: 0,
                    properties: {
                        childProperty: {
                            type: 'string',
                            enum: ['A', 'B', 'C']
                        }
                    }
                };
                const db = await RxDB.create({
                    name: util.randomCouchString(10),
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
                const schema = {
                    'keyCompression': false,
                    'version': 0,
                    'type': 'object',
                    'properties': {
                        'user_id': {
                            'type': 'string',
                            'primary': true
                        },
                        'user_pwd': {
                            'type': 'string',
                            'encrypted': true
                        },
                        'last_login': {
                            'type': 'number'
                        },
                        'status': {
                            'type': 'string'
                        }
                    },
                    'required': ['user_pwd', 'last_login', 'status']
                };
                const db = await RxDatabase.create({
                    name: util.randomCouchString(10),
                    adapter: 'memory',
                    password: util.randomCouchString(20)
                });
                const collection = await db.collection({
                    name: util.randomCouchString(10),
                    schema
                });

                const query = collection
                    .findOne()
                    .where('status')
                    .eq('foobar');

                const resultDoc = await query.exec();
                assert.equal(resultDoc, null);

                const queryAll = collection
                    .find()
                    .where('status')
                    .eq('foobar');

                const resultsAll = await queryAll.exec();
                assert.equal(resultsAll.length, 0);
                db.destroy();
            });
            it('schema example 2', async () => {
                const schema = {
                    keyCompression: false,
                    version: 0,
                    type: 'object',
                    properties: {
                        value: {
                            type: 'number',
                            index: true
                        }
                    }
                };
                const db = await RxDatabase.create({
                    name: util.randomCouchString(10),
                    adapter: 'memory',
                    password: util.randomCouchString(20)
                });
                const collection = await db.collection({
                    name: util.randomCouchString(10),
                    schema
                });

                const queryAll = collection
                    .find()
                    .sort({
                        value: -1
                    });

                const resultsAll = await queryAll.exec();
                assert.equal(resultsAll.length, 0);
                db.destroy();
            });
        });
        it('#164 Sort error, pouchdb-find/mango "unknown operator"', async () => {
            const db = await RxDB.create({
                adapter: 'memory',
                name: util.randomCouchString(12),
                password: 'password'
            });
            const collection = await db.collection({
                name: 'test3',
                schema: {
                    title: 'test3',
                    version: 0,
                    properties: {
                        name: {
                            type: 'string',
                            index: true
                        }
                    }
                }
            });

            const sortedNames = ['a123', 'b123', 'c123', 'f123', 'z123'];
            await Promise.all(
                sortedNames.map(name => collection.insert({
                    name
                }))
            );

            // this query is wrong because .find() does not allow sort, limit etc, only the selector
            await AsyncTestUtil.assertThrows(
                () => collection.find({
                    sort: ['name']
                }).exec(),
                Error,
                'lte'
            );
            const results2 = await collection.find().sort('name').exec();
            assert.deepEqual(sortedNames, results2.map(doc => doc.name));

            db.destroy();
        });
        it('#267 query for null-fields', async () => {
            const c = await humansCollection.create(2);
            const foundDocs = await c.find({
                foobar: null
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
                .map(docData => c.insert(docData))
            );

            // make and exec query
            const query = c.find();
            const docs = await query.exec();
            assert.ok(docs.length, 100);

            // produces changeEvents
            await Promise.all(
                new Array(300) // higher than ChangeEventBuffer.limit
                .fill(0)
                .map(() => schemaObjects.human())
                .map(docData => c.insert(docData))
            );

            // re-exec query
            const docs2 = await query.exec();
            assert.ok(docs2.length, 400);

            // try same with upserts
            const docData = new Array(200)
                .fill(0)
                .map(() => schemaObjects.human());
            for (const doc of docData)
                await c.insert(doc);

            const docs3 = await query.exec();
            assert.ok(docs3.length, 600);

            const docData2 = clone(docData);
            docData2.forEach(doc => doc.lastName = doc.lastName + '1');

            for (const doc of docData2)
                await c.upsert(doc);

            const docs4 = await query.exec();
            assert.ok(docs4.length, 600);

            c.database.destroy();
        });
        it('#393 Deleting all items with a sorted subscribe throws error', async () => {
            // TODO it seams like this fails randomly
            // further investigation needed
            return;
            /*

            // QueryChangeDetector.enable();
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
                                type: 'string',
                                index: true
                            },
                        },
                    }
                }
            };
            const db = await RxDatabase.create({
                name: util.randomCouchString(10),
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
            assert.equal(foundDocs.length, 3);
            assert.equal(foundDocs[0].info.title, 'aatest');

            const foundDocsDesc = await col
                .find()
                .sort('-info.title')
                .exec();
            assert.equal(foundDocsDesc.length, 3);
            assert.equal(foundDocsDesc[0].info.title, 'cctest');

            db.destroy();
        });
        it('#609 default index on _id when better possible', async () => {
            const mySchema = {
                version: 0,
                keyCompression: false,
                type: 'object',
                properties: {
                    name: {
                        type: 'string'
                    },
                    passportId: {
                        type: 'string',
                        index: true
                    }
                }
            };
            const collection = await humansCollection.createBySchema(mySchema);

            await collection.insert({
                name: 'abc',
                passportId: 'foobar'
            });

            // first query, no sort
            const q1 = collection.findOne({
                passportId: 'foofbar'
            });
            const explained1 = await collection.pouch.explain(q1.toJSON());
            assert.ok(explained1.index.ddoc);
            assert.ok(explained1.index.ddoc.startsWith('_design/idx-'));

            // second query, with sort
            const q2 = collection.findOne({
                passportId: 'foofbar'
            }).sort('passportId');
            const explained2 = await collection.pouch.explain(q2.toJSON());
            assert.ok(explained2.index.ddoc);
            assert.ok(explained2.index.ddoc.startsWith('_design/idx-'));

            collection.database.destroy();
        });
        it('#698 Same query producing a different result', async () => {
            const mySchema = {
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
                        type: 'number',
                        index: true
                    }
                }
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
                    }
                ]
            };
            /* eslint-enable */

            const resultDocs1 = await collection.find(selector)
                .sort({
                    created_at: 'desc'
                })
                .exec();
            const resultData1 = resultDocs1.map(doc => doc.toJSON());

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


            assert.equal(resultData1.length, 1);
            assert.equal(resultData1[0].event_id, 2);
            assert.deepEqual(resultData1, resultData2);

            collection.database.destroy();
        });
        it('698#issuecomment-402604237 mutating a returned array should not affect exec-calls afterwards', async () => {
            const c = await humansCollection.create(2);
            const query = c.find();

            // exec-calls
            const result1 = await query.exec();
            assert.equal(result1.length, 2);
            result1.push({
                foo: 'bar'
            });
            const result2 = await query.exec();
            assert.equal(result2.length, 2);

            c.database.destroy();

            // subscriptions
            const c2 = await humansCollection.create(2);
            const query2 = c2.find();
            const res1 = await query2.$
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
            assert.equal(res2.length, 2);

            c2.database.destroy();
        });
        it('#724 find() does not find all matching documents', async () => {
            const db = await RxDB.create({
                name: util.randomCouchString(10),
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
                roomId
            }).exec();
            const foundByRoomAndSessionId = await roomsession.findOne({
                roomId,
                sessionId
            }).exec();
            const foundBySessionId = await roomsession.findOne({
                sessionId
            }).exec();

            assert(foundByRoomId !== null); // fail
            assert(foundByRoomAndSessionId !== null); // fail
            assert(foundBySessionId !== null); // pass
            assert(foundBySessionId.roomId === roomId && foundBySessionId.sessionId === sessionId); // pass

            db.destroy();
        });
    });

    describe('e', () => {
        // it('e', () => process.exit());
    });
});
