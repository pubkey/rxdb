import assert from 'assert';


import * as humansCollection from './../helper/humans-collection';
import * as schemaObjects from '../helper/schema-objects';
import * as util from '../../dist/lib/util';
import * as RxDocument from '../../dist/lib/RxDocument';

process.on('unhandledRejection', function(err) {
    throw err;
});

describe('RxQuery.test.js', () => {
    describe('.toJSON()', () => {

        it('should produce the correct selector-object', async() => {
            const col = await humansCollection.create(0);
            const q = col.find()
                .where('name').ne('Alice')
                .where('age').gt(18).lt(67)
                .limit(10)
                .sort('-age');
            const queryObj = q.toJSON();
            console.dir(queryObj);
            assert.deepEqual(queryObj, {
                selector: {
                    name: {
                        $ne: 'Alice'
                    },
                    age: {
                        $gt: 18,
                        $lt: 67
                    }
                },
                limit: 10,
                sort: [{
                    age: 'desc'
                }]
            });
            col.database.destroy();
        });

    });

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
                console.dir(mquery);
                console.dir(q.toJSON());
                const cloned = mquery.clone();
                console.log(':::::');
                console.dir(cloned);
                process.exit();
            });
        });
    });
});
