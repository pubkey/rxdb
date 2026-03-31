import assert from 'assert';
import clone from 'clone';
import config, { describeParallel } from './config.ts';


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
    addRxPlugin,
    ensureNotFalsy
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

            const c = await humansCollection.create(1);
            let result = [];
            c.insert(schemaObjects.humanData()); // do not await here!
            c.find().$.subscribe(r => {
                result = r;
            });

            await c.insert(schemaObjects.humanData());
            await waitUntil(() => result.length === 3);

            // should still have correct results after some time
            await wait(50);
            assert.strictEqual(result.length, 3);

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
        it('#7075 query results not correct if changes happen faster than the query updates', async () => {
            if (
                config.storage.name === 'sqlite-trial'
            ) {
                return;
            }
            const c = await humansCollection.create(0);
            let docSize = 0;

            let len = isFastMode() ? 100 : 3000;
            if (
                len > 100 &&
                [
                    'deno',
                    'dexie'
                ].find(slowName => config.storage.name.includes(slowName))
            ) {
                len = 100;
            }


            docSize += len;
            const docs = new Array(len).fill(0).map((_, i) => {
                const id = 'base_' + ((i + 1) + '').padStart(5, '0');
                return schemaObjects.humanData(id);
            });
            await c.bulkInsert(docs);

            let result: RxDocument<{
                firstName: string;
                lastName: string;
                passportId: string;
                age?: number | undefined;
            }, {}>[] = [];

            let done = false;
            let insertLen = 0;
            let addCount = 0;

            const query = c.find({ sort: [{ passportId: 'asc', lastName: 'desc', firstName: 'asc' }] });
            const sub = query.$.subscribe(r => {
                done = true;
                result = r;
            });

            (async () => {
                while (!done && insertLen < 10) {
                    await wait(2);
                    const useCount = addCount++;
                    const id = 'z_add_ ' + useCount;
                    c.insert(schemaObjects.humanData(id)).then(() => {
                    });
                    insertLen++;
                }
            })();


            await waitUntil(() => done);
            await waitUntil(() => {
                const should = insertLen + docSize;
                return result.length === should;
            });
            await wait(isFastMode() ? 0 : 50);
            assert.strictEqual(result.length, insertLen + docSize);

            // adding a new doc now should still work
            await c.insert(schemaObjects.humanData('last'));
            const endResult = await query.exec();
            assert.ok(endResult.find(d => d.primary === 'last'), 'must have last doc');

            sub.unsubscribe();
            c.database.close();
        });
        // his test failed randomly, so we run it more often.
        new Array(isFastMode() ? 1 : 5)
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
        it('observed query should update correctly when document is updated to no longer match selector', async () => {
            const c = await humansCollection.createAgeIndex(0);

            // Insert documents with specific ages
            await c.bulkInsert([
                schemaObjects.humanData('doc1', 30, 'Alice'),
                schemaObjects.humanData('doc2', 25, 'Bob'),
                schemaObjects.humanData('doc3', 15, 'Charlie'),
            ]);

            const emitted: HumanDocumentType[][] = [];
            const query = c.find({
                selector: { age: { $gt: 20 } },
                sort: [{ age: 'asc' }]
            });
            const sub = query.$.subscribe(results => {
                emitted.push(results.map(d => d.toJSON()));
            });

            // Wait for initial emission
            await waitUntil(() => emitted.length >= 1);
            assert.strictEqual(emitted[emitted.length - 1].length, 2);

            // Update doc2 so it no longer matches (age 25 -> 10)
            const doc2 = await c.findOne('doc2').exec(true);
            await doc2.incrementalPatch({ age: 10 });

            // Wait for the query to update
            await waitUntil(() => {
                const last = emitted[emitted.length - 1];
                return last.length === 1;
            });

            // Verify only doc1 remains
            const lastEmitted = emitted[emitted.length - 1];
            assert.strictEqual(lastEmitted.length, 1);
            assert.strictEqual(lastEmitted[0].passportId, 'doc1');

            sub.unsubscribe();
            c.database.close();
        });
        it('observed query should update correctly when document is updated to match selector', async () => {
            const c = await humansCollection.createAgeIndex(0);

            await c.bulkInsert([
                schemaObjects.humanData('doc1', 30, 'Alice'),
                schemaObjects.humanData('doc2', 10, 'Bob'),
            ]);

            const emitted: HumanDocumentType[][] = [];
            const query = c.find({
                selector: { age: { $gt: 20 } },
                sort: [{ age: 'asc' }]
            });
            const sub = query.$.subscribe(results => {
                emitted.push(results.map(d => d.toJSON()));
            });

            await waitUntil(() => emitted.length >= 1);
            assert.strictEqual(emitted[emitted.length - 1].length, 1);

            // Update doc2 so it now matches (age 10 -> 25)
            const doc2 = await c.findOne('doc2').exec(true);
            await doc2.incrementalPatch({ age: 25 });

            await waitUntil(() => {
                const last = emitted[emitted.length - 1];
                return last.length === 2;
            });

            const lastEmitted = emitted[emitted.length - 1];
            assert.strictEqual(lastEmitted.length, 2);
            // Should be sorted by age ascending
            assert.strictEqual(lastEmitted[0].passportId, 'doc2'); // age 25
            assert.strictEqual(lastEmitted[1].passportId, 'doc1'); // age 30

            sub.unsubscribe();
            c.database.close();
        });
        it('observed count query should update correctly on insert, update, and delete', async () => {
            const c = await humansCollection.createAgeIndex(0);

            // Insert initial documents
            await c.bulkInsert([
                schemaObjects.humanData('doc1', 30, 'Alice'),
                schemaObjects.humanData('doc2', 10, 'Bob'),
                schemaObjects.humanData('doc3', 25, 'Charlie'),
            ]);

            const countEmissions: number[] = [];
            const countQuery = c.count({
                selector: { age: { $gt: 20 } }
            });
            const sub = countQuery.$.subscribe(count => {
                countEmissions.push(count);
            });

            // Wait for initial count
            await waitUntil(() => countEmissions.length >= 1);
            assert.strictEqual(countEmissions[countEmissions.length - 1], 2); // doc1(30), doc3(25)

            // Insert a matching document
            await c.insert(schemaObjects.humanData('doc4', 35, 'Dave'));
            await waitUntil(() => countEmissions[countEmissions.length - 1] === 3);

            // Update doc2 so it now matches (age 10 -> 22)
            const doc2 = await c.findOne('doc2').exec(true);
            await doc2.incrementalPatch({ age: 22 });
            await waitUntil(() => countEmissions[countEmissions.length - 1] === 4);

            // Update doc3 so it no longer matches (age 25 -> 5)
            const doc3 = await c.findOne('doc3').exec(true);
            await doc3.incrementalPatch({ age: 5 });
            await waitUntil(() => countEmissions[countEmissions.length - 1] === 3);

            // Delete a matching document
            const doc1 = await c.findOne('doc1').exec(true);
            await doc1.remove();
            await waitUntil(() => countEmissions[countEmissions.length - 1] === 2);

            // Verify final count matches exec()
            const execCount = await c.count({ selector: { age: { $gt: 20 } } }).exec();
            assert.strictEqual(countEmissions[countEmissions.length - 1], execCount);

            sub.unsubscribe();
            c.database.close();
        });
        it('observed query with limit should correctly fill results when a matching doc is removed', async () => {
            const c = await humansCollection.createAgeIndex(0);

            // Insert 5 documents with specific ages
            await c.bulkInsert([
                schemaObjects.humanData('a', 10, 'Alice'),
                schemaObjects.humanData('b', 20, 'Bob'),
                schemaObjects.humanData('c', 30, 'Charlie'),
                schemaObjects.humanData('d', 40, 'Dave'),
                schemaObjects.humanData('e', 50, 'Eve'),
            ]);

            const emitted: HumanDocumentType[][] = [];
            const query = c.find({
                selector: {},
                sort: [{ age: 'asc' }],
                limit: 3
            });
            const sub = query.$.subscribe(results => {
                emitted.push(results.map(d => d.toJSON()));
            });

            // Wait for initial emission: [a(10), b(20), c(30)]
            await waitUntil(() => emitted.length >= 1);
            assert.strictEqual(emitted[emitted.length - 1].length, 3);
            assert.strictEqual(emitted[emitted.length - 1][0].passportId, 'a');

            // Delete doc 'a' (age 10)
            const docA = await c.findOne('a').exec(true);
            await docA.remove();

            // After deletion, result should be [b(20), c(30), d(40)] - d should fill the gap
            await waitUntil(() => {
                const last = emitted[emitted.length - 1];
                return last.length === 3 && last[0].passportId === 'b';
            });

            const lastEmitted = emitted[emitted.length - 1];
            assert.strictEqual(lastEmitted.length, 3);
            assert.strictEqual(lastEmitted[0].passportId, 'b');
            assert.strictEqual(lastEmitted[1].passportId, 'c');
            assert.strictEqual(lastEmitted[2].passportId, 'd');

            sub.unsubscribe();
            c.database.close();
        });
        it('observed query with skip should correctly update when documents are inserted', async () => {
            const c = await humansCollection.createAgeIndex(0);

            // Insert initial documents with specific ages
            await c.bulkInsert([
                schemaObjects.humanData('a', 10, 'Alice'),
                schemaObjects.humanData('b', 20, 'Bob'),
                schemaObjects.humanData('c', 30, 'Charlie'),
                schemaObjects.humanData('d', 40, 'Dave'),
            ]);

            const emitted: HumanDocumentType[][] = [];
            const query = c.find({
                selector: {},
                sort: [{ age: 'asc' }],
                skip: 1,
                limit: 2
            });
            const sub = query.$.subscribe(results => {
                emitted.push(results.map(d => d.toJSON()));
            });

            // Wait for initial emission: skip a(10), take [b(20), c(30)]
            await waitUntil(() => emitted.length >= 1);
            let lastEmitted = emitted[emitted.length - 1];
            assert.strictEqual(lastEmitted.length, 2);
            assert.strictEqual(lastEmitted[0].passportId, 'b');
            assert.strictEqual(lastEmitted[1].passportId, 'c');

            // Insert a new doc with age 5 (sorts before all existing)
            await c.insert(schemaObjects.humanData('z', 5, 'Zoe'));

            // After insertion of z(5), sorted order is: z(5), a(10), b(20), c(30), d(40)
            // With skip 1, limit 2: [a(10), b(20)]
            await waitUntil(() => {
                const last = emitted[emitted.length - 1];
                return last[0].passportId === 'a';
            });

            lastEmitted = emitted[emitted.length - 1];
            assert.strictEqual(lastEmitted.length, 2, 'should have 2 results after insert');
            assert.strictEqual(lastEmitted[0].passportId, 'a');
            assert.strictEqual(lastEmitted[1].passportId, 'b');

            // Verify against exec()
            const execResult = await c.find({
                selector: {},
                sort: [{ age: 'asc' }],
                skip: 1,
                limit: 2
            }).exec();
            assert.strictEqual(execResult.length, 2);
            assert.strictEqual(execResult[0].primary, 'a');
            assert.strictEqual(execResult[1].primary, 'b');

            sub.unsubscribe();
            c.database.close();
        });
        it('docsDataMap should not be mutated by calculateNewResults when event-reduce partially processes events', async () => {
            /**
             * This test verifies that the cached docsDataMap on the query result
             * is not mutated by the event-reduce algorithm. The calculateNewResults
             * function should use a copy of the map, not the original.
             * If the map is mutated and a runFullQueryAgain occurs, subsequent
             * event-reduce calls could produce incorrect results.
             */
            const c = await humansCollection.createAgeIndex(0);

            // Insert initial documents
            await c.bulkInsert([
                schemaObjects.humanData('doc1', 30, 'Alice'),
                schemaObjects.humanData('doc2', 25, 'Bob'),
            ]);

            // Execute the query to initialize results
            const query = c.find({
                selector: { age: { $gt: 20 } },
                sort: [{ age: 'asc' }]
            });

            const emitted: HumanDocumentType[][] = [];
            const sub = query.$.subscribe(results => {
                emitted.push(results.map(d => d.toJSON()));
            });
            await waitUntil(() => emitted.length >= 1);
            assert.strictEqual(emitted[emitted.length - 1].length, 2);

            // Get the initial docsDataMap size
            const initialMapSize = ensureNotFalsy(query._result).docsDataMap.size;
            assert.strictEqual(initialMapSize, 2);

            // Insert a new matching doc
            await c.insert(schemaObjects.humanData('doc3', 35, 'Charlie'));
            await waitUntil(() => emitted[emitted.length - 1].length === 3);

            // Insert and remove in quick succession to create a scenario where
            // event-reduce might partially process events
            const doc4 = await c.insert(schemaObjects.humanData('doc4', 40, 'Dave'));
            await waitUntil(() => emitted[emitted.length - 1].length === 4);

            await doc4.remove();
            await waitUntil(() => emitted[emitted.length - 1].length === 3);

            // Verify the final state matches exec()
            const execResult = await query.exec();
            assert.strictEqual(execResult.length, 3);
            const observedResult = emitted[emitted.length - 1];
            assert.strictEqual(observedResult.length, 3);

            // The observed passportIds should match the exec() passportIds
            const observedIds = observedResult.map(d => d.passportId).sort();
            const execIds = execResult.map(d => d.primary).sort();
            assert.deepStrictEqual(observedIds, execIds);

            // Verify the docsDataMap matches the actual results
            const currentMapSize = ensureNotFalsy(query._result).docsDataMap.size;
            const currentDocsCount = ensureNotFalsy(query._result).docsData.length;
            assert.strictEqual(
                currentMapSize,
                currentDocsCount,
                'docsDataMap size (' + currentMapSize + ') should equal docsData length (' + currentDocsCount + '). ' +
                'If docsDataMap has extra entries, it means calculateNewResults mutated the cached map.'
            );

            sub.unsubscribe();
            c.database.close();
        });
    });
});
