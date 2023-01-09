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
    clone,
    getQueryPlan,
    deepFreeze
} from '../../';
import {
    areSelectorsSatisfiedByIndex
} from '../../plugins/dev-mode';
import { EXAMPLE_REVISION_1 } from '../helper/revisions';
import * as schemas from '../helper/schemas';
import {
    HeroArrayDocumentType,
    human,
    nestedHuman,
    NestedHumanDocumentType
} from '../helper/schema-objects';

const TEST_CONTEXT = 'rx-storage-query-correctness.test.ts';
config.parallel('rx-storage-query-correctness.test.ts', () => {
    type TestCorrectQueriesInput<RxDocType> = {
        testTitle: string;
        schema: RxJsonSchema<RxDocType>;
        data: RxDocType[];
        queries: ({
            info: string;
            query: MangoQuery<RxDocType>;
            expectedResultDocIds: string[];
            /**
             * If this is set, we expect the output
             * of the RxDB query planner to have
             * set selectorSatisfiedByIndex as the given value.
             */
            selectorSatisfiedByIndex?: boolean;
        } | undefined)[];
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
                const normalizedQuery = deepFreeze(normalizeMangoQuery(schema, queryData.query));
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
                    console.log('WRONG QUERY RESULTS FROM STATICS: ' + queryData.info);
                    console.dir(queryData);
                    throw err;
                }


                // Test correct selectorSatisfiedByIndex
                if (typeof queryData.selectorSatisfiedByIndex !== 'undefined') {
                    const queryPlan = getQueryPlan(schema, normalizedQuery);
                    try {
                        assert.strictEqual(
                            queryPlan.selectorSatisfiedByIndex,
                            queryData.selectorSatisfiedByIndex
                        );
                    } catch (err) {
                        console.log('WRONG selectorSatisfiedByIndex IN QUERY PLAN: ' + queryData.info);
                        console.dir(queryData);
                        console.dir(queryPlan);
                        throw err;
                    }
                }

                // Test output of RxStorageInstance.query();
                const resultFromStorage = await storageInstance.query(preparedQuery);
                const resultIds = resultFromStorage.documents.map(d => (d as any)[primaryPath]);
                try {
                    assert.deepStrictEqual(resultIds, queryData.expectedResultDocIds);
                } catch (err) {
                    console.log('WRONG QUERY RESULTS FROM .query(): ' + queryData.info);
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
                        console.log('WRONG QUERY RESULTS FROM .count(): ' + queryData.info);
                        console.dir(queryData);
                        throw err;
                    }
                }
            }

            storageInstance.close();
        });
    }

    testCorrectQueries<schemas.HumanDocumentType>({
        testTitle: '$gt/$gte',
        data: [
            human('aa', 10, 'alice'),
            human('bb', 20, 'bob'),
            /**
             * One must have a longer id
             * because we had many bugs around how padLeft
             * works on custom indexes.
             */
            human('cc-looong-id', 30, 'carol'),
            human('dd', 40, 'dave'),
            human('ee', 50, 'eve')
        ],
        schema: withIndexes(schemas.human, [
            ['age'],
            ['age', 'firstName'],
            ['firstName']
        ]),
        queries: [
            {
                info: 'normal $gt',
                query: {
                    selector: {
                        age: {
                            $gt: 20
                        }
                    },
                    sort: [{ age: 'asc' }]
                },
                selectorSatisfiedByIndex: true,
                expectedResultDocIds: [
                    'cc-looong-id',
                    'dd',
                    'ee'
                ]
            },
            {
                info: 'normal $gte',
                query: {
                    selector: {
                        age: {
                            $gte: 20
                        }
                    },
                    sort: [{ age: 'asc' }]
                },
                selectorSatisfiedByIndex: true,
                expectedResultDocIds: [
                    'bb',
                    'cc-looong-id',
                    'dd',
                    'ee'
                ]
            },
            {
                info: 'sort by something that is not in the selector',
                query: {
                    selector: {
                        age: {
                            $gt: 20
                        }
                    },
                    sort: [{ passportId: 'asc' }]
                },
                selectorSatisfiedByIndex: false,
                expectedResultDocIds: [
                    'cc-looong-id',
                    'dd',
                    'ee'
                ]
            },
            {
                info: 'with string comparison',
                query: {
                    selector: {
                        firstName: {
                            $gt: 'bob'
                        }
                    }
                },
                selectorSatisfiedByIndex: true,
                expectedResultDocIds: [
                    'cc-looong-id',
                    'dd',
                    'ee'
                ]
            },
            {
                info: 'compare more then one field',
                query: {
                    selector: {
                        age: {
                            $gt: 20
                        },
                        firstName: {
                            $gt: 'a'
                        }
                    }
                },
                selectorSatisfiedByIndex: false,
                expectedResultDocIds: [
                    'cc-looong-id',
                    'dd',
                    'ee'
                ]
            }
        ]
    });
    testCorrectQueries<schemas.HumanDocumentType>({
        testTitle: '$lt/$lte',
        data: [
            human('aa', 10, 'alice'),
            human('bb', 20, 'bob'),
            /**
             * One must have a longer id
             * because we had many bugs around how padLeft
             * works on custom indexes.
             */
            human('cc-looong-id', 30, 'carol'),
            human('dd', 40, 'dave'),
            human('ee', 50, 'eve')
        ],
        schema: withIndexes(schemas.human, [
            ['age'],
            ['age', 'firstName'],
            ['firstName']
        ]),
        queries: [
            {
                info: 'normal $lt',
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
                info: 'normal $lte',
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
            {
                info: 'sort by something that is not in the selector',
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
            // TODO why does this query not use the age+firstName index?
            {
                info: 'compare more then one field',
                query: {
                    selector: {
                        age: {
                            $lt: 40
                        },
                        firstName: {
                            $lt: 'd'
                        }
                    }
                },
                selectorSatisfiedByIndex: false,
                expectedResultDocIds: [
                    'aa',
                    'bb',
                    'cc-looong-id'
                ]
            }
        ]
    });
    testCorrectQueries<NestedHumanDocumentType>({
        testTitle: 'nested properties',
        data: [
            nestedHuman({
                passportId: 'aaa',
                mainSkill: {
                    level: 6,
                    name: 'zzz'
                }
            }),
            nestedHuman({
                passportId: 'bbb',
                mainSkill: {
                    level: 4,
                    name: 'ttt'
                }
            }),
            nestedHuman({
                passportId: 'ccc',
                mainSkill: {
                    level: 3,
                    name: 'ccc'
                }
            })
        ],
        schema: withIndexes(schemas.nestedHuman, [
            ['mainSkill.level'],
            ['mainSkill.name']
        ]),
        queries: [
            {
                info: 'sort by nested mainSkill.name',
                query: {
                    selector: {
                    },
                    sort: [{ 'mainSkill.name': 'asc' }]
                },
                expectedResultDocIds: [
                    'ccc',
                    'bbb',
                    'aaa'
                ]
            }
        ]
    });
    testCorrectQueries<schemas.HumanDocumentType>({
        testTitle: '$in',
        data: [
            human('aa', 10, 'alice'),
            human('bb', 20, 'bob'),
            human('cc', 30, 'carol'),
            human('dd', 40, 'dave'),
            human('ee', 50, 'eve')
        ],
        schema: schemas.human,
        queries: [
            {
                info: 'get first',
                query: {
                    selector: {
                        firstName: {
                            $in: ['alice']
                        },
                    },
                    sort: [{ name: 'asc' }]
                },
                expectedResultDocIds: [
                    'aa'
                ]
            },
            {
                info: 'get by multiple',
                query: {
                    selector: {
                        firstName: {
                            $in: ['alice', 'bob']
                        },
                    },
                    sort: [{ name: 'asc' }]
                },
                expectedResultDocIds: [
                    'aa',
                    'bb'
                ]
            },
            {
                info: 'get none matching',
                query: {
                    selector: {
                        firstName: {
                            $in: ['foobar', 'barfoo']
                        },
                    },
                    sort: [{ name: 'asc' }]
                },
                expectedResultDocIds: []
            }
        ]
    });
    testCorrectQueries<HeroArrayDocumentType>({
        testTitle: '$elemMatch/$size',
        data: [
            {
                name: 'foo1',
                skills: [
                    {
                        name: 'bar1',
                        damage: 10
                    },
                    {
                        name: 'bar2',
                        damage: 5
                    },
                ],
            },
            {
                name: 'foo2',
                skills: [
                    {
                        name: 'bar3',
                        damage: 10
                    },
                    {
                        name: 'bar4',
                        damage: 10
                    },
                ],
            },
            {
                name: 'foo3',
                skills: [
                    {
                        name: 'bar5',
                        damage: 5
                    },
                ],
            }
        ],
        schema: schemas.heroArray,
        queries: [
            {
                info: '$elemMatch',
                query: {
                    selector: {
                        skills: {
                            $elemMatch: {
                                damage: 5
                            }
                        },
                    },
                    sort: [{ name: 'asc' }]
                },
                selectorSatisfiedByIndex: false,
                expectedResultDocIds: [
                    'foo1',
                    'foo3'
                ]
            },
            {
                info: '$size',
                query: {
                    selector: {
                        skills: {
                            $size: 1
                        },
                    },
                    sort: [{ name: 'asc' }]
                },
                selectorSatisfiedByIndex: false,
                expectedResultDocIds: [
                    'foo3'
                ]
            },
        ]
    });
});
