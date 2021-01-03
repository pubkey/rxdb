import assert from 'assert';
import AsyncTestUtil, { wait, waitUntil, randomString } from 'async-test-util';

import * as humansCollection from '../helper/humans-collection';
import * as schemas from '../helper/schemas';
import * as schemaObjects from '../helper/schema-objects';
import {
    createRxDatabase,
    randomCouchString,
    RxLocalDocument,
    addRxPlugin
} from '../../plugins/core';
import { RxDBLocalDocumentsPlugin } from '../../plugins/local-documents';
addRxPlugin(RxDBLocalDocumentsPlugin);
import config from './config';
import {
    filter,
    first
} from 'rxjs/operators';


let leveldown: any;
if (config.platform.isNode()) {
    leveldown = require('leveldown');
}

declare type TestDocType = {
    foo: string;
};

config.parallel('local-documents.test.js', () => {
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
                assert.strictEqual(doc2, null);
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
                    'RxError',
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
                assert.strictEqual(doc.get('foo'), 'bar');
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
                assert.strictEqual(doc, null);
                c.database.destroy();
            });
        });
    });
    describe('.getLocal$()', () => {
        const id = 'foo';
        it('should emit null when not exists', async () => {
            const c = await humansCollection.create();
            const cData = await c.getLocal$(id).pipe(first()).toPromise();
            const dbData = await c.database.getLocal$(id).pipe(first()).toPromise();

            assert.strictEqual(cData, null);
            assert.strictEqual(dbData, null);

            c.database.destroy();
        });
        it('should emit the document when exists', async () => {
            const c = await humansCollection.create();
            await c.insertLocal(id, {
                foo: 'bar'
            });
            await c.database.insertLocal(id, {
                foo: 'bar'
            });

            const cDoc = await c.getLocal$(id).pipe(first()).toPromise();
            const dbDoc = await c.database.getLocal$(id).pipe(first()).toPromise();

            assert.strictEqual(cDoc.get('foo'), 'bar');
            assert.strictEqual(dbDoc.get('foo'), 'bar');

            c.database.destroy();
        });
        it('collection: should emit again when state changed', async () => {
            const c = await humansCollection.create();

            const cEmits: any[] = [];

            const sub = c.getLocal$(id).subscribe((x: RxLocalDocument<any>) => {
                cEmits.push(x ? x.toJSON() : null);
            });

            await waitUntil(() => cEmits.length === 1);
            assert.strictEqual(cEmits[0], null);

            // insert
            await c.insertLocal(id, { foo: 'bar' });
            await waitUntil(() => cEmits.length === 2);
            assert.strictEqual(cEmits[1].foo, 'bar');

            // update
            await c.upsertLocal(id, { foo: 'bar2' });
            await waitUntil(() => cEmits.length === 3);
            assert.strictEqual(cEmits[2].foo, 'bar2');

            sub.unsubscribe();
            c.database.destroy();
        });
        it('database: should emit again when state changed', async () => {
            const c = await humansCollection.create();
            const db = c.database;

            const cEmits: any[] = [];
            const sub = db.getLocal$(id).subscribe((x: RxLocalDocument<any>) => {
                cEmits.push(x ? x.toJSON() : null);
            });

            await waitUntil(() => cEmits.length === 1);
            assert.strictEqual(cEmits[0], null);

            // insert
            await db.insertLocal(id, { foo: 'bar' });
            await waitUntil(() => cEmits.length === 2);
            assert.strictEqual(cEmits[1].foo, 'bar');

            // update
            await db.upsertLocal(id, { foo: 'bar2' });
            await waitUntil(() => cEmits.length === 3);
            assert.strictEqual(cEmits[2].foo, 'bar2');

            sub.unsubscribe();
            c.database.destroy();
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
                assert.strictEqual(doc.get('foo'), 'bar');
                c.database.destroy();
            });
            it('should update when exists', async () => {
                const c = await humansCollection.create(0);
                await c.upsertLocal('foobar', {
                    foo: 'bar'
                });
                const doc = await c.upsertLocal('foobar', {
                    foo: 'bar2'
                });
                assert.ok(doc);
                assert.strictEqual(doc.get('foo'), 'bar2');
                c.database.destroy();
            });
            /**
             * @link https://github.com/pubkey/rxdb/issues/2471
             */
            it('should invoke subscription once', async () => {
                const c = await humansCollection.create();
                const emitted: any[] = [];
                const doc = await c.upsertLocal('foobar', {
                    foo: 'barOne',
                });
                await wait(50);
                const docSub = doc.$.subscribe(x => {
                    emitted.push(x);
                });
                await c.upsertLocal('foobar', {
                    foo: 'barTwo',
                });

                assert.strictEqual(emitted.length, 2);
                // first 'barOne' is emitted because.$ is a BehaviorSubject
                assert.strictEqual(emitted[0].foo, 'barOne');
                // second after the change, barTwo is emitted
                assert.strictEqual(emitted[1].foo, 'barTwo');

                docSub.unsubscribe();
                c.database.destroy();
            });
        });
        describe('negative', () => { });
    });
    describe('.remove()', () => {
        it('should remove the document', async () => {
            const c = await humansCollection.create();
            const doc = await c.upsertLocal('foobar', {
                foo: 'bar'
            });
            await doc.remove();
            const doc2 = await c.getLocal('foobar');
            assert.strictEqual(doc2, null);
            c.database.destroy();
        });
    });
    describe('.atomicSet()', () => {
        it('should change the value', async () => {
            const c = await humansCollection.create();
            const doc = await c.insertLocal('foobar', {
                foo: 'bar'
            });

            await doc.atomicSet('foo', 'bar2');
            assert.strictEqual(doc.get('foo'), 'bar2');

            await doc.atomicSet('foo', 'bar3');
            assert.strictEqual(doc.get('foo'), 'bar3');

            c.database.destroy();
        });
        it('should save the doc persistent', async () => {
            const name = randomCouchString(10);
            const db = await createRxDatabase({
                name,
                adapter: 'memory'
            });
            const doc = await db.insertLocal('foobar', {
                foo: 'bar'
            });

            await doc.atomicSet('foo', 'bar2');
            db.destroy();

            const db2 = await createRxDatabase({
                name,
                adapter: 'memory',
                ignoreDuplicate: true
            });
            const doc2 = await db2.getLocal('foobar');
            assert.ok(doc2);
            assert.strictEqual(doc2.get('foo'), 'bar2');
            db2.destroy();
        });
        it('should not fail with many atomic updates in parallel', async () => {
            const c = await humansCollection.create(0);
            const db = c.database;

            // database
            const docDb = await db.insertLocal('foobar', {
                foo: 'bar'
            });
            await Promise.all(
                new Array(20).map(() => docDb.atomicSet('foo', randomString()))
            );

            // collection
            const doc = await c.insertLocal('foobar', {
                foo: 'bar'
            });
            await Promise.all(
                new Array(20).map(() => doc.atomicSet('foo', randomString()))
            );

            await db.destroy();
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
            assert.strictEqual(doc1, doc2);
            db.destroy();
        });
    });
    describe('multi-instance', () => {
        it('should stream events over multi-instance', async () => {
            const name = randomCouchString(10);
            const db = await createRxDatabase({
                name,
                adapter: 'memory'
            });
            const db2 = await createRxDatabase({
                name,
                adapter: 'memory',
                ignoreDuplicate: true
            });

            const doc1 = await db.insertLocal('foobar', {
                foo: 'bar'
            });
            const doc2 = await db2.getLocal('foobar');
            assert.ok(doc2);

            await doc1.atomicSet('foo', 'bar2');
            await AsyncTestUtil.waitUntil(() => doc2.get('foo') === 'bar2');

            db.destroy();
            db2.destroy();
        });
        it('should emit deleted', async () => {
            const name = randomCouchString(10);
            const db = await createRxDatabase({
                name,
                adapter: 'memory'
            });
            const db2 = await createRxDatabase({
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

            await doc2.deleted$
                .pipe(
                    filter(d => d === true),
                    first()
                )
                .toPromise();

            db.destroy();
            db2.destroy();
        });
        it('should emit changes (database)', async () => {
            const name = randomCouchString(10);
            const db = await createRxDatabase({
                name,
                adapter: 'memory'
            });
            const db2 = await createRxDatabase({
                name,
                adapter: 'memory',
                ignoreDuplicate: true
            });

            const doc1 = await db.insertLocal('foobar', {
                foo: 'bar'
            });
            const doc2 = await db2.getLocal<TestDocType>('foobar');

            await doc1.atomicSet('foo', 'bar2');

            await waitUntil(() => doc2.toJSON().foo === 'bar2');

            db.destroy();
            db2.destroy();
        });
        it('should emit changes (collection)', async () => {
            const name = randomCouchString(10);
            const db = await createRxDatabase({
                name,
                adapter: 'memory'
            });
            const db2 = await createRxDatabase({
                name,
                adapter: 'memory',
                ignoreDuplicate: true
            });
            const c1 = await db.collection({
                name: 'humans',
                schema: schemas.primaryHuman
            });
            const c2 = await db2.collection({
                name: 'humans',
                schema: schemas.primaryHuman
            });
            const doc1 = await c1.insertLocal('foobar', {
                foo: 'bar'
            });
            const doc2 = await c2.getLocal<TestDocType>('foobar');
            await doc1.atomicSet('foo', 'bar2');

            const emitted: any[] = [];
            const sub = c2.getLocal$('foobar').subscribe((x: any) => {
                emitted.push(x);
            });

            await waitUntil(() => doc2.toJSON().foo === 'bar2');
            await waitUntil(() => emitted.length >= 2);

            sub.unsubscribe();
            db.destroy();
            db2.destroy();
        });
        it('BUG insertLocal not send to other instance', async () => {
            const name = randomCouchString(10);
            const db = await createRxDatabase({
                name,
                adapter: 'memory'
            });
            const db2 = await createRxDatabase({
                name,
                adapter: 'memory',
                ignoreDuplicate: true
            });

            const emitted: any[] = [];
            const sub = db2.getLocal$<TestDocType>('foobar').subscribe(x => {
                emitted.push(x);
            });

            await db.insertLocal<TestDocType>('foobar', {
                foo: 'bar'
            });

            await waitUntil(() => emitted.length === 2);
            assert.ok(emitted.pop());

            const doc = await db2.getLocal<TestDocType>('foobar');
            assert.strictEqual(doc.toJSON().foo, 'bar');

            sub.unsubscribe();
            db.destroy();
            db2.destroy();
        });
        it('should not conflict with non-local-doc that has same id', async () => {
            const name = randomCouchString(10);
            const db = await createRxDatabase({
                name,
                adapter: 'memory'
            });
            const c1 = await db.collection({
                name: 'humans',
                schema: schemas.primaryHuman
            });
            const db2 = await createRxDatabase({
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
            await doc.atomicSet('age', 50);

            await AsyncTestUtil.waitUntil(() => doc2.age === 50);
            await AsyncTestUtil.wait(20);
            assert.strictEqual(localDoc2.get('age'), 10);
            await localDoc.atomicSet('age', 66);

            await AsyncTestUtil.waitUntil(() => localDoc2.get('age') === 66);
            await AsyncTestUtil.wait(20);
            assert.strictEqual(doc2.get('age'), 50);

            db.destroy();
            db2.destroy();
        });
    });
    describe('in-memory', () => {
        it('should call the non-mem parent', async () => {
            const name = randomCouchString(10);
            const db = await createRxDatabase({
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
            assert.strictEqual(doc.get('age'), 10);

            await c1.insertLocal('foobar2', {
                foo: 'bar',
                age: 11
            });
            const doc2 = await inMem.getLocal('foobar2');
            assert.strictEqual(doc2.get('age'), 11);

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
            assert.strictEqual(doc.foo, 'bar');

            // update
            await pouch.put({
                _id: '_local/foobar',
                foo: 'bar2',
                _rev: doc._rev
            });
            const doc2 = await pouch.get('_local/foobar');
            assert.strictEqual(doc2.foo, 'bar2');

            // remove
            await pouch.remove('_local/foobar', doc2._rev);
            await AsyncTestUtil.assertThrows(
                () => pouch.get('_local/foobar'),
                'PouchError',
                'missing'
            );

            c.database.destroy();
        });
        it('#661 LocalDocument Observer field error', async () => {
            const myCollection = await humansCollection.create(0);
            await myCollection.upsertLocal(
                'foobar', {
                foo: 'bar'
            }
            );

            const emitted: any[] = [];
            const localDoc = await myCollection.getLocal('foobar');
            localDoc.get$('foo').subscribe((val: any) => emitted.push(val));

            await AsyncTestUtil.waitUntil(() => emitted.length === 1);
            assert.strictEqual(emitted[0], 'bar');

            myCollection.database.destroy();
        });
        it('#663', async () => {
            const name = randomCouchString(10);
            const db = await createRxDatabase({
                name,
                adapter: 'memory'
            });
            const boundaryMgmtSchema = {
                version: 0,
                type: 'object',
                properties: {
                    boudariesGrp: {
                        type: 'array',
                        uniqueItems: false,
                        item: {
                            type: 'object',
                            properties: {
                                bndrPlnId: {
                                    type: 'string',
                                },
                                bndrPlnNm: {
                                    type: 'string',
                                }
                            }
                        },
                        default: [],
                    },
                }
            };
            const boundaryMgmtCol = await db.collection({
                name: 'human',
                schema: boundaryMgmtSchema
            });


            // insert non-local
            await boundaryMgmtCol.insert({
                boudariesGrp: [
                    'mygroup'
                ]
            });

            await boundaryMgmtCol.insertLocal('metadata', {
                userData: {},
                selectedBndrPlnId: 'foobar1',
                actionRev: 0,
                bndrId: 'foobar2',
                direction: 'foobar3',
            });

            // save localgrpId
            const grpId = 'foobar';
            const metadata = await boundaryMgmtCol.getLocal('metadata');

            await metadata.atomicSet('selectedBndrPlnId', grpId);

            const data = await boundaryMgmtCol.findOne().exec();
            const json = data.toJSON();

            assert.strictEqual(json.boudariesGrp[0], 'mygroup');

            db.destroy();
        });
        it('local documents not persistent on db restart', async () => {
            if (!config.platform.isNode()) {
                return;
            }
            const dbName: string = config.rootPath + 'test_tmp/' + randomCouchString(10);

            const localDocId = 'foobar';
            const localDocData = {
                foo: 'bar'
            };

            const db = await createRxDatabase({
                name: dbName,
                adapter: leveldown,
                multiInstance: false
            });
            const col = await db.collection({
                name: 'humans',
                schema: schemas.human
            });

            await db.insertLocal(localDocId, localDocData);
            await col.insertLocal(localDocId, localDocData);

            await db.destroy();

            const db2 = await createRxDatabase({
                name: dbName,
                adapter: leveldown,
                multiInstance: false
            });
            const col2 = await db2.collection({
                name: 'humans',
                schema: schemas.human
            });

            const docDb = await db2.getLocal(localDocId);
            const docCol = await col2.getLocal(localDocId);

            assert.ok(docDb);
            assert.ok(docCol);

            assert.strictEqual(docDb.get('foo'), 'bar');
            assert.strictEqual(docCol.get('foo'), 'bar');

            await db2.destroy();
        });
        it('doing many upsertLocal() can cause a 404 document not found', async () => {
            if (!config.platform.isNode()) {
                return;
            }
            const dbName: string = config.rootPath + 'test_tmp/' + randomCouchString(10);
            const db = await createRxDatabase({
                name: dbName,
                adapter: 'leveldb',
                multiInstance: false
            });

            const key = 'foobar';
            let doc = await db.getLocal(key);
            doc = await db.insertLocal(key, {
                foo: 'bar'
            });

            let t = 0;
            while (t < 50) {
                await db.upsertLocal(key, {
                    foo: randomString(10)
                });
                t++;
            }

            db.destroy();
        });
    });
});
