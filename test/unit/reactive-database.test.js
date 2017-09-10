import assert from 'assert';
import clone from 'clone';
import memdown from 'memdown';

import * as schemas from '../helper/schemas';
import * as schemaObjects from '../helper/schema-objects';
import * as humansCollection from '../helper/humans-collection';

import * as RxDatabase from '../../dist/lib/rx-database';
import * as RxSchema from '../../dist/lib/rx-schema';
import * as RxCollection from '../../dist/lib/rx-collection';
import * as util from '../../dist/lib/util';
import AsyncTestUtil from 'async-test-util';


describe('reactive-database.test.js', () => {
    describe('.collection()', () => {
        describe('positive', () => {
            it('emit when collection is created', async() => {
                const db = await RxDatabase.create({
                    name: util.randomCouchString(10),
                    adapter: 'memory'
                });
                db.collection({
                    name: 'myname',
                    schema: schemas.human
                });
                const changeEvent = await db.$
                    .filter(cEvent => cEvent.data.op == 'RxDatabase.collection')
                    .first().toPromise();
                assert.equal(changeEvent.constructor.name, 'RxChangeEvent');
                assert.equal(changeEvent.data.v, 'myname');
                db.destroy();
            });
        });
        describe('negative', () => {});
    });
});
