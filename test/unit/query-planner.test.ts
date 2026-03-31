import assert from 'assert';
import {
    clone
} from 'async-test-util';

import config, { describeParallel } from './config.ts';
import {
    schemas,
    HumanDocumentType
} from '../../plugins/test-utils/index.mjs';

import {
    fillWithDefaultSettings,
    RxJsonSchema,
    getQueryPlan,
    normalizeMangoQuery,
    INDEX_MAX,
    lastOfArray,
    INDEX_MIN,
    randomToken,
    createRxDatabase,
    rateQueryPlan
} from '../../plugins/core/index.mjs';


import type {
    RxDocumentData
} from '../../plugins/core/index.mjs';


describeParallel('query-planner.test.js', () => {
    function getHumanSchemaWithIndexes(
        indexes: string[][]
    ): RxJsonSchema<RxDocumentData<HumanDocumentType>> {
        const schema = clone(schemas.human);
        schema.indexes = indexes;
        return fillWithDefaultSettings(schema);
    }

    describe('.normalizeMangoQuery()', () => {
        describe('fill up the sort', () => {
            it('should use the index fields as default sort, if index is provided', () => {
                const schema = getHumanSchemaWithIndexes([['age', 'firstName']]);
                const query = normalizeMangoQuery<HumanDocumentType>(
                    schema,
                    {
                        index: ['age', 'firstName']
                    }
                );
                assert.deepStrictEqual(
                    query.sort,
                    [
                        { age: 'asc' },
                        { firstName: 'asc' },
                        { passportId: 'asc' }
                    ]
                );
            });
            it('should use the logical operators if no index is provided', () => {
                const schema = getHumanSchemaWithIndexes([
                    ['age', 'firstName'],
                    ['lastName', 'firstName']
                ]);
                const query = normalizeMangoQuery<RxDocumentData<HumanDocumentType>>(
                    schema,
                    {
                        selector: {
                            age: {
                                $gt: 20
                            },
                            firstName: {
                                $gt: ''
                            },
                            _deleted: false
                        }
                    }
                );

                assert.deepStrictEqual(
                    query.sort,
                    [
                        { _deleted: 'asc' },
                        { age: 'asc' },
                        { firstName: 'asc' },
                        { passportId: 'asc' }
                    ]
                );
            });
        });
        describe('normalize selector shorthands', () => {
            it('should normalize top-level shorthand selectors to $eq', () => {
                const schema = getHumanSchemaWithIndexes([]);
                const query = normalizeMangoQuery<HumanDocumentType>(
                    schema,
                    {
                        selector: {
                            firstName: 'bar',
                            age: 10
                        },
                        sort: [{ passportId: 'asc' }]
                    }
                );
                assert.deepStrictEqual(
                    (query.selector as any).firstName,
                    { $eq: 'bar' }
                );
                assert.deepStrictEqual(
                    (query.selector as any).age,
                    { $eq: 10 }
                );
            });
            it('should normalize shorthands inside $and', () => {
                const schema = getHumanSchemaWithIndexes([]);
                const query = normalizeMangoQuery<HumanDocumentType>(
                    schema,
                    {
                        selector: {
                            $and: [
                                { firstName: 'Alice' },
                                { age: 30 }
                            ]
                        } as any,
                        sort: [{ passportId: 'asc' }]
                    }
                );
                const $and = (query.selector as any).$and;
                assert.deepStrictEqual($and[0].firstName, { $eq: 'Alice' });
                assert.deepStrictEqual($and[1].age, { $eq: 30 });
            });
            it('should normalize shorthands inside $or', () => {
                const schema = getHumanSchemaWithIndexes([]);
                const query = normalizeMangoQuery<HumanDocumentType>(
                    schema,
                    {
                        selector: {
                            $or: [
                                { firstName: 'Alice' },
                                { firstName: 'Bob' }
                            ]
                        } as any,
                        sort: [{ passportId: 'asc' }]
                    }
                );
                const $or = (query.selector as any).$or;
                assert.deepStrictEqual($or[0].firstName, { $eq: 'Alice' });
                assert.deepStrictEqual($or[1].firstName, { $eq: 'Bob' });
            });
            it('should normalize shorthands inside $nor', () => {
                const schema = getHumanSchemaWithIndexes([]);
                const query = normalizeMangoQuery<HumanDocumentType>(
                    schema,
                    {
                        selector: {
                            $nor: [
                                { firstName: 'Alice' }
                            ]
                        } as any,
                        sort: [{ passportId: 'asc' }]
                    }
                );
                const $nor = (query.selector as any).$nor;
                assert.deepStrictEqual($nor[0].firstName, { $eq: 'Alice' });
            });
            it('should normalize shorthands inside $not', () => {
                const schema = getHumanSchemaWithIndexes([]);
                const query = normalizeMangoQuery<HumanDocumentType>(
                    schema,
                    {
                        selector: {
                            $not: {
                                firstName: 'Alice'
                            }
                        } as any,
                        sort: [{ passportId: 'asc' }]
                    }
                );
                const $not = (query.selector as any).$not;
                assert.deepStrictEqual($not.firstName, { $eq: 'Alice' });
            });
            it('should normalize shorthands in deeply nested $and inside $or', () => {
                const schema = getHumanSchemaWithIndexes([]);
                const query = normalizeMangoQuery<HumanDocumentType>(
                    schema,
                    {
                        selector: {
                            $or: [
                                {
                                    $and: [
                                        { firstName: 'Alice' },
                                        { age: 30 }
                                    ]
                                },
                                { firstName: 'Bob' }
                            ]
                        } as any,
                        sort: [{ passportId: 'asc' }]
                    }
                );
                const $or = (query.selector as any).$or;
                assert.deepStrictEqual($or[0].$and[0].firstName, { $eq: 'Alice' });
                assert.deepStrictEqual($or[0].$and[1].age, { $eq: 30 });
                assert.deepStrictEqual($or[1].firstName, { $eq: 'Bob' });
            });
            it('should not modify selectors that already use operators', () => {
                const schema = getHumanSchemaWithIndexes([]);
                const query = normalizeMangoQuery<HumanDocumentType>(
                    schema,
                    {
                        selector: {
                            $and: [
                                { age: { $gt: 20 } },
                                { firstName: 'Alice' }
                            ]
                        } as any,
                        sort: [{ passportId: 'asc' }]
                    }
                );
                const $and = (query.selector as any).$and;
                assert.deepStrictEqual($and[0].age, { $gt: 20 });
                assert.deepStrictEqual($and[1].firstName, { $eq: 'Alice' });
            });
            it('should normalize shorthands inside $elemMatch', () => {
                const schema = getHumanSchemaWithIndexes([]);
                const query = normalizeMangoQuery<HumanDocumentType>(
                    schema,
                    {
                        selector: {
                            firstName: {
                                $elemMatch: {
                                    age: 30,
                                    lastName: 'Smith'
                                }
                            }
                        } as any,
                        sort: [{ passportId: 'asc' }]
                    }
                );
                const $elemMatch = (query.selector as any).firstName.$elemMatch;
                assert.deepStrictEqual($elemMatch.age, { $eq: 30 });
                assert.deepStrictEqual($elemMatch.lastName, { $eq: 'Smith' });
            });
            it('should not modify $elemMatch selectors that already use operators', () => {
                const schema = getHumanSchemaWithIndexes([]);
                const query = normalizeMangoQuery<HumanDocumentType>(
                    schema,
                    {
                        selector: {
                            firstName: {
                                $elemMatch: {
                                    age: { $gt: 20 },
                                    lastName: 'Smith'
                                }
                            }
                        } as any,
                        sort: [{ passportId: 'asc' }]
                    }
                );
                const $elemMatch = (query.selector as any).firstName.$elemMatch;
                assert.deepStrictEqual($elemMatch.age, { $gt: 20 });
                assert.deepStrictEqual($elemMatch.lastName, { $eq: 'Smith' });
            });
            it('should normalize $elemMatch inside $and', () => {
                const schema = getHumanSchemaWithIndexes([]);
                const query = normalizeMangoQuery<HumanDocumentType>(
                    schema,
                    {
                        selector: {
                            $and: [
                                {
                                    firstName: {
                                        $elemMatch: {
                                            age: 25
                                        }
                                    }
                                }
                            ]
                        } as any,
                        sort: [{ passportId: 'asc' }]
                    }
                );
                const $elemMatch = (query.selector as any).$and[0].firstName.$elemMatch;
                assert.deepStrictEqual($elemMatch.age, { $eq: 25 });
            });
            it('should handle null values in nested selectors', () => {
                const schema = getHumanSchemaWithIndexes([]);
                const query = normalizeMangoQuery<HumanDocumentType>(
                    schema,
                    {
                        selector: {
                            $or: [
                                { firstName: null as any }
                            ]
                        } as any,
                        sort: [{ passportId: 'asc' }]
                    }
                );
                const $or = (query.selector as any).$or;
                assert.deepStrictEqual($or[0].firstName, { $eq: null });
            });
        });
    });
    describe('.getQueryPlan()', () => {
        it('should pick the default index when no indexes specified in the schema', () => {
            const schema = getHumanSchemaWithIndexes([]);
            const query = normalizeMangoQuery<HumanDocumentType>(
                schema,
                {
                    sort: [{ passportId: 'asc' }]
                }
            );
            const queryPlan = getQueryPlan(
                schema,
                query
            );
            assert.deepStrictEqual(queryPlan.index, ['_meta.lwt', 'passportId']);
        });
        it('should respect the given index', () => {
            const customSetIndex = ['firstName'];
            const schema = getHumanSchemaWithIndexes([customSetIndex]);
            const query = normalizeMangoQuery<HumanDocumentType>(
                schema,
                {
                    index: customSetIndex
                }
            );
            const queryPlan = getQueryPlan(
                schema,
                query
            );
            assert.deepStrictEqual(queryPlan.index, ['firstName', 'passportId']);
        });
        it('should have the correct start- and end keys', () => {
            const schema = getHumanSchemaWithIndexes([['age']]);
            const query = normalizeMangoQuery<RxDocumentData<HumanDocumentType>>(
                schema,
                {
                    selector: {
                        age: {
                            $gte: 20
                        },
                        _deleted: false
                    }
                }
            );
            const queryPlan = getQueryPlan(
                schema,
                query
            );

            assert.deepStrictEqual(queryPlan.index, ['_deleted', 'age', 'passportId']);
            assert.strictEqual(queryPlan.startKeys[1], 20);
            assert.strictEqual(queryPlan.endKeys[1], INDEX_MAX);
            assert.ok(queryPlan.inclusiveStart);
        });
        it('should have the correct start- and end keys when inclusiveStart and inclusiveEnd are false', () => {
            const schema = getHumanSchemaWithIndexes([['age']]);
            const query = normalizeMangoQuery<HumanDocumentType>(
                schema,
                {
                    selector: {
                        age: {
                            $gt: 20,
                            $lt: 80
                        }
                    },
                    index: ['age']
                }
            );
            const queryPlan = getQueryPlan<HumanDocumentType>(
                schema,
                query
            );
            assert.deepStrictEqual(queryPlan.index, ['age', 'passportId']);
            assert.strictEqual(queryPlan.startKeys[0], 20);
            assert.strictEqual(queryPlan.endKeys[0], 80);

            assert.strictEqual(queryPlan.inclusiveStart, false);
            assert.strictEqual(queryPlan.inclusiveEnd, false);

            assert.strictEqual(lastOfArray(queryPlan.startKeys), INDEX_MAX);
            assert.strictEqual(lastOfArray(queryPlan.endKeys), INDEX_MIN);
        });
    });
    describe('.isSelectorSatisfiedByIndex()', () => {
        const schema = getHumanSchemaWithIndexes([['age']]);
        it('should be true if satisfied', () => {
            const query = normalizeMangoQuery<RxDocumentData<HumanDocumentType>>(
                schema,
                {
                    selector: {
                        age: {
                            $gt: 10,
                            $lt: 100
                        },
                        _deleted: false
                    }
                }
            );
            const queryPlan = getQueryPlan(
                schema,
                query
            );
            assert.ok(queryPlan.selectorSatisfiedByIndex);
        });
        it('should be false if non logic operator is used', () => {
            const query = normalizeMangoQuery<HumanDocumentType>(
                schema,
                {
                    selector: {
                        age: {
                            $gt: 10,
                            $lt: 100,
                            $elemMatch: {
                                foo: 'bar'
                            }
                        }
                    }
                }
            );
            const queryPlan = getQueryPlan(
                schema,
                query
            );
            assert.strictEqual(queryPlan.selectorSatisfiedByIndex, false);
        });
        it('should be false if non-index field is queried operator is used', () => {
            const query = normalizeMangoQuery<HumanDocumentType>(
                schema,
                {
                    selector: {
                        age: {
                            $gt: 10
                        },
                        lastName: 'foo'
                    },
                    index: ['age']
                }
            );
            const queryPlan = getQueryPlan(
                schema,
                query
            );
            assert.strictEqual(queryPlan.selectorSatisfiedByIndex, false);
        });
    });

    describe('always prefer the better index', () => {
        it('should prefer the index that reduces the read-count by having a non-minimal startKey', () => {
            const schema = getHumanSchemaWithIndexes([
                ['firstName', 'age'],
                ['age', 'firstName']
            ]);
            const query = normalizeMangoQuery<RxDocumentData<HumanDocumentType>>(
                schema,
                {
                    selector: {
                        age: {
                            $eq: 10
                        },
                        _deleted: false
                    }
                }
            );
            const queryPlan = getQueryPlan(
                schema,
                query
            );
            assert.deepStrictEqual(queryPlan.index, ['_deleted', 'age', 'firstName', 'passportId']);
        });
        it('should prefer the index that matches the sort order, if no selector given', () => {
            const schema = getHumanSchemaWithIndexes([
                ['firstName', 'age'],
                ['age', 'firstName']
            ]);
            const query = normalizeMangoQuery<RxDocumentData<HumanDocumentType>>(
                schema,
                {
                    selector: {
                        _deleted: false
                    },
                    sort: [
                        { age: 'asc' },
                        { firstName: 'asc' }
                    ]
                }
            );
            const queryPlan = getQueryPlan(
                schema,
                query
            );
            assert.deepStrictEqual(queryPlan.index, ['_deleted', 'age', 'firstName', 'passportId']);
            assert.ok(queryPlan.selectorSatisfiedByIndex);
            assert.ok(queryPlan.sortSatisfiedByIndex);
        });
        it('should prefer the index that matches the sort order, if selector for both fields is used', () => {
            const schema = getHumanSchemaWithIndexes([
                ['firstName', 'age'],
                ['age', 'firstName']
            ]);
            const query = normalizeMangoQuery<RxDocumentData<HumanDocumentType>>(
                schema,
                {
                    selector: {
                        age: {
                            $gt: 20
                        },
                        firstName: {
                            $gt: 'aaa'
                        },
                        _deleted: false
                    },
                    sort: [
                        { age: 'asc' },
                        { firstName: 'asc' }
                    ]
                }
            );
            const queryPlan = getQueryPlan(
                schema,
                query
            );
            assert.deepStrictEqual(queryPlan.index, ['_deleted', 'age', 'firstName', 'passportId']);
            assert.ok(queryPlan.sortSatisfiedByIndex);
        });
        it('should prefer indexing over the $eq operator over the $gt operator', () => {
            const schema = getHumanSchemaWithIndexes([
                ['firstName', 'age'],
                ['age', 'firstName']
            ]);
            const query = normalizeMangoQuery<RxDocumentData<HumanDocumentType>>(
                schema,
                {
                    selector: {
                        age: {
                            $gt: 20
                        },
                        firstName: {
                            $eq: 'aaa'
                        },
                        _deleted: false
                    },
                    sort: [
                        { age: 'asc' },
                        { firstName: 'asc' }
                    ]
                }
            );
            const queryPlan = getQueryPlan(
                schema,
                query
            );
            assert.deepStrictEqual(queryPlan.index, ['_deleted', 'firstName', 'age', 'passportId']);
        });
        it('should treat enum fields with $eq as sort-irrelevant', () => {
            const schema: RxJsonSchema<RxDocumentData<any>> = fillWithDefaultSettings({
                version: 0,
                primaryKey: 'id',
                type: 'object',
                properties: {
                    id: {
                        type: 'string',
                        maxLength: 100
                    },
                    status: {
                        type: 'string',
                        enum: ['active', 'inactive', 'pending'],
                        maxLength: 20
                    },
                    age: {
                        type: 'integer',
                        minimum: 0,
                        maximum: 150,
                        multipleOf: 1
                    }
                },
                indexes: [
                    ['status', 'age']
                ],
                required: ['id', 'status', 'age']
            });
            const query = normalizeMangoQuery<RxDocumentData<any>>(
                schema,
                {
                    selector: {
                        status: {
                            $eq: 'active'
                        },
                        _deleted: false
                    },
                    sort: [
                        { age: 'asc' }
                    ]
                }
            );
            const queryPlan = getQueryPlan(
                schema,
                query
            );
            /**
             * The enum field 'status' with $eq should be treated as sort-irrelevant,
             * so sortSatisfiedByIndex should be true when the remaining sort
             * fields match the index order.
             */
            assert.ok(queryPlan.sortSatisfiedByIndex);
        });
        it('should have set sortSatisfiedByIndex=false when order is desc', () => {
            const schema = getHumanSchemaWithIndexes([
                ['firstName', 'age'],
                ['age', 'firstName']
            ]);
            const query = normalizeMangoQuery<RxDocumentData<HumanDocumentType>>(
                schema,
                {
                    selector: {
                        _deleted: false
                    },
                    sort: [
                        { age: 'desc' },
                        { firstName: 'asc' }
                    ]
                }
            );
            const queryPlan = getQueryPlan(
                schema,
                query
            );
            assert.strictEqual(queryPlan.sortSatisfiedByIndex, false);
        });
        it('rateQueryPlan should rate endKeys constraints ($lte) higher than no constraint', () => {
            const schema = getHumanSchemaWithIndexes([['age']]);

            // Query with only an upper bound ($lte) sets endKey but NOT startKey
            const queryWithUpper = normalizeMangoQuery<HumanDocumentType>(
                schema,
                {
                    selector: {
                        age: {
                            $lte: 50
                        }
                    },
                    index: ['age']
                }
            );
            const planWithUpper = getQueryPlan(schema, queryWithUpper);

            // Query with no selector at all (full table scan)
            const queryNoSelector = normalizeMangoQuery<HumanDocumentType>(
                schema,
                {
                    selector: {},
                    index: ['age']
                }
            );
            const planNoSelector = getQueryPlan(schema, queryNoSelector);

            const ratingWithUpper = rateQueryPlan(schema, queryWithUpper, planWithUpper);
            const ratingNoSelector = rateQueryPlan(schema, queryNoSelector, planNoSelector);

            /**
             * The plan with an $lte constraint should be rated higher
             * because its endKey is a specific value (50) rather than INDEX_MAX.
             * Previously, rateQueryPlan() checked startKeys twice instead of
             * checking endKeys, so both plans would receive the same rating.
             */
            assert.ok(
                ratingWithUpper > ratingNoSelector,
                'query with $lte endKey constraint should be rated higher than query with no constraint. ' +
                'Got ratingWithUpper=' + ratingWithUpper + ', ratingNoSelector=' + ratingNoSelector
            );
        });
    });
    describe('issues', () => {
        it('#6925 col.find() ignores the primaryKey index if another index was defined', async () => {
            const mySchema = {
                version: 0,
                primaryKey: 'passportId',
                type: 'object',
                properties: {
                    passportId: {
                        type: 'string',
                        maxLength: 100
                    },
                    firstName: {
                        type: 'string',
                        maxLength: 50
                    },
                    lastName: {
                        type: 'string'
                    },
                    age: {
                        type: 'integer',
                        minimum: 0,
                        maximum: 150
                    }
                },
                indexes: ['firstName'],
                required: ['firstName']
            };

            const name = randomToken(10);
            const db = await createRxDatabase({
                name,
                storage: config.storage.getStorage(),
                eventReduce: true,
                ignoreDuplicate: true
            });
            const collections = await db.addCollections({
                mycollection: {
                    schema: mySchema
                }
            });
            await collections.mycollection.insert({
                passportId: 'foobar',
                firstName: 'Bob',
                lastName: 'Kelso',
                age: 56
            });
            const myDocumentQuery = await collections.mycollection.find();

            const preparedQuery = await myDocumentQuery.getPreparedQuery();

            /**
             * Should have sortSatisfiedByIndex: true
             * and do NOT make a full table scan!
             */
            assert.strictEqual(preparedQuery.queryPlan.sortSatisfiedByIndex, true);
            assert.strictEqual(preparedQuery.queryPlan.selectorSatisfiedByIndex, true);

            db.close();
        });
    });
});
