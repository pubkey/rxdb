import assert from 'assert';

import config from './config';
import {
    RxJsonSchema,
    randomCouchString,
    MangoQuery,
    fillWithDefaultSettings,
    normalizeMangoQuery,
    now,
    getPrimaryFieldOfPrimaryKey,
    clone
} from '../../';
import {
    areSelectorsSatisfiedByIndex
} from '../../plugins/dev-mode';
import { EXAMPLE_REVISION_1 } from '../helper/revisions';
import * as schemas from '../helper/schemas';
import { human } from '../helper/schema-objects';

const TEST_CONTEXT = 'rx-storage-query-correctness.test.ts';
config.parallel('rx-storage-query-correctness.test.ts', () => {
    type TestCorrectQueriesInput<RxDocType> = {
        testTitle: string;
        schema: RxJsonSchema<RxDocType>;
        data: RxDocType[];
        queries: ({
            query: MangoQuery<RxDocType>;
            expectedResultDocIds: string[];
        } | undefined)[]
    };
    function withIndexes<RxDocType>(
        schema: RxJsonSchema<RxDocType>,
        indexes: string[][]
    ): RxJsonSchema<RxDocType> {
        schema = clone(schema);
        schema.indexes = indexes;
        return schema;
    }
    function testCorrectQueries<RxDocType>(
        input: TestCorrectQueriesInput<RxDocType>
    ) {
        it(input.testTitle, async () => {
            const schema = fillWithDefaultSettings(input.schema);
            const primaryPath = getPrimaryFieldOfPrimaryKey(schema.primaryKey);
            const storageInstance = await config.storage.getStorage().createStorageInstance<RxDocType>({
                databaseInstanceToken: randomCouchString(10),
                databaseName: randomCouchString(12),
                collectionName: randomCouchString(12),
                schema,
                options: {},
                multiInstance: false
            });


            const rawDocsData = input.data.map(row => {
                const writeData = Object.assign(
                    {},
                    row,
                    {
                        _deleted: false,
                        _attachments: {},
                        _meta: {
                            lwt: now()
                        },
                        _rev: EXAMPLE_REVISION_1
                    }
                );
                return writeData;
            });
            await storageInstance.bulkWrite(
                rawDocsData.map(document => ({ document })),
                TEST_CONTEXT
            );


            for (const queryData of input.queries) {
                if (!queryData) {
                    continue;
                }
                const normalizedQuery = normalizeMangoQuery(schema, queryData.query);
                const skip = normalizedQuery.skip ? normalizedQuery.skip : 0;
                const limit = normalizedQuery.limit ? normalizedQuery.limit : Infinity;
                const skipPlusLimit = skip + limit;

                const preparedQuery = config.storage.getStorage().statics.prepareQuery<RxDocType>(
                    schema,
                    normalizedQuery
                );


                // Test output of RxStorageStatics
                const queryMatcher = config.storage.getStorage().statics.getQueryMatcher(schema, preparedQuery);
                const sortComparator = config.storage.getStorage().statics.getSortComparator(schema, preparedQuery);
                const staticsResult = rawDocsData.slice(0)
                    .filter(d => queryMatcher(d))
                    .sort(sortComparator)
                    .slice(skip, skipPlusLimit);
                const resultStaticsIds = staticsResult.map(d => (d as any)[primaryPath]);
                try {
                    assert.deepStrictEqual(resultStaticsIds, queryData.expectedResultDocIds);
                } catch (err) {
                    console.log('WRONG QUERY RESULTS FROM STATICS:');
                    console.dir(queryData);
                    throw err;
                }

                // Test output of RxStorageInstance.query();
                const resultFromStorage = await storageInstance.query(preparedQuery);
                const resultIds = resultFromStorage.documents.map(d => (d as any)[primaryPath]);
                try {
                    assert.deepStrictEqual(resultIds, queryData.expectedResultDocIds);
                } catch (err) {
                    console.log('WRONG QUERY RESULTS FROM .query():');
                    console.dir(queryData);
                    throw err;
                }

                // Test output of .count()
                if (
                    !queryData.query.limit &&
                    !queryData.query.skip &&
                    areSelectorsSatisfiedByIndex(schema, normalizedQuery)
                ) {
                    const countResult = await storageInstance.count(preparedQuery);
                    try {
                        assert.strictEqual(
                            countResult.count,
                            queryData.expectedResultDocIds.length
                        );
                    } catch (err) {
                        console.log('WRONG QUERY RESULTS FROM .count():');
                        console.dir(queryData);
                        throw err;
                    }
                }
            }

            storageInstance.close();
        });
    }

    testCorrectQueries<schemas.HumanDocumentType>({
        testTitle: '$gt/$gte with number',
        data: [
            human('aa', 10),
            human('bb', 20),
            /**
             * One must have a longer id
             * because we had many bugs around how padLeft
             * works on custom indexes.
             */
            human('cc-looong-id', 30),
            human('dd', 40),
            human('ee', 50)
        ],
        schema: withIndexes(schemas.human, [
            ['age']
        ]),
        queries: [
            /**
             * TODO using $gte in pouchdb returns the wrong results,
             * create an issue at the PouchDB repo.
             */
            config.isNotOneOfTheseStorages(['pouchdb']) ? {
                query: {
                    selector: {
                        age: {
                            $gt: 20
                        }
                    },
                    sort: [{ age: 'asc' }]
                },
                expectedResultDocIds: [
                    'cc-looong-id',
                    'dd',
                    'ee'
                ]
            } : undefined,
            {
                query: {
                    selector: {
                        age: {
                            $gte: 20
                        }
                    },
                    sort: [{ age: 'asc' }]
                },
                expectedResultDocIds: [
                    'bb',
                    'cc-looong-id',
                    'dd',
                    'ee'
                ]
            },
            // sort by something that is not in the selector
            {
                query: {
                    selector: {
                        age: {
                            $gt: 20
                        }
                    },
                    sort: [{ passportId: 'asc' }]
                },
                expectedResultDocIds: [
                    'cc-looong-id',
                    'dd',
                    'ee'
                ]
            },
        ]
    });
    testCorrectQueries<schemas.HumanDocumentType>({
        testTitle: '$lt/$lte with number',
        data: [
            human('aa', 10),
            human('bb', 20),
            /**
             * One must have a longer id
             * because we had many bugs around how padLeft
             * works on custom indexes.
             */
            human('cc-looong-id', 30),
            human('dd', 40),
            human('ee', 50)
        ],
        queries: [
            {
                query: {
                    selector: {
                        age: {
                            $lt: 40
                        }
                    },
                    sort: [{ age: 'asc' }]
                },
                expectedResultDocIds: [
                    'aa',
                    'bb',
                    'cc-looong-id'
                ]
            },
            {
                query: {
                    selector: {
                        age: {
                            $lte: 40
                        }
                    },
                    sort: [{ age: 'asc' }]
                },
                expectedResultDocIds: [
                    'aa',
                    'bb',
                    'cc-looong-id',
                    'dd'
                ]
            },
            // sort by something that is not in the selector
            {
                query: {
                    selector: {
                        age: {
                            $lt: 40
                        }
                    },
                    sort: [{ passportId: 'asc' }]
                },
                expectedResultDocIds: [
                    'aa',
                    'bb',
                    'cc-looong-id'
                ]
            },
        ],
        schema: withIndexes(schemas.human, [
            ['age']
        ])
    });
});
