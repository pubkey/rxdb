import assert from 'assert';
import AsyncTestUtil from 'async-test-util';

import * as humansCollection from '../helper/humans-collection';
import * as schemas from '../helper/schemas';
import * as schemaObjects from '../helper/schema-objects';
import * as RxDatabase from '../../dist/lib/rx-database';
import * as RxSchema from '../../dist/lib/rx-schema';
import * as RxDocument from '../../dist/lib/rx-document';
import * as util from '../../dist/lib/util';

describe('local-documents.test.js', () => {
    describe('.insertLocal()', () => {
        describe('positive', () => {
            it('should create a local document', async () => {
                const c = await humansCollection.create();
                const doc = await c.insertLocal('foobar', {
                    foo: 'bar'
                });
                assert.ok(doc);
                c.database.destroy();
            });
            it('should not find the doc because its local', async () => {
                const c = await humansCollection.create(0);
                await c.insertLocal('foobar', {
                    foo: 'bar'
                });
                const doc2 = await c.findOne().exec();
                assert.equal(doc2, null);
                c.database.destroy();
            });
        });
        describe('negative', () => {
            it('should throw if already exists', async () => {
                const c = await humansCollection.create();
                const doc = await c.insertLocal('foobar', {
                    foo: 'bar'
                });
                assert.ok(doc);
                await AsyncTestUtil.assertThrows(
                    () => c.insertLocal('foobar', {
                        foo: 'bar2'
                    }),
                    Error,
                    'already exists'
                );
                c.database.destroy();
            });
        });
    });
    describe('.getLocal()', () => {
        describe('positive', () => {
            it('should find the document', async () => {
                const c = await humansCollection.create();
                await c.insertLocal('foobar', {
                    foo: 'bar'
                });
                const doc = await c.getLocal('foobar');
                assert.ok(doc);
                assert.equal(doc.get('foo'), 'bar');
                c.database.destroy();
            });
            it('should find the document twice (doc-cache)', async () => {
                const c = await humansCollection.create();
                await c.insertLocal('foobar', {
                    foo: 'bar'
                });
                const doc = await c.getLocal('foobar');
                const doc2 = await c.getLocal('foobar');
                assert.ok(doc);
                assert.ok(doc === doc2);
                c.database.destroy();
            });
        });
        describe('negative', () => {
            it('should not find non-existing', async () => {
                const c = await humansCollection.create();
                const doc = await c.getLocal('foobar');
                assert.equal(doc, null);
                c.database.destroy();
            });
        });
    });
    describe('.upsertLocal()', () => {
        describe('positive', () => {
            it('should insert when not exists', async () => {
                const c = await humansCollection.create();
                const doc = await c.upsertLocal('foobar', {
                    foo: 'bar'
                });
                assert.ok(doc);
                assert.equal(doc.get('foo'), 'bar');
                c.database.destroy();
            });
            it('should update when exists', async () => {
                const c = await humansCollection.create();
                await c.upsertLocal('foobar', {
                    foo: 'bar'
                });
                const doc = await c.upsertLocal('foobar', {
                    foo: 'bar2'
                });
                assert.ok(doc);
                assert.equal(doc.get('foo'), 'bar2');
                c.database.destroy();
            });
        });
        describe('negative', () => {});
    });
    describe('.remove()', () => {
        it('should remove the document', async () => {
            const c = await humansCollection.create();
            const doc = await c.upsertLocal('foobar', {
                foo: 'bar'
            });
            await doc.remove();
            const doc2 = await c.getLocal('foobar');
            assert.equal(doc2, null);
            c.database.destroy();
        });
    });
    describe('.save()', () => {
        it('should save the document', async () => {
            const c = await humansCollection.create();
            const doc = await c.insertLocal('foobar', {
                foo: 'bar'
            });

            doc.set('foo', 'bar2');
            await doc.save();
            assert.equal(doc.get('foo'), 'bar2');
            doc.set({
                foo: 'bar3'
            });
            await doc.save();
            assert.equal(doc.get('foo'), 'bar3');

            c.database.destroy();
        });
        it('should save the doc persistent', async () => {
            const name = util.randomCouchString(10);
            const db = await RxDatabase.create({
                name,
                adapter: 'memory'
            });
            const doc = await db.insertLocal('foobar', {
                foo: 'bar'
            });
            doc.set('foo', 'bar2');
            await doc.save();
            db.destroy();

            const db2 = await RxDatabase.create({
                name,
                adapter: 'memory',
                ignoreDuplicate: true
            });
            const doc2 = await db2.getLocal('foobar');
            assert.ok(doc2);
            assert.equal(doc2.get('foo'), 'bar2');
            db2.destroy();
        });
    });
    describe('with database', () => {
        it('should be able to use local documents directly on the database', async () => {
            const c = await humansCollection.create();
            const db = c.database;

            const doc1 = await db.insertLocal('foobar', {
                foo: 'bar'
            });
            const doc2 = await db.getLocal('foobar');
            assert.equal(doc1, doc2);
            db.destroy();
        });
    });
    describe('multi-instance', () => {
        it('should stream events over multi-instance', async () => {
            const name = util.randomCouchString(10);
            const db = await RxDatabase.create({
                name,
                adapter: 'memory'
            });
            const db2 = await RxDatabase.create({
                name,
                adapter: 'memory',
                ignoreDuplicate: true
            });

            const doc1 = await db.insertLocal('foobar', {
                foo: 'bar'
            });
            const doc2 = await db2.getLocal('foobar');
            assert.ok(doc2);

            doc1.set('foo', 'bar2');
            await doc1.save();

            await AsyncTestUtil.waitUntil(() => doc2.get('foo') === 'bar2');

            db.destroy();
            db2.destroy();
        });
        it('should emit deleted', async () => {
            const name = util.randomCouchString(10);
            const db = await RxDatabase.create({
                name,
                adapter: 'memory'
            });
            const db2 = await RxDatabase.create({
                name,
                adapter: 'memory',
                ignoreDuplicate: true
            });

            const doc1 = await db.insertLocal('foobar', {
                foo: 'bar'
            });
            const doc2 = await db2.getLocal('foobar');
            assert.ok(doc2);

            doc1.remove();

            await doc2.deleted$.filter(d => d === true).first().toPromise();

            db.destroy();
            db2.destroy();
        });
        it('should not conflict with non-local-doc that has same id', async () => {
            const name = util.randomCouchString(10);
            const db = await RxDatabase.create({
                name,
                adapter: 'memory'
            });
            const c1 = await db.collection({
                name: 'humans',
                schema: schemas.primaryHuman
            });
            const db2 = await RxDatabase.create({
                name,
                adapter: 'memory',
                ignoreDuplicate: true
            });
            const c2 = await db2.collection({
                name: 'humans',
                schema: schemas.primaryHuman
            });
            const docData = schemaObjects.human();
            docData.passportId = 'foobar';
            docData.age = 40;
            const doc = await c1.insert(docData);
            const localDoc = await c1.insertLocal('foobar', {
                foo: 'bar',
                age: 10
            });

            const doc2 = await c2.findOne().exec();
            const localDoc2 = await c2.getLocal('foobar');

            doc.age = 50;
            await doc.save();

            await AsyncTestUtil.waitUntil(() => doc2.age === 50);
            await AsyncTestUtil.wait(20);
            assert.equal(localDoc2.get('age'), 10);

            localDoc.set('age', 66);
            await localDoc.save();

            await AsyncTestUtil.waitUntil(() => localDoc2.get('age') === 66);
            await AsyncTestUtil.wait(20);
            assert.equal(doc2.get('age'), 50);

            db.destroy();
            db2.destroy();
        });
    });
    describe('in-memory', () => {
        it('should call the non-mem parent', async () => {
            const name = util.randomCouchString(10);
            const db = await RxDatabase.create({
                name,
                adapter: 'memory'
            });
            const c1 = await db.collection({
                name: 'humans',
                schema: schemas.primaryHuman
            });
            const inMem = await c1.inMemory();

            await inMem.insertLocal('foobar', {
                foo: 'bar',
                age: 10
            });
            const doc = await c1.getLocal('foobar');
            assert.ok(doc);
            assert.equal(doc.get('age'), 10);

            await c1.insertLocal('foobar2', {
                foo: 'bar',
                age: 11
            });
            const doc2 = await inMem.getLocal('foobar2');
            assert.equal(doc2.get('age'), 11);

            db.destroy();
        });
    });
    describe('issues', () => {
        it('PouchDB: Create and remove local doc', async () => {
            const c = await humansCollection.create();
            const pouch = c.pouch;

            // create
            await pouch.put({
                _id: '_local/foobar',
                foo: 'bar'
            });

            // find
            const doc = await pouch.get('_local/foobar');
            assert.equal(doc.foo, 'bar');

            // update
            await pouch.put({
                _id: '_local/foobar',
                foo: 'bar2',
                _rev: doc._rev
            });
            const doc2 = await pouch.get('_local/foobar');
            assert.equal(doc2.foo, 'bar2');

            // remove
            await pouch.remove('_local/foobar', doc2._rev);
            await AsyncTestUtil.assertThrows(
                () => pouch.get('_local/foobar'),
                'PouchError',
                'missing'
            );

            c.database.destroy();
        });
    });
    describe('exxx', () => {
        // it('e', () => process.exit());
    });
});
