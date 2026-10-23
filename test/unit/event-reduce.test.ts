import assert from 'assert';
import { clone } from 'async-test-util';

import {
    schemaObjects,
    schemas,
    isFastMode
} from '../../plugins/test-utils/index.mjs';
import {
    createRxDatabase,
    randomToken,
    RxCollection,
    RxDocument,
    MangoQuery,
    rxChangeEventToEventReduceChangeEvent,
    RxStorageChangeEvent,
    RxEventReduceOptions,
    defaultResultWindowBuffer
} from '../../plugins/core/index.mjs';

import {
    wrappedKeyCompressionStorage
} from '../../plugins/key-compression/index.mjs';

import config from './config.ts';

describe('event-reduce.test.js', () => {
    async function createCollection(
        eventReduce: boolean | RxEventReduceOptions,
        storage = config.storage.getStorage(),
        keyCompression = false
    ): Promise<RxCollection> {
        const db = await createRxDatabase({
            name: randomToken(10),
            storage,
            eventReduce
        });
        const schema = clone(schemas.primaryHuman);
        schema.keyCompression = keyCompression;
        schema.indexes = ['age', 'lastName', 'firstName'];
        (schema as any).required.push('age');
        const collectionName = eventReduce !== false ? 'with-event-reduce' : 'without-event-reduce';
        const collections = await db.addCollections({
            [collectionName]: {
                schema
            }
        });
        return collections[collectionName];
    }
    function ensureResultsEqual<RxDocType>(
        res1: RxDocument<RxDocType>[],
        res2: RxDocument<RxDocType>[]
    ) {
        const keys1 = res1.map(d => d.primary);
        const keys2 = res2.map(d => d.primary);

        try {
            assert.deepStrictEqual(keys1, keys2);
        } catch (err) {
            console.error('ensureResultsEqual() keys not equal');
            console.dir(keys1);
            console.dir(keys2);
            throw err;
        }
        assert.deepStrictEqual(
            res1.map(d => d.toJSON()),
            res2.map(d => d.toJSON())
        );
    }
    async function testQueryResultForEquality<RxDocType>(
        col1: RxCollection<RxDocType, {}, {}>,
        col2: RxCollection<RxDocType, {}, {}>,
        queries: MangoQuery<RxDocType>[]
    ) {
        for (const query of queries) {
            const res1 = await col1.find(query).exec();
            const res2 = await col2.find(query).exec();
            try {
                ensureResultsEqual(res1, res2);
            } catch (err) {
                console.error('NOT EQUAL FOR QUERY:');
                console.dir(query);
                console.dir(col1.find(query).getPreparedQuery());
                throw err;
            }
        }
    }

    it('should have the same results on given data', async () => {
        const queries: MangoQuery<any>[] = [
            { selector: { age: { '$gt': 20 } }, sort: [{ passportId: 'asc' }] }
        ];
        const writeData = [
            {
                passportId: 's90j6hhznefj',
                firstName: 'Freeman',
                lastName: 'Rogahn',
                age: 25
            },
            {
                passportId: '6eu7byz49iq9',
                firstName: 'Eugenia',
                lastName: 'Dare',
                age: 16
            }
        ];

        const colNoEventReduce = await createCollection(false);
        const colWithEventReduce = await createCollection(true);

        await testQueryResultForEquality(
            colNoEventReduce,
            colWithEventReduce,
            queries
        );

        await Promise.all(
            writeData
                .map(async (docData) => {
                    await colNoEventReduce.insert(docData);
                    await colWithEventReduce.insert(docData);
                })
        );

        await testQueryResultForEquality(
            colNoEventReduce,
            colWithEventReduce,
            queries
        );

        // update one so it must now be in query results
        await Promise.all(
            [
                colNoEventReduce,
                colWithEventReduce
            ].map(async (col) => {
                const docToUpdate = await col
                    .findOne('6eu7byz49iq9')
                    .exec(true);
                await docToUpdate.incrementalPatch({ age: 50 });
            })
        );

        await testQueryResultForEquality(
            colNoEventReduce,
            colWithEventReduce,
            queries
        );

        colNoEventReduce.database.close();
        colWithEventReduce.database.close();
    });

    it('should work with the key-compression plugin', async () => {
        const storage = wrappedKeyCompressionStorage({
            storage: config.storage.getStorage()
        });


        const queries: MangoQuery<any>[] = [
            { selector: { age: { '$gt': 10 } }, sort: [{ passportId: 'asc' }] },
            { selector: { firstName: { $eq: 'Freeman' } }, sort: [{ passportId: 'asc' }] },
            {
                selector: {},
                sort: [{ firstName: 'asc' }]
            }
        ];


        const colNoEventReduce = await createCollection(false, storage, true);
        const colWithEventReduce = await createCollection(true, storage, true);

        await testQueryResultForEquality(
            colNoEventReduce,
            colWithEventReduce,
            queries
        );

        const writeData = [
            {
                passportId: 's90j6hhznefj-bbbbb',
                firstName: 'bbbbb',
                lastName: 'Rogahn',
                age: 25
            },
            {
                passportId: '6eu7byz49iq9-aaaa',
                firstName: 'aaaaa',
                lastName: 'Dare',
                age: 16
            }
        ];
        await Promise.all(
            writeData
                .map(async (docData) => {
                    await colNoEventReduce.insert(docData);
                    await colWithEventReduce.insert(docData);
                })
        );
        await testQueryResultForEquality(
            colNoEventReduce,
            colWithEventReduce,
            queries
        );


        const insertForSortTest = {
            passportId: 'for-sort-00000',
            firstName: '00000',
            lastName: 'Rogahn2',
            age: 26
        };
        await colNoEventReduce.insert(insertForSortTest);
        await colWithEventReduce.insert(insertForSortTest);

        await testQueryResultForEquality(
            colNoEventReduce,
            colWithEventReduce,
            queries
        );

        colNoEventReduce.database.close();
        colWithEventReduce.database.close();
    });

    /**
     * This test randomly failed, so we run it more often.
     * It generates random data writes and checks if the query result
     * is the same as the result calculated by event-reduce.
     */
    new Array(isFastMode() ? 1 : 5).fill(0).forEach(() => {
        it('random data: should have the same results as without event-reduce', async () => {
            const colNoEventReduce = await createCollection(false);
            const colWithEventReduce = await createCollection(true);

            const queries: MangoQuery[] = [
                {
                    selector: {},
                    sort: [{
                        passportId: 'asc'
                    }]
                },
                {
                    selector: {
                        age: {
                            $gt: 20,
                            $lt: 80
                        }
                    }
                }

            ];

            await testQueryResultForEquality(
                colNoEventReduce,
                colWithEventReduce,
                queries
            );

            // add some
            const docsData = new Array(3).fill(0).map(() => schemaObjects.humanData());
            docsData.push(schemaObjects.humanData('age-is-20', 20));
            docsData.push(schemaObjects.humanData('age-is-80', 80));
            await colNoEventReduce.bulkInsert(docsData);
            await colWithEventReduce.bulkInsert(docsData);

            await testQueryResultForEquality(
                colNoEventReduce,
                colWithEventReduce,
                queries
            );

            // update one
            await Promise.all(
                [
                    colNoEventReduce,
                    colWithEventReduce
                ].map(async (col) => {
                    const docToUpdate = await col
                        .findOne()
                        .sort('lastName')
                        .exec(true);
                    await docToUpdate.incrementalPatch({ age: 50 });
                })
            );

            await testQueryResultForEquality(
                colNoEventReduce,
                colWithEventReduce,
                queries
            );

            // remove one
            await Promise.all(
                [
                    colNoEventReduce,
                    colWithEventReduce
                ].map(async (col) => {
                    const doc = await col
                        .findOne()
                        .sort('age')
                        .exec(true);
                    await doc.remove();
                })
            );

            await testQueryResultForEquality(
                colNoEventReduce,
                colWithEventReduce,
                queries
            );

            // remove another one
            await Promise.all(
                [
                    colNoEventReduce,
                    colWithEventReduce
                ].map(async (col) => {
                    const doc = await col
                        .findOne()
                        .sort('age')
                        .exec(true);
                    await doc.remove();
                })
            );

            await testQueryResultForEquality(
                colNoEventReduce,
                colWithEventReduce,
                queries
            );

            // clean up
            colNoEventReduce.database.close();
            colWithEventReduce.database.close();
        });
    });
    it('should show re-inserted documents after insert-delete cycle', async () => {
        /**
         * This test reproduces a bug where event-reduce's calculateNewResults
         * mutated the cached docsDataMap on the query result object.
         *
         * The scenario:
         * 1. A query with limit caches results [doc-a, doc-b].
         * 2. Between two exec() calls, doc-c is inserted then deleted.
         *    Event-reduce processes INSERT (adds doc-c to the cached map via
         *    insertAtSortPosition), then DELETE triggers runFullQueryAgain.
         * 3. Full re-exec returns [doc-a, doc-b] (same as before), so the old
         *    result object is reused, keeping the corrupted map that still has doc-c.
         * 4. doc-c is inserted again. Event-reduce calls insertAtSortPosition,
         *    which checks keyDocumentMap.has('doc-c') and finds it in the
         *    corrupted map, so it skips the insertion.
         * 5. The query returns [doc-a, doc-b] instead of [doc-a, doc-c, doc-b].
         */
        const col = await createCollection(true);

        // Insert initial documents
        await col.bulkInsert([
            {
                passportId: 'doc-a',
                firstName: 'Alice',
                lastName: 'Smith',
                age: 25
            },
            {
                passportId: 'doc-b',
                firstName: 'Bob',
                lastName: 'Jones',
                age: 30
            }
        ]);

        // Create a query with limit so that delete-after-insert triggers runFullQueryAgain
        const query = col.find({
            selector: { age: { $gt: 20 } },
            sort: [{ age: 'asc' }],
            limit: 3
        });

        // Execute to cache initial results
        const initialResults = await query.exec();
        assert.strictEqual(initialResults.length, 2);
        assert.strictEqual(initialResults[0].primary, 'doc-a');
        assert.strictEqual(initialResults[1].primary, 'doc-b');

        // Insert then delete doc-c WITHOUT calling exec() in between,
        // so both events are batched in one calculateNewResults call.
        // Event 1 (INSERT doc-c): handled by insertAtSortPosition (corrupts cached map)
        // Event 2 (DELETE doc-c): triggers runFullQueryAgain (limit reached after insert)
        const docC = await col.insert({
            passportId: 'doc-c',
            firstName: 'Charlie',
            lastName: 'Brown',
            age: 28
        });
        await docC.remove();

        // Process the batched events: event-reduce fails, full re-exec returns
        // [doc-a, doc-b] (same as before), so old result with corrupted map is reused.
        const afterDeleteResults = await query.exec();
        assert.strictEqual(afterDeleteResults.length, 2);

        // Now re-insert doc-c. Without the fix, insertAtSortPosition would
        // check the corrupted map, find 'doc-c' already present, and skip insertion.
        await col.insert({
            passportId: 'doc-c',
            firstName: 'Charlie',
            lastName: 'Brown',
            age: 28
        });

        const finalResults = await query.exec();
        assert.strictEqual(
            finalResults.length,
            3,
            'doc-c should appear in query results after re-insertion. ' +
            'Got ' + finalResults.length + ' results: [' +
            finalResults.map(d => d.primary).join(', ') + ']. ' +
            'If doc-c is missing, calculateNewResults likely mutated the cached docsDataMap.'
        );
        assert.strictEqual(finalResults[0].primary, 'doc-a');
        assert.strictEqual(finalResults[1].primary, 'doc-c');
        assert.strictEqual(finalResults[2].primary, 'doc-b');

        col.database.close();
    });
    it('should throw in dev-mode on UPDATE events without previousDocumentData', () => {
        const documentData: any = {
            passportId: 'foobar',
            _deleted: false,
            _attachments: {},
            _rev: '2-aaa',
            _meta: { lwt: 1000 }
        };
        const event: RxStorageChangeEvent<any> = {
            operation: 'UPDATE',
            documentId: 'foobar',
            documentData,
            previousDocumentData: undefined as any
        };
        assert.throws(
            () => rxChangeEventToEventReduceChangeEvent(event),
            (err: any) => err.code === 'CE1'
        );

        const previousDocumentData = Object.assign({}, documentData, { _rev: '1-aaa' });
        const reduceEvent = rxChangeEventToEventReduceChangeEvent(
            Object.assign({}, event, { previousDocumentData })
        );
        assert.strictEqual(reduceEvent?.previous, previousDocumentData);
    });
    describe('result window buffer', () => {
        it('should by default buffer about log2(limit), growing faster around limit 400, at most 30', () => {
            const expected: [number, number][] = [
                [1, 0],
                [2, 1],
                [3, 1],
                [4, 2],
                [10, 3],
                [20, 4],
                [100, 7],
                [500, 20],
                [1000, 26],
                [2711, 29],
                [2712, 30],
                [100000, 30]
            ];
            expected.forEach(([limit, size]) => {
                assert.deepStrictEqual(
                    defaultResultWindowBuffer({ selector: {}, sort: [], skip: 10, limit }),
                    { skip: size, limit: size },
                    'limit ' + limit
                );
            });
            // no limit, no buffer
            assert.deepStrictEqual(defaultResultWindowBuffer({ selector: {}, sort: [], skip: 10 }), { skip: 0, limit: 0 });
        });
        it('should throw when resultWindowBuffer returns a negative size', async () => {
            const col = await createCollection({
                resultWindowBuffer: () => ({ skip: 0, limit: -1 })
            });
            await assert.rejects(
                () => col.find({ selector: {}, limit: 3 }).exec(),
                /RWB_SIZE/
            );
            col.database.close();
        });
        it('should not run the query again when a visible document is removed', async () => {
            const col = await createCollection(true);
            await col.bulkInsert(new Array(10).fill(0).map((_v, i) => schemaObjects.humanData('doc-' + i, 20 + i)));
            const query = col.find({
                selector: {},
                sort: [{ age: 'asc' }],
                limit: 3
            });
            // the default buffer for limit 3 has 1 document after the window
            const results = await query.exec();
            assert.deepStrictEqual(results.map(d => d.primary), ['doc-0', 'doc-1', 'doc-2']);
            const execCountBefore = query._execOverDatabaseCount;

            await results[0].remove();
            const resultsAfter = await query.exec();
            assert.deepStrictEqual(resultsAfter.map(d => d.primary), ['doc-1', 'doc-2', 'doc-3']);
            assert.strictEqual(query._execOverDatabaseCount, execCountBefore);

            // the buffer is used up, so the next removal must run the query again
            await resultsAfter[0].remove();
            const resultsAfter2 = await query.exec();
            assert.deepStrictEqual(resultsAfter2.map(d => d.primary), ['doc-2', 'doc-3', 'doc-4']);
            assert.strictEqual(query._execOverDatabaseCount, execCountBefore + 1);

            col.database.close();
        });
        new Array(isFastMode() ? 1 : 5).fill(0).forEach(() => {
            it('random writes: should have the same results as without event-reduce', async () => {
                const colNoEventReduce = await createCollection(false);
                const colWithBuffer = await createCollection({
                    resultWindowBuffer: (query) => ({
                        skip: query.skip > 0 ? 3 : 0,
                        limit: query.limit ? 3 : 0
                    })
                });
                const queries: MangoQuery[] = [
                    { selector: {}, sort: [{ age: 'asc' }], limit: 5 },
                    { selector: {}, sort: [{ age: 'desc' }], skip: 3, limit: 4 },
                    { selector: { age: { $gt: 30 } }, sort: [{ lastName: 'asc' }], skip: 2 },
                    { selector: { age: { $lt: 60 } }, sort: [{ age: 'asc' }], limit: 1 }
                ];
                // subscribe so the query instances stay in the query cache and keep their buffers
                const subs = queries.map(query => colWithBuffer.find(query).$.subscribe());

                const initialDocs = new Array(15).fill(0).map(() => schemaObjects.humanData());
                await colNoEventReduce.bulkInsert(initialDocs);
                await colWithBuffer.bulkInsert(initialDocs);
                await testQueryResultForEquality(colNoEventReduce, colWithBuffer, queries);

                for (let i = 0; i < (isFastMode() ? 20 : 60); i++) {
                    const allDocs = await colNoEventReduce.find({ sort: [{ passportId: 'asc' }] }).exec();
                    const random = Math.random();
                    if (allDocs.length === 0 || random < 0.3) {
                        const docData = schemaObjects.humanData();
                        await colNoEventReduce.insert(docData);
                        await colWithBuffer.insert(docData);
                    } else {
                        const id = allDocs[Math.floor(Math.random() * allDocs.length)].primary;
                        if (random < 0.7) {
                            const age = Math.floor(Math.random() * 100);
                            await Promise.all([colNoEventReduce, colWithBuffer].map(async (col) => {
                                const doc = await col.findOne(id).exec(true);
                                await doc.incrementalPatch({ age });
                            }));
                        } else {
                            await Promise.all([colNoEventReduce, colWithBuffer].map(async (col) => {
                                const doc = await col.findOne(id).exec(true);
                                await doc.remove();
                            }));
                        }
                    }
                    await testQueryResultForEquality(colNoEventReduce, colWithBuffer, queries);
                }

                subs.forEach(sub => sub.unsubscribe());
                colNoEventReduce.database.close();
                colWithBuffer.database.close();
            });
        });
    });
});
