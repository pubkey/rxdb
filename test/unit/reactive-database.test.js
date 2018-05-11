import assert from 'assert';

import * as schemas from '../helper/schemas';

import * as RxDatabase from '../../dist/lib/rx-database';
import * as util from '../../dist/lib/util';

import {
    first,
    filter
} from 'rxjs/operators';

describe('reactive-database.test.js', () => {
    describe('.collection()', () => {
        describe('positive', () => {
            it('emit when collection is created', async () => {
                const db = await RxDatabase.create({
                    name: util.randomCouchString(10),
                    adapter: 'memory'
                });
                db.collection({
                    name: 'myname',
                    schema: schemas.human
                });
                const changeEvent = await db.$
                    .pipe(
                        filter(cEvent => cEvent.data.op === 'RxDatabase.collection'),
                        first()
                    ).toPromise();
                assert.equal(changeEvent.constructor.name, 'RxChangeEvent');
                assert.equal(changeEvent.data.v, 'myname');
                db.destroy();
            });
        });
        describe('negative', () => {});
    });
});
