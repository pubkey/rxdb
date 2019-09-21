import assert from 'assert';

import * as schemas from '../helper/schemas';

import {
    create as createRxDatabase
} from '../../';
import * as util from '../../dist/lib/util';

import {
    first,
    filter
} from 'rxjs/operators';

describe('reactive-database.test.js', () => {
    describe('.collection()', () => {
        describe('positive', () => {
            it('emit when collection is created', async () => {
                const db = await createRxDatabase({
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
                    ).toPromise().then(event => {
                        assert.notEqual(db[event.data.v], undefined);
                        return event;
                    });
                assert.equal(changeEvent.constructor.name, 'RxChangeEvent');
                assert.equal(changeEvent.data.v, 'myname');
                db.destroy();
            });
        });
        describe('negative', () => {});
    });
});
