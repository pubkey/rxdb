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
                    .where('age').gt(10)
                    .sort('name').limit(3);
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
