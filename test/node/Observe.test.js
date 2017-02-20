import assert from 'assert';
import {
    default as clone
} from 'clone';
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
                    const db = await RxDatabase.create({
                        name: util.randomCouchString(10),
                        adapter: memdown
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
    describe('Collection', () => {
        describe('.insert()', () => {
            describe('positive', () => {
                it('should get a valid event on insert', async() => {
                    const db = await RxDatabase.create({
                        name: util.randomCouchString(10),
                        adapter: memdown
                    });
                    const colName = 'foobar';
                    const c = await db.collection({
                        name: colName,
                        schema: schemas.human
                    });

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
                    const db = await RxDatabase.create({
                        name: util.randomCouchString(10),
                        adapter: memdown
                    });
                    const c = await db.collection({
                        name: 'foobar',
                        schema: schemas.human
                    });
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
        describe('.remove()', () => {
            describe('positive', () => {
                it('should fire on remove', async() => {
                    const c = await humansCollection.create(0);
                    let ar = [];
                    const sub = c
                        .find()
                        .$
                        .subscribe(docs => ar.push(docs));

                    // null is fired until no results
                    assert.equal(ar.length, 1);
                    assert.deepEqual(ar[0], null);

                    // empty array since no documents
                    await util.promiseWait(10);
                    assert.equal(ar.length, 2);
                    assert.deepEqual(ar[1], []);

                    await c.insert(schemaObjects.human());
                    await util.promiseWait(10);
                    assert.equal(ar.length, 3);
                    const doc = await c.findOne().exec();
                    await doc.remove();
                    await util.promiseWait(10);
                    assert.equal(ar.length, 4);
                    sub.unsubscribe();
                    c.database.destroy();
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
                    doc.set('firstName', util.randomCouchString(8));
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
                    const setName = util.randomCouchString(10);
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
                    const setName = util.randomCouchString(10);
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
                    const sub = doc.get$('firstName').subscribe(newVal => v1 = newVal);
                    await util.promiseWait(5);

                    doc.set('firstName', 'foobar');
                    await doc.save();

                    let v2;
                    doc.get$('firstName').subscribe(newVal => v2 = newVal);

                    assert.equal(v1, v2);
                    assert.equal(v1, 'foobar');
                    sub.unsubscribe();
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
                it('deleted$ is true, on delete', async() => {
                    const c = await humansCollection.create();
                    const doc = await c.findOne().exec();
                    let deleted = null;
                    doc.deleted$.subscribe(v => deleted = v);

                    util.promiseWait(5);
                    assert.deepEqual(deleted, false);

                    await doc.remove();

                    util.promiseWait(5);
                    assert.deepEqual(deleted, true);

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
                    doc.set('firstName', util.randomCouchString(10));
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
                const pw8 = util.promiseWaitResolveable();

                query.$.subscribe(newResults => {
                    lastValue = newResults;
                    if (!newResults) pw8.resolve();
                });
                assert.equal(lastValue, null);
                await pw8.promise;

                await util.promiseWait(100); // w8 a bit to make sure no other fires
                assert.ok(lastValue);
                assert.equal(lastValue.length, 1);
                c.database.destroy();
            });
            it('get the updated docs on Collection.insert()', async() => {
                const c = await humansCollection.create(1);
                const query = c.query();
                let lastValue = [];
                let pw8 = util.promiseWaitResolveable(500);
                query.$.subscribe(newResults => {
                    lastValue = newResults;
                    if (!!newResults) pw8.resolve();
                });
                await pw8.promise;
                assert.equal(lastValue.length, 1);

                const addHuman = schemaObjects.human();
                pw8 = util.promiseWaitResolveable(500);
                await c.insert(addHuman);
                await pw8.promise;
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
                let pw8 = util.promiseWaitResolveable(500);

                let values;
                const query = c.find({
                    firstName: doc.get('firstName')
                }).$.subscribe(newV => {
                    values = newV;
                    if (!!newV) pw8.resolve();
                });

                await pw8.promise;
                assert.equal(values.length, 1);

                // change doc so query does not match
                doc.set('firstName', 'foobar');
                pw8 = util.promiseWaitResolveable(500);
                await doc.save();
                await pw8.promise;
                assert.equal(values.length, 0);
                c.database.destroy();
            });


            /**
             * @link https://github.com/pubkey/rxdb/issues/31
             */
            it('do not fire on doc-change when result-doc not affected', async() => {
                const c = await humansCollection.createAgeIndex(10);
                // take only 9 of 10
                let valuesAr = [];
                let pw8 = util.promiseWaitResolveable(300);
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
