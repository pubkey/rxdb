import assert from 'assert';
import config from './config';

import * as schemas from '../helper/schemas';
import * as schemaObjects from '../helper/schema-objects';
import * as humansCollection from '../helper/humans-collection';

import {
    createRxDatabase, randomCouchString, isRxDocument
} from '../../plugins/core';
import AsyncTestUtil from 'async-test-util';
import {
    first
} from 'rxjs/operators';
import { RxChangeEvent, RxChangeEventDelete } from '../../src/rx-change-event';

config.parallel('reactive-collection.test.js', () => {
    describe('.insert()', () => {
        describe('positive', () => {
            it('should get a valid event on insert', async () => {
                const db = await createRxDatabase({
                    name: randomCouchString(10),
                    adapter: 'memory'
                });
                const colName = 'foobar';
                const c = await db.collection({
                    name: colName,
                    schema: schemas.human
                });

                c.insert(schemaObjects.human());
                const changeEvent: RxChangeEvent = await c.$.pipe(first()).toPromise() as any;
                assert.strictEqual(changeEvent.constructor.name, 'RxChangeEvent');
                assert.strictEqual(changeEvent.collectionName, colName);
                assert.strictEqual(typeof changeEvent.documentId, 'string');
                assert.ok(changeEvent.documentData);
                db.destroy();
            });
        });
        describe('negative', () => {
            it('should get no event on non-succes-insert', async () => {
                const db = await createRxDatabase({
                    name: randomCouchString(10),
                    adapter: 'memory'
                });
                const c = await db.collection({
                    name: 'foobar',
                    schema: schemas.human
                });
                let calls = 0;
                const sub = db.$.subscribe(() => {
                    calls++;
                });
                await AsyncTestUtil.assertThrows(
                    () => c.insert({
                        foo: 'baar'
                    }),
                    'RxError',
                    'schema'
                );
                assert.strictEqual(calls, 0);
                sub.unsubscribe();
                db.destroy();
            });
        });
    });
    describe('.bulkInsert()', () => {
        describe('positive', () => {
            it('should fire on bulk insert', async () => {
                const db = await createRxDatabase({
                    name: randomCouchString(10),
                    adapter: 'memory'
                });
                const collection = await db.collection({
                    name: 'human',
                    schema: schemas.primaryHuman
                });

                const emittedCollection: RxChangeEvent[] = [];
                const colSub = collection.insert$.subscribe((ce) => {
                    emittedCollection.push(ce);
                });

                const docs = new Array(1).fill(0).map(() => schemaObjects.human());

                await collection.bulkInsert(docs);

                const changeEvent = emittedCollection[0];
                assert.strictEqual(changeEvent.operation, 'INSERT');
                assert.strictEqual(changeEvent.collectionName, 'human');
                assert.strictEqual(changeEvent.documentId, docs[0].passportId);
                assert.ok(isRxDocument(changeEvent.rxDocument));
                assert.ok(changeEvent.documentData);

                colSub.unsubscribe();
                db.destroy();
            });
        });
    });
    describe('.bulkRemove()', () => {
        describe('positive', () => {
            it('should fire on bulk remove', async () => {
                const c = await humansCollection.create(10);

                const emittedCollection: RxChangeEventDelete[] = [];
                const colSub = c.remove$.subscribe((ce) => {
                    emittedCollection.push(ce);
                });

                const docList = await c.find().exec();
                const primaryList = docList.map(doc => doc.primary);

                await c.bulkRemove(primaryList);

                const changeEvent = emittedCollection[0];

                assert.strictEqual(changeEvent.operation, 'DELETE');
                assert.strictEqual(changeEvent.collectionName, 'human');
                assert.strictEqual(changeEvent.documentId, docList[0].primary);
                assert.ok(isRxDocument(changeEvent.rxDocument));
                assert.ok(changeEvent.documentData);
                assert.ok(changeEvent.previousData);

                colSub.unsubscribe();
                c.database.destroy();
            });
        });
    });
    describe('.remove()', () => {
        describe('positive', () => {
            it('should fire on remove', async () => {
                const c = await humansCollection.create(0);
                const q = c.find();
                const ar: any[] = [];
                const sub = q.$
                    .subscribe(docs => {
                        ar.push(docs);
                    });

                // nothing is fired until no results
                assert.strictEqual(ar.length, 0);

                // empty array since no documents
                await AsyncTestUtil.waitUntil(() => ar.length === 1);

                assert.deepStrictEqual(ar[0], []);

                await c.insert(schemaObjects.human());
                await AsyncTestUtil.waitUntil(() => ar.length === 2);

                const doc: any = await c.findOne().exec();
                await doc.remove();
                await AsyncTestUtil.waitUntil(() => ar.length === 3);
                sub.unsubscribe();

                c.database.destroy();
            });
        });
    });
    describe('.insert$', () => {
        it('should only emit inserts', async () => {
            const c = await humansCollection.create(0);

            const emitted: RxChangeEvent[] = [];
            c.insert$.subscribe(cE => emitted.push(cE as any));

            await c.insert(schemaObjects.human());
            const doc = await c.insert(schemaObjects.human());
            await c.insert(schemaObjects.human());
            await doc.remove();

            await c.insert(schemaObjects.human());

            await AsyncTestUtil.waitUntil(() => emitted.length === 4);
            emitted.forEach(cE => assert.strictEqual(cE.operation, 'INSERT'));
            c.database.destroy();
        });
    });
    describe('.update$', () => {
        it('should only emit updates', async () => {
            const c = await humansCollection.create(0);

            const emitted: RxChangeEvent[] = [];
            c.update$.subscribe(cE => emitted.push(cE as any));

            const doc1 = await c.insert(schemaObjects.human());
            const doc2 = await c.insert(schemaObjects.human());
            const doc3 = await c.insert(schemaObjects.human());
            await c.insert(schemaObjects.human());
            await doc3.remove();

            await doc1.atomicSet('firstName', 'foobar1');
            await doc2.atomicSet('firstName', 'foobar2');

            await AsyncTestUtil.waitUntil(() => emitted.length === 2);
            emitted.forEach(cE => assert.strictEqual(cE.operation, 'UPDATE'));
            c.database.destroy();
        });
    });
    describe('.remove$', () => {
        it('should only emit removes', async () => {
            const c = await humansCollection.create(0);

            const emitted: RxChangeEvent[] = [];
            c.remove$.subscribe(cE => emitted.push(cE as any));
            await c.insert(schemaObjects.human());
            const doc1 = await c.insert(schemaObjects.human());
            const doc2 = await c.insert(schemaObjects.human());
            await doc1.remove();
            await c.insert(schemaObjects.human());
            await doc2.remove();


            await AsyncTestUtil.waitUntil(() => emitted.length === 2);
            emitted.forEach(cE => assert.strictEqual(cE.operation, 'DELETE'));
            c.database.destroy();
        });
    });
});
