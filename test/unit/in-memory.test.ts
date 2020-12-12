/**
 * this test is to the in-memory-plugin
 */
import assert from 'assert';
import AsyncTestUtil from 'async-test-util';

import * as schemas from './../helper/schemas';
import * as schemaObjects from './../helper/schema-objects';
import * as humansCollection from './../helper/humans-collection';

import config from './config';
import {
    createRxDatabase,
    clone,
    randomCouchString,
    addRxPlugin
} from '../../plugins/core';
import {
    RxDBInMemoryPlugin,
    InMemoryRxCollection,
    setIndexes,
    replicateExistingDocuments,
    streamChangedDocuments,
    applyChangedDocumentToPouch
} from '../../plugins/in-memory';
addRxPlugin(RxDBInMemoryPlugin);

config.parallel('in-memory.test.js', () => {
    describe('internals', () => {
        describe('.setIndexes()', () => {
            it('should have set all indexes', async () => {
                const col = await humansCollection.create(0);
                const inMem = new (InMemoryRxCollection as any)(col);
                await setIndexes(inMem.schema, inMem.pouch);

                const hasIndexes = await inMem.pouch.getIndexes();
                assert.strictEqual(hasIndexes.indexes[1].def.fields[0].passportId, 'asc');

                inMem.destroy();
                col.database.destroy();
            });
        });
        describe('.replicateExistingDocuments()', () => {
            it('should have replicated all documents', async () => {
                const col = await humansCollection.create(5);
                const inMem = new (InMemoryRxCollection as any)(col);
                await replicateExistingDocuments(col, inMem);

                const foundAfter = await inMem.pouch.find({
                    selector: {}
                });
                assert.strictEqual(foundAfter.docs.length, 5);
                inMem.destroy();
                col.database.destroy();
            });
            it('should have decrypted all documents', async () => {
                const col = await humansCollection.createEncrypted(0);
                await col.insert({
                    passportId: 'asdf',
                    firstName: 'steve',
                    secret: 'foobar'
                });
                const inMem = new (InMemoryRxCollection as any)(col);
                await replicateExistingDocuments(col, inMem);

                const foundAfter = await inMem.pouch.find({
                    selector: {}
                });
                assert.strictEqual(foundAfter.docs[0].secret, 'foobar');
                inMem.destroy();
                col.database.destroy();
            });
        });
        describe('.streamChangedDocuments()', () => {
            it('should stream a doc-change of a normal collection', async () => {
                const col = await humansCollection.create(0);
                const obs = streamChangedDocuments(col);
                const emitted: any[] = [];
                const sub = obs.subscribe(doc => emitted.push(doc));

                await col.insert(schemaObjects.human('foobar'));
                await AsyncTestUtil.waitUntil(() => emitted.length === 1);
                assert.strictEqual(emitted[0].passportId, 'foobar');

                sub.unsubscribe();
                col.database.destroy();
            });
            it('should stream a doc-change of an inMemory collection', async () => {
                const col = await humansCollection.create(0);
                const inMem = new (InMemoryRxCollection as any)(col);
                const obs = streamChangedDocuments(inMem);
                const emitted: any[] = [];
                const sub = obs.subscribe(d => emitted.push(d));

                const doc: any = schemaObjects.human('foobar');
                doc['_id'] = 'foobar1';
                await inMem.pouch.put(doc);
                await AsyncTestUtil.waitUntil(() => emitted.length === 1);
                assert.strictEqual(emitted[0].passportId, 'foobar');

                sub.unsubscribe();
                inMem.destroy();
                col.database.destroy();
            });
            it('should use the filter-function', async () => {
                const col = await humansCollection.create(0);
                const obs = streamChangedDocuments(col, () => false);
                const emitted = [];
                const sub = obs.subscribe(doc => emitted.push(doc));

                await col.insert(schemaObjects.human('foobar'));
                await AsyncTestUtil.wait(100);
                assert.strictEqual(emitted.length, 0);

                sub.unsubscribe();
                col.database.destroy();
            });
        });
        describe('.applyChangedDocumentToPouch()', () => {
            it('should write the data into the collection', async () => {
                const col = await humansCollection.create(0);

                const docData: any = schemaObjects.human();
                docData['_id'] = 'foobar1';
                docData['_rev'] = '1-51b2fae5721cc4d3cf7392f19e6cc118';
                await applyChangedDocumentToPouch(col, docData);

                const foundAfter = await col.pouch.find({
                    selector: {}
                });
                assert.strictEqual(foundAfter.docs.length, 1);
                assert.strictEqual(foundAfter.docs[0]._id, 'foobar1');

                col.database.destroy();
            });
            it('should not emit a change when written', async () => {
                const col = await humansCollection.create(0);
                const obs = streamChangedDocuments(col, () => false);
                const emitted = [];
                const sub = obs.subscribe(doc => emitted.push(doc));

                const docData: any = schemaObjects.human();
                docData['_id'] = 'foobar1';
                docData['_rev'] = '1-51b2fae5721cc4d3cf7392f19e6cc118';
                await applyChangedDocumentToPouch(col, docData);

                await AsyncTestUtil.wait(100);
                assert.strictEqual(emitted.length, 0);

                sub.unsubscribe();
                col.database.destroy();
            });
            it('should also work with _deleted: true', async () => {
                const col = await humansCollection.create(0);
                const obs = streamChangedDocuments(col);
                const emitted = [];

                // insert existing doc, then overwrite
                const docData: any = schemaObjects.human();
                docData['_id'] = 'foobar1';
                const ret = await col.pouch.put(docData);

                await AsyncTestUtil.wait(100);
                const sub = obs.subscribe(doc => emitted.push(doc));

                const docData2 = clone(docData);
                docData2._rev = ret.rev;
                docData2._deleted = true;
                await applyChangedDocumentToPouch(col, docData2);


                await AsyncTestUtil.wait(100);

                const foundAfter = await col.pouch.find({
                    selector: {}
                });

                assert.strictEqual(foundAfter.docs.length, 0);
                /**
                 * should not have emitted an event
                 * becaues the change was written via applyChangedDocumentToPouch()
                 */
                assert.strictEqual(emitted.length, 0);

                sub.unsubscribe();
                col.database.destroy();
            });
        });
    });
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
            assert.strictEqual(docs.length, 5);
            const firstDoc: any = await memCol.findOne().exec();
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
            const memDoc: any = await memCol.findOne().exec();

            await memDoc.atomicSet('firstName', 'foobar');

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

            const doc: any = await col.findOne().exec();

            await doc.atomicSet('firstName', 'foobar');

            await AsyncTestUtil.waitUntil(async () => {
                const memDoc = await memCol.findOne()
                    .where('passportId')
                    .eq(doc.passportId)
                    .exec();
                return !!memDoc && memDoc.firstName === 'foobar';
            });
            col.database.destroy();
        });
        it('should fire the correct amount of events (a)', async () => {
            const col = await humansCollection.create(0);
            const memCol = await col.inMemory();
            const emitted = [];
            const sub = memCol.$.subscribe(cE => {
                emitted.push(cE);
            });

            const doc = await memCol.insert(schemaObjects.human());
            await AsyncTestUtil.wait(100);
            assert.strictEqual(emitted.length, 1);

            await doc.atomicSet('firstName', 'foobar');
            await AsyncTestUtil.wait(100);
            assert.strictEqual(emitted.length, 2);

            await doc.remove();
            await AsyncTestUtil.wait(300);
            assert.strictEqual(emitted.length, 3);

            sub.unsubscribe();
            col.database.destroy();
        });
        it('should fire the correct amount of events (b)', async () => {
            const col = await humansCollection.create(0);
            const memCol = await col.inMemory();
            const emitted = [];
            const sub = memCol.$.subscribe(cE => {
                emitted.push(cE);
            });
            const emittedNonMem = [];
            const sub2 = col.$.subscribe(cE => {
                emittedNonMem.push(cE);
            });

            const docData = schemaObjects.human();
            docData.firstName = 'foo123';
            docData.age = 1;

            // insert event
            const doc = await memCol.insert(docData);
            await AsyncTestUtil.wait(100);
            assert.strictEqual(emitted.length, 1); // one event should be fired
            let foundCol: any = await col.find().where('firstName').ne('foobar1').exec();
            assert.strictEqual(foundCol.length, 1);
            let foundMem: any = await memCol.find().where('firstName').ne('foobar1').exec();
            assert.strictEqual(foundMem.length, 1);

            // update event
            await doc.atomicSet('firstName', 'foobar');
            await AsyncTestUtil.wait(100);
            assert.strictEqual(emitted.length, 2);
            foundCol = await col.find().where('firstName').ne('foobar2').exec();
            assert.strictEqual(foundCol[0].firstName, 'foobar');
            foundMem = await memCol.find().where('firstName').ne('foobar2').exec();
            assert.strictEqual(foundMem[0].firstName, 'foobar');

            // remove event
            await doc.remove();
            await AsyncTestUtil.wait(100);
            foundCol = await col.find().where('firstName').ne('foobar3').exec();
            assert.strictEqual(foundCol.length, 0);
            foundMem = await memCol.find().where('firstName').ne('foobar3').exec();
            assert.strictEqual(foundMem.length, 0);
            assert.strictEqual(emitted.length, 3);

            // both collection should find no docs
            foundCol = await col.findOne().exec();
            assert.strictEqual(foundCol, null);
            foundMem = await memCol.findOne().exec();
            assert.strictEqual(foundMem, null);

            sub.unsubscribe();
            sub2.unsubscribe();
            col.database.destroy();
        });
    });
    describe('reactive', () => {
        it('should re-emit query when parent changes', async () => {
            const col = await humansCollection.create(5);
            const memCol = await col.inMemory();

            const emitted: any[] = [];
            memCol.find().$.subscribe(docs => emitted.push(docs));
            await AsyncTestUtil.waitUntil(() => emitted.length === 1);
            assert.strictEqual(emitted[0].length, 5);

            const addDoc = schemaObjects.human();
            await col.insert(addDoc);

            await AsyncTestUtil.waitUntil(() => emitted.length === 2);
            assert.strictEqual(emitted[1].length, 6);

            col.database.destroy();
        });
        it('it should re-emit on parent when in-mem changes', async () => {
            const col = await humansCollection.create(5);
            const memCol = await col.inMemory();

            const emitted: any[] = [];
            col.find().$.subscribe(docs => emitted.push(docs));
            await AsyncTestUtil.waitUntil(() => emitted.length === 1);
            assert.strictEqual(emitted[0].length, 5);

            const addDoc = schemaObjects.human();
            await memCol.insert(addDoc);

            await AsyncTestUtil.waitUntil(() => emitted.length === 2);
            assert.strictEqual(emitted[1].length, 6);

            col.database.destroy();
        });
    });
    describe('multi-instance', () => {
        it('should emit on other instance when in-mem changes', async () => {
            const name = randomCouchString(10);
            const db = await createRxDatabase({
                name,
                adapter: 'memory',
                multiInstance: true,
                ignoreDuplicate: true
            });
            const db2 = await createRxDatabase({
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

            const emitted: any[] = [];
            c2.find().$.subscribe(docs => emitted.push(docs));
            await AsyncTestUtil.waitUntil(() => emitted.length === 1);

            await memCol.insert(schemaObjects.human());
            await AsyncTestUtil.waitUntil(() => emitted.length === 2);
            await memCol.insert(schemaObjects.human());
            await AsyncTestUtil.waitUntil(() => emitted.length === 3);
            await memCol.insert(schemaObjects.human());
            await AsyncTestUtil.waitUntil(() => emitted.length === 4);


            const lastEmitted = emitted.pop();
            assert.strictEqual(lastEmitted.length, 3);

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
            assert.strictEqual(memPouchDoc.secret, docData.secret);

            // insert to memory
            const docData2 = schemaObjects.encryptedHuman();
            const doc2 = await memCol.insert(docData2);
            await AsyncTestUtil.waitUntil(async () => {
                const docs = await col.find().exec();
                return docs.length === 2;
            });
            const pouchDoc = await col.pouch.get(doc2.primary);
            assert.notStrictEqual(doc2.secret, pouchDoc.secret);

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
            assert.strictEqual(memPouchDoc.firstName, docData.firstName);

            // insert to memory
            const docData2 = schemaObjects.simpleHuman();
            const doc2 = await memCol.insert(docData2);
            await AsyncTestUtil.waitUntil(async () => {
                const docs = await col.find().exec();
                return docs.length === 2;
            });
            const pouchDoc = await col.pouch.get(doc2.primary);
            assert.notStrictEqual(doc2.firstName, pouchDoc.firstName);

            col.database.destroy();
        });
    });
    describe('.awaitPersistence()', () => {
        it('should resolve the promise after some time', async () => {
            const col = await humansCollection.create(0);
            const memCol = await col.inMemory();

            await memCol.awaitPersistence();

            await memCol.insert(schemaObjects.simpleHuman() as any);
            await memCol.awaitPersistence();

            const doc: any = await memCol.findOne().exec();
            await doc.atomicSet('age', 6);
            await memCol.awaitPersistence();

            await doc.remove();
            await memCol.awaitPersistence();

            col.database.destroy();
        });
    });
    describe('other', () => {
        it('should work with many documents', async () => {
            const amount = 100;
            const col = await humansCollection.create(amount);
            const memCol = await col.inMemory();
            const docs = await memCol.find().exec();
            assert.strictEqual(docs.length, amount);
            col.database.destroy();
        });
        it('should not allow to use .sync() on inMemory', async () => {
            const col = await humansCollection.create(5);
            const memCol = await col.inMemory();

            await AsyncTestUtil.assertThrows(
                () => memCol.sync({} as any),
                'RxError',
                'not replicate'
            );
            col.database.destroy();
        });
    });
    describe('issues', () => {
        it('#401 error: _id is required for puts', async () => {
            const schema = {
                version: 0,
                type: 'object',
                properties: {
                    name: {
                        type: 'string',
                        primary: true
                    },
                    color: {
                        type: 'string'
                    },
                    maxHp: {
                        type: 'number',
                        min: 0,
                        max: 1000
                    }
                },
                required: ['color', 'maxHp']
            };
            const name = randomCouchString(10);
            const db = await createRxDatabase({
                name,
                adapter: 'memory',
                multiInstance: true,
                ignoreDuplicate: true
            });
            const col = await db.collection({
                name: 'heroes',
                schema
            });
            await col.insert({
                name: 'alice',
                color: 'azure',
                maxHp: 101
            });
            await col.insert({
                name: 'bob',
                color: 'blue',
                maxHp: 100
            });
            await db.destroy();

            const db2 = await createRxDatabase({
                name,
                adapter: 'memory',
                multiInstance: true,
                ignoreDuplicate: true
            });
            const col2 = await db2.collection({
                name: 'heroes',
                schema
            });
            const memCol = await col2.inMemory();

            const doc = await memCol
                .findOne()
                .where('name').eq('bob')
                .exec();
            assert.ok(doc);
            assert.strictEqual(doc.name, 'bob');
            assert.strictEqual(doc.color, 'blue');
            assert.strictEqual(doc.maxHp, 100);

            const docs = await memCol.find().exec();
            assert.strictEqual(docs.length, 2);

            const alice = docs.find(d => d.name === 'alice');
            assert.strictEqual(alice.maxHp, 101);

            // check if it works from mem to parent
            await alice.atomicSet('maxHp', 103);

            await AsyncTestUtil.waitUntil(async () => {
                const aliceDoc = await col2
                    .findOne()
                    .where('name').eq('alice')
                    .exec();
                return aliceDoc.maxHp === 103;
            });

            db2.destroy();
        });
        it('#744 inMemory collections don\'t implement static methods and options', async () => {
            const db = await createRxDatabase({
                name: randomCouchString(10),
                adapter: 'memory',
                multiInstance: true,
                ignoreDuplicate: true
            });
            const col = await db.collection({
                name: 'heroes',
                schema: schemas.human,
                statics: {
                    foo() {
                        return 'bar';
                    }
                },
                options: {
                    foobar: 'foobar'
                }
            });
            const memCol = await col.inMemory();

            // check method
            assert.strictEqual(memCol.foo(), 'bar');

            // check options
            assert.strictEqual(memCol.options.foobar, 'foobar');
            db.destroy();
        });
        it('#754 inMemory collections don\'t sync up removals', async () => {
            const col = await humansCollection.create(0);
            const inMemCollection = await col.inMemory();

            const obj = schemaObjects.human();
            await col.insert(obj);

            // w8 until insert was replicated into memory
            await AsyncTestUtil.waitUntil(async () => {
                const inserted = await inMemCollection.findOne().exec();
                return !!inserted;
            });

            // Remove from non-inMemory
            await col
                .findOne()
                .exec()
                .then((x: any) => x.remove());


            // wait until remove was replicated
            await AsyncTestUtil.waitUntil(async () => {
                const foundMemory = await inMemCollection.findOne().exec();
                return !foundMemory;
            });


            const foundWithOtherQuery = await inMemCollection.findOne().where('firstName').ne('whatever').exec();
            assert.strictEqual(foundWithOtherQuery, null);

            const foundWithSameQuery = await inMemCollection.findOne().exec();
            assert.strictEqual(foundWithSameQuery, null);

            const foundNonMemory = await col.findOne().exec();
            assert.strictEqual(foundNonMemory, null);

            col.database.destroy();
        });
    });
});
