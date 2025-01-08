import assert from 'assert';
import config, { describeParallel } from './config.ts';

import {
    schemaObjects,
    schemas,
    humansCollection,
    HumanDocumentType
} from '../../plugins/test-utils/index.mjs';

import {
    createRxDatabase,
    randomToken,
    RxChangeEvent
} from '../../plugins/core/index.mjs';


import AsyncTestUtil from 'async-test-util';
import {
    first
} from 'rxjs/operators';
import { firstValueFrom } from 'rxjs';

describeParallel('reactive-collection.test.js', () => {
    describe('.insert()', () => {
        describe('positive', () => {
            it('should get a valid event on insert', async () => {
                const db = await createRxDatabase({
                    name: randomToken(10),
                    storage: config.storage.getStorage(),
                });
                const colName = 'foobar';
                const cols = await db.addCollections({
                    [colName]: {
                        schema: schemas.human
                    }
                });
                const c = cols[colName];

                const changeEventPromise = firstValueFrom(c.$.pipe(first()));
                c.insert(schemaObjects.humanData());
                const changeEvent = await changeEventPromise;
                assert.strictEqual(changeEvent.collectionName, colName);
                assert.strictEqual(typeof changeEvent.documentId, 'string');
                assert.ok(changeEvent.documentData);
                db.close();
            });
        });
    });
    describe('.bulkInsert()', () => {
        describe('positive', () => {
            it('should fire on bulk insert', async () => {
                const db = await createRxDatabase({
                    name: randomToken(10),
                    storage: config.storage.getStorage(),
                });
                const collections = await db.addCollections({
                    human: {
                        schema: schemas.primaryHuman
                    }
                });
                const collection = collections.human;

                const emittedCollection: RxChangeEvent<HumanDocumentType>[] = [];
                const colSub = collection.insert$.subscribe((ce) => {
                    emittedCollection.push(ce);
                });

                const docs = new Array(1).fill(0).map(() => schemaObjects.humanData());

                await collection.bulkInsert(docs);

                const changeEvent = emittedCollection[0];
                assert.strictEqual(changeEvent.operation, 'INSERT');
                assert.strictEqual(changeEvent.collectionName, 'human');
                assert.strictEqual(changeEvent.documentId, docs[0].passportId);
                assert.ok(changeEvent.documentData);

                colSub.unsubscribe();
                db.close();
            });
        });
    });
    describe('.bulkRemove()', () => {
        describe('positive', () => {
            it('should fire on bulk remove', async () => {
                const c = await humansCollection.create(10);
                const emittedCollection: RxChangeEvent<HumanDocumentType>[] = [];
                const colSub = c.remove$.subscribe((ce) => {
                    emittedCollection.push(ce);
                });

                const docList = await c.find().exec();
                const primaryList = docList.map(doc => doc.primary);

                await c.bulkRemove(primaryList);
                const changeEvent = emittedCollection[0];

                assert.strictEqual(changeEvent.operation, 'DELETE');
                assert.strictEqual(changeEvent.collectionName, 'human');
                assert.ok(changeEvent.documentData);
                assert.ok(changeEvent.previousDocumentData);

                colSub.unsubscribe();
                c.database.close();
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

                await c.insert(schemaObjects.humanData());
                await AsyncTestUtil.waitUntil(() => ar.length === 2);

                const doc: any = await c.findOne().exec();
                await doc.remove();
                await AsyncTestUtil.waitUntil(() => ar.length === 3);
                sub.unsubscribe();

                c.database.close();
            });
        });
    });
    describe('.insert$', () => {
        it('should only emit inserts', async () => {
            const c = await humansCollection.create(0);

            const emitted: RxChangeEvent<HumanDocumentType>[] = [];
            c.insert$.subscribe(cE => emitted.push(cE as any));

            await c.insert(schemaObjects.humanData());
            const doc = await c.insert(schemaObjects.humanData());
            await c.insert(schemaObjects.humanData());
            await doc.remove();

            await c.insert(schemaObjects.humanData());

            await AsyncTestUtil.waitUntil(() => {
                return emitted.length === 4;
            });
            emitted.forEach(cE => assert.strictEqual(cE.operation, 'INSERT'));
            c.database.close();
        });
    });
    describe('.update$', () => {
        it('should only emit updates', async () => {
            const c = await humansCollection.create(0);

            const emitted: RxChangeEvent<HumanDocumentType>[] = [];
            c.update$.subscribe(cE => emitted.push(cE as any));

            const doc1 = await c.insert(schemaObjects.humanData());
            const doc2 = await c.insert(schemaObjects.humanData());
            const doc3 = await c.insert(schemaObjects.humanData());
            await c.insert(schemaObjects.humanData());
            await doc3.remove();

            await doc1.incrementalPatch({ firstName: 'foobar1' });
            await doc2.incrementalPatch({ firstName: 'foobar2' });

            await AsyncTestUtil.waitUntil(() => emitted.length === 2);
            emitted.forEach(cE => assert.strictEqual(cE.operation, 'UPDATE'));
            c.database.close();
        });
    });
    describe('.remove$', () => {
        it('should only emit removes', async () => {
            const c = await humansCollection.create(0);

            const emitted: RxChangeEvent<HumanDocumentType>[] = [];
            c.remove$.subscribe(cE => emitted.push(cE as any));
            await c.insert(schemaObjects.humanData());
            const doc1 = await c.insert(schemaObjects.humanData());
            const doc2 = await c.insert(schemaObjects.humanData());
            await doc1.remove();
            await c.insert(schemaObjects.humanData());
            await doc2.remove();


            await AsyncTestUtil.waitUntil(() => emitted.length === 2);
            emitted.forEach(cE => assert.strictEqual(cE.operation, 'DELETE'));
            c.database.close();
        });
    });
});
