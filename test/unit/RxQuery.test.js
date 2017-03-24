import assert from 'assert';


import * as humansCollection from './../helper/humans-collection';
import * as schemaObjects from '../helper/schema-objects';
import * as util from '../../dist/lib/util';
import * as RxDocument from '../../dist/lib/RxDocument';
import {
    default as MQuery
} from '../../dist/lib/mquery/mquery';


process.on('unhandledRejection', function(err) {
    throw err;
});

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

    describe('e', () => {
    //    it('e', () => process.exit());
    });
});
