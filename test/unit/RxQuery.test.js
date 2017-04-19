import assert from 'assert';


import * as humansCollection from './../helper/humans-collection';
import * as schemaObjects from '../helper/schema-objects';
import * as util from '../../dist/lib/util';
import * as RxDocument from '../../dist/lib/RxDocument';

process.on('unhandledRejection', function(err) {
    throw err;
});

describe('RxQuery.test.js', () => {
    describe('mquery', () => {
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
        describe('.findOne()', () => {
            it('should only return one for primary key search', async() => {
                const col = await humansCollection.create(0);
                const [general] = await col.find().where('name').eq('Alice').exec()
                const [specific] = await col.findOne(general._id).exec()
                assert.deepEqual(general, specific)
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
    describe('.clone()', () => {
        it('should deep-clone the query', async() => {
            const col = await humansCollection.create(0);
            const q = col.find()
                .where('name').ne('Alice')
                .where('age').gt(18).lt(67)
                .limit(10)
                .sort('-age');
            const cloned = q._clone();
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
            assert.equal(str, '{"options":{"limit":10,"sort":{"age":-1}},"_conditions":{"_id":{},"name":{"$ne":"Alice"},"age":{"$gt":18,"$lt":67}},"_path":"age"}');
        });
    });
});
