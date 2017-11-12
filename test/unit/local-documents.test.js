import assert from 'assert';
import AsyncTestUtil from 'async-test-util';

import * as humansCollection from '../helper/humans-collection';
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
            const doc2 = await db.getLocal('foobar');
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
    describe('multi-instance', () => {});
    describe('data-migration', () => {});
    describe('in-memory', () => {});
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
        it('e', () => process.exit());
    });
});
