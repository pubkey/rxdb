import assert from 'assert';
import {
    clone
} from 'async-test-util';

import config from './config';
import * as schemas from '../helper/schemas';

import {
    fillWithDefaultSettings,
    RxJsonSchema,
    getQueryPlan,
    normalizeMangoQuery,
    INDEX_MAX,
    lastOfArray,
    INDEX_MIN
} from '../../dist/es/index.js';


import type {
    RxDocumentData
} from '../../src/types';
import { HumanDocumentType } from '../helper/schemas';


config.parallel('query-planner.test.js', () => {
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
                const query = normalizeMangoQuery<HumanDocumentType>(
                    schema,
                    {
                        selector: {
                            age: {
                                $gt: 20
                            },
                            firstName: {
                                $gt: ''
                            }
                        }
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
        });
    });
    describe('.getQueryPlan()', () => {
        it('should pick the default index when no indexes specified in the schema', () => {
            const schema = getHumanSchemaWithIndexes([]);
            const query = normalizeMangoQuery<HumanDocumentType>(
                schema,
                {}
            );
            const queryPlan = getQueryPlan(
                schema,
                query
            );
            assert.deepStrictEqual(queryPlan.index, ['passportId']);
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
            const query = normalizeMangoQuery<HumanDocumentType>(
                schema,
                {
                    selector: {
                        age: {
                            $gte: 20
                        }
                    }
                }
            );
            const queryPlan = getQueryPlan(
                schema,
                query
            );
            assert.deepStrictEqual(queryPlan.index, ['age', 'passportId']);
            assert.strictEqual(queryPlan.startKeys[0], 20);
            assert.strictEqual(queryPlan.endKeys[0], INDEX_MAX);
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
        it('should use the best plan for an equals comparison', () => {
            const schema = getHumanSchemaWithIndexes([]);
            const query = normalizeMangoQuery<HumanDocumentType>(
                schema,
                {
                    selector: {
                        passportId: 'asdf'
                    }
                }
            );
            const queryPlan = getQueryPlan(
                schema,
                query
            );
            assert.deepStrictEqual(queryPlan.index, ['passportId']);
            assert.deepStrictEqual(queryPlan.startKeys[0], 'asdf');
            assert.deepStrictEqual(queryPlan.endKeys[0], 'asdf');
        });
    });
    describe('.isSelectorSatisfiedByIndex()', () => {
        const schema = getHumanSchemaWithIndexes([['age']]);
        it('should be true if satisfied', () => {
            const query = normalizeMangoQuery<HumanDocumentType>(
                schema,
                {
                    selector: {
                        age: {
                            $gt: 10,
                            $lt: 100
                        }
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
        it('should prefer the default index over one that has no fields of the query', () => {
            const schema = getHumanSchemaWithIndexes([['firstName']]);
            const query = normalizeMangoQuery<HumanDocumentType>(
                schema,
                {
                    selector: {
                        age: {
                            $eq: 10
                        }
                    }
                }
            );
            const queryPlan = getQueryPlan(
                schema,
                query
            );
            assert.deepStrictEqual(queryPlan.index, ['passportId']);
        });
        it('should prefer the index that reduces the read-count by having a non-minimal startKey', () => {
            const schema = getHumanSchemaWithIndexes([
                ['firstName', 'age'],
                ['age', 'firstName']
            ]);
            const query = normalizeMangoQuery<HumanDocumentType>(
                schema,
                {
                    selector: {
                        age: {
                            $eq: 10
                        }
                    }
                }
            );
            const queryPlan = getQueryPlan(
                schema,
                query
            );
            assert.deepStrictEqual(queryPlan.index, ['age', 'firstName', 'passportId']);
        });
        it('should prefer the index that matches the sort order, if no selector given', () => {
            const schema = getHumanSchemaWithIndexes([
                ['firstName', 'age'],
                ['age', 'firstName']
            ]);
            const query = normalizeMangoQuery<HumanDocumentType>(
                schema,
                {
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
            assert.deepStrictEqual(queryPlan.index, ['age', 'firstName', 'passportId']);
        });
        it('should prefer the index that matches the sort order, if selector for both fields is used', () => {
            const schema = getHumanSchemaWithIndexes([
                ['firstName', 'age'],
                ['age', 'firstName']
            ]);
            const query = normalizeMangoQuery<HumanDocumentType>(
                schema,
                {
                    selector: {
                        age: {
                            $gt: 20
                        },
                        firstName: {
                            $gt: 'aaa'
                        }
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
            assert.deepStrictEqual(queryPlan.index, ['age', 'firstName', 'passportId']);
        });
        it('should prefer indexing over the $eq operator over the $gt operator', () => {
            const schema = getHumanSchemaWithIndexes([
                ['firstName', 'age'],
                ['age', 'firstName']
            ]);
            const query = normalizeMangoQuery<HumanDocumentType>(
                schema,
                {
                    selector: {
                        age: {
                            $gt: 20
                        },
                        firstName: {
                            $eq: 'aaa'
                        }
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
            assert.deepStrictEqual(queryPlan.index, ['firstName', 'age', 'passportId']);
        });
        it('should have set sortFieldsSameAsIndexFields: false when order is desc', () => {
            const schema = getHumanSchemaWithIndexes([
                ['firstName', 'age'],
                ['age', 'firstName']
            ]);
            const query = normalizeMangoQuery<HumanDocumentType>(
                schema,
                {
                    selector: {},
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

            /**
             * Because on a 'desc'-sorting no index can be used,
             * it should use the default index.
             */
            assert.deepStrictEqual(queryPlan.index, ['passportId']);
            assert.strictEqual(queryPlan.sortFieldsSameAsIndexFields, false);
        });
    });
});
