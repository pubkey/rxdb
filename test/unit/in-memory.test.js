/**
 * this test is to the in-memory-plugin
 */
import assert from 'assert';

import * as schemas from './../helper/schemas';
import * as schemaObjects from './../helper/schema-objects';
import * as humansCollection from './../helper/humans-collection';

import * as RxDatabase from '../../dist/lib/rx-database';
import * as util from '../../dist/lib/util';
import AsyncTestUtil from 'async-test-util';

describe('in-memory.test.js', () => {
    describe('.inMemory()', () => {
        it('should spawn an in-memory collection', async () => {
            const col = await humansCollection.create(5);
            const memCol = await col.inMemory();
            assert.ok(memCol.database);
            assert.ok(memCol.pouch);
            col.database.destroy();
        });
        it('should contain the initial documents', async () => {
            const col = await humansCollection.create(5);
            const memCol = await col.inMemory();
            const docs = await memCol.find().exec();
            assert.ok(docs.length, 5);
            const firstDoc = await memCol.findOne().exec();
            assert.ok(firstDoc.firstName);
            col.database.destroy();
        });
    });
    describe('.onDestroy', () => {
        it('should be destroyed when the parent is destroyed', async () => {
            const col = await humansCollection.create(5);
            const memCol = await col.inMemory();
            await col.database.destroy();
            assert.ok(memCol.destroyed);
        });
    });
    describe('changes', () => {
        it('should replicate change from memory to original', async () => {
            const col = await humansCollection.create(5);
            const memCol = await col.inMemory();
            const memDoc = await memCol.findOne().exec();
            memDoc.firstName = 'foobar';
            await memDoc.save();

            await AsyncTestUtil.waitUntil(async () => {
                const doc = await col.findOne()
                    .where('passportId')
                    .eq(memDoc.passportId)
                    .exec();
                return !!doc && doc.firstName === 'foobar';
            });
            col.database.destroy();
        });
        it('should replicate change from original to memory', async () => {
            const col = await humansCollection.create(5);
            const memCol = await col.inMemory();

            const doc = await col.findOne().exec();
            doc.firstName = 'foobar';
            await doc.save();

            await AsyncTestUtil.waitUntil(async () => {
                const memDoc = await memCol.findOne()
                    .where('passportId')
                    .eq(doc.passportId)
                    .exec();
                return !!memDoc && memDoc.firstName === 'foobar';
            });
            col.database.destroy();
        });
    });
    describe('reactive', () => {
        it('should re-emit query when parent changes', async () => {
            const col = await humansCollection.create(5);
            const memCol = await col.inMemory();

            const emitted = [];
            memCol.find().$.subscribe(docs => emitted.push(docs));
            await AsyncTestUtil.waitUntil(() => emitted.length === 1);
            assert.equal(emitted[0].length, 5);

            const addDoc = schemaObjects.human();
            await col.insert(addDoc);

            await AsyncTestUtil.waitUntil(() => emitted.length === 2);
            assert.equal(emitted[1].length, 6);

            col.database.destroy();
        });
        it('it should re-emit on parent when in-mem changes', async () => {
            const col = await humansCollection.create(5);
            const memCol = await col.inMemory();

            const emitted = [];
            col.find().$.subscribe(docs => emitted.push(docs));
            await AsyncTestUtil.waitUntil(() => emitted.length === 1);
            assert.equal(emitted[0].length, 5);

            const addDoc = schemaObjects.human();
            await memCol.insert(addDoc);

            await AsyncTestUtil.waitUntil(() => emitted.length === 2);
            assert.equal(emitted[1].length, 6);

            col.database.destroy();
        });
    });
    describe('multi-instance', () => {
        it('should emit on other instance when in-mem changes', async () => {
            const name = util.randomCouchString(10);
            const db = await RxDatabase.create({
                name,
                adapter: 'memory',
                multiInstance: true,
                ignoreDuplicate: true
            });
            const db2 = await RxDatabase.create({
                name,
                adapter: 'memory',
                multiInstance: true,
                ignoreDuplicate: true
            });

            const c1 = await db.collection({
                name: 'humans',
                schema: schemas.human
            });
            const c2 = await db2.collection({
                name: 'humans',
                schema: schemas.human
            });
            const memCol = await c1.inMemory();

            const emitted = [];
            c2.find().$.subscribe(docs => emitted.push(docs));
            await AsyncTestUtil.waitUntil(() => emitted.length === 1);

            await memCol.insert(schemaObjects.human());
            await AsyncTestUtil.waitUntil(() => emitted.length === 2);
            await memCol.insert(schemaObjects.human());
            await AsyncTestUtil.waitUntil(() => emitted.length === 3);
            await memCol.insert(schemaObjects.human());
            await AsyncTestUtil.waitUntil(() => emitted.length === 4);


            const lastEmitted = emitted.pop();
            assert.equal(lastEmitted.length, 3);

            db.destroy();
            db2.destroy();
        });
    });
    describe('encryption', () => {
        it('should store the encrypted data unencrypted in memory-collection', async () => {
            const col = await humansCollection.createEncrypted(0);
            const memCol = await col.inMemory();

            // insert to parent
            const docData = schemaObjects.encryptedHuman();
            const doc = await col.insert(docData);
            await AsyncTestUtil.waitUntil(async () => {
                const docs = await memCol.find().exec();
                return docs.length === 1;
            });
            const memPouchDoc = await memCol.pouch.get(doc.primary);
            assert.equal(memPouchDoc.secret, docData.secret);

            // insert to memory
            const docData2 = schemaObjects.encryptedHuman();
            const doc2 = await memCol.insert(docData2);
            await AsyncTestUtil.waitUntil(async () => {
                const docs = await col.find().exec();
                return docs.length === 2;
            });
            const pouchDoc = await col.pouch.get(doc2.primary);
            assert.notEqual(doc2.secret, pouchDoc.secret);

            col.database.destroy();
        });
    });
    describe('primary', () => {
        it('should work on set primary-key', async () => {
            const col = await humansCollection.createPrimary(0);
            const memCol = await col.inMemory();

            // insert to parent
            const docData = schemaObjects.simpleHuman();
            const doc = await col.insert(docData);
            await AsyncTestUtil.waitUntil(async () => {
                const docs = await memCol.find().exec();
                return docs.length === 1;
            });
            const memPouchDoc = await memCol.pouch.get(doc.primary);
            assert.equal(memPouchDoc.firstName, docData.firstName);

            // insert to memory
            const docData2 = schemaObjects.simpleHuman();
            const doc2 = await memCol.insert(docData2);
            await AsyncTestUtil.waitUntil(async () => {
                const docs = await col.find().exec();
                return docs.length === 2;
            });
            const pouchDoc = await col.pouch.get(doc2.primary);
            assert.notEqual(doc2.firstName, pouchDoc.firstName);

            col.database.destroy();
        });
    });
    describe('other', () => {
        it('should work with many documents', async () => {
            const amount = 100;
            const col = await humansCollection.create(amount);
            const memCol = await col.inMemory();
            const docs = await memCol.find().exec();
            assert.equal(docs.length, amount);
            col.database.destroy();
        });
    });
    describe('e', () => {
        // TODO remove this
        //        it('e', () => process.exit());
    });
});
