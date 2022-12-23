import assert from 'assert';
import { clone } from 'async-test-util';

import * as schemas from '../helper/schemas';
import * as schemaObjects from '../helper/schema-objects';
import {
    createRxDatabase,
    randomCouchString,
    RxCollection,
    RxDocument,
    MangoQuery
} from '../../';

import {
    wrappedKeyCompressionStorage
} from '../../plugins/key-compression';



import config from './config';


describe('event-reduce.test.js', () => {
    async function createCollection(
        eventReduce: boolean,
        storage = config.storage.getStorage(),
        keyCompression = false
    ): Promise<RxCollection> {
        const db = await createRxDatabase({
            name: randomCouchString(10),
            storage,
            eventReduce
        });
        const schema = clone(schemas.primaryHuman);
        schema.keyCompression = keyCompression;
        schema.indexes = ['age', 'lastName', 'firstName'];
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
    async function testQueryResultForEqualness<RxDocType>(
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

        await testQueryResultForEqualness(
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

        await testQueryResultForEqualness(
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

        await testQueryResultForEqualness(
            colNoEventReduce,
            colWithEventReduce,
            queries
        );

        colNoEventReduce.database.destroy();
        colWithEventReduce.database.destroy();
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

        await testQueryResultForEqualness(
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
        await testQueryResultForEqualness(
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

        await testQueryResultForEqualness(
            colNoEventReduce,
            colWithEventReduce,
            queries
        );

        colNoEventReduce.database.destroy();
        colWithEventReduce.database.destroy();
    });

    /**
     * This test randomly failed, so we run it more often.
     * It generates random data writes and checks if the query result
     * is the same as the result calculated by event-reduce.
     */
    new Array(config.isFastMode() ? 1 : 5).fill(0).forEach(() => {
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
                    },
                    // TODO it should also work without the sorting
                    // because RxDB should add predictable sort if primary not used in sorting
                    sort: [{
                        passportId: 'asc'
                    }]
                }

            ];

            await testQueryResultForEqualness(
                colNoEventReduce,
                colWithEventReduce,
                queries
            );

            // add some
            const docsData = new Array(3).fill(0).map(() => schemaObjects.human());
            docsData.push(schemaObjects.human('age-is-20', 20));
            docsData.push(schemaObjects.human('age-is-80', 80));
            await colNoEventReduce.bulkInsert(docsData);
            await colWithEventReduce.bulkInsert(docsData);

            await testQueryResultForEqualness(
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

            await testQueryResultForEqualness(
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

            await testQueryResultForEqualness(
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

            await testQueryResultForEqualness(
                colNoEventReduce,
                colWithEventReduce,
                queries
            );

            // clean up
            colNoEventReduce.database.destroy();
            colWithEventReduce.database.destroy();
        });
    });
});
