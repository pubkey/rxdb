import assert from 'assert';
import {
    first
} from 'rxjs/operators';

import config from './config.ts';
import {
    schemaObjects,
    schemas,
    humansCollection
} from '../../plugins/test-utils/index.mjs';

import {
    createRxDatabase,
    isRxDocument,
    promiseWait,
    randomToken,
    RxChangeEvent
} from '../../plugins/core/index.mjs';


describe('hooks.test.js', () => {
    describe('get/set', () => {
        it('should set a hook', async () => {
            const c = await humansCollection.create(0);
            c.preSave(function () { }, false);
            c.database.close();
        });
        it('should get a hook', async () => {
            const c = await humansCollection.create(0);
            c.preSave(function () { }, false);
            const hooks = c.getHooks('pre', 'save');
            assert.ok(Array.isArray(hooks.series));
            assert.strictEqual(hooks.series.length, 1);
            c.database.close();
        });
        it('should get a parallel hook', async () => {
            const c = await humansCollection.create(0);
            c.preSave(function () { }, true);
            const hooks = c.getHooks('pre', 'save');
            assert.ok(Array.isArray(hooks.parallel));
            assert.strictEqual(hooks.parallel.length, 1);
            c.database.close();
        });
    });
    describe('insert', () => {
        describe('pre', () => {
            describe('positive', () => {
                it('series', async () => {
                    const c = await humansCollection.create(0);
                    const human = schemaObjects.humanData();
                    let count = 0;
                    c.preInsert((data, instance) => {
                        assert.strictEqual(typeof instance, 'undefined');
                        count++;
                    }, false);
                    await c.insert(human);
                    assert.strictEqual(count, 1);
                    c.database.close();
                });
                it('parallel', async () => {
                    const c = await humansCollection.create(0);
                    const human = schemaObjects.humanData();
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
                    c.database.close();
                });
                it('should save a modified document', async () => {
                    const c = await humansCollection.createPrimary(0);
                    const human = schemaObjects.simpleHumanData();

                    c.preInsert(function (d, instance) {
                        assert.strictEqual(typeof instance, 'undefined');
                        d.lastName = 'foobar';
                    }, false);

                    await c.insert(human);
                    const doc = await c.findOne(human.passportId).exec(true);
                    assert.strictEqual(doc.get('lastName'), 'foobar');
                    c.database.close();
                });
                it('async: should save a modified document', async () => {
                    const c = await humansCollection.createPrimary(0);
                    const human = schemaObjects.simpleHumanData();

                    c.preInsert(async function (d, instance) {
                        assert.strictEqual(typeof instance, 'undefined');
                        await promiseWait(10);
                        d.lastName = 'foobar';
                    }, false);

                    await c.insert(human);
                    const doc = await c.findOne(human.passportId).exec(true);
                    assert.strictEqual(doc.get('lastName'), 'foobar');
                    c.database.close();
                });
                it('should not insert if hook throws', async () => {
                    const c = await humansCollection.createPrimary(0);
                    const human = schemaObjects.simpleHumanData();
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
                    c.database.close();
                });
                it('should run the insert hooks only for the new documents on upsert(), bulkUpsert() and insertIfNotExists()', async () => {
                    const c = await humansCollection.createPrimary(0);
                    const existing = schemaObjects.simpleHumanData();
                    const added = schemaObjects.simpleHumanData();
                    await c.insert(existing);

                    const preInsertIds: string[] = [];
                    const postInsertIds: string[] = [];
                    let preSaveCount = 0;
                    c.preInsert(function (data) {
                        preInsertIds.push(data.passportId);
                        if (data.firstName === 'no-insert') {
                            throw new Error('inserts are not allowed');
                        }
                        data.lastName = 'set-by-pre-insert';
                    }, false);
                    c.postInsert(function (data) {
                        postInsertIds.push(data.passportId);
                    }, false);
                    c.preSave(function () {
                        preSaveCount++;
                    }, false);

                    // upsert() of an existing document
                    let doc = await c.upsert(Object.assign({}, existing, { firstName: 'no-insert' }));
                    assert.strictEqual(doc.firstName, 'no-insert');
                    assert.strictEqual(doc.lastName, existing.lastName);
                    assert.deepStrictEqual(preInsertIds, []);
                    assert.strictEqual(preSaveCount, 1);

                    // insertIfNotExists() of an existing document
                    doc = await c.insertIfNotExists(Object.assign({}, existing, { firstName: 'foobar' }));
                    assert.strictEqual(doc.firstName, 'no-insert');
                    assert.deepStrictEqual(preInsertIds, []);
                    assert.strictEqual(preSaveCount, 1);

                    // bulkUpsert() with one existing and one new document
                    const result = await c.bulkUpsert([
                        Object.assign({}, existing, { firstName: 'updated' }),
                        added
                    ]);
                    assert.deepStrictEqual(result.error, []);
                    assert.strictEqual(result.success.length, 2);
                    assert.deepStrictEqual(preInsertIds, [added.passportId]);
                    assert.deepStrictEqual(postInsertIds, [added.passportId]);
                    assert.strictEqual(preSaveCount, 2);
                    const existingDoc = await c.findOne(existing.passportId).exec(true);
                    assert.strictEqual(existingDoc.firstName, 'updated');
                    assert.strictEqual(existingDoc.lastName, existing.lastName);
                    const addedDoc = await c.findOne(added.passportId).exec(true);
                    assert.strictEqual(addedDoc.lastName, 'set-by-pre-insert');

                    // new documents still run the insert hooks
                    const viaUpsert = schemaObjects.simpleHumanData();
                    const viaInsertIfNotExists = schemaObjects.simpleHumanData();
                    doc = await c.upsert(viaUpsert);
                    assert.strictEqual(doc.lastName, 'set-by-pre-insert');
                    doc = await c.insertIfNotExists(viaInsertIfNotExists);
                    assert.strictEqual(doc.lastName, 'set-by-pre-insert');
                    const newIds = [added.passportId, viaUpsert.passportId, viaInsertIfNotExists.passportId];
                    assert.deepStrictEqual(preInsertIds, newIds);
                    assert.deepStrictEqual(postInsertIds, newIds);
                    assert.strictEqual(preSaveCount, 2);

                    c.database.close();
                });
                it('should have the collection bound to the this-scope', async () => {
                    const c = await humansCollection.createPrimary(0);
                    (c as any).foo = 'bar';
                    let hasRun = false;
                    c.preInsert(function (this: any) {
                        hasRun = true;
                        assert.strictEqual(this.foo, 'bar');
                    }, false);

                    await c.insert(schemaObjects.simpleHumanData());

                    assert.ok(hasRun);
                    c.database.close();
                });
            });
        });
        describe('post', () => {
            describe('positive', () => {
                it('series', async () => {
                    const c = await humansCollection.create(0);
                    const human = schemaObjects.humanData();
                    let count = 0;
                    c.postInsert(function (data, instance) {
                        assert.ok(isRxDocument(instance));
                        count++;
                    }, false);
                    await c.insert(human);
                    assert.strictEqual(count, 1);
                    c.database.close();
                });
                it('parallel', async () => {
                    const c = await humansCollection.create(0);
                    const human = schemaObjects.humanData();
                    let count = 0;
                    c.postInsert(function (data, instance) {
                        assert.ok(isRxDocument(instance));
                        assert.ok(data.age);
                        count++;
                    }, true);
                    await c.insert(human);
                    assert.strictEqual(count, 1);
                    c.database.close();
                });
                it('should call post insert hook after bulkInsert', async () => {
                    const c = await humansCollection.create(0);
                    const human = schemaObjects.humanData();
                    let count = 0;
                    c.postInsert((data, instance) => {
                        assert.ok(data.age);
                        assert.ok(isRxDocument(instance));
                        count++;
                    }, false);
                    await c.bulkInsert([human]);
                    assert.strictEqual(count, 1);
                    c.database.close();
                });
            });
        });
    });
    describe('save', () => {
        describe('pre', () => {
            describe('positive', () => {
                it('series', async () => {
                    const c = await humansCollection.createPrimary(0);
                    const human = schemaObjects.simpleHumanData();
                    await c.insert(human);
                    const doc = await c.findOne(human.passportId).exec(true);
                    let count = 0;
                    c.preSave(function (data, oldData) {
                        assert.ok(data);
                        assert.ok(oldData);
                        if (count === 1) {
                            assert.equal(oldData.firstName, 'foobar');
                        }
                        count++;
                    }, false);
                    await doc.incrementalPatch({ firstName: 'foobar' });
                    assert.strictEqual(count, 1);
                    await c.upsert(human);
                    assert.strictEqual(count, 2);
                    c.database.close();
                });
                it('parallel', async () => {
                    const c = await humansCollection.createPrimary(0);
                    const human = schemaObjects.simpleHumanData();
                    await c.insert(human);
                    const doc = await c.findOne(human.passportId).exec(true);
                    let count = 0;
                    c.preSave(function (data, oldData) {
                        assert.ok(data);
                        assert.ok(oldData);
                        count++;
                    }, true);
                    await doc.incrementalPatch({ firstName: 'foobar' });
                    assert.strictEqual(count, 1);
                    c.database.close();
                });
                it('should save a modified document', async () => {
                    const c = await humansCollection.createPrimary(0);
                    const human = schemaObjects.simpleHumanData();
                    await c.insert(human);
                    const doc = await c.findOne(human.passportId).exec(true);

                    let hasRun = false;
                    c.preSave(function () {
                        hasRun = true;
                    }, false);

                    await doc.incrementalPatch({ firstName: 'foobar' });
                    assert.ok(hasRun);
                    c.database.close();
                });
                it('async: should save a modified document', async () => {
                    const c = await humansCollection.createPrimary(0);
                    const human = schemaObjects.simpleHumanData();
                    await c.insert(human);
                    const doc = await c.findOne(human.passportId).exec(true);

                    let hasRun = false;
                    c.preSave(async function () {
                        await promiseWait(10);
                        hasRun = true;
                    }, false);
                    await doc.incrementalPatch({ firstName: 'foobar' });
                    assert.ok(hasRun);
                    c.database.close();
                });
                it('should not save if hook throws', async () => {
                    const c = await humansCollection.createPrimary(0);
                    const human = schemaObjects.simpleHumanData();
                    human.firstName = 'test';
                    await c.insert(human);
                    const doc = await c.findOne(human.passportId).exec(true);

                    c.preSave(function () {
                        throw new Error('fail');
                    }, false);

                    let failC = 0;
                    try {
                        await doc.incrementalPatch({ firstName: 'foobar' });
                    } catch (e) {
                        failC++;
                    }
                    assert.strictEqual(failC, 1);
                    const syncValue = await (doc as any).firstName$.pipe(first()).toPromise();
                    assert.strictEqual(syncValue, 'test');
                    c.database.close();
                });
            });
        });
        describe('post', () => {
            describe('positive', () => {
                it('series', async () => {
                    const c = await humansCollection.createPrimary(0);
                    const human = schemaObjects.simpleHumanData();
                    await c.insert(human);
                    const doc = await c.findOne(human.passportId).exec(true);
                    let count = 0;
                    c.postSave(function (data) {
                        assert.ok(data);
                        count++;
                    }, false);
                    await doc.incrementalPatch({ firstName: 'foobar' });
                    assert.strictEqual(count, 1);
                    c.database.close();
                });
                it('parallel', async () => {
                    const c = await humansCollection.createPrimary(0);
                    const human = schemaObjects.simpleHumanData();
                    await c.insert(human);
                    const doc = await c.findOne(human.passportId).exec(true);
                    let count = 0;
                    c.postSave(function (data) {
                        assert.ok(data);
                        count++;
                    }, true);
                    await doc.incrementalPatch({ firstName: 'foobar' });
                    assert.strictEqual(count, 1);
                    c.database.close();
                });
                it('should receive the RxDocument instance as second argument', async () => {
                    const c = await humansCollection.createPrimary(0);
                    const human = schemaObjects.simpleHumanData();
                    await c.insert(human);
                    const doc = await c.findOne(human.passportId).exec(true);
                    let count = 0;
                    let receivedInstance: any;
                    c.postSave(function (data, instance) {
                        receivedInstance = instance;
                        count++;
                    }, false);
                    await doc.incrementalPatch({ firstName: 'foobar' });
                    assert.strictEqual(count, 1);
                    assert.ok(isRxDocument(receivedInstance));
                    assert.strictEqual(receivedInstance.primary, human.passportId);
                    c.database.close();
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
                    const human = schemaObjects.simpleHumanData();
                    await c.insert(human);
                    const doc = await c.findOne(human.passportId).exec(true);
                    let count = 0;
                    c.preRemove(function (data, instance) {
                        assert.ok(isRxDocument(instance));
                        count++;
                    }, false);
                    await doc.remove();
                    assert.strictEqual(count, 1);
                    c.database.close();
                });
                it('parallel', async () => {
                    const c = await humansCollection.createPrimary(0);
                    const human = schemaObjects.simpleHumanData();
                    await c.insert(human);
                    const doc = await c.findOne(human.passportId).exec(true);
                    let count = 0;
                    c.preRemove(function (data, instance) {
                        assert.ok(isRxDocument(instance));
                        count++;
                    }, true);
                    await doc.remove();
                    assert.strictEqual(count, 1);
                    c.database.close();
                });
                it('should not remove if hook throws', async () => {
                    const c = await humansCollection.createPrimary(0);
                    const human = schemaObjects.simpleHumanData();
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
                    c.database.close();
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

                    c.database.close();
                });
                it('should keep the field value that was added by the hook', async () => {
                    const c = await humansCollection.create(5);
                    const firstDoc = await c.findOne().exec(true);

                    const emitted: RxChangeEvent<any>[] = [];
                    c.$.subscribe(event => emitted.push(event));

                    c.preRemove((data) => {
                        data.lastName = 'by-hook';
                        return data;
                    }, true);
                    await firstDoc.remove();

                    // check in storage
                    const docInStorage = await c.storageInstance.findDocumentsById([firstDoc.primary], true);
                    assert.strictEqual(docInStorage[0].lastName, 'by-hook');

                    // check the emitted event
                    const ev = emitted[0];
                    assert.strictEqual(ev.documentData.lastName, 'by-hook');

                    c.database.close();
                });
            });
            describe('negative', () => { });
        });
        describe('post', () => {
            describe('positive', () => {
                it('series', async () => {
                    const c = await humansCollection.createPrimary(0);
                    const human = schemaObjects.simpleHumanData();
                    await c.insert(human);
                    const doc = await c.findOne(human.passportId).exec(true);
                    let count = 0;
                    c.postRemove(function (data, instance) {
                        assert.ok(isRxDocument(instance));
                        count++;
                    }, false);
                    await doc.remove();
                    assert.strictEqual(count, 1);
                    c.database.close();
                });
                it('parallel', async () => {
                    const c = await humansCollection.createPrimary(0);
                    const human = schemaObjects.simpleHumanData();
                    await c.insert(human);
                    const doc = await c.findOne(human.passportId).exec(true);
                    let count = 0;
                    c.postRemove(function (data, instance) {
                        assert.ok(isRxDocument(instance));
                        count++;
                    }, true);
                    await doc.remove();
                    assert.strictEqual(count, 1);
                    c.database.close();
                });
                it('should have the collection bound to the this-scope', async () => {
                    const c = await humansCollection.createPrimary(1);
                    (c as any).foo2 = 'bar2';
                    let hasRun = false;

                    c.postRemove(function (this: any) {
                        hasRun = true;
                        assert.strictEqual(this.foo2, 'bar2');
                    }, true);

                    const doc = await c.findOne().exec(true);
                    await doc.remove();

                    assert.ok(hasRun);
                    c.database.close();
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

                    c.database.close();
                });
            });
            describe('negative', () => { });
        });
    });
    describe('postCreate', () => {
        describe('positive', () => {
            it('should define a getter', async () => {
                const db = await createRxDatabase({
                    name: randomToken(10),
                    storage: config.storage.getStorage(),
                    multiInstance: true
                });
                const collections = await db.addCollections({
                    myhumans: {
                        schema: schemas.primaryHuman
                    }
                });
                const collection = collections.myhumans;
                collection.postCreate(function (_data, instance) {
                    assert.ok(isRxDocument(instance));
                    Object.defineProperty(instance, 'myField', {
                        get: () => 'foobar',
                    });
                });

                const human = schemaObjects.simpleHumanData();
                await collection.insert(human);
                const doc = await collection.findOne().exec();
                assert.strictEqual('foobar', doc.myField);

                db.close();
            });
        });
        describe('negative', () => {
            it('should throw when adding an async-hook', async () => {
                const db = await createRxDatabase({
                    name: randomToken(10),
                    storage: config.storage.getStorage(),
                    multiInstance: true
                });
                const collections = await db.addCollections({
                    myhumans: {
                        schema: schemas.primaryHuman
                    }
                });
                const collection = collections.myhumans;

                const hookFun = function (doc: any) {
                    Object.defineProperty(doc, 'myField', {
                        get: () => 'foobar',
                    });
                };

                assert.throws(() => (collection as any).postCreate(hookFun, true));
                db.close();
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
                await c.insert(schemaObjects.humanData());
            } catch (e) {
                hasThrown = true;
            }
            assert.ok(hasThrown);
            await promiseWait(10);
            const allDocs = await c.find().exec();
            assert.strictEqual(allDocs.length, 0);
            c.database.close();
        });
        it('should auto-generate composite primary key when set in preInsert hook', async () => {
            const db = await createRxDatabase({
                name: randomToken(10),
                storage: config.storage.getStorage(),
                multiInstance: true
            });
            const collections = await db.addCollections({
                humans: {
                    schema: {
                        version: 0,
                        primaryKey: {
                            key: 'id',
                            fields: ['name', 'number'],
                            separator: '|'
                        },
                        type: 'object',
                        properties: {
                            id: {
                                type: 'string',
                                maxLength: 100
                            },
                            name: {
                                type: 'string',
                                maxLength: 100
                            },
                            number: {
                                type: 'integer',
                                minimum: 0,
                                maximum: 9999
                            }
                        },
                        required: [
                            'id',
                            'name',
                            'number'
                        ]
                    }
                }
            });
            const collection = collections.humans;

            collection.preInsert((docData) => {
                docData.name = 'alice';
                docData.number = 5;
            }, false);

            const doc = await collection.insert({} as any);
            assert.strictEqual(doc.id, 'alice|5');
            assert.strictEqual(doc.name, 'alice');
            assert.strictEqual(doc.number, 5);

            db.close();
        });
    });
});
