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
    ensureNotFalsy
} from '../../plugins/core/index.mjs';

import {
    wrappedKeyCompressionStorage
} from '../../plugins/key-compression/index.mjs';

import config from './config.ts';

describe('event-reduce.test.js', () => {
    async function createCollection(
        eventReduce: boolean,
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
        const collectionName = eventReduce ? 'with-event-reduce' : 'without-event-reduce';
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
    it('event-reduce should not mutate the cached docsDataMap of the query result', async () => {
        /**
         * This test verifies that the event-reduce algorithm does not mutate
         * the cached docsDataMap on the current query result.
         * Previously, the map was passed by reference to the event-reduce
         * runAction functions, which modify it in-place (adding/removing entries).
         * This could cause the cached map to accumulate stale entries,
         * leading to incorrect behavior in subsequent event-reduce calls.
         * Specifically, insertAtSortPosition checks keyDocumentMap.has(docId)
         * and would incorrectly skip insertions for documents that were
         * in the corrupted map but not in the actual results.
         */
        const col = await createCollection(true);

        // Insert initial documents
        await col.bulkInsert([
            {
                passportId: 'doc-a',
                firstName: 'Alice',
                lastName: 'Smith',
                age: 30
            },
            {
                passportId: 'doc-b',
                firstName: 'Bob',
                lastName: 'Jones',
                age: 25
            }
        ]);

        // Create and execute a query to populate _result
        const query = col.find({
            selector: { age: { $gt: 20 } },
            sort: [{ age: 'asc' }]
        });
        await query.exec();

        // Verify initial state
        const resultBefore = ensureNotFalsy(query._result);
        assert.strictEqual(resultBefore.docsData.length, 2);
        assert.strictEqual(resultBefore.docsDataMap.size, 2);

        // Capture the docsDataMap before any mutation
        const mapSizeBefore = resultBefore.docsDataMap.size;

        // Now insert a new matching document which triggers event-reduce
        await col.insert({
            passportId: 'doc-c',
            firstName: 'Charlie',
            lastName: 'Brown',
            age: 28
        });

        // Wait for the query to update via event-reduce
        await query.exec();

        // The NEW result should have 3 documents
        const resultAfter = ensureNotFalsy(query._result);
        assert.strictEqual(resultAfter.docsData.length, 3);
        assert.strictEqual(resultAfter.docsDataMap.size, 3);

        // The OLD result's docsDataMap should NOT have been mutated
        // (it should still have exactly 2 entries, not 3)
        assert.strictEqual(
            resultBefore.docsDataMap.size,
            mapSizeBefore,
            'The cached docsDataMap on the previous result was mutated by event-reduce! ' +
            'Expected size ' + mapSizeBefore + ' but got ' + resultBefore.docsDataMap.size + '. ' +
            'calculateNewResults should copy the map before passing it to runAction.'
        );

        col.database.close();
    });
});
