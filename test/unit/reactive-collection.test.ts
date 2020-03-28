import assert from 'assert';
import config from './config';

import * as schemas from '../helper/schemas';
import * as schemaObjects from '../helper/schema-objects';
import * as humansCollection from '../helper/humans-collection';

import {
    createRxDatabase, randomCouchString
} from '../../';
import AsyncTestUtil from 'async-test-util';
import {
    first
} from 'rxjs/operators';
import { RxChangeEvent } from '../../src/rx-change-event';

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
    describe('.delete$', () => {
        it('should only emit deletes', async () => {
            const c = await humansCollection.create(0);

            const emitted: RxChangeEvent[] = [];
            c.delete$.subscribe(cE => emitted.push(cE as any));
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
