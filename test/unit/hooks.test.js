import assert from 'assert';
import config from './config';

import * as schemas from '../helper/schemas';
import * as schemaObjects from '../helper/schema-objects';
import * as humansCollection from '../helper/humans-collection';

import * as RxDatabase from '../../dist/lib/rx-database';
import RxDocument from '../../dist/lib/rx-document';
import * as util from '../../dist/lib/util';
import AsyncTestUtil from 'async-test-util';
import {
    first
} from 'rxjs/operators';

config.parallel('hooks.test.js', () => {
    describe('get/set', () => {
        it('should set a hook', async () => {
            const c = await humansCollection.create(0);
            c.preSave(function() {}, false);
            c.database.destroy();
        });
        it('should get a hook', async () => {
            const c = await humansCollection.create(0);
            c.preSave(function() {}, false);
            const hooks = c.getHooks('pre', 'save');
            assert.ok(Array.isArray(hooks.series));
            assert.equal(hooks.series.length, 1);
            c.database.destroy();
        });
        it('should get a parallel hook', async () => {
            const c = await humansCollection.create(0);
            c.preSave(function() {}, true);
            const hooks = c.getHooks('pre', 'save');
            assert.ok(Array.isArray(hooks.parallel));
            assert.equal(hooks.parallel.length, 1);
            c.database.destroy();
        });
    });
    describe('insert', () => {
        describe('pre', () => {
            describe('positive', () => {
                it('series', async () => {
                    const c = await humansCollection.create(0);
                    const human = schemaObjects.human();
                    let count = 0;
                    c.preInsert(function(data, instance) {
                        assert.equal(typeof instance, 'undefined');
                        count++;
                    }, false);
                    await c.insert(human);
                    assert.equal(count, 1);
                    c.database.destroy();
                });
                it('parallel', async () => {
                    const c = await humansCollection.create(0);
                    const human = schemaObjects.human();
                    let count = 0;
                    c.preInsert(function(doc, instance) {
                        assert.equal(typeof instance, 'undefined');
                        count++;
                    }, false);
                    let countp = 0;
                    c.preInsert(function(doc, instance) {
                        assert.equal(typeof instance, 'undefined');
                        countp++;
                    }, true);
                    await c.insert(human);
                    assert.equal(count, 1);
                    assert.equal(countp, 1);
                    c.database.destroy();
                });
                it('should save a modified document', async () => {
                    const c = await humansCollection.createPrimary(0);
                    const human = schemaObjects.simpleHuman();

                    c.preInsert(function(doc, instance) {
                        assert.equal(typeof instance, 'undefined');
                        doc.lastName = 'foobar';
                    }, false);

                    await c.insert(human);
                    const doc = await c.findOne(human.passportId).exec();
                    assert.equal(doc.get('lastName'), 'foobar');
                    c.database.destroy();
                });
                it('async: should save a modified document', async () => {
                    const c = await humansCollection.createPrimary(0);
                    const human = schemaObjects.simpleHuman();

                    c.preInsert(async function(doc, instance) {
                        assert.equal(typeof instance, 'undefined');
                        await util.promiseWait(10);
                        doc.lastName = 'foobar';
                    }, false);

                    await c.insert(human);
                    const doc = await c.findOne(human.passportId).exec();
                    assert.equal(doc.get('lastName'), 'foobar');
                    c.database.destroy();
                });
                it('should not insert if hook throws', async () => {
                    const c = await humansCollection.createPrimary(0);
                    const human = schemaObjects.simpleHuman();
                    c.preInsert(() => {
                        throw new Error('foobar');
                    }, false);

                    let failC = 0;
                    try {
                        await c.insert(human);
                    } catch (e) {
                        failC++;
                    }
                    assert.equal(failC, 1);
                    const doc = await c.findOne(human.passportId).exec();
                    assert.equal(doc, null);
                    c.database.destroy();
                });
                it('should have the collection bound to the this-scope', async () => {
                    const c = await humansCollection.createPrimary(0);
                    c.foo = 'bar';
                    let hasRun = false;
                    c.preInsert(function() {
                        hasRun = true;
                        assert.equal(this.foo, 'bar');
                    }, false);

                    await c.insert(schemaObjects.simpleHuman());

                    assert.ok(hasRun);
                    c.database.destroy();
                });
            });
            describe('negative', () => {
                it('should throw if hook invalidates schema', async () => {
                    const c = await humansCollection.create(0);
                    const human = schemaObjects.human();

                    c.preInsert(function(doc) {
                        doc.lastName = 1337;
                    }, false);

                    await AsyncTestUtil.assertThrows(
                        () => c.insert(human),
                        'RxError',
                        'not match'
                    );
                    c.database.destroy();
                });
            });
        });
        describe('post', () => {
            describe('positive', () => {
                it('series', async () => {
                    const c = await humansCollection.create(0);
                    const human = schemaObjects.human();
                    let count = 0;
                    c.postInsert(function(data, instance) {
                        assert.ok(RxDocument.isInstanceOf(instance));
                        count++;
                    }, false);
                    await c.insert(human);
                    assert.equal(count, 1);
                    c.database.destroy();
                });
                it('parallel', async () => {
                    const c = await humansCollection.create(0);
                    const human = schemaObjects.human();
                    let count = 0;
                    c.postInsert(function(data, instance) {
                        assert.ok(RxDocument.isInstanceOf(instance));
                        assert.ok(data.age);
                        count++;
                    }, true);
                    await c.insert(human);
                    assert.equal(count, 1);
                    c.database.destroy();
                });
            });
        });
    });
    describe('save', () => {
        describe('pre', () => {
            describe('positive', () => {
                it('series', async () => {
                    const c = await humansCollection.createPrimary(0);
                    const human = schemaObjects.simpleHuman();
                    await c.insert(human);
                    const doc = await c.findOne(human.passportId).exec();
                    let count = 0;
                    c.preSave(function(data, instance) {
                        assert.ok(RxDocument.isInstanceOf(instance));
                        count++;
                    }, false);
                    await doc.atomicSet('firstName', 'foobar');
                    assert.equal(count, 1);
                    c.database.destroy();
                });
                it('parallel', async () => {
                    const c = await humansCollection.createPrimary(0);
                    const human = schemaObjects.simpleHuman();
                    await c.insert(human);
                    const doc = await c.findOne(human.passportId).exec();
                    let count = 0;
                    c.preSave(function(data, instance) {
                        assert.ok(RxDocument.isInstanceOf(instance));
                        count++;
                    }, true);
                    await doc.atomicSet('firstName', 'foobar');
                    assert.equal(count, 1);
                    c.database.destroy();
                });
                it('should save a modified document', async () => {
                    const c = await humansCollection.createPrimary(0);
                    const human = schemaObjects.simpleHuman();
                    await c.insert(human);
                    const doc = await c.findOne(human.passportId).exec();

                    let hasRun = false;
                    c.preSave(function() {
                        hasRun = true;
                    }, false);

                    await doc.atomicSet('firstName', 'foobar');
                    assert.ok(hasRun);
                    c.database.destroy();
                });
                it('async: should save a modified document', async () => {
                    const c = await humansCollection.createPrimary(0);
                    const human = schemaObjects.simpleHuman();
                    await c.insert(human);
                    const doc = await c.findOne(human.passportId).exec();

                    let hasRun = false;
                    c.preSave(async function() {
                        await util.promiseWait(10);
                        hasRun = true;
                    }, false);
                    await doc.atomicSet('firstName', 'foobar');
                    assert.ok(hasRun);
                    c.database.destroy();
                });
                it('should not save if hook throws', async () => {
                    const c = await humansCollection.createPrimary(0);
                    const human = schemaObjects.simpleHuman();
                    human.firstName = 'test';
                    await c.insert(human);
                    const doc = await c.findOne(human.passportId).exec();

                    c.preSave(function() {
                        throw new Error('fail');
                    }, false);

                    let failC = 0;
                    try {
                        await doc.atomicSet('firstName', 'foobar');
                    } catch (e) {
                        failC++;
                    }
                    assert.equal(failC, 1);
                    const syncValue = await doc.firstName$.pipe(first()).toPromise();
                    assert.equal(syncValue, 'test');
                    c.database.destroy();
                });
            });
        });
        describe('post', () => {
            describe('positive', () => {
                it('series', async () => {
                    const c = await humansCollection.createPrimary(0);
                    const human = schemaObjects.simpleHuman();
                    await c.insert(human);
                    const doc = await c.findOne(human.passportId).exec();
                    let count = 0;
                    c.postSave(function(data, instance) {
                        assert.ok(RxDocument.isInstanceOf(instance));
                        count++;
                    }, false);
                    await doc.atomicSet('firstName', 'foobar');
                    assert.equal(count, 1);
                    c.database.destroy();
                });
                it('parallel', async () => {
                    const c = await humansCollection.createPrimary(0);
                    const human = schemaObjects.simpleHuman();
                    await c.insert(human);
                    const doc = await c.findOne(human.passportId).exec();
                    let count = 0;
                    c.postSave(function(data, instance) {
                        assert.ok(RxDocument.isInstanceOf(instance));
                        count++;
                    }, true);
                    await doc.atomicSet('firstName', 'foobar');
                    assert.equal(count, 1);
                    c.database.destroy();
                });
            });
            describe('negative', () => {});
        });
    });
    describe('remove', () => {
        describe('pre', () => {
            describe('positive', () => {
                it('series', async () => {
                    const c = await humansCollection.createPrimary(0);
                    const human = schemaObjects.simpleHuman();
                    await c.insert(human);
                    const doc = await c.findOne(human.passportId).exec();
                    let count = 0;
                    c.preRemove(function(data, instance) {
                        assert.ok(RxDocument.isInstanceOf(instance));
                        count++;
                    }, false);
                    await doc.remove();
                    assert.equal(count, 1);
                    c.database.destroy();
                });
                it('parallel', async () => {
                    const c = await humansCollection.createPrimary(0);
                    const human = schemaObjects.simpleHuman();
                    await c.insert(human);
                    const doc = await c.findOne(human.passportId).exec();
                    let count = 0;
                    c.preRemove(function(data, instance) {
                        assert.ok(RxDocument.isInstanceOf(instance));
                        count++;
                    }, true);
                    await doc.remove();
                    assert.equal(count, 1);
                    c.database.destroy();
                });
                it('should not remove if hook throws', async () => {
                    const c = await humansCollection.createPrimary(0);
                    const human = schemaObjects.simpleHuman();
                    await c.insert(human);
                    const doc = await c.findOne(human.passportId).exec();

                    c.preRemove(function() {
                        throw new Error('fail');
                    }, false);

                    let failC = 0;
                    try {
                        await doc.remove();
                    } catch (e) {
                        failC++;
                    }
                    assert.equal(failC, 1);
                    const doc2 = await c.findOne(human.passportId).exec();
                    assert.notEqual(doc2, null);
                    assert.equal(doc2.get('passportId'), human.passportId);
                    c.database.destroy();
                });
            });
            describe('negative', () => {});
        });
        describe('post', () => {
            describe('positive', () => {
                it('series', async () => {
                    const c = await humansCollection.createPrimary(0);
                    const human = schemaObjects.simpleHuman();
                    await c.insert(human);
                    const doc = await c.findOne(human.passportId).exec();
                    let count = 0;
                    c.postRemove(function(data, instance) {
                        assert.ok(RxDocument.isInstanceOf(instance));
                        count++;
                    }, false);
                    await doc.remove();
                    assert.equal(count, 1);
                    c.database.destroy();
                });
                it('parallel', async () => {
                    const c = await humansCollection.createPrimary(0);
                    const human = schemaObjects.simpleHuman();
                    await c.insert(human);
                    const doc = await c.findOne(human.passportId).exec();
                    let count = 0;
                    c.postRemove(function(data, instance) {
                        assert.ok(RxDocument.isInstanceOf(instance));
                        count++;
                    }, true);
                    await doc.remove();
                    assert.equal(count, 1);
                    c.database.destroy();
                });
                it('should have the collection bound to the this-scope', async () => {
                    const c = await humansCollection.createPrimary(1);
                    c.foo2 = 'bar2';
                    let hasRun = false;

                    c.postRemove(function() {
                        hasRun = true;
                        assert.equal(this.foo2, 'bar2');
                    }, true);

                    const doc = await c.findOne().exec();
                    await doc.remove();

                    assert.ok(hasRun);
                    c.database.destroy();
                });
            });
            describe('negative', () => {});
        });
    });
    describe('postCreate', () => {
        describe('positive', () => {
            it('should define a getter', async () => {
                const db = await RxDatabase.create({
                    name: util.randomCouchString(10),
                    adapter: 'memory',
                    multiInstance: true
                });
                const collection = await db.collection({
                    name: 'myhumans',
                    schema: schemas.primaryHuman
                });
                collection.postCreate(function(data, instance) {
                    assert.ok(RxDocument.isInstanceOf(instance));
                    Object.defineProperty(instance, 'myField', {
                        get: () => 'foobar',
                    });
                }, false);

                const human = schemaObjects.simpleHuman();
                await collection.insert(human);
                const doc = await collection.findOne().exec();
                assert.equal('foobar', doc.myField);

                db.destroy();
            });
        });
        describe('negative', () => {
            it('should throw when adding an async-hook', async () => {
                const db = await RxDatabase.create({
                    name: util.randomCouchString(10),
                    adapter: 'memory',
                    multiInstance: true
                });
                const collection = await db.collection({
                    name: 'myhumans',
                    schema: schemas.primaryHuman
                });

                const hookFun = function(doc) {
                    Object.defineProperty(doc, 'myField', {
                        get: () => 'foobar',
                    });
                };

                assert.throws(() => collection.postCreate(hookFun, true));
                db.destroy();
            });
        });
    });
    describe('issues', () => {
        it('ISSUE #158 : Throwing error in async preInsert does not prevent insert', async () => {
            const c = await humansCollection.create(0);
            c.preInsert(async function() {
                await util.promiseWait(1);
                throw new Error('This throw should prevent the insert');
            }, false);
            let hasThrown = false;
            try {
                await c.insert(schemaObjects.human());
            } catch (e) {
                hasThrown = true;
            }
            assert.ok(hasThrown);
            await util.promiseWait(10);
            const allDocs = await c.find().exec();
            assert.equal(allDocs.length, 0);
            c.database.destroy();
        });
    });
});
