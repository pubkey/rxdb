import assert from 'assert';
import clone from 'clone';
import config, { describeParallel, getStorage } from './config.ts';


import {
    schemaObjects,
    schemas,
    humansCollection,
    isFastMode,
    HumanDocumentType
} from '../../plugins/test-utils/index.mjs';

import AsyncTestUtil, { wait, waitUntil } from 'async-test-util';
import {
    createRxDatabase,
    RxDocument,
    isRxDocument,
    promiseWait,
    randomToken,
    addRxPlugin
} from '../../plugins/core/index.mjs';

import { RxDBQueryBuilderPlugin } from '../../plugins/query-builder/index.mjs';
addRxPlugin(RxDBQueryBuilderPlugin);


import {
    filter,
    map,
    first
} from 'rxjs/operators';

describeParallel('reactive-query.test.js', () => {
    describeParallel('positive', () => {
        it('get results of array when .subscribe() and filled array later', async () => {
            const c = await humansCollection.create(1);
            const query = c.find();
            let lastValue: any = null;
            let count = 0;
            query.$.subscribe(newResults => {
                count++;
                lastValue = newResults;
            });
            await AsyncTestUtil.waitUntil(() => count === 1);
            assert.ok(lastValue);
            assert.strictEqual(lastValue.length, 1);
            assert.strictEqual(count, 1);
            c.database.close();
        });
        it('get the updated docs on Collection.insert()', async () => {
            const c = await humansCollection.create(1);
            const query = c.find();
            let lastValue: any[] = [];
            const emitted: any[] = [];
            query.$.subscribe(newResults => {
                lastValue = newResults;
                emitted.push(newResults);
            });
            await waitUntil(() => emitted.length === 1);
            assert.strictEqual(lastValue.length, 1);

            const addHuman = schemaObjects.humanData();

            await c.insert(addHuman);
            await waitUntil(() => lastValue.length === 2);

            let isHere = false;
            lastValue.map(doc => {
                if (doc.get('passportId') === addHuman.passportId) {
                    isHere = true;
                }
            });
            assert.ok(isHere);
            c.database.close();
        });
        it('get the value twice when subscribing 2 times', async () => {
            const c = await humansCollection.create(1);
            const query = c.find();
            let lastValue: any[] = [];
            query.$.subscribe(newResults => {
                lastValue = newResults;
            });
            let lastValue2: any[] = [];
            query.$.subscribe(newResults => {
                lastValue2 = newResults;
            });
            await promiseWait(100);

            await AsyncTestUtil.waitUntil(() => lastValue2 && lastValue2.length === 1);
            assert.deepStrictEqual(lastValue, lastValue2);
            c.database.close();
        });
        it('get the base-value when subscribing again later', async () => {
            const c = await humansCollection.create(1);
            const query = c.find();
            let lastValue: any[] = [];
            query.$.subscribe(newResults => {
                lastValue = newResults;
            });
            await AsyncTestUtil.waitUntil(() => lastValue.length > 0);
            let lastValue2: any[] = [];
            query.$.subscribe(newResults => {
                lastValue2 = newResults;
            });
            await AsyncTestUtil.waitUntil(() => lastValue2.length > 0);
            await promiseWait(10);
            assert.strictEqual(lastValue2.length, 1);
            assert.deepStrictEqual(lastValue, lastValue2);
            c.database.close();
        });
        it('subscribing many times should not result in many database-requests', async () => {
            const c = await humansCollection.create(1);
            const query = c.find({
                selector: {
                    passportId: {
                        $ne: 'foobar'
                    }
                }
            });
            await query.exec();
            const countBefore = query._execOverDatabaseCount;
            await Promise.all(
                new Array(10).fill(0).map(() => {
                    return query.$.pipe(first()).toPromise();
                })
            );
            const countAfter = query._execOverDatabaseCount;

            assert.strictEqual(countBefore, countAfter);

            c.database.close();
        });
        it('changing many documents in one write should not lead to many query result emits', async () => {
            const c = await humansCollection.create(0);

            const emitted: RxDocument<HumanDocumentType>[][] = [];
            const sub = c.find().$.subscribe(results => emitted.push(results));
            await waitUntil(() => emitted.length > 0);

            await c.bulkInsert(
                new Array(10).fill(0).map(() => schemaObjects.humanData())
            );
            await wait(isFastMode() ? 50 : 100);
            assert.ok(
                emitted.length <= 3,
                JSON.stringify(emitted.map(result => result.map(doc => doc.toJSON())), null, 4)
            );

            sub.unsubscribe();
            c.database.close();
        });
        it('doing insert after subscribe should end with the correct results', async () => {
            if (config.storage.name === 'foundationdb') {
                // TODO randomly fails in foundationdb
                return;
            }

            const c = await humansCollection.create(1,
                'human',
                true,
                true,
                getStorage('memory-long-query-delay').getStorage()
            );

            let result = [];

            c.find().$.subscribe(r => {
                result = r;
            });

            const insertLen = 150;
            for (let i = 0; i < insertLen; i++) {
                c.insert(schemaObjects.humanData());
            }

            await waitUntil(() => result.length === insertLen + 1);

            // should still have correct results after some time
            await wait(50);
            assert.strictEqual(result.length, insertLen + 1);

            c.database.close();
        });
    });
    describe('negative', () => {
        it('get no change when nothing happens', async () => {
            const c = await humansCollection.create(1);
            const query = c.find();
            let received = 0;
            const querySub = query.$.subscribe(() => {
                received++;
            });
            await AsyncTestUtil.waitUntil(() => received === 1);
            querySub.unsubscribe();
            c.database.close();
        });
    });
    describe('ISSUES', () => {
        // his test failed randomly, so we run it more often.
        new Array(isFastMode() ? 3 : 10)
            .fill(0).forEach(() => {
                it('#31 do not fire on doc-change when result-doc not affected ' + config.storage.name, async () => {
                    const docAmount = isFastMode() ? 2 : 10;
                    const c = await humansCollection.createAgeIndex(0);
                    const docsData = new Array(docAmount)
                        .fill(0)
                        .map((_x, idx) => {
                            const docData = schemaObjects.humanData();
                            docData.age = idx + 10;
                            return docData;
                        });
                    await c.bulkInsert(docsData);

                    // take only 9 of 10
                    const valuesAr: HumanDocumentType[][] = [];
                    const querySub = c
                        .find({
                            selector: {},
                            limit: docAmount - 1,
                            sort: [
                                { age: 'asc' }
                            ]
                        }).$.pipe(
                            filter(x => x !== null)
                        )
                        .subscribe(newV => valuesAr.push(newV.map(d => d.toJSON())));
                    await waitUntil(() => valuesAr.length === 1);

                    // get the last document that is not part of the previous query result
                    const lastDoc = await c
                        .findOne({
                            selector: {},
                            sort: [
                                { age: 'desc' }
                            ]
                        })
                        .exec(true);

                    // ensure the query is correct and the doc is really not in results.
                    const isDocInPrevResults = !!valuesAr[0].find(d => d.passportId === lastDoc.primary);
                    if (isDocInPrevResults) {
                        console.log(JSON.stringify(docsData, null, 4));
                        console.log(JSON.stringify(valuesAr[0], null, 4));
                        console.log(JSON.stringify(lastDoc.toJSON(), null, 4));
                        throw new Error('lastDoc (' + lastDoc.primary + ') was in previous results');
                    }

                    // edit+save doc
                    await promiseWait(20);
                    await lastDoc.incrementalPatch({ firstName: 'foobar' });
                    await promiseWait(100);

                    // query must not have emitted because an unrelated document got changed.
                    assert.strictEqual(valuesAr.length, 1);
                    querySub.unsubscribe();
                    c.database.remove();
                });
            });

        it('ISSUE: should have the document in DocCache when getting it from observe', async () => {
            if (!config.storage.hasMultiInstance) {
                return;
            }
            const name = randomToken(10);
            const c = await humansCollection.createPrimary(1, name);
            const c2 = await humansCollection.createPrimary(0, name);
            const doc = await c.findOne().exec(true);
            const docId = doc.primary;

            // should not be in cache
            assert.deepStrictEqual(c2._docCache.getLatestDocumentDataIfExists(docId), undefined);

            const results = [];
            const sub = c2.find().$.subscribe(docs => results.push(docs));
            await AsyncTestUtil.waitUntil(() => results.length >= 1);

            // should be in cache now
            assert.strictEqual((c2._docCache.getLatestDocumentData(docId) as any).passportId, docId);

            sub.unsubscribe();
            c.database.close();
            c2.database.close();
        });
        it('#138 : findOne().$ returns every doc if no id given', async () => {
            const col = await humansCollection.create(3);
            const streamed: any[] = [];
            const sub = col.findOne().$
                .pipe(
                    filter(doc => doc !== null)
                )
                .subscribe(doc => {
                    streamed.push(doc);
                });
            await AsyncTestUtil.waitUntil(() => streamed.length === 1);
            assert.strictEqual(streamed.length, 1);
            assert.ok(isRxDocument(streamed[0]));
            sub.unsubscribe();
            col.database.remove();
        });
        it('ISSUE emitted-order not correct when doing many incrementalUpserts', async () => {
            if (
                !config.storage.hasPersistence ||
                !config.storage.hasMultiInstance
            ) {
                return;
            }
            const crawlStateSchema = {
                version: 0,
                type: 'object',
                primaryKey: 'key',
                properties: {
                    key: {
                        type: 'string',
                        maxLength: 100
                    },
                    state: {
                        type: 'object'
                    }
                },
                required: ['state']
            };
            const name = randomToken(10);
            const db = await createRxDatabase({
                name,
                storage: config.storage.getStorage(),
                ignoreDuplicate: true
            });
            await db.addCollections({
                crawlstate: {
                    schema: crawlStateSchema
                }
            });
            const db2 = await createRxDatabase({
                name,
                storage: config.storage.getStorage(),
                ignoreDuplicate: true
            });
            await db2.addCollections({
                crawlstate: {
                    schema: crawlStateSchema
                }
            });

            const emitted: any[] = [];
            const sub = db.crawlstate
                .findOne('registry').$
                .pipe(
                    filter(doc => doc !== null),
                    map(doc => (doc as RxDocument).toJSON())
                ).subscribe(data => emitted.push(data));

            const emittedOwn = [];
            const sub2 = db2.crawlstate
                .findOne('registry').$
                .pipe(
                    filter(doc => doc !== null),
                    map(doc => (doc as RxDocument).toJSON())
                ).subscribe(data => emittedOwn.push(data));

            const baseData = {
                lastProvider: null,
                providers: 0,
                sync: false,
                other: {}
            };
            let count = 0;
            const getData = () => {
                const d2 = clone(baseData);
                d2.providers = count;
                count++;
                return d2;
            };

            await Promise.all(
                new Array(5)
                    .fill(0)
                    .map(() => ({
                        key: 'registry',
                        state: getData()
                    }))
                    .map(data => {
                        return db2.crawlstate.incrementalUpsert(data);
                    })
            );

            await AsyncTestUtil.waitUntil(() => emitted.length > 0);
            await AsyncTestUtil.waitUntil(() => {
                const lastEmitted = emitted[emitted.length - 1];
                return lastEmitted.state.providers === 4;
            }, undefined, 300);

            await Promise.all(
                new Array(5)
                    .fill(0)
                    .map(() => ({
                        key: 'registry',
                        state: getData()
                    }))
                    .map(data => db2.crawlstate.incrementalUpsert(data))
            );

            await AsyncTestUtil.waitUntil(() => {
                if (!emitted.length) return false;
                const lastEmitted = emitted[emitted.length - 1];
                return lastEmitted.state.providers === 9;
            });

            await AsyncTestUtil.waitUntil(() => emittedOwn.length === 10);

            const last = emitted[emitted.length - 1];
            assert.strictEqual(last.state.providers, 9);

            // on own collection, all events should have propagated
            assert.strictEqual(emittedOwn.length, 10);

            sub.unsubscribe();
            sub2.unsubscribe();
            db.close();
            db2.close();
        });
        it(
            '#749 RxQuery subscription returns null as first result when ran immediately after another subscription or exec()',
            async () => {
                const name = randomToken(10);
                const db = await createRxDatabase({
                    name,
                    storage: config.storage.getStorage(),
                    ignoreDuplicate: true
                });
                const collections = await db.addCollections({
                    humans: {
                        schema: schemas.human
                    }
                });
                const collection = collections.humans;

                await collection.insert(schemaObjects.humanData());

                const results: any[] = [];

                const subs1 = collection.find().$.subscribe(x => {
                    results.push(x);
                    subs1.unsubscribe();
                });

                const subs2 = collection.find().$.subscribe(x => {
                    results.push(x);
                    subs2.unsubscribe();
                });

                // Let's try with a different query
                collection
                    .find()
                    .sort('passportId')
                    .exec()
                    .then((x) => {
                        results.push(x);
                    });

                const subs3 = collection
                    .find()
                    .sort('passportId')
                    .$.subscribe(x => {
                        results.push(x);
                        subs3.unsubscribe();
                    });

                await AsyncTestUtil.waitUntil(() => results.length === 4);
                results.forEach(res => {
                    assert.strictEqual(res.length, 1);
                });

                db.remove();
            });
    });
});
