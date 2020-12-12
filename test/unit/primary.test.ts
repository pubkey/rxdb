/**
 * instead of using a generated _id as primary,
 * a own primary can be set in the schema
 * the primary is always:
 *    - type:     'string'
 *    - index:    true
 *    - final:    true
 *    - unique:   true
 *    - required
 */

import assert from 'assert';
import clone from 'clone';
import AsyncTestUtil from 'async-test-util';

import config from './config';
import {
    createRxSchema,
    randomCouchString,
    promiseWait,
    isRxDocument
} from '../../plugins/core';
import * as schemas from '../helper/schemas';
import * as schemaObjects from '../helper/schema-objects';
import * as humansCollection from '../helper/humans-collection';

config.parallel('primary.test.js', () => {
    describe('Schema', () => {
        describe('.create()', () => {
            describe('positive', () => {
                it('use in schema', () => {
                    const schema = createRxSchema(schemas.primaryHuman);
                    assert.strictEqual(typeof schema.primaryPath, 'string');
                });
            });
            describe('negative', () => {
                it('throw if primary is also index', () => {
                    const schemaObj = clone(schemas.primaryHuman);
                    (schemaObj.properties.passportId as any).index = true;
                    assert.throws(() => createRxSchema(schemaObj), Error);
                });
                it('throw if primary is also unique', () => {
                    const schemaObj: any = clone(schemas.primaryHuman);
                    schemaObj.properties.passportId['unique'] = true;
                    assert.throws(() => createRxSchema(schemaObj), Error);
                });
                it('throw if primary is no string', () => {
                    const schemaObj = clone(schemas.primaryHuman);
                    schemaObj.properties.passportId.type = 'integer';
                    assert.throws(() => createRxSchema(schemaObj), Error);
                });
                it('throw if primary is defined twice', () => {
                    const schemaObj = clone(schemas.primaryHuman);
                    (schemaObj.properties as any).passportId2 = {
                        type: 'string',
                        primary: true
                    };
                    assert.throws(() => createRxSchema(schemaObj), Error);
                });
                it('throw if primary is encrypted', () => {
                    const schemaObj = clone(schemas.primaryHuman);
                    (schemaObj.properties.passportId as any).encrypted = true;
                    assert.throws(() => createRxSchema(schemaObj), Error);
                });
            });
        });
        describe('.validate()', () => {
            describe('positive', () => {
                it('should validate the human', () => {
                    const schema = createRxSchema(schemas.primaryHuman);
                    const obj = schemaObjects.simpleHuman();
                    assert.ok(schema.validate(obj));
                });
            });

            describe('positive', () => {
                it('should validate when primary key is _id', () => {
                    const schema = createRxSchema(schemas._idPrimary);
                    const obj = schemaObjects._idPrimary();
                    assert.ok(schema.validate(obj));
                });
            });

            describe('negative', () => {
                it('should not validate the human without primary', () => {
                    const schema = createRxSchema(schemas.primaryHuman);
                    const obj = {
                        firstName: randomCouchString(10),
                        lastName: randomCouchString(10)
                    };
                    assert.throws(() => schema.validate(obj), Error);
                });
                it('should not validate with primary object', () => {
                    const schema = createRxSchema(schemas.primaryHuman);
                    const obj = {
                        passportId: {},
                        firstName: randomCouchString(10),
                        lastName: randomCouchString(10)
                    };
                    assert.throws(() => schema.validate(obj), Error);
                });
            });
        });
    });
    describe('Collection', () => {
        describe('.insert()', () => {
            describe('positive', () => {
                it('should insert a human', async () => {
                    const c = await humansCollection.createPrimary(0);
                    const obj = schemaObjects.simpleHuman();
                    await c.insert(obj);
                    const all = await c.pouch.allDocs({
                        include_docs: true
                    });
                    const first = all.rows[0].doc;
                    assert.strictEqual(obj.passportId, first._id);
                    c.database.destroy();
                });
            });
            describe('negative', () => {
                it('throw on duplicate primary', async () => {
                    const c = await humansCollection.createPrimary(0);
                    const obj = schemaObjects.simpleHuman();
                    await c.insert(obj);
                    const obj2 = schemaObjects.simpleHuman();
                    obj2.passportId = obj.passportId;
                    await AsyncTestUtil.assertThrows(
                        () => c.insert(obj2),
                        'RxError',
                        'conflict'
                    );
                    c.database.destroy();
                });
                it('do not allow primary==null', async () => {
                    const c = await humansCollection.createPrimary(0);
                    const obj: any = schemaObjects.simpleHuman();
                    obj.passportId = null;
                    await AsyncTestUtil.assertThrows(
                        () => c.insert(obj),
                        'RxError',
                        'not match'
                    );
                    c.database.destroy();
                });
            });
        });
        describe('.find()', () => {
            describe('positive', () => {
                it('find the inserted doc', async () => {
                    const c = await humansCollection.createPrimary(0);
                    const obj = schemaObjects.simpleHuman();
                    await c.insert(obj);
                    const docs = await c.find().exec();
                    assert.strictEqual(docs.length, 1);
                    c.database.destroy();
                });
                it('find by primary', async () => {
                    const c = await humansCollection.createPrimary(0);
                    const obj = schemaObjects.simpleHuman();
                    await c.insert(obj);
                    const docs = await c.find({
                        selector: {
                            passportId: obj.passportId
                        }
                    }).exec();
                    assert.strictEqual(docs.length, 1);
                    c.database.destroy();
                });
                it('sort by primary', async () => {
                    const c = await humansCollection.createPrimary(5);
                    const docsASC = await c.find().sort({
                        passportId: 'asc'
                    }).exec();
                    const docsDESC = await c.find().sort({
                        passportId: 'desc'
                    }).exec();
                    assert.strictEqual(docsASC.length, 5);
                    assert.strictEqual(docsDESC.length, 5);
                    assert.strictEqual(
                        docsASC[0].firstName,
                        (docsDESC.pop() as any).firstName
                    );
                    c.database.destroy();
                });
            });
            describe('negative', () => { });
        });
        describe('.findOne()', () => {
            describe('positive', () => {
                it('find the doc', async () => {
                    const c = await humansCollection.createPrimary(6);
                    const obj = schemaObjects.simpleHuman();
                    await c.insert(obj);
                    const doc = await c.findOne(obj.passportId).exec(true);
                    assert.strictEqual(doc.primary, obj.passportId);
                    c.database.destroy();
                });
                it('find nothing', async () => {
                    const c = await humansCollection.createPrimary(10);
                    const doc = await c.findOne('foobar').exec();
                    assert.strictEqual(doc, null);
                    c.database.destroy();
                });
                it('find with more selectors', async () => {
                    const c = await humansCollection.createPrimary(6);
                    const obj = schemaObjects.simpleHuman();
                    await c.insert(obj);
                    const doc = await c.findOne({
                        selector: {
                            firstName: obj.firstName
                        }
                    }).exec(true);
                    assert.strictEqual(doc.primary, obj.passportId);
                    c.database.destroy();
                });
                it('BUG: findOne().where(myPrimary)', async () => {
                    const c = await humansCollection.createPrimary(1);
                    const doc = await c.findOne().exec(true);
                    const passportId = doc.passportId;
                    assert.ok(passportId.length > 4);
                    const doc2 = await c.findOne().where('passportId').eq(passportId).exec(true);
                    assert.ok(isRxDocument(doc2));
                    assert.strictEqual(doc.passportId, doc2.passportId);
                    c.database.destroy();
                });
            });
            describe('negative', () => { });
        });
    });
    describe('Document', () => {
        describe('.get()', () => {
            describe('positive', () => {
                it('get the primary value', async () => {
                    const c = await humansCollection.createPrimary(0);
                    const obj = schemaObjects.simpleHuman();
                    await c.insert(obj);
                    const doc = await c.findOne().exec(true);
                    assert.strictEqual(obj.passportId, doc.get('passportId'));
                    c.database.destroy();
                });
            });
            describe('negative', () => { });
        });
        describe('.save()', () => {
            describe('positive', () => {
                it('save an edited doc with a primary', async () => {
                    const c = await humansCollection.createPrimary(0);
                    const obj = schemaObjects.simpleHuman();
                    await c.insert(obj);
                    const doc = await c.findOne().exec(true);
                    await doc.atomicSet('firstName', 'foobar');
                    const doc2 = await c.findOne().exec(true);

                    assert.strictEqual(doc2.get('firstName'), 'foobar');
                    assert.strictEqual(doc.get('passportId'), doc2.get('passportId'));
                    c.database.destroy();
                });
            });
            describe('negative', () => { });
        });
        describe('.subscribe()', () => {
            describe('positive', () => {
                it('subscribe to one field', async () => {
                    const c = await humansCollection.createPrimary(0);
                    const obj = schemaObjects.simpleHuman();
                    await c.insert(obj);
                    const doc = await c.findOne().exec(true);
                    let value;
                    const sub = doc.get$('firstName').subscribe((newVal: any) => value = newVal);
                    await doc.atomicSet('firstName', 'foobar');
                    await promiseWait(10);
                    assert.strictEqual(value, 'foobar');
                    sub.unsubscribe();
                    c.database.destroy();
                });
                it('subscribe to query', async () => {
                    const c = await humansCollection.createPrimary(0);
                    let docs: any[];
                    const sub = c.find().$.subscribe(newDocs => {
                        docs = newDocs;
                    });
                    await c.insert(schemaObjects.simpleHuman());
                    await AsyncTestUtil.waitUntil(() => docs && docs.length === 1);
                    sub.unsubscribe();
                    c.database.destroy();
                });
                it('get event on db2 when db1 fires', async () => {
                    const name = randomCouchString(10);
                    const c1 = await humansCollection.createPrimary(0, name);
                    const c2 = await humansCollection.createPrimary(0, name);
                    let docs: any[];
                    c2.find().$.subscribe(newDocs => docs = newDocs);
                    await c1.insert(schemaObjects.simpleHuman());
                    await AsyncTestUtil.waitUntil(() => docs && docs.length === 1);

                    c1.database.destroy();
                    c2.database.destroy();
                });
                it('get new field-value when other db changes', async () => {
                    const name = randomCouchString(10);
                    const c1 = await humansCollection.createPrimary(0, name);
                    const c2 = await humansCollection.createPrimary(0, name);
                    const obj = schemaObjects.simpleHuman();
                    await c1.insert(obj);
                    const doc = await c1.findOne().exec(true);


                    let value: any;
                    let count = 0;
                    const pW8 = AsyncTestUtil.waitResolveable(1000);
                    (doc as any).firstName$.subscribe((newVal: any) => {
                        value = newVal;
                        count++;
                        if (count >= 2) pW8.resolve();
                    });
                    const doc2 = await c2.findOne().exec(true);
                    await doc2.atomicSet('firstName', 'foobar');
                    await pW8.promise;
                    await AsyncTestUtil.waitUntil(() => value === 'foobar');
                    assert.strictEqual(count, 2);
                    c1.database.destroy();
                    c2.database.destroy();
                });
            });
            describe('negative', () => { });
        });
    });
});
