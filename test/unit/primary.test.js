/**
 * instead of using a generated _id as primary,
 * a own primary can be set in the schema
 * the primary is always:
 *    - type:     'string'
 *    - index:    true
 *    - unique:   true
 *    - required: true,
 */

import assert from 'assert';
import clone from 'clone';

import * as RxSchema from '../../dist/lib/rx-schema';
import * as util from '../../dist/lib/util';
import AsyncTestUtil from 'async-test-util';
import * as schemas from '../helper/schemas';
import * as schemaObjects from '../helper/schema-objects';
import * as humansCollection from '../helper/humans-collection';


describe('primary.test.js', () => {
    describe('Schema', () => {
        describe('.create()', () => {
            describe('positive', () => {
                it('use in schema', async() => {
                    const schema = RxSchema.create(schemas.primaryHuman);
                    assert.equal(typeof schema.primaryPath, 'string');
                });
            });
            describe('negative', () => {
                it('throw if primary is also index', async() => {
                    const schemaObj = clone(schemas.primaryHuman);
                    schemaObj.properties.passportId.index = true;
                    assert.throws(() => RxSchema.create(schemaObj), Error);
                });
                it('throw if primary is also unique', async() => {
                    const schemaObj = clone(schemas.primaryHuman);
                    schemaObj.properties.passportId.unique = true;
                    assert.throws(() => RxSchema.create(schemaObj), Error);
                });
                it('throw if primary is no string', () => {
                    const schemaObj = clone(schemas.primaryHuman);
                    schemaObj.properties.passportId.type = 'integer';
                    assert.throws(() => RxSchema.create(schemaObj), Error);
                });
                it('throw if primary is defined twice', async() => {
                    const schemaObj = clone(schemas.primaryHuman);
                    schemaObj.properties.passportId2 = {
                        type: 'string',
                        primary: true
                    };
                    assert.throws(() => RxSchema.create(schemaObj), Error);
                });
                it('throw if primary is in required', async() => {
                    const schemaObj = clone(schemas.primaryHuman);
                    schemaObj.required.push('passportId');
                    assert.throws(() => RxSchema.create(schemaObj), Error);
                });

                it('throw if primary is encrypted', async() => {
                    const schemaObj = clone(schemas.primaryHuman);
                    schemaObj.properties.passportId.encrypted = true;
                    assert.throws(() => RxSchema.create(schemaObj), Error);
                });
            });
        });
        describe('.validate()', () => {
            describe('positive', () => {
                it('should validate the human', () => {
                    const schema = RxSchema.create(schemas.primaryHuman);
                    const obj = schemaObjects.simpleHuman();
                    assert.ok(schema.validate(obj));
                });
            });
            describe('negative', () => {
                it('should not validate the human without primary', () => {
                    const schema = RxSchema.create(schemas.primaryHuman);
                    const obj = {
                        firstName: util.randomCouchString(10),
                        lastName: util.randomCouchString(10)
                    };
                    assert.throws(() => schema.validate(obj), Error);
                });
                it('should not validate with primary object', () => {
                    const schema = RxSchema.create(schemas.primaryHuman);
                    const obj = {
                        passportId: {},
                        firstName: util.randomCouchString(10),
                        lastName: util.randomCouchString(10)
                    };
                    assert.throws(() => schema.validate(obj), Error);
                });
            });
        });
    });
    describe('Collection', () => {
        describe('.insert()', () => {
            describe('positive', () => {
                it('should insert a human', async() => {
                    const c = await humansCollection.createPrimary(0);
                    const obj = schemaObjects.simpleHuman();
                    await c.insert(obj);
                    const all = await c.pouch.allDocs({
                        include_docs: true
                    });
                    const first = all.rows[0].doc;
                    assert.equal(obj.passportId, first._id);
                    c.database.destroy();
                });
            });
            describe('negative', () => {
                it('throw on duplicate primary', async() => {
                    const c = await humansCollection.createPrimary(0);
                    const obj = schemaObjects.simpleHuman();
                    await c.insert(obj);
                    const obj2 = schemaObjects.simpleHuman();
                    obj2.passportId = obj.passportId;
                    await AsyncTestUtil.assertThrows(
                        () => c.insert(obj2),
                        'PouchError'
                    );
                    c.database.destroy();
                });
                it('do not allow primary==null', async() => {
                    const c = await humansCollection.createPrimary(0);
                    const obj = schemaObjects.simpleHuman();
                    obj.passportId = null;
                    await AsyncTestUtil.assertThrows(
                        () => c.insert(obj),
                        Error
                    );
                    c.database.destroy();
                });
            });
        });
        describe('.find()', () => {
            describe('positive', () => {
                it('find the inserted doc', async() => {
                    const c = await humansCollection.createPrimary(0);
                    const obj = schemaObjects.simpleHuman();
                    await c.insert(obj);
                    const docs = await c.find().exec();
                    assert.equal(docs.length, 1);
                    c.database.destroy();
                });
                it('find by primary', async() => {
                    const c = await humansCollection.createPrimary(0);
                    const obj = schemaObjects.simpleHuman();
                    await c.insert(obj);
                    const docs = await c.find({
                        passportId: obj.passportId
                    }).exec();
                    assert.equal(docs.length, 1);
                    c.database.destroy();
                });
                it('sort by primary', async() => {
                    const c = await humansCollection.createPrimary(5);
                    const docsASC = await c.find().sort({
                        passportId: 1
                    }).exec();
                    const docsDESC = await c.find().sort({
                        passportId: -1
                    }).exec();
                    assert.equal(docsASC.length, 5);
                    assert.equal(docsDESC.length, 5);
                    assert.equal(
                        docsASC[0].firstName,
                        docsDESC.pop().firstName
                    );
                    c.database.destroy();
                });
            });
            describe('negative', () => {});
        });
        describe('.findOne()', () => {
            describe('positive', () => {
                it('find the doc', async() => {
                    const c = await humansCollection.createPrimary(6);
                    const obj = schemaObjects.simpleHuman();
                    await c.insert(obj);
                    const doc = await c.findOne(obj.passportId).exec();
                    assert.equal(doc.primary, obj.passportId);
                    c.database.destroy();
                });
                it('find nothing', async() => {
                    const c = await humansCollection.createPrimary(10);
                    const doc = await c.findOne('foobar').exec();
                    assert.equal(doc, null);
                    c.database.destroy();
                });
                it('find with more selectors', async() => {
                    const c = await humansCollection.createPrimary(6);
                    const obj = schemaObjects.simpleHuman();
                    await c.insert(obj);
                    const doc = await c.findOne({
                        firstName: obj.firstName
                    }).exec();
                    assert.equal(doc.primary, obj.passportId);
                    c.database.destroy();
                });
                it('BUG: findOne().where(myPrimary)', async() => {
                    const c = await humansCollection.createPrimary(1);
                    const doc = await c.findOne().exec();
                    const passportId = doc.passportId;
                    assert.ok(passportId.length > 4);
                    const doc2 = await c.findOne().where('passportId').eq(passportId).exec();
                    assert.equal(doc2.constructor.name, 'RxDocument');
                    assert.equal(doc.passportId, doc2.passportId);
                });
            });
            describe('negative', () => {});
        });
    });
    describe('Document', () => {
        describe('.get()', () => {
            describe('positive', () => {
                it('get the primary value', async() => {
                    const c = await humansCollection.createPrimary(0);
                    const obj = schemaObjects.simpleHuman();
                    await c.insert(obj);
                    const doc = await c.findOne().exec();
                    assert.equal(obj.passportId, doc.get('passportId'));
                    c.database.destroy();
                });
            });
            describe('negative', () => {});
        });
        describe('.set()', () => {
            describe('positive', () => {
                it('modify a non-primary', async() => {
                    const c = await humansCollection.createPrimary(0);
                    const obj = schemaObjects.simpleHuman();
                    await c.insert(obj);
                    const doc = await c.findOne().exec();
                    doc.set('firstName', 'foobar');
                    c.database.destroy();
                });
            });
            describe('negative', () => {
                it('should not allow to set the primary', async() => {
                    const c = await humansCollection.createPrimary(0);
                    const obj = schemaObjects.simpleHuman();
                    await c.insert(obj);
                    const doc = await c.findOne().exec();
                    await AsyncTestUtil.assertThrows(
                        () => doc.set('passportId', 'foobar'),
                        Error
                    );
                    c.database.destroy();
                });
            });
        });
        describe('.save()', () => {
            describe('positive', () => {
                it('save an edited doc with a primary', async() => {
                    const c = await humansCollection.createPrimary(0);
                    const obj = schemaObjects.simpleHuman();
                    await c.insert(obj);
                    const doc = await c.findOne().exec();
                    doc.set('firstName', 'foobar');
                    await doc.save();
                    const doc2 = await c.findOne().exec();

                    assert.equal(doc2.get('firstName'), 'foobar');
                    assert.equal(doc.get('passportId'), doc2.get('passportId'));
                    c.database.destroy();
                });
            });
            describe('negative', () => {});
        });
        describe('.subscribe()', () => {
            describe('positive', () => {
                it('subscribe to one field', async() => {
                    const c = await humansCollection.createPrimary(0);
                    const obj = schemaObjects.simpleHuman();
                    await c.insert(obj);
                    const doc = await c.findOne().exec();
                    let value;
                    doc.get$('firstName').subscribe(newVal => value = newVal);
                    doc.set('firstName', 'foobar');
                    await doc.save();
                    await util.promiseWait(10);
                    assert.equal(value, 'foobar');
                    c.database.destroy();
                });
                it('subscribe to query', async() => {
                    const c = await humansCollection.createPrimary(0);
                    let docs;
                    c.find().$.subscribe(newDocs => docs = newDocs);
                    await c.insert(schemaObjects.simpleHuman());
                    await AsyncTestUtil.waitUntil(() => docs && docs.length === 1);
                    c.database.destroy();
                });
                it('get event on db2 when db1 fires', async() => {
                    const name = util.randomCouchString(10);
                    const c1 = await humansCollection.createPrimary(0, name);
                    const c2 = await humansCollection.createPrimary(0, name);
                    let docs;
                    c2.find().$.subscribe(newDocs => docs = newDocs);
                    await c1.insert(schemaObjects.simpleHuman());
                    await AsyncTestUtil.waitUntil(() => docs && docs.length === 1);

                    c1.database.destroy();
                    c2.database.destroy();
                });
                it('get new field-value when other db changes', async() => {
                    const name = util.randomCouchString(10);
                    const c1 = await humansCollection.createPrimary(0, name);
                    const c2 = await humansCollection.createPrimary(0, name);
                    const obj = schemaObjects.simpleHuman();
                    await c1.insert(obj);
                    const doc = await c1.findOne().exec();
                    let value;
                    let count = 0;
                    const pW8 = AsyncTestUtil.waitResolveable(1000);
                    doc.firstName$.subscribe(newVal => {
                        value = newVal;
                        count++;
                        if (count >= 2) pW8.resolve();
                    });
                    const doc2 = await c2.findOne().exec();
                    doc2.set('firstName', 'foobar');
                    await doc2.save();
                    await pW8.promise;
                    assert.equal(value, 'foobar');
                    assert.equal(count, 2);
                    c1.database.destroy();
                    c2.database.destroy();
                });
            });
            describe('negative', () => {});
        });
    });
});
