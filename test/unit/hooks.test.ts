import assert from 'assert';
import AsyncTestUtil from 'async-test-util';
import {
    first
} from 'rxjs/operators';

import config from './config';
import * as schemas from '../helper/schemas';
import * as schemaObjects from '../helper/schema-objects';
import * as humansCollection from '../helper/humans-collection';

import {
    createRxDatabase,
    isRxDocument,
    promiseWait,
    randomCouchString
} from '../../plugins/core';

config.parallel('hooks.test.js', () => {
    describe('get/set', () => {
        it('should set a hook', async () => {
            const c = await humansCollection.create(0);
            c.preSave(function () { }, false);
            c.database.destroy();
        });
        it('should get a hook', async () => {
            const c = await humansCollection.create(0);
            c.preSave(function () { }, false);
            const hooks = c.getHooks('pre', 'save');
            assert.ok(Array.isArray(hooks.series));
            assert.strictEqual(hooks.series.length, 1);
            c.database.destroy();
        });
        it('should get a parallel hook', async () => {
            const c = await humansCollection.create(0);
            c.preSave(function () { }, true);
            const hooks = c.getHooks('pre', 'save');
            assert.ok(Array.isArray(hooks.parallel));
            assert.strictEqual(hooks.parallel.length, 1);
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
                    c.preInsert((data, instance) => {
                        assert.strictEqual(typeof instance, 'undefined');
                        count++;
                    }, false);
                    await c.insert(human);
                    assert.strictEqual(count, 1);
                    c.database.destroy();
                });
                it('parallel', async () => {
                    const c = await humansCollection.create(0);
                    const human = schemaObjects.human();
                    let count = 0;
                    c.preInsert(function (doc, instance) {
                        assert.strictEqual(typeof instance, 'undefined');
                        count++;
                    }, false);
                    let countp = 0;
                    c.preInsert(function (doc, instance) {
                        assert.strictEqual(typeof instance, 'undefined');
                        countp++;
                    }, true);
                    await c.insert(human);
                    assert.strictEqual(count, 1);
                    assert.strictEqual(countp, 1);
                    c.database.destroy();
                });
                it('should save a modified document', async () => {
                    const c = await humansCollection.createPrimary(0);
                    const human = schemaObjects.simpleHuman();

                    c.preInsert(function (d, instance) {
                        assert.strictEqual(typeof instance, 'undefined');
                        d.lastName = 'foobar';
                    }, false);

                    await c.insert(human);
                    const doc = await c.findOne(human.passportId).exec(true);
                    assert.strictEqual(doc.get('lastName'), 'foobar');
                    c.database.destroy();
                });
                it('async: should save a modified document', async () => {
                    const c = await humansCollection.createPrimary(0);
                    const human = schemaObjects.simpleHuman();

                    c.preInsert(async function (d, instance) {
                        assert.strictEqual(typeof instance, 'undefined');
                        await promiseWait(10);
                        d.lastName = 'foobar';
                    }, false);

                    await c.insert(human);
                    const doc = await c.findOne(human.passportId).exec(true);
                    assert.strictEqual(doc.get('lastName'), 'foobar');
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
                    assert.strictEqual(failC, 1);
                    const doc = await c.findOne(human.passportId).exec();
                    assert.strictEqual(doc, null);
                    c.database.destroy();
                });
                it('should have the collection bound to the this-scope', async () => {
                    const c = await humansCollection.createPrimary(0);
                    c.foo = 'bar';
                    let hasRun = false;
                    c.preInsert(function (this: any) {
                        hasRun = true;
                        assert.strictEqual(this.foo, 'bar');
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

                    c.preInsert(function (doc: any) {
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
                    c.postInsert(function (data, instance) {
                        assert.ok(isRxDocument(instance));
                        count++;
                    }, false);
                    await c.insert(human);
                    assert.strictEqual(count, 1);
                    c.database.destroy();
                });
                it('parallel', async () => {
                    const c = await humansCollection.create(0);
                    const human = schemaObjects.human();
                    let count = 0;
                    c.postInsert(function (data, instance) {
                        assert.ok(isRxDocument(instance));
                        assert.ok(data.age);
                        count++;
                    }, true);
                    await c.insert(human);
                    assert.strictEqual(count, 1);
                    c.database.destroy();
                });
                it('should call post insert hook after bulkInsert', async () => {
                    const c = await humansCollection.create(0);
                    const human = schemaObjects.human();
                    let count = 0;
                    c.postInsert((data, instance) => {
                        assert.ok(data.age);
                        assert.ok(isRxDocument(instance));
                        count++;
                    }, false);
                    await c.bulkInsert([human]);
                    assert.strictEqual(count, 1);
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
                    const doc = await c.findOne(human.passportId).exec(true);
                    let count = 0;
                    c.preSave(function (data, instance) {
                        assert.ok(isRxDocument(instance));
                        count++;
                    }, false);
                    await doc.atomicSet('firstName', 'foobar');
                    assert.strictEqual(count, 1);
                    c.database.destroy();
                });
                it('parallel', async () => {
                    const c = await humansCollection.createPrimary(0);
                    const human = schemaObjects.simpleHuman();
                    await c.insert(human);
                    const doc = await c.findOne(human.passportId).exec(true);
                    let count = 0;
                    c.preSave(function (data, instance) {
                        assert.ok(isRxDocument(instance));
                        count++;
                    }, true);
                    await doc.atomicSet('firstName', 'foobar');
                    assert.strictEqual(count, 1);
                    c.database.destroy();
                });
                it('should save a modified document', async () => {
                    const c = await humansCollection.createPrimary(0);
                    const human = schemaObjects.simpleHuman();
                    await c.insert(human);
                    const doc = await c.findOne(human.passportId).exec(true);

                    let hasRun = false;
                    c.preSave(function () {
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
                    const doc = await c.findOne(human.passportId).exec(true);

                    let hasRun = false;
                    c.preSave(async function () {
                        await promiseWait(10);
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
                    const doc = await c.findOne(human.passportId).exec(true);

                    c.preSave(function () {
                        throw new Error('fail');
                    }, false);

                    let failC = 0;
                    try {
                        await doc.atomicSet('firstName', 'foobar');
                    } catch (e) {
                        failC++;
                    }
                    assert.strictEqual(failC, 1);
                    const syncValue = await (doc as any).firstName$.pipe(first()).toPromise();
                    assert.strictEqual(syncValue, 'test');
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
                    const doc = await c.findOne(human.passportId).exec(true);
                    let count = 0;
                    c.postSave(function (data, instance) {
                        assert.ok(isRxDocument(instance));
                        count++;
                    }, false);
                    await doc.atomicSet('firstName', 'foobar');
                    assert.strictEqual(count, 1);
                    c.database.destroy();
                });
                it('parallel', async () => {
                    const c = await humansCollection.createPrimary(0);
                    const human = schemaObjects.simpleHuman();
                    await c.insert(human);
                    const doc = await c.findOne(human.passportId).exec(true);
                    let count = 0;
                    c.postSave(function (data, instance) {
                        assert.ok(isRxDocument(instance));
                        count++;
                    }, true);
                    await doc.atomicSet('firstName', 'foobar');
                    assert.strictEqual(count, 1);
                    c.database.destroy();
                });
            });
            describe('negative', () => { });
        });
    });
    describe('remove', () => {
        describe('pre', () => {
            describe('positive', () => {
                it('series', async () => {
                    const c = await humansCollection.createPrimary(0);
                    const human = schemaObjects.simpleHuman();
                    await c.insert(human);
                    const doc = await c.findOne(human.passportId).exec(true);
                    let count = 0;
                    c.preRemove(function (data, instance) {
                        assert.ok(isRxDocument(instance));
                        count++;
                    }, false);
                    await doc.remove();
                    assert.strictEqual(count, 1);
                    c.database.destroy();
                });
                it('parallel', async () => {
                    const c = await humansCollection.createPrimary(0);
                    const human = schemaObjects.simpleHuman();
                    await c.insert(human);
                    const doc = await c.findOne(human.passportId).exec(true);
                    let count = 0;
                    c.preRemove(function (data, instance) {
                        assert.ok(isRxDocument(instance));
                        count++;
                    }, true);
                    await doc.remove();
                    assert.strictEqual(count, 1);
                    c.database.destroy();
                });
                it('should not remove if hook throws', async () => {
                    const c = await humansCollection.createPrimary(0);
                    const human = schemaObjects.simpleHuman();
                    await c.insert(human);
                    const doc = await c.findOne(human.passportId).exec(true);

                    c.preRemove(function () {
                        throw new Error('fail');
                    }, false);

                    let failC = 0;
                    try {
                        await doc.remove();
                    } catch (e) {
                        failC++;
                    }
                    assert.strictEqual(failC, 1);
                    const doc2 = await c.findOne(human.passportId).exec(true);
                    assert.strictEqual(doc2.get('passportId'), human.passportId);
                    c.database.destroy();
                });
                it('should call pre remove hook before bulkRemove', async () => {
                    const c = await humansCollection.create(5);
                    const docList = await c.find().exec();
                    const primaryList = docList.map(doc => doc.primary);

                    let count = 0;
                    c.preRemove((data, instance) => {
                        assert.ok(isRxDocument(instance));
                        assert.ok(data.age);
                        count++;
                    }, true);

                    await c.bulkRemove(primaryList);
                    assert.strictEqual(count, 5);

                    c.database.destroy();
                });
            });
            describe('negative', () => { });
        });
        describe('post', () => {
            describe('positive', () => {
                it('series', async () => {
                    const c = await humansCollection.createPrimary(0);
                    const human = schemaObjects.simpleHuman();
                    await c.insert(human);
                    const doc = await c.findOne(human.passportId).exec(true);
                    let count = 0;
                    c.postRemove(function (data, instance) {
                        assert.ok(isRxDocument(instance));
                        count++;
                    }, false);
                    await doc.remove();
                    assert.strictEqual(count, 1);
                    c.database.destroy();
                });
                it('parallel', async () => {
                    const c = await humansCollection.createPrimary(0);
                    const human = schemaObjects.simpleHuman();
                    await c.insert(human);
                    const doc = await c.findOne(human.passportId).exec(true);
                    let count = 0;
                    c.postRemove(function (data, instance) {
                        assert.ok(isRxDocument(instance));
                        count++;
                    }, true);
                    await doc.remove();
                    assert.strictEqual(count, 1);
                    c.database.destroy();
                });
                it('should have the collection bound to the this-scope', async () => {
                    const c = await humansCollection.createPrimary(1);
                    c.foo2 = 'bar2';
                    let hasRun = false;

                    c.postRemove(function (this: any) {
                        hasRun = true;
                        assert.strictEqual(this.foo2, 'bar2');
                    }, true);

                    const doc = await c.findOne().exec(true);
                    await doc.remove();

                    assert.ok(hasRun);
                    c.database.destroy();
                });
                it('should call post remove hook after bulkRemove', async () => {
                    const c = await humansCollection.create(5);
                    const docList = await c.find().exec();
                    const primaryList = docList.map(doc => doc.primary);

                    let count = 0;
                    c.postRemove((data, instance) => {
                        assert.ok(isRxDocument(instance));
                        assert.ok(data.age);
                        count++;
                    }, true);
                    await c.bulkRemove(primaryList);
                    assert.strictEqual(count, 5);

                    c.database.destroy();
                });
            });
            describe('negative', () => { });
        });
    });
    describe('postCreate', () => {
        describe('positive', () => {
            it('should define a getter', async () => {
                const db = await createRxDatabase({
                    name: randomCouchString(10),
                    adapter: 'memory',
                    multiInstance: true
                });
                const collection = await db.collection({
                    name: 'myhumans',
                    schema: schemas.primaryHuman
                });
                collection.postCreate(function (_data, instance) {
                    assert.ok(isRxDocument(instance));
                    Object.defineProperty(instance, 'myField', {
                        get: () => 'foobar',
                    });
                });

                const human = schemaObjects.simpleHuman();
                await collection.insert(human);
                const doc = await collection.findOne().exec();
                assert.strictEqual('foobar', doc.myField);

                db.destroy();
            });
        });
        describe('negative', () => {
            it('should throw when adding an async-hook', async () => {
                const db = await createRxDatabase({
                    name: randomCouchString(10),
                    adapter: 'memory',
                    multiInstance: true
                });
                const collection = await db.collection({
                    name: 'myhumans',
                    schema: schemas.primaryHuman
                });

                const hookFun = function (doc: any) {
                    Object.defineProperty(doc, 'myField', {
                        get: () => 'foobar',
                    });
                };

                assert.throws(() => (collection as any).postCreate(hookFun, true));
                db.destroy();
            });
        });
    });
    describe('issues', () => {
        it('ISSUE #158 : Throwing error in async preInsert does not prevent insert', async () => {
            const c = await humansCollection.create(0);
            c.preInsert(async function () {
                await promiseWait(1);
                throw new Error('This throw should prevent the insert');
            }, false);
            let hasThrown = false;
            try {
                await c.insert(schemaObjects.human());
            } catch (e) {
                hasThrown = true;
            }
            assert.ok(hasThrown);
            await promiseWait(10);
            const allDocs = await c.find().exec();
            assert.strictEqual(allDocs.length, 0);
            c.database.destroy();
        });
    });
});
