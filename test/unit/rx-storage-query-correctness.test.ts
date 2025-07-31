import assert from 'assert';

import config, { describeParallel } from './config.ts';
import {
    RxJsonSchema,
    randomToken,
    MangoQuery,
    fillWithDefaultSettings,
    normalizeMangoQuery,
    now,
    getPrimaryFieldOfPrimaryKey,
    clone,
    getQueryPlan,
    deepFreeze,
    getQueryMatcher,
    getSortComparator,
    createRxDatabase,
    prepareQuery,
    ensureNotFalsy
} from '../../plugins/core/index.mjs';
import {
    schemaObjects,
    EXAMPLE_REVISION_1,
    HumanDocumentType,
    human,
    schemas,
    nestedHuman,
    humanMinimal,
    SimpleHeroArrayDocumentType
} from '../../plugins/test-utils/index.mjs';
import { wrappedValidateAjvStorage } from '../../plugins/validate-ajv/index.mjs';
import {
    HeroArrayDocumentType,
    NestedHumanDocumentType,
    SimpleHumanV3DocumentType

} from '../../src/plugins/test-utils/schema-objects.ts';

const TEST_CONTEXT = 'rx-storage-query-correctness.test.ts';
describeParallel('rx-storage-query-correctness.test.ts', () => {
    type TestCorrectQueriesInput<RxDocType> = {
        notRunIfTrue?: () => boolean;
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

        const indexFields = indexes.flat();
        const required = ensureNotFalsy(schema.required);
        if (required) {
            indexFields.forEach(indexField => {
                if (!required.includes(indexField as any)) {
                    (required as any).push(indexField);
                }
            });
        }

        return schema;
    }
    function testCorrectQueries<RxDocType>(
        input: TestCorrectQueriesInput<RxDocType>
    ) {

        if (input.notRunIfTrue && input.notRunIfTrue()) {
            return;
        }


        it(input.testTitle, async () => {
            const schema = fillWithDefaultSettings(clone(input.schema));
            const primaryPath = getPrimaryFieldOfPrimaryKey(schema.primaryKey);
            const storageInstance = await config.storage.getStorage().createStorageInstance<RxDocType>({
                databaseInstanceToken: randomToken(10),
                databaseName: randomToken(12),
                collectionName: randomToken(12),
                schema,
                options: {},
                multiInstance: false,
                devMode: true
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
            const bulkWriteResult = await storageInstance.bulkWrite(
                rawDocsData.map(document => ({ document })),
                TEST_CONTEXT
            );
            if (bulkWriteResult.error.length > 0) {
                throw new Error('bulkWrite(' + input.testTitle + ') error: ' + JSON.stringify(bulkWriteResult.error, null, 4));
            }

            const database = await createRxDatabase({
                name: randomToken(10),
                storage: wrappedValidateAjvStorage({
                    storage: config.storage.getStorage()
                }),
                allowSlowCount: true
            });
            const collections = await database.addCollections({
                test: {
                    schema: input.schema
                }
            });
            const collection = collections.test;
            await collection.bulkInsert(input.data);

            for (const queryData of input.queries) {
                if (!queryData) {
                    continue;
                }

                const queryForStorage = clone(queryData.query) as MangoQuery<RxDocType>;
                if (!queryForStorage.selector) {
                    queryForStorage.selector = {};
                }
                (queryForStorage.selector as any)._deleted = false;
                if (queryForStorage.index) {
                    (queryForStorage.index as any).unshift('_deleted');
                }
                const normalizedQuery = deepFreeze(normalizeMangoQuery(schema, queryForStorage));
                const skip = normalizedQuery.skip ? normalizedQuery.skip : 0;
                const limit = normalizedQuery.limit ? normalizedQuery.limit : Infinity;
                const skipPlusLimit = skip + limit;

                const preparedQuery = prepareQuery<RxDocType>(
                    schema,
                    normalizedQuery
                );

                // Test output of RxStorageStatics
                const queryMatcher = getQueryMatcher(schema, normalizedQuery);
                const sortComparator = getSortComparator(schema, normalizedQuery);
                const staticsResult = rawDocsData.slice(0)
                    .filter(d => queryMatcher(d))
                    .sort(sortComparator)
                    .slice(skip, skipPlusLimit);
                const resultStaticsIds = staticsResult.map(d => (d as any)[primaryPath]);
                try {
                    assert.deepStrictEqual(resultStaticsIds, queryData.expectedResultDocIds);
                } catch (err) {
                    console.log('WRONG QUERY RESULTS FROM STATICS: ' + queryData.info);
                    console.dir({
                        queryData,
                        resultStaticsIds
                    });

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
                    console.log('WRONG QUERY RESULTS FROM RxStorageInstance.query(): ' + queryData.info);
                    console.dir({
                        resultIds,
                        expectedResultDocIds: queryData.expectedResultDocIds,
                        resultFromStorage: resultFromStorage.documents,
                        queryData,
                        preparedQuery
                    });
                    throw err;
                }

                // Test output of RxCollection.find()
                const rxQuery = collection.find(queryData.query);
                const resultFromCollection = await rxQuery.exec();
                const resultFromCollectionIds = resultFromCollection.map(d => d.primary);
                try {
                    assert.deepStrictEqual(resultFromCollectionIds, queryData.expectedResultDocIds);
                } catch (err) {
                    console.log('WRONG QUERY RESULTS FROM RxCollection.find(): ' + queryData.info);
                    console.dir({
                        queryData,
                        resultFromCollectionIds,
                        preparedQuery: rxQuery.getPreparedQuery()
                    });
                    throw err;
                }
                const byId = await collection.findByIds(resultFromCollectionIds).exec();
                resultFromCollectionIds.forEach(id => assert.ok(byId.has(id), 'findById must have same output'));


                // Test output of .count()
                if (
                    !queryData.query.limit &&
                    !queryData.query.skip
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

            await Promise.all([
                database.remove(),
                storageInstance.close()
            ]);
        });
    }

    testCorrectQueries<HumanDocumentType>({
        testTitle: '$gt/$gte',
        data: [
            schemaObjects.humanData('aa', 10, 'alice'),
            schemaObjects.humanData('bb', 20, 'bob'),
            /**
             * One must have a longer id
             * because we had many bugs around how padLeft
             * works on custom indexes.
             */
            schemaObjects.humanData('cc-looong-id', 30, 'carol'),
            schemaObjects.humanData('dd', 40, 'dave'),
            schemaObjects.humanData('ee', 50, 'eve')
        ],
        schema: withIndexes(human, [
            ['age'],
            ['age', 'firstName'],
            ['firstName'],
            ['passportId']
        ]),
        queries: [
            {
                info: 'normal $gt by number',
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
                info: '$gt on primary key',
                query: {
                    selector: {
                        passportId: {
                            $gt: 'dd'
                        }
                    },
                    sort: [{ passportId: 'asc' }]
                },
                selectorSatisfiedByIndex: true,
                expectedResultDocIds: [
                    'ee'
                ]
            },
            {
                info: '$gt and $gte on same field',
                query: {
                    selector: {
                        age: {
                            $gte: 40,
                            $gt: 19,
                        },
                    },
                    sort: [{ age: 'asc' }]
                },
                expectedResultDocIds: [
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
                selectorSatisfiedByIndex: true,
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
    testCorrectQueries<HumanDocumentType>({
        testTitle: '$lt/$lte',
        data: [
            schemaObjects.humanData('aa', 10, 'alice'),
            schemaObjects.humanData('bb', 20, 'bob'),
            /**
             * One must have a longer id
             * because we had many bugs around how padLeft
             * works on custom indexes.
             */
            schemaObjects.humanData('cc-looong-id', 30, 'carol'),
            schemaObjects.humanData('dd', 40, 'dave'),
            schemaObjects.humanData('ee', 50, 'eve')
        ],
        schema: withIndexes(human, [
            ['age'],
            ['age', 'firstName'],
            ['firstName'],
            ['passportId']
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
                selectorSatisfiedByIndex: true,
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
                selectorSatisfiedByIndex: true,
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
                selectorSatisfiedByIndex: false,
                expectedResultDocIds: [
                    'aa',
                    'bb',
                    'cc-looong-id'
                ]
            },
            {
                /**
                 * @link https://github.com/pubkey/rxdb/pull/4751
                 */
                info: '$lt on primaryKey',
                query: {
                    selector: {
                        passportId: {
                            $lt: 'bb'
                        }
                    },
                    sort: [{ passportId: 'asc' }]
                },
                expectedResultDocIds: [
                    'aa'
                ]
            },
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
            schemaObjects.nestedHumanData({
                passportId: 'aaa',
                mainSkill: {
                    level: 6,
                    name: 'zzz'
                }
            }),
            schemaObjects.nestedHumanData({
                passportId: 'bbb',
                mainSkill: {
                    level: 4,
                    name: 'ttt'
                }
            }),
            schemaObjects.nestedHumanData({
                passportId: 'ccc',
                mainSkill: {
                    level: 3,
                    name: 'ccc'
                }
            })
        ],
        schema: withIndexes(nestedHuman, [
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
    testCorrectQueries<SimpleHumanV3DocumentType>({
        testTitle: '$or',
        data: [
            schemaObjects.simpleHumanV3Data({
                passportId: 'aaa',
                oneOptional: 'A'
            }),
            schemaObjects.simpleHumanV3Data({
                passportId: 'bbb',
                oneOptional: 'B'
            }),
            schemaObjects.simpleHumanV3Data({
                passportId: 'ccc'
            })
        ],
        schema: withIndexes(humanMinimal, [
        ]),
        queries: [
            {
                info: 'match A or B',
                query: {
                    selector: {
                        $or: [
                            {
                                passportId: 'aaa'
                            },
                            {
                                passportId: 'bbb'
                            }
                        ]
                    },
                    sort: [{ 'passportId': 'asc' }]
                },
                expectedResultDocIds: [
                    'aaa',
                    'bbb'
                ]
            },
            {
                info: 'match with optional field',
                query: {
                    selector: {
                        passportId: {
                            $eq: 'ccc'
                        },
                        $or: [
                            {
                                oneOptional: {
                                    $ne: 'foobar1'
                                }
                            },
                            {
                                oneOptional: {
                                    $ne: 'foobar2'
                                }
                            }
                        ]
                    },
                    sort: [{ 'passportId': 'asc' }]
                },
                expectedResultDocIds: [
                    'ccc'
                ]
            },
            {
                info: 'match non on non-existing optional field',
                query: {
                    selector: {
                        passportId: {
                            $eq: 'foobar'
                        },
                        $or: [
                            {
                                oneOptional: {
                                    $ne: 'foobar1'
                                }
                            },
                            {
                                oneOptional: {
                                    $ne: 'foobar2'
                                }
                            }
                        ]
                    },
                    sort: [{ 'passportId': 'asc' }]
                },
                expectedResultDocIds: []
            }
        ]
    });
    testCorrectQueries<HumanDocumentType>({
        testTitle: '$in',
        data: [
            schemaObjects.humanData('aa', 10, 'alice'),
            schemaObjects.humanData('bb', 20, 'bob'),
            schemaObjects.humanData('cc', 30, 'carol'),
            schemaObjects.humanData('dd', 40, 'dave'),
            schemaObjects.humanData('ee', 50, 'eve')
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
                    sort: [{ passportId: 'asc' }]
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
                    sort: [{ passportId: 'asc' }]
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
                    sort: [{ passportId: 'asc' }]
                },
                expectedResultDocIds: []
            },
            {
                info: 'get by primary key',
                query: {
                    selector: {
                        passportId: {
                            $in: ['aa', 'cc', 'ee']
                        }
                    }
                },
                expectedResultDocIds: ['aa', 'cc', 'ee']
            }
        ]
    });
    /**
     * $in must not only work on strings but also on
     * arrays.
     */
    testCorrectQueries<SimpleHeroArrayDocumentType>({
        testTitle: '$in for array fields named skills',
        data: [
            { name: 'alice', skills: ['a', 'b', 'c'] },
            { name: 'bob', skills: ['c', 'd', 'e'] }
        ],
        schema: schemas.simpleArrayHero,
        queries: [
            {
                info: 'get first',
                query: {
                    selector: {
                        skills: {
                            $in: ['a']
                        },
                    }
                },
                expectedResultDocIds: [
                    'alice'
                ]
            },
            {
                info: 'get by multiple',
                query: {
                    selector: {
                        skills: {
                            $in: ['c']
                        },
                    }
                },
                expectedResultDocIds: [
                    'alice',
                    'bob'
                ]
            },
            {
                info: 'get none matching',
                query: {
                    selector: {
                        skills: {
                            $in: ['aa']
                        },
                    }
                },
                expectedResultDocIds: []
            }
        ]
    });
    testCorrectQueries<HumanDocumentType>({
        testTitle: '$nin',
        data: [
            schemaObjects.humanData('aa', 10, 'alice'),
            schemaObjects.humanData('bb', 20, 'bob'),
            schemaObjects.humanData('cc', 30, 'carol')
        ],
        schema: schemas.human,
        queries: [
            {
                info: 'get all but first',
                query: {
                    selector: {
                        firstName: {
                            $nin: ['alice']
                        },
                    },
                    sort: [{ passportId: 'asc' }]
                },
                expectedResultDocIds: [
                    'bb',
                    'cc'
                ]
            },
            {
                info: 'get all but multiple',
                query: {
                    selector: {
                        firstName: {
                            $nin: ['alice', 'bob']
                        },
                    },
                    sort: [{ passportId: 'asc' }]
                },
                expectedResultDocIds: [
                    'cc'
                ]
            },
            {
                info: 'get all matching',
                query: {
                    selector: {
                        firstName: {
                            $nin: ['foobar', 'barfoo']
                        },
                    },
                    sort: [{ passportId: 'asc' }]
                },
                expectedResultDocIds: [
                    'aa',
                    'bb',
                    'cc'
                ]
            },
            {
                info: 'get by primary key',
                query: {
                    selector: {
                        passportId: {
                            $nin: ['aa', 'cc']
                        }
                    }
                },
                expectedResultDocIds: ['bb']
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
                info: '$elemMatch with other operator',
                query: {
                    selector: {
                        name: {
                            $eq: 'foo3'
                        },
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
    testCorrectQueries({
        testTitle: '$eq operator',
        data: [
            {
                id: 'zero',
                nonPrimaryString: 'zero',
                integer: 0,
                number: 0,
                boolean: false,
                null: 'not-null'
            },
            {
                id: 'one',
                nonPrimaryString: 'one',
                integer: 1,
                number: 1,
                boolean: true,
                null: null
            },
            {
                id: 'two',
                nonPrimaryString: 'two',
                integer: 2,
                number: 2,
                boolean: false,
                null: 'not-null'
            }
        ],
        schema: {
            version: 0,
            primaryKey: 'id',
            type: 'object',
            properties: {
                id: {
                    type: 'string',
                    maxLength: 100
                },
                nonPrimaryString: {
                    type: 'string'
                },
                integer: {
                    type: 'integer'
                },
                number: {
                    type: 'number'
                },
                boolean: {
                    type: 'boolean'
                },
                null: {
                    type: ['null', 'string']
                }
            },
            indexes: [
                // boolean indexing was broken on some storages
                'boolean'
            ],
            required: [
                'id',
                'nonPrimaryString',
                'integer',
                'number',
                'boolean'
            ],
        },
        queries: [
            {
                info: '$eq primary key',
                query: {
                    selector: {
                        id: {
                            $eq: 'one'
                        }
                    },
                    sort: [{ id: 'asc' }]
                },
                expectedResultDocIds: [
                    'one'
                ]
            },
            {
                info: '$eq non-primary string',
                query: {
                    selector: {
                        nonPrimaryString: {
                            $eq: 'one'
                        }
                    },
                    sort: [{ id: 'asc' }]
                },
                expectedResultDocIds: [
                    'one'
                ]
            },
            {
                info: '$eq integer',
                query: {
                    selector: {
                        integer: {
                            $eq: 1
                        }
                    },
                    sort: [{ id: 'asc' }]
                },
                expectedResultDocIds: [
                    'one'
                ]
            },
            {
                info: '$eq number',
                query: {
                    selector: {
                        number: {
                            $eq: 1
                        }
                    },
                    sort: [{ id: 'asc' }]
                },
                expectedResultDocIds: [
                    'one'
                ]
            },
            {
                info: '$eq boolean',
                query: {
                    selector: {
                        boolean: {
                            $eq: true
                        }
                    },
                    sort: [{ id: 'asc' }]
                },
                expectedResultDocIds: [
                    'one'
                ]
            },
            {
                info: '$eq null',
                query: {
                    selector: {
                        null: {
                            $eq: null
                        }
                    },
                    sort: [{ id: 'asc' }]
                },
                expectedResultDocIds: [
                    'one'
                ]
            }
        ]
    });
    /**
     * @link https://github.com/pubkey/rxdb/issues/4571
     */
    testCorrectQueries({
        testTitle: '$eq operator with composite primary key',
        data: [
            {
                id: 'one',
                key: 'one|1|1',
                string: 'one',
                number: 1,
                integer: 1,
            },
            {
                id: 'two',
                key: 'two|1|1',
                string: 'two',
                number: 1,
                integer: 1,
            },
            {
                id: 'three',
                key: 'one|2|1',
                string: 'one',
                number: 2,
                integer: 1,
            },
        ],
        schema: {
            version: 0,
            indexes: ['string', ['number', 'integer']],
            primaryKey: {
                key: 'key',
                fields: ['string', 'number', 'integer'],
                separator: '|',
            },
            type: 'object',
            properties: {
                key: {
                    maxLength: 100,
                    type: 'string',
                },
                id: {
                    maxLength: 100,
                    type: 'string',
                },
                string: {
                    maxLength: 50,
                    type: 'string',
                },
                number: {
                    type: 'number',
                    minimum: 0,
                    maximum: 100,
                    multipleOf: 1,
                },
                integer: {
                    type: 'integer',
                    minimum: 0,
                    maximum: 100,
                    multipleOf: 1,
                },
            },
            required: ['id', 'key', 'string', 'number', 'integer'],
        },
        queries: [
            {
                info: '$eq primary key 2',
                query: {
                    selector: {
                        id: {
                            $eq: 'one',
                        },
                    },
                    sort: [{ id: 'asc' }],
                },
                expectedResultDocIds: ['one|1|1'],
            },
            {
                info: '$eq by key',
                query: {
                    selector: {
                        key: {
                            $eq: 'one|1|1',
                        },
                    },
                    sort: [{ id: 'asc' }],
                },
                expectedResultDocIds: ['one|1|1'],
            },
            {
                info: '$eq by composite key fields',
                query: {
                    selector: {
                        $and: [
                            {
                                string: {
                                    $eq: 'one',
                                },
                            },
                            {
                                number: {
                                    $eq: 1,
                                },
                                integer: {
                                    $eq: 1,
                                },
                            },
                        ],
                    },
                    sort: [{ number: 'desc', integer: 'desc' }],
                },
                expectedResultDocIds: ['one|1|1'],
            },
        ],
    });
    /**
     * @link https://github.com/pubkey/rxdb/issues/5273
     */
    testCorrectQueries<{
        id: string;
        hasHighlights: number;
        lastOpenedAt: number;
        exists: number;
    }>({
        testTitle: 'issue: compound index has wrong range',
        data: [
            {
                id: '1',
                exists: 1,
                hasHighlights: 1,
                lastOpenedAt: 1600000000000
            },
            {
                id: '2',
                exists: 1,
                hasHighlights: 1,
                lastOpenedAt: 1700000000000
            }
        ],
        schema: {
            version: 0,
            indexes: [
                ['exists', 'hasHighlights', 'lastOpenedAt']
            ],
            primaryKey: 'id',
            type: 'object',
            properties: {
                id: {
                    type: 'string',
                    maxLength: 1
                },
                hasHighlights: {
                    type: 'integer',
                    minimum: 0,
                    maximum: 1,
                    multipleOf: 1
                },
                lastOpenedAt: {
                    type: 'integer',
                    minimum: 0,
                    maximum: Number.MAX_SAFE_INTEGER,
                    multipleOf: 1,
                },
                exists: {
                    type: 'integer',
                    minimum: 0,
                    maximum: 1,
                    multipleOf: 1
                },
            },
            required: ['id', 'hasHighlights', 'lastOpenedAt', 'exists']
        },
        queries: [
            {
                info: 'multiple operators',
                query: {
                    selector: {
                        exists: 1,
                        lastOpenedAt: {
                            $gte: 1600000000000,
                            $lte: 1650000000000
                        }
                    }
                },
                selectorSatisfiedByIndex: false,
                expectedResultDocIds: ['1']
            },
            {
                info: 'multiple operators 2',
                query: {
                    selector: {
                        exists: 1,
                        lastOpenedAt: {
                            $gte: 1600000000000
                        }
                    }
                },
                selectorSatisfiedByIndex: false,
                expectedResultDocIds: ['1', '2']
            },
            {
                info: 'all operators in index',
                query: {
                    selector: {
                        exists: 1,
                        hasHighlights: 1,
                        lastOpenedAt: {
                            $gte: 1600000000000
                        }
                    }
                },
                selectorSatisfiedByIndex: true,
                expectedResultDocIds: ['1', '2']
            }
        ],
    });
    testCorrectQueries({
        testTitle: '$type',
        data: [
            {
                foo: '1',
                bar: 'test'
            },
            {
                foo: '2',
                bar: 2.0
            }
        ],
        schema: {
            version: 0,
            primaryKey: 'foo',
            type: 'object',
            properties: {
                foo: {
                    type: 'string',
                    maxLength: 100
                },
                bar: {
                    oneOf: [
                        {
                            type: 'string'
                        },
                        {
                            type: 'number'
                        }
                    ]
                },
            },
            required: ['foo', 'bar'],
        },
        queries: [
            {
                info: '$type string',
                query: {
                    selector: {
                        bar: {
                            $type: 'string'
                        }
                    },
                    sort: [{ foo: 'asc' }]
                },
                expectedResultDocIds: [
                    '1'
                ]
            },
            {
                info: '$type number',
                query: {
                    selector: {
                        bar: {
                            $type: 'number'
                        }
                    },
                    sort: [{ foo: 'asc' }]
                },
                expectedResultDocIds: [
                    '2'
                ]
            },
        ]
    });
    testCorrectQueries<{
        _id: string;
        name: string;
        gender: string;
        age: number;
    }>({
        testTitle: 'issue: wrong results on complex index',
        data: [
            {
                '_id': 'nogljngyvo',
                'name': 'cjbovwbzjx',
                'gender': 'f',
                'age': 18
            },
            {
                '_id': 'zmbznyggnu',
                'name': 'rpjljekeoy',
                'gender': 'm',
                'age': 3
            },
            {
                '_id': 'hauezldqea',
                'name': 'ckjndqrthh',
                'gender': 'f',
                'age': 20
            },
            {
                '_id': 'utarwoqkav',
                'name': 'thfubuvqwr',
                'gender': 'm',
                'age': 12
            }
        ],
        schema: {
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
            required: [
                '_id',
                'name',
                'gender',
                'age'
            ],
            indexes: [
                [
                    'name',
                    'gender',
                    'age',
                    '_id'
                ],
                [
                    'gender',
                    'age',
                    'name',
                    '_id'
                ],
                [
                    'age',
                    'name',
                    'gender',
                    '_id'
                ]
            ]
        },
        queries: [
            {
                info: 'complex query on index',
                query: {
                    'selector': {
                        'gender': {
                            '$gt': 'x'
                        },
                        'name': {
                            '$lt': 'hqybnsozrv'
                        }
                    },
                    'sort': [
                        {
                            'gender': 'asc'
                        },
                        {
                            'age': 'asc'
                        },
                        {
                            '_id': 'asc'
                        }
                    ],
                    'index': [
                        'name',
                        'gender',
                        'age',
                        '_id'
                    ]
                },
                expectedResultDocIds: []
            },
            {
                info: 'complex query on end of index',
                query: {
                    'selector': {
                        'gender': {
                            '$lt': 'x',
                            '$lte': 'm'
                        },
                    },
                    'sort': [
                        {
                            'age': 'asc'
                        },
                        {
                            'name': 'asc'
                        },
                        {
                            '_id': 'asc'
                        }

                    ],
                    'index': [
                        'gender',
                        'age',
                        'name',
                        '_id'

                    ]
                },
                expectedResultDocIds: ['zmbznyggnu', 'utarwoqkav', 'nogljngyvo', 'hauezldqea']
            },
            {
                info: 'had wrong index string on upper bound',
                query: {
                    'selector': {
                        'age': {
                            '$gte': 4,
                            '$lte': 20
                        },
                        'gender': {
                            '$lt': 'm'
                        },

                    },
                    'sort': [
                        {
                            'name': 'asc'
                        },
                        {
                            '_id': 'asc'
                        }
                    ],
                    'index': [
                        'age',
                        'name',
                        'gender',
                        '_id'
                    ]
                },
                expectedResultDocIds: ['nogljngyvo', 'hauezldqea']
            },
            {
                info: 'had wrong index string on upper bound for $eq',
                query: {
                    'selector': {
                        'age': {
                            '$lte': 12
                        },
                        'gender': {
                            '$lt': 'x',
                            '$eq': 'm'
                        },
                    },
                    'sort': [
                        {
                            '_id': 'asc'
                        }
                    ],
                    'index': [
                        'gender',
                        'age',
                        'name',
                        '_id'
                    ]
                },
                expectedResultDocIds: ['utarwoqkav', 'zmbznyggnu']
            },
        ],
    });

    testCorrectQueries<{
        _id: string;
        name: string;
        gender: string;
        age: number;
    }>({
        testTitle: 'issue: wrong results using skip and limit',
        data: [
            {
                '_id': 'aaaaaa',
                'name': 'odvxvubzto',
                'gender': 'f',
                'age': 7
            },
            {
                '_id': 'bbbbbb',
                'name': 'ftudnsnyek',
                'gender': 'f',
                'age': 14
            },
            {
                '_id': 'cccccc',
                'name': 'ollytrnxkr',
                'gender': 'f',
                'age': 3
            },
            {
                '_id': 'dddddd',
                'name': 'sxzsplrctw',
                'gender': 'f',
                'age': 15
            },
            {
                '_id': 'eeeeee',
                'name': 'gwhtwjinib',
                'gender': 'm',
                'age': 9
            }
        ],
        schema: {
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
            indexes: [
                [
                    '_id'
                ],
            ]
        },
        queries: [
            {
                info: 'use skip + limit, expecting no results',
                query: {
                    'selector': {
                        'gender': {
                            '$eq': 'f'
                        },
                        'name': {
                            '$gt': 'baavgagzmr',
                            '$lte': 'mzahchkldk'
                        }
                    },
                    'skip': 1,
                    'limit': 5,
                    'sort': [
                        {
                            'gender': 'asc'
                        },
                        {
                            '_id': 'asc'
                        }
                    ],
                    'index': [
                        '_id'
                    ]
                },
                expectedResultDocIds: []
            },
            {
                info: 'use skip + limit, expecting one specific result',
                query: {
                    'selector': {
                        'age': {
                            '$gt': 3
                        },
                        'name': {
                            '$gt': 'enjpqcusiu',
                            '$lt': 'ircrnmjhkd'
                        }
                    },
                    'skip': 1,
                    'limit': 9,
                    'sort': [
                        {
                            'gender': 'asc'
                        },
                        {
                            '_id': 'asc'
                        }
                    ],
                    'index': [
                        '_id'
                    ]
                },
                expectedResultDocIds: ['eeeeee']
            },
        ],
    });
    /**
     * @link https://github.com/pubkey/rxdb/pull/6643
     */
    testCorrectQueries<{
        id: string;
        numberIndex?: number;
    }>({
        testTitle: 'issue: Inserting without an optional index field causes unexpected behavior',
        /**
         * IndexedDB has some non-indexable types, so this does not work in dexie.
         * @link https://github.com/pubkey/rxdb/pull/6643#issuecomment-2505310082
         */
        notRunIfTrue: () => config.storage.name.includes('dexie'),
        data: [
            {
                'id': 'aa',
                'numberIndex': 2,
            },
            {
                'id': 'bb'
            },
            {
                'id': 'cc',
                'numberIndex': 5,
            }
        ],
        schema: {
            primaryKey: 'id',
            type: 'object',
            version: 0,
            properties: {
                id: {
                    type: 'string',
                    maxLength: 20
                },
                numberIndex: {
                    type: 'number',
                    minimum: 1,
                    maximum: 40,
                    multipleOf: 1,
                }
            },
            indexes: ['numberIndex']
        },
        queries: [
            {
                info: 'without selector',
                query: {
                    'selector': {},
                    sort: [{ id: 'asc' }]
                },
                expectedResultDocIds: [
                    'aa',
                    'bb',
                    'cc'
                ]
            },
            {
                info: 'without selector and numberIndex',
                query: {
                    'selector': {},
                    sort: [{ numberIndex: 'asc' }]
                },
                expectedResultDocIds: [
                    'bb',
                    'aa',
                    'cc'
                ]
            }
        ],
    });
    /**
     * @link https://github.com/pubkey/rxdb/issues/6792
     * @link https://github.com/pubkey/rxdb/issues/6792#issuecomment-2624555824
     */
    testCorrectQueries<SimpleHumanV3DocumentType>({
        testTitle: 'Using undefined in a selector must have the same result in all storages',
        data: [
            {
                passportId: 'there',
                oneOptional: 'opt',
                age: 10
            },
            {
                passportId: 'not-there',
                // oneOptional: undefined,
                age: 10
            }
        ],
        schema: schemas.humanMinimal,
        queries: [
            {
                info: 'oneOptional is null',
                query: {
                    'selector': {
                        oneOptional: null
                    } as any,
                    sort: [{ passportId: 'asc' }]
                },
                expectedResultDocIds: [
                    'not-there'
                ]
            },
            {
                info: 'oneOptional does not exist in selector',
                query: {
                    'selector': {},
                    sort: [{ passportId: 'asc' }]
                },
                expectedResultDocIds: [
                    'not-there',
                    'there'
                ]
            },
            {
                info: 'oneOptional is empty object',
                query: {
                    'selector': {
                        oneOptional: {}
                    },
                    sort: [{ passportId: 'asc' }]
                },
                expectedResultDocIds: []
            },
        ],
    });
});
