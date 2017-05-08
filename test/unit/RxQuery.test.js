import assert from 'assert';

import * as RxDatabase from '../../dist/lib/RxDatabase';
import * as humansCollection from './../helper/humans-collection';
import * as schemaObjects from '../helper/schema-objects';
import * as util from '../../dist/lib/util';
import * as RxDocument from '../../dist/lib/RxDocument';
import {
    default as MQuery
} from '../../dist/lib/mquery/mquery';

describe('RxQuery.test.js', () => {
    describe('mquery', () => {
        describe('basic', () => {
            it('should distinguish between different sort-orders', async() => {
                // TODO I don't know if this is defined in the couchdb-spec
                return;
                const q1 = new MQuery();
                q1.sort('age');
                q1.sort('name');

                const q2 = new MQuery();
                q2.sort('name');
                q2.sort('age');


                console.dir(q1);
                console.dir(q2);
            });
        });
        describe('.clone()', () => {
            it('should clone the mquery', async() => {
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
        it('should produce the correct selector-object', async() => {
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
                    },
                    language: {
                        '$ne': 'query'
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
        it('should deep-clone the query', async() => {
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
        it('should get a valid string-representation', async() => {
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
    });

    describe('immutable', () => {
        it('should not be the same object (sort)', async() => {
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
        it('should not be the same object (where)', async() => {
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
        it('return the same object', async() => {
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
        it('return another object', async() => {
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
        it('TODO should distinguish between different sort-orders', async() => {
            // TODO I don't know if this is defined in the couchdb-spec
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

            console.dir(q.mquery);
            console.dir(q2.mquery);

            assert.notEqual(q, q2);
            assert.notEqual(q.id, q2.id);
            col.database.destroy();
        });
    });

    describe('.exec()', () => {
        it('reusing exec should not make a execOverDatabase', async() => {
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
        it('should execOverDatabase when still subscribed and changeEvent comes in', async() => {
            const col = await humansCollection.create(2);

            // it is assumed that this query can never handled by the QueryChangeDetector
            const q = col.find().sort('-passportId').limit(1);

            const fired = [];
            q.$.subscribe(res => fired.push(res));

            await util.waitUntil(() => fired.length == 1);
            assert.equal(q._execOverDatabaseCount, 1);
            assert.equal(q._latestChangeEvent, 2);

            const addObj = schemaObjects.human();
            addObj.passportId = 'zzzzzzzz';
            await col.insert(addObj);
            assert.equal(q.collection._changeEventBuffer.counter, 3);
            assert.equal(q._latestChangeEvent, 3);

            await util.waitUntil(() => fired.length == 2);
            assert.equal(fired[1].pop().passportId, addObj.passportId);
        });
        it('reusing exec should execOverDatabase when change happened', async() => {
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
    });



    describe('issues', () => {
        it('#157 Cannot sort on field(s) "XXX" when using the default index', async() => {
            const schema = {
                'disableKeyCompression': true,
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
    });

    describe('e', () => {
        //    it('e', () => process.exit());
    });
});
