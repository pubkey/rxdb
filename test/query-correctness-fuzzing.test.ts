import {
    randomToken,
    RxJsonSchema,
    fillWithDefaultSettings,
    now,
    createRevision,
    prepareQuery,
    ensureNotFalsy,
    normalizeMangoQuery
} from '../plugins/core/index.mjs';
import * as assert from 'assert';
import config from './unit/config.ts';
import {
    randomOfArray
} from 'event-reduce-js';
import {
    Human,
    randomQuery,
    getRandomChangeEvents,
    mingoCollectionCreator,
    applyChangeEvent
} from 'event-reduce-js/truth-table-generator';
import { randomNumber } from 'async-test-util';


function trueByChance(chance: number) {
    return Math.random() < chance;
}

/**
 * Creates random writes, indexes and queries and tests if the results are correct.
 */
describe('query-correctness-fuzzing.test.ts', () => {
    it('init storage', async () => {
        if (config.storage.init) {
            await config.storage.init();
        }
    });
    it('run tests', async function () {
        this.timeout(1000 * 1000000);

        const runsPerInstance = 5;
        const eventsAmount = 30;
        const queriesAmount = 30;


        let totalRuns = 0;
        while (true) {
            totalRuns++;
            console.log('-----------NEW RUN #' + totalRuns);
            const indexes = [
                ['_id'],
                ['name', 'gender', 'age'],
                ['gender', 'age', 'name'],
                ['age', 'name', 'gender'],
                ['gender', 'age'],
                ['name', 'gender']
            ] as const;
            const sorts = [
                [{ '_id': 'asc' }],
                [{ 'gender': 'asc' }, { '_id': 'asc' }],
                [{ 'name': 'asc' }, { '_id': 'asc' }],
                [{ 'age': 'asc' }, { '_id': 'asc' }],
                [{ 'gender': 'asc' }, { 'name': 'asc' }, { '_id': 'asc' }],
                [{ 'name': 'asc' }, { 'gender': 'asc' }, { '_id': 'asc' }],
                [{ 'gender': 'asc' }, { 'age': 'asc' }, { '_id': 'asc' }],
                [{ 'age': 'asc' }, { 'name': 'asc' }, { '_id': 'asc' }],
                [{ 'age': 'asc' }, { 'gender': 'asc' }, { 'name': 'asc' }, { '_id': 'asc' }],
            ];
            const schemaPlain: RxJsonSchema<Human> = {
                primaryKey: '_id',
                type: 'object',
                version: 0,
                properties: {
                    _id: {
                        type: 'string',
                        maxLength: 20
                    },
                    name: {
                        type: 'string',
                        maxLength: 20
                    },
                    gender: {
                        type: 'string',
                        enum: ['f', 'm', 'x'],
                        maxLength: 1
                    },
                    age: {
                        type: 'number',
                        minimum: 0,
                        maximum: 100,
                        multipleOf: 1
                    }
                },
                indexes
            };
            const schema = fillWithDefaultSettings(schemaPlain);

            const collectionName = randomToken(10);
            const databaseName = randomToken(10);

            const openStorageInstance = () => {
                return config.storage.getStorage().createStorageInstance({
                    collectionName,
                    databaseName,
                    databaseInstanceToken: randomToken(10),
                    multiInstance: false,
                    devMode: false,
                    options: {},
                    schema
                });
            };

            let storageInstance = await openStorageInstance();
            const collection = mingoCollectionCreator();


            let runs = 0;
            while (runs < runsPerInstance) {
                runs++;

                const procedure = getRandomChangeEvents(eventsAmount);

                for (const changeEvent of procedure) {
                    applyChangeEvent(
                        collection,
                        changeEvent
                    );
                    const docs = await storageInstance.findDocumentsById([changeEvent.id], true);
                    const previous = docs[0];
                    const nextRev = createRevision(randomToken(10), previous);

                    if (changeEvent.operation === 'DELETE') {
                        const writeResult = await storageInstance.bulkWrite([{
                            previous: previous,
                            document: Object.assign({}, changeEvent.previous, {
                                _deleted: true,
                                _rev: nextRev,
                                _meta: {
                                    lwt: now()
                                },
                                _attachments: {}
                            })
                        }], 'randomevent-delete');
                        assert.deepStrictEqual(writeResult.error, []);
                    } else {
                        const writeResult = await storageInstance.bulkWrite([{
                            previous: previous,
                            document: Object.assign({}, changeEvent.doc, {
                                _deleted: false,
                                _rev: nextRev,
                                _meta: {
                                    lwt: now()
                                },
                                _attachments: {}
                            })
                        }], 'randomevent');
                        assert.deepStrictEqual(writeResult.error, []);
                    }

                    /**
                     * If the storage has persistence,
                     * close and open it randomly and check again for the correctness.
                     * Also randomly run the cleanup
                     */
                    if (config.storage.hasPersistence) {
                        if (trueByChance(0.005)) {
                            await storageInstance.close();
                            storageInstance = await openStorageInstance();
                        } else if (trueByChance(0.006)) {
                            await storageInstance.cleanup(randomNumber(0, 1000));
                        }
                    }


                }

                // ensure all docs are equal
                const allStorage = await storageInstance.query(prepareQuery(schema, { selector: { _deleted: { $eq: false } }, skip: 0, sort: [{ _id: 'asc' }] }));
                const allCorrect = collection.query({ selector: {}, sort: ['_id'] });
                allCorrect.forEach((d, idx) => {
                    const correctDoc = allStorage.documents[idx];
                    if (d._id !== correctDoc._id) {
                        console.dir(allStorage);
                        console.dir(allCorrect);
                        throw new Error('State not equal after writes');
                    }
                });


                let queryC = 0;
                while (queryC < queriesAmount) {
                    queryC++;
                    const query = randomQuery();
                    const sort = randomOfArray(sorts);
                    const mingoSort = sort.map(sortPart => {
                        const dirPrefix = Object.values(sortPart)[0] === 'asc' ? '' : '-';
                        return dirPrefix + Object.keys(sortPart)[0];
                    });
                    query.sort = mingoSort;
                    const correctResult = collection.query(query);
                    query.sort = sort as any;
                    query.selector._deleted = { $eq: false };
                    // must have the same result for all indexes
                    for (const index of ensureNotFalsy(schema.indexes, 'schema.indexes is falsy')) {
                        const useQuery = normalizeMangoQuery(schema, query as any);
                        useQuery.index = index as any;
                        const preparedQuery = prepareQuery(schema, useQuery);
                        const storageResult = await storageInstance.query(preparedQuery);

                        storageResult.documents.forEach((d, idx) => {
                            const correctDoc = correctResult[idx];
                            if (d._id !== correctDoc._id) {
                                console.dir(preparedQuery);
                                console.dir(correctResult);
                                console.dir(storageResult);
                                throw new Error('WRONG QUERY RESULT!');
                            }
                        });

                    }
                }

                // run cleanup after each run
                await storageInstance.cleanup(0);
            }


            await storageInstance.remove();
        }



    });
});
