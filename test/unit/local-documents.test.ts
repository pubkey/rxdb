import assert from 'assert';
import AsyncTestUtil, { wait, waitUntil, randomString } from 'async-test-util';

import {
    schemaObjects,
    schemas,
    humansCollection,
    isNode
} from '../../plugins/test-utils/index.mjs';
import {
    createRxDatabase,
    randomToken,
    addRxPlugin,
    RxJsonSchema,
    ensureNotFalsy,
    RxLocalDocument,
    RxCollection
} from '../../plugins/core/index.mjs';


import { RxDBLocalDocumentsPlugin } from '../../plugins/local-documents/index.mjs';
addRxPlugin(RxDBLocalDocumentsPlugin);
import config, { describeParallel } from './config.ts';
import {
    filter,
    first,
    map
} from 'rxjs/operators';
import { firstValueFrom } from 'rxjs';

declare type TestDocType = {
    foo: string;
};

describeParallel('local-documents.test.ts', () => {
    describe('.insertLocal()', () => {
        describe('positive', () => {
            it('should create a local document', async () => {
                const c = await humansCollection.create(0);
                const doc = await c.insertLocal('foobar', {
                    foo: 'bar'
                });
                assert.ok(doc);
                c.database.close();
            });
            it('should not find the doc because its local', async () => {
                const c = await humansCollection.create(0);
                await c.insertLocal('foobar', {
                    foo: 'bar'
                });
                const doc2 = await c.findOne().exec();
                assert.strictEqual(doc2, null);
                c.database.close();
            });
        });
        describe('negative', () => {
            it('should throw if already exists', async () => {
                const c = await humansCollection.create(0);
                const doc = await c.insertLocal('foobar', {
                    foo: 'bar'
                });
                assert.ok(doc);
                let thrown = false;
                try {
                    await c.insertLocal('foobar', {
                        foo: 'bar2'
                    });
                } catch (err) {
                    thrown = true;
                }
                assert.ok(thrown);
                c.database.close();
            });
        });
    });
    describe('.getLocal()', () => {
        describe('positive', () => {
            it('should find the document', async () => {
                const c = await humansCollection.create(0);
                await c.insertLocal('foobar', {
                    foo: 'bar'
                });
                const doc = await c.getLocal('foobar');
                assert.ok(doc);
                assert.strictEqual(doc.get('foo'), 'bar');
                c.database.close();
            });
            it('should find the document twice (doc-cache)', async () => {
                const c = await humansCollection.create(0);
                await c.insertLocal('foobar', {
                    foo: 'bar'
                });
                const doc = await c.getLocal('foobar');
                const doc2 = await c.getLocal('foobar');
                assert.ok(doc);
                assert.ok(doc === doc2);
                c.database.close();
            });
        });
        describe('negative', () => {
            it('should not find non-existing', async () => {
                const c = await humansCollection.create(0);
                const doc = await c.getLocal('foobar');
                assert.strictEqual(doc, null);
                c.database.close();
            });
        });
    });
    describe('.$', () => {
        it('should return the full RxLocaDocument, not just the data', async () => {
            const c = await humansCollection.create(0);
            const doc = await c.insertLocal('foobar', {
                foo: 'bar'
            });
            const emitted: RxLocalDocument<any, any>[] = [];
            doc.$.subscribe(fullDoc => {
                emitted.push(fullDoc);
            });
            await waitUntil(() => emitted.length === 1);
            await doc.incrementalPatch({ foo: 'bar2' });
            await waitUntil(() => emitted.length === 2);

            emitted.forEach(fullDoc => {
                // ensure it is a full RxLocalDocument instance
                assert.ok(fullDoc.primary);
            });

            // 2nd must have updated data
            assert.strictEqual(emitted[1].get('foo'), 'bar2');

            c.database.close();
        });
    });
    describe('incremental mutation functions', () => {
        type LocalDocType = {
            foo: string;
            added?: string;
        };
        describe('.incrementalPatch()', () => {
            it('should modify the data', async () => {
                const c = await humansCollection.create(0);
                let doc = await c.upsertLocal<LocalDocType>(
                    'foobar',
                    {
                        foo: 'bar'
                    }
                );

                doc = await doc.incrementalPatch({
                    added: 'foo'
                });

                assert.strictEqual(doc.get('foo'), 'bar');
                assert.strictEqual(doc.get('added'), 'foo');

                c.database.close();
            });
        });
        describe('.incrementalModify()', () => {
            it('should modify the data', async () => {
                const c = await humansCollection.create(0);
                let doc: RxLocalDocument<RxCollection<any>, LocalDocType> = await c.upsertLocal<LocalDocType>('foobar', {
                    foo: 'bar'
                });

                doc = await doc.incrementalModify(data => {
                    data.added = 'foo';
                    return data;
                });

                assert.strictEqual(doc.get('foo'), 'bar');
                assert.strictEqual(doc.get('added'), 'foo');

                c.database.close();
            });
        });
    });
    describe('.getLocal$()', () => {
        const id = 'foo';
        it('should emit null when not exists', async () => {
            const c = await humansCollection.create(0);
            const cData = await c.getLocal$(id).pipe(first()).toPromise();
            const dbData = await c.database.getLocal$(id).pipe(first()).toPromise();

            assert.strictEqual(cData, null);
            assert.strictEqual(dbData, null);

            c.database.close();
        });
        it('should emit the document when exists', async () => {
            const c = await humansCollection.create(0);

            await c.insertLocal(id, {
                foo: 'bar'
            });
            await c.database.insertLocal(id, {
                foo: 'bar'
            });

            const cDoc = await c.getLocal$(id).pipe(first()).toPromise();
            const dbDoc = await c.database.getLocal$(id).pipe(first()).toPromise();

            assert.strictEqual(ensureNotFalsy(cDoc).get('foo'), 'bar');
            assert.strictEqual(ensureNotFalsy(dbDoc).get('foo'), 'bar');

            c.database.close();
        });
        it('collection: should emit again when state changed', async () => {
            const c = await humansCollection.create(0);
            const cEmits: any[] = [];
            const sub = c.getLocal$(id).subscribe((x: any) => {
                cEmits.push(x ? x.toJSON() : null);
            });

            await waitUntil(() => cEmits.length === 1);
            assert.strictEqual(cEmits[0], null);

            // insert
            await c.insertLocal(id, { foo: 'bar' });
            await waitUntil(() => cEmits.length === 2);

            assert.strictEqual(cEmits[1].data.foo, 'bar');

            // update
            await c.upsertLocal(id, { foo: 'bar2' });
            await waitUntil(() => cEmits.length === 3);
            assert.strictEqual(cEmits[2].data.foo, 'bar2');

            sub.unsubscribe();
            c.database.close();
        });
        it('database: should emit again when state changed', async () => {
            const c = await humansCollection.create(0);
            const db = c.database;

            const cEmits: any[] = [];
            const sub = db.getLocal$(id).subscribe((x) => {
                cEmits.push(x ? x.toJSON() : null);
            });

            await waitUntil(() => cEmits.length === 1);
            assert.strictEqual(cEmits[0], null);

            // insert
            await db.insertLocal(id, { foo: 'bar' });
            await waitUntil(() => cEmits.length === 2);
            assert.strictEqual(cEmits[1].data.foo, 'bar');

            // update
            await db.upsertLocal(id, { foo: 'bar2' });
            await waitUntil(() => cEmits.length === 3);
            assert.strictEqual(cEmits[2].data.foo, 'bar2');

            sub.unsubscribe();
            c.database.close();
        });
    });
    describe('.upsertLocal()', () => {
        describe('positive', () => {
            it('should insert when not exists', async () => {
                const c = await humansCollection.create(0);
                const doc: RxLocalDocument<any, { foo: string; }> = await c.upsertLocal<{ foo: string; }>('foobar', {
                    foo: 'bar'
                });
                assert.ok(doc);
                assert.strictEqual(doc.get('foo'), 'bar');
                c.database.close();
            });
            it('should update if the document already exists', async () => {
                const c = await humansCollection.create(0);
                const doc = await c.upsertLocal('foobar', {
                    foo: 'bar'
                });
                const doc2 = await c.upsertLocal('foobar', {
                    foo: 'bar2'
                });

                assert.strictEqual(doc2.get('foo'), 'bar2');
                assert.ok(doc !== doc2);
                c.database.close();
            });
            /**
             * @link https://github.com/pubkey/rxdb/issues/2471
             */
            it('should invoke subscription once', async () => {
                const c = await humansCollection.create(0);
                const emitted: RxLocalDocument<any, { foo: string; }>[] = [];
                const doc = await c.upsertLocal<{ foo: string; }>('foobar', {
                    foo: 'barOne',
                });
                await wait(50);
                const docSub = doc.$.subscribe(x => {
                    emitted.push(x as any);
                });
                await waitUntil(() => emitted.length === 1);
                await c.upsertLocal('foobar', {
                    foo: 'barTwo',
                });

                assert.strictEqual(emitted.length, 2);
                // first 'barOne' is emitted because.$ is a BehaviorSubject
                assert.strictEqual(emitted[0].get('foo'), 'barOne');
                // second after the change, barTwo is emitted
                assert.strictEqual(emitted[1].get('foo'), 'barTwo');

                docSub.unsubscribe();
                c.database.close();
            });
        });
        describe('negative', () => { });
    });
    describe('.remove()', () => {
        it('should remove the document', async () => {
            const c = await humansCollection.create(0);
            const doc = await c.upsertLocal('foobar', {
                foo: 'bar'
            });
            await doc.remove();
            const doc2 = await c.getLocal('foobar');
            assert.ok(ensureNotFalsy(doc2).deleted);
            c.database.close();
        });
    });
    describe('with database', () => {
        it('should be able to use local documents directly on the database', async () => {
            const c = await humansCollection.create(0);
            const db = c.database;

            const doc1 = await db.insertLocal('foobar', {
                foo: 'bar'
            });
            const doc2 = await db.getLocal('foobar');
            assert.strictEqual(doc1, doc2);
            db.close();
        });
    });
    describe('multi-instance', () => {
        if (!config.storage.hasMultiInstance) {
            return;
        }
        it('should stream events over multi-instance', async () => {
            const name = randomToken(10);
            const db = await createRxDatabase({
                name,
                storage: config.storage.getStorage(),
                localDocuments: true
            });
            const db2 = await createRxDatabase({
                name,
                storage: config.storage.getStorage(),
                ignoreDuplicate: true,
                localDocuments: true
            });

            const doc1 = await db.insertLocal('foobar', {
                foo: 'bar'
            });
            let doc2: RxLocalDocument<any, any> | null;
            await waitUntil(async () => {
                doc2 = await db2.getLocal('foobar');
                return !!doc2;
            });

            await doc1.incrementalPatch({ foo: 'bar2' });
            await waitUntil(() => {
                return ensureNotFalsy(doc2).getLatest().get('foo') === 'bar2';
            }, 1000, 50);

            db.close();
            db2.close();
        });
        it('should emit deleted', async () => {
            const name = randomToken(10);
            const db = await createRxDatabase({
                name,
                storage: config.storage.getStorage(),
                localDocuments: true
            });
            const db2 = await createRxDatabase({
                name,
                storage: config.storage.getStorage(),
                ignoreDuplicate: true,
                localDocuments: true
            });

            const doc1 = await db.insertLocal('foobar', {
                foo: 'bar'
            });

            let doc2: RxLocalDocument<any, any> | null = undefined as any;
            await waitUntil(async () => {
                doc2 = await db2.getLocal('foobar');
                return !!doc2;
            });

            const hasEmitted = firstValueFrom(
                ensureNotFalsy(doc2).deleted$
                    .pipe(
                        map(x => {
                            return x;
                        }),
                        filter(d => d === true),
                        first()
                    )
            );
            await doc1.remove();
            await hasEmitted;

            db.close();
            db2.close();
        });
        it('should emit changes (database)', async () => {
            const name = randomToken(10);
            const db = await createRxDatabase({
                name,
                storage: config.storage.getStorage(),
                localDocuments: true
            });
            const db2 = await createRxDatabase({
                name,
                storage: config.storage.getStorage(),
                ignoreDuplicate: true,
                localDocuments: true
            });

            const doc1 = await db.insertLocal('foobar', {
                foo: 'bar'
            });

            await doc1.incrementalPatch({ foo: 'bar2' });

            await waitUntil(async () => {
                const doc2 = await db2.getLocal<TestDocType>('foobar');
                return doc2 && doc2.toJSON().data.foo === 'bar2';
            });

            db.close();
            db2.close();
        });
        it('should emit changes (collection)', async () => {
            const name = randomToken(10);
            const db = await createRxDatabase({
                name,
                storage: config.storage.getStorage(),
            });
            const db2 = await createRxDatabase({
                name,
                storage: config.storage.getStorage(),
                ignoreDuplicate: true
            });
            const c1 = await db.addCollections({
                humans: {
                    schema: schemas.primaryHuman,
                    localDocuments: true
                }
            });

            const c2 = await db2.addCollections({
                humans: {
                    schema: schemas.primaryHuman,
                    localDocuments: true
                }
            });

            // insert on instance #1
            const doc1 = await c1.humans.insertLocal('foobar', {
                foo: 'bar'
            });

            const emitted: any[] = [];
            const sub = c1.humans.getLocal$('foobar').subscribe((x: any) => {
                emitted.push(x ? x.toJSON(true) : null);
            });
            await waitUntil(() => emitted.length === 1);


            // update on instance #2
            const doc2 = await c2.humans.getLocal<TestDocType>('foobar');
            await doc1.incrementalPatch({ foo: 'bar2' });

            await waitUntil(() => doc2 && doc2.getLatest().toJSON().data.foo === 'bar2');
            await waitUntil(() => {
                return emitted.length >= 2;
            });

            sub.unsubscribe();
            db.close();
            db2.close();
        });
        it('BUG insertLocal not send to other instance', async () => {
            const name = randomToken(10);
            const db = await createRxDatabase({
                name,
                storage: config.storage.getStorage(),
                localDocuments: true
            });
            const db2 = await createRxDatabase({
                name,
                storage: config.storage.getStorage(),
                ignoreDuplicate: true,
                localDocuments: true
            });

            const emitted: any[] = [];
            const sub = db2.getLocal$<TestDocType>('foobar').subscribe(x => {
                emitted.push(x);
            });

            /**
             * Before inserting, we must await that the empty result set
             * was emitted. Otherwise we might miss the initial emit
             * because creating the db2 can take a long time
             * on some storages. So not awaiting here would make the test
             * timing dependent.
             */
            await waitUntil(() => emitted.length === 1);

            await db.insertLocal<TestDocType>('foobar', {
                foo: 'bar'
            });

            await waitUntil(() => {
                return emitted.length === 2;
            }, 2000, 50);
            assert.ok(emitted.pop());

            const doc = await db2.getLocal<TestDocType>('foobar');
            assert.strictEqual(doc && doc.toJSON().data.foo, 'bar');

            sub.unsubscribe();
            db.close();
            db2.close();
        });
        it('should not conflict with non-local-doc that has same id', async () => {
            const name = randomToken(10);
            const db = await createRxDatabase({
                name,
                storage: config.storage.getStorage(),
                localDocuments: true
            });
            const c1 = await db.addCollections({
                humans: {
                    schema: schemas.primaryHuman,
                    localDocuments: true
                }
            });
            const db2 = await createRxDatabase({
                name,
                storage: config.storage.getStorage(),
                ignoreDuplicate: true,
                localDocuments: true
            });
            const c2 = await db2.addCollections({
                humans: {
                    schema: schemas.primaryHuman,
                    localDocuments: true
                }
            });
            const docData = schemaObjects.humanData();
            docData.passportId = 'foobar';
            docData.age = 40;
            const doc = await c1.humans.insert(docData);
            const localDoc = await c1.humans.insertLocal('foobar', {
                foo: 'bar',
                age: 10
            });

            let doc2: RxLocalDocument<any, any> | null = undefined as any;
            await waitUntil(async () => {
                doc2 = await c2.humans.findOne().exec();
                return !!doc2;
            });



            let localDoc2: RxLocalDocument<any, any> | null = undefined as any;
            await waitUntil(async () => {
                localDoc2 = await c2.humans.getLocal('foobar');
                return !!localDoc2;
            });
            await doc.incrementalPatch({ age: 50 });

            await AsyncTestUtil.waitUntil(() => (doc2 as any).getLatest().age === 50);
            await AsyncTestUtil.wait(20);
            assert.strictEqual(ensureNotFalsy(localDoc2).get('age'), 10);
            await localDoc.incrementalPatch({ age: 66, foo: 'bar' });

            await AsyncTestUtil.waitUntil(() => ensureNotFalsy(localDoc2).getLatest().get('age') === 66);
            await AsyncTestUtil.wait(20);
            assert.strictEqual(ensureNotFalsy(doc2).getLatest().get('age'), 50);

            db.close();
            db2.close();
        });
    });
    describe('issues', () => {
        it('#661 LocalDocument Observer field error', async () => {
            const myCollection = await humansCollection.create(0);
            await myCollection.upsertLocal(
                'foobar', {
                foo: 'bar'
            }
            );

            const emitted: any[] = [];
            const localDoc = await myCollection.getLocal('foobar');
            ensureNotFalsy(localDoc).get$('foo').subscribe((val: any) => {
                emitted.push(val);
            });

            await AsyncTestUtil.waitUntil(() => emitted.length === 1);
            assert.strictEqual(emitted[0], 'bar');

            myCollection.database.close();
        });
        it('#663 Document conflicts with LocalDocument in the same Collection', async () => {
            const name = randomToken(10);
            const db = await createRxDatabase({
                name,
                storage: config.storage.getStorage(),
            });

            type DocData = { id: string; boundariesGrp: { bndrPlnId: string; bndrPlnNm: string; }[]; };
            const boundaryMgmtSchema: RxJsonSchema<DocData> = {
                version: 0,
                type: 'object',
                primaryKey: 'id',
                properties: {
                    id: {
                        type: 'string',
                        maxLength: 100
                    },
                    boundariesGrp: {
                        type: 'array',
                        uniqueItems: false,
                        items: {
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
            const boundaryMgmtCols = await db.addCollections({
                human: {
                    schema: boundaryMgmtSchema,
                    localDocuments: true
                }
            });
            const boundaryMgmtCol = boundaryMgmtCols.human;

            const groups = {
                bndrPlnId: 'mygroup',
                bndrPlnNm: 'other'
            };

            // insert non-local
            await boundaryMgmtCol.insert({
                id: randomToken(12),
                boundariesGrp: [groups]
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

            await ensureNotFalsy(metadata).incrementalModify(docData => {
                docData.selectedBndrPlnId = grpId;
                return docData;
            });

            const data = await boundaryMgmtCol.findOne().exec(true);
            const json = data.toJSON();

            assert.deepStrictEqual(json.boundariesGrp[0], groups);

            db.close();
        });
        it('local documents not persistent on db restart', async () => {
            if (!config.storage.hasPersistence) {
                return;
            }
            if (!isNode) {
                return;
            }
            const dbName: string = randomToken(10);

            const localDocId = 'foobar';
            const localDocData = {
                foo: 'bar'
            };

            const db = await createRxDatabase({
                name: dbName,
                storage: config.storage.getStorage(),
                multiInstance: false,
                localDocuments: true
            });
            const cols = await db.addCollections({
                humans: {
                    schema: schemas.human,
                    localDocuments: true
                }
            });

            await db.insertLocal(localDocId, localDocData);
            await cols.humans.insertLocal(localDocId, localDocData);

            await db.close();

            const db2 = await createRxDatabase({
                name: dbName,
                storage: config.storage.getStorage(),
                multiInstance: false,
                localDocuments: true
            });
            const col2 = await db2.addCollections({
                humans: {
                    schema: schemas.human,
                    localDocuments: true
                }
            });

            const docDb = await db2.getLocal(localDocId);
            const docCol = await col2.humans.getLocal(localDocId);

            assert.ok(docDb);
            assert.ok(docCol);

            assert.strictEqual(docDb.get('foo'), 'bar');
            assert.strictEqual(docCol.get('foo'), 'bar');

            await db2.close();
        });
        it('doing many upsertLocal() can cause a 404 document not found', async () => {
            if (!isNode) {
                return;
            }
            const dbName: string = randomToken(10);
            const db = await createRxDatabase({
                name: dbName,
                storage: config.storage.getStorage(),
                multiInstance: false,
                localDocuments: true
            });

            const key = 'foobar';
            await db.getLocal(key);
            const doc = await db.insertLocal(key, {
                foo: 'bar'
            });
            assert.ok(doc);

            let t = 0;
            while (t < 50) {
                await db.upsertLocal(key, {
                    foo: randomString(10)
                });
                t++;
            }

            db.close();
        });
    });
});
