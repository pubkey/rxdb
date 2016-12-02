import assert from 'assert';
import {
    default as randomToken
} from 'random-token';

import * as RxDB from '../../lib/index';
import * as util from '../../lib/util';

import * as schemas from '../helper/schemas';
import * as schemaObjects from '../helper/schema-objects';
import * as humansCollection from '../helper/humans-collection';

describe('Observe.test.js', () => {
    describe('Collection', () => {
        describe('.$', () => {
            it('should fire event on insert', async() => {
                const col = await humansCollection.create(1);
                let recieved = 0;
                col.$.subscribe(cEvent => {
                    assert.equal(cEvent.constructor.name, 'RxChangeEvent');
                    recieved++;
                });
                await col.insert(schemaObjects.human());
                assert.equal(recieved, 1);
            });
        });
        describe('.query()', () => {
            it('should get new docs on insert', async() => {
                const c = await humansCollection.create(1);
                const query = c.query();
                let lastValue = [];
                query.$.subscribe(newResults => {
                    lastValue = newResults;
                });
                await util.promiseWait(50);
                assert.equal(lastValue.length, 1);

                const addHuman = schemaObjects.human();
                await c.insert(addHuman);
                await util.promiseWait(50);
                assert.equal(lastValue.length, 2);

                let isHere = false;
                lastValue.map(doc => {
                    if (doc.get('passportId') == addHuman.passportId)
                        isHere = true;
                });
                assert.ok(isHere);
            });
        });
    });
    describe('Document', () => {
        it('should fire on save', async() => {
            const c = await humansCollection.create();
            const doc = await c.findOne().exec();
            doc.set('firstName', randomToken(8));
            doc.save();
            const changeEvent = await doc.$.first().toPromise();
            assert.equal(changeEvent.data.doc, doc.rawData._id);
        });
        it('should observe a single field', async() => {
            const c = await humansCollection.create();
            const doc = await c.findOne().exec();
            const valueObj = {
                v: doc.get('firstName')
            };
            doc.get$('firstName').subscribe(newVal => {
                valueObj.v = newVal;
            });
            const setName = randomToken(10);
            doc.set('firstName', setName);
            await doc.save();
            util.promiseWait(5);
            assert.equal(valueObj.v, setName);
        });
    });
});
