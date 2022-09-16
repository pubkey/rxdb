import assert from 'assert';
import { clone } from 'async-test-util';

import * as schemas from '../helper/schemas';
import * as schemaObjects from '../helper/schema-objects';
import {
    createRxDatabase,
    randomCouchString,
    RxCollection,
    RxDocument,
    MangoQuery,
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
        schema.indexes = ['age', 'lastName'];
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
        assert.deepStrictEqual(
            res1.map(d => d.primary),
            res2.map(d => d.primary)
        );
        assert.deepStrictEqual(
            res1.map(d => d.toJSON()),
            res2.map(d => d.toJSON())
        );
    }
    async function testQueryResultForEqualness<RxDocType>(
        col1: RxCollection<RxDocType>,
        col2: RxCollection<RxDocType>,
        queries: MangoQuery<RxDocType>[]
    ) {
        await Promise.all(
            queries.map(async (query) => {
                const res1 = await col1.find(query).exec();
                const res2 = await col2.find(query).exec();
                ensureResultsEqual(res1, res2);
            })
        );
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
                await docToUpdate.atomicPatch({ age: 50 });
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
            { selector: { firstName: { $eq: 'Freeman' } }, sort: [{ passportId: 'asc' }] }
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
                            $gt: 20
                        }
                    },
                    // TODO it should also work without the sorting
                    // because RxDB should add predicatble sort if primary not used in sorting
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
            await Promise.all(
                new Array(3)
                    .fill(0)
                    .map(async () => {
                        const doc = schemaObjects.human();
                        await colNoEventReduce.insert(doc);
                        await colWithEventReduce.insert(doc);
                    })
            );

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
                    await docToUpdate.atomicPatch({ age: 50 });
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
