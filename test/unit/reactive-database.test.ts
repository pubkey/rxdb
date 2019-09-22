import assert from 'assert';

import * as schemas from '../helper/schemas';

import {
    createRxDatabase,
    RxChangeEvent
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
                        filter((cEvent: RxChangeEvent) => cEvent.data.op === 'RxDatabase.collection'),
                        first()
                    ).toPromise().then(event => {
                        assert.notStrictEqual(db[event.data.v], undefined);
                        return event;
                    });
                assert.strictEqual(changeEvent.constructor.name, 'RxChangeEvent');
                assert.strictEqual(changeEvent.data.v, 'myname');
                db.destroy();
            });
        });
        describe('negative', () => {});
    });
});
