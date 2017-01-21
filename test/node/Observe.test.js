import assert from 'assert';
import {
    default as clone
} from 'clone';
import {
    default as randomToken
} from 'random-token';
import {
    default as memdown
} from 'memdown';
import * as _ from 'lodash';

import * as schemas from '../helper/schemas';
import * as schemaObjects from '../helper/schema-objects';
import * as humansCollection from '../helper/humans-collection';

import * as RxDatabase from '../../dist/lib/RxDatabase';
import * as RxSchema from '../../dist/lib/RxSchema';
import * as RxCollection from '../../dist/lib/RxCollection';
import * as util from '../../dist/lib/util';

process.on('unhandledRejection', function(err) {
    throw err;
});

describe('Observe.test.js', () => {
    describe('Database', () => {
        describe('.collection()', () => {
            describe('positive', () => {
                it('emit when collection is created', async() => {
                    const db = await RxDatabase.create(randomToken(10), memdown);
                    db.collection('myname', schemas.human);
                    const changeEvent = await db.$
                        .filter(cEvent => cEvent.data.op == 'RxDatabase.collection')
                        .first().toPromise();
                    assert.equal(changeEvent.constructor.name, 'RxChangeEvent');
                    assert.equal(changeEvent.data.v, 'myname');
                    db.destroy();
                });
            });
            describe('negative', () => {
                it('emit once when called twice', async() => {
                    const db = await RxDatabase.create(randomToken(10), memdown);
                    let calls = 0;
                    db.$
                        .filter(cEvent => cEvent.data.op == 'RxDatabase.collection')
                        .subscribe(e => {
                            calls++;
                        });
                    await db.collection('myname1', schemas.human);
                    await db.collection('myname1', schemas.human);

                    await util.promiseWait(10);
                    assert.equal(calls, 1);
                    db.destroy();
                });
            });
        });
    });
    describe('Collection', () => {
        describe('.insert()', () => {
            describe('positive', () => {
                it('should get a valid event on insert', async() => {
                    const db = await RxDatabase.create(randomToken(10), memdown);
                    const colName = randomToken(10);
                    const c = await db.collection(colName, schemas.human);

                    c.insert(schemaObjects.human());
                    const changeEvent = await c.$.first().toPromise();
                    assert.equal(changeEvent.constructor.name, 'RxChangeEvent');
                    assert.equal(changeEvent.data.col, colName);
                    assert.equal(typeof changeEvent.data.doc, 'string');
                    assert.ok(changeEvent.data.v);
                    db.destroy();
                });
            });
            describe('negative', () => {
                it('should get no event on non-succes-insert', async() => {
                    const db = await RxDatabase.create(randomToken(10), memdown);
                    const c = await db.collection(randomToken(10), schemas.human);
                    let calls = 0;
                    db.$.subscribe(e => {
                        calls++;
                    });
                    await util.assertThrowsAsync(
                        () => c.insert({
                            foo: 'baar'
                        }),
                        Error
                    );
                    assert.equal(calls, 0);
                    db.destroy();
                });
            });
        });
    });
    describe('Document', () => {
        describe('.save()', () => {
            describe('positive', () => {
                it('should fire on save', async() => {
                    const c = await humansCollection.create();
                    const doc = await c.findOne().exec();
                    doc.set('firstName', randomToken(8));
                    doc.save();
                    const changeEvent = await doc.$.first().toPromise();
                    assert.equal(changeEvent._id, doc.getPrimary());
                    c.database.destroy();
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
                    await util.promiseWait(5);
                    assert.equal(valueObj.v, setName);
                    c.database.destroy();
                });
                it('should observe a nested field', async() => {
                    const c = await humansCollection.createNested();
                    const doc = await c.findOne().exec();
                    const valueObj = {
                        v: doc.get('mainSkill.name')
                    };
                    doc.get$('mainSkill.name').subscribe(newVal => {
                        valueObj.v = newVal;
                    });
                    const setName = randomToken(10);
                    doc.set('mainSkill.name', setName);
                    await doc.save();
                    util.promiseWait(5);
                    assert.equal(valueObj.v, setName);
                    c.database.destroy();
                });
                it('get equal values when subscribing again later', async() => {
                    const c = await humansCollection.create(1);
                    const doc = await c.findOne().exec();
                    let v1;
                    doc.get$('firstName').subscribe(newVal => v1 = newVal);
                    await util.promiseWait(50);

                    doc.set('firstName', 'foobar');
                    await doc.save();

                    let v2;
                    doc.get$('firstName').subscribe(newVal => v2 = newVal);

                    assert.equal(v1, v2);
                    assert.equal(v1, 'foobar');
                    c.database.destroy();
                });
            });
            describe('negative', () => {
                it('cannot observe non-existend field', async() => {
                    const c = await humansCollection.create();
                    const doc = await c.findOne().exec();
                    await util.assertThrowsAsync(
                        () => doc.get$('foobar').subscribe(newVal => newVal),
                        Error
                    );
                    c.database.destroy();
                });
            });
        });
        describe('.remove()', () => {
            describe('positive', () => {
                it('value is undefined on delete', async() => {
                    const c = await humansCollection.create();
                    const doc = await c.findOne().exec();
                    const valueObj = {
                        v: doc.get('firstName')
                    };
                    doc.get$('firstName').subscribe(newVal => {
                        valueObj.v = newVal;
                    });
                    await doc.remove();
                    util.promiseWait(5);
                    assert.equal(valueObj.v, undefined);
                    c.database.destroy();
                });
            });
            describe('negative', () => {});
        });
        describe('.destroy()', () => {
            describe('positive', () => {
                it('not crash on destroy', async() => {
                    const c = await humansCollection.create();
                    const doc = await c.findOne().exec();
                    doc.$.subscribe(newVal => newVal);
                    doc.destroy();
                    c.database.destroy();
                });
                it('should no more change data when destroyed', async() => {
                    const c = await humansCollection.create();
                    const doc = await c.findOne().exec();
                    const valueObj = {
                        v: doc.get('firstName')
                    };
                    const firstValue = valueObj.v;
                    doc.get$('firstName').subscribe(newVal => {
                        valueObj.v = newVal;
                    });
                    doc.set('firstName', randomToken(10));
                    doc.destroy();
                    util.promiseWait(50);
                    assert.equal(valueObj.v, firstValue);
                    c.database.destroy();
                });
            });
            describe('negative', () => {});
        });
    });

    describe('Query', () => {
        describe('positive', () => {
            it('get an init value of null on .subscribe() and [] later', async() => {
                const c = await humansCollection.create(1);
                const query = c.query();
                let lastValue = null;
                query.$.subscribe(newResults => {
                    lastValue = newResults;
                });
                assert.equal(lastValue, null);
                await util.promiseWait(15);
                assert.ok(lastValue);
                assert.equal(lastValue.length, 1);
                c.database.destroy();
            });
            it('get the updated docs on Collection.insert()', async() => {
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
                c.database.destroy();
            });
            it('get the value twice when subscribing 2 times', async() => {
                const c = await humansCollection.create(1);
                const query = c.query();
                let lastValue = [];
                query.$.subscribe(newResults => {
                    lastValue = newResults;
                });
                let lastValue2 = [];
                query.$.subscribe(newResults => {
                    lastValue2 = newResults;
                });
                await util.promiseWait(50);
                assert.equal(lastValue2.length, 1);
                assert.deepEqual(lastValue, lastValue2);
                c.database.destroy();
            });
            it('get the base-value when subscribing again later', async() => {
                const c = await humansCollection.create(1);
                const query = c.query();
                let lastValue = [];
                query.$.subscribe(newResults => {
                    lastValue = newResults;
                });
                await util.promiseWait(100);
                let lastValue2 = [];
                query.$.subscribe(newResults => {
                    lastValue2 = newResults;
                });
                await util.promiseWait(150);
                assert.equal(lastValue2.length, 1);
                assert.deepEqual(lastValue, lastValue2);
                c.database.destroy();
            });
            it('get new values on Document.save', async() => {
                const c = await humansCollection.create(1);
                const doc = await c.findOne().exec();

                let values;
                const query = c.find({
                    firstName: doc.get('firstName')
                }).$.subscribe(newV => values = newV);

                await util.promiseWait(50);
                assert.equal(values.length, 1);

                doc.set('firstName', 'foobar');
                await doc.save();
                await util.promiseWait(50);
                assert.equal(values.length, 0);
                c.database.destroy();
            });


            /**
             * @link https://github.com/pubkey/rxdb/issues/31
             */
            it('do not fire on doc-change when result-doc not affected', async() => {
                const c = await humansCollection.createAgeIndex(10);

                let pw8 = util.promiseWaitResolveable(300);

                // take only 9 of 10
                let valuesAr = [];
                const query = c.find()
                    .limit(9)
                    .sort('age')
                    .$
                    .do(x => pw8.resolve())
                    .filter(x => x !== null)
                    .subscribe(newV => valuesAr.push(newV));

                // get the 10th
                const doc = await c.findOne()
                    .sort({
                        age: -1
                    })
                    .exec();

                await pw8.promise;
                assert.equal(valuesAr.length, 1);

                // edit+save doc
                pw8 = util.promiseWaitResolveable(300);
                doc.firstName = 'foobar';
                await doc.save();
                await pw8.promise;

                await util.promiseWait(20);
                assert.equal(valuesAr.length, 1);
            });
        });
        describe('negative', () => {
            it('get no change when nothing happens', async() => {
                const c = await humansCollection.create(1);
                const query = c.query();
                let recieved = 0;
                query.$.subscribe(newResults => {
                    recieved++;
                });
                await util.promiseWait(50);
                assert.equal(recieved, 2);
                c.database.destroy();
            });
        });
    });
});
