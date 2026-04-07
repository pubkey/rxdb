import assert from 'assert';

import type {
    MangoQuery
} from '../../plugins/core/index.mjs';

import {
    NoSqlQueryBuilder,
    createQueryBuilder
} from '../../plugins/query-builder/index.mjs';

import { describeParallel } from './config.ts';

/**
 * This tests the plugin 'query-builder'
 */
describeParallel('query-builder.test.js', () => {
    describe('NoSqlQueryBuilder', () => {
        it('should make a basic roundtrip', () => {
            const startQuery: MangoQuery = {
                selector: {
                    age: {
                        $gt: 4
                    },
                    name: {
                        $ne: 'alice'
                    }
                },
                sort: [{ name: 'asc' }, { lastname: 'desc' }],
                skip: 3,
                limit: 2
            };

            // check initial json
            const builder: NoSqlQueryBuilder = createQueryBuilder(startQuery);
            const initialJson = builder.toJSON();
            assert.deepStrictEqual(startQuery, initialJson.query);

            // check built json
            const builder2 = createQueryBuilder();
            builder2
                .where('age').gt(4)
                .where('name').ne('alice')
                .skip(startQuery.skip as number)
                .limit(startQuery.limit as number)
                .sort({ name: 'asc', lastname: 'desc' });
            const builtJson = builder2.toJSON();
            assert.deepStrictEqual(startQuery, builtJson.query);
        });
        it('should work with only the selector', () => {
            const startQuery: MangoQuery = {
                selector: {
                    age: {
                        $gt: 5
                    },
                    name: {
                        $ne: 'alice'
                    }
                }
            };
            // check initial json
            const builder: NoSqlQueryBuilder = createQueryBuilder(startQuery);
            const initialJson = builder.toJSON();
            assert.deepStrictEqual(startQuery, initialJson.query);

            // check built json
            const builder2 = createQueryBuilder();
            builder2
                .where('age').gt(5)
                .where('name').ne('alice');
            const builtJson = builder2.toJSON();
            assert.deepStrictEqual(startQuery, builtJson.query);
        });
        it('should have path', () => {
            const path = 'foobar';
            const builder2 = createQueryBuilder();
            builder2
                .where('age').gt(6)
                .where('name').ne('alice')
                .where(path);
            const builtJson = builder2.toJSON();
            assert.strictEqual(builtJson.path, path);
        });
        it('should work with big equal number', () => {
            const startQuery: MangoQuery = {
                selector: {
                    age: {
                        $gt: -999999999999999
                    }
                },
                sort: [{ age: 'asc' }]
            };
            // check initial json
            const builder: NoSqlQueryBuilder = createQueryBuilder(startQuery);
            const initialJson = builder.toJSON();
            assert.deepStrictEqual(startQuery, initialJson.query);

            // check built json
            const builder2 = createQueryBuilder();
            builder2
                .where('age')
                .gt(-999999999999999)
                .sort('age');
            const builtJson = builder2.toJSON();
            assert.deepStrictEqual(startQuery, builtJson.query);
        });

        it('eq() should use $eq operator so it can coexist with other operators on the same field', () => {
            // Using eq() should store as { $eq: value } not as a raw primitive,
            // so that chaining another operator on the same field does not silently
            // overwrite the equality condition.
            const builder = createQueryBuilder();
            builder
                .where('age').eq(25)
                .where('age').gt(20);
            const result = builder.toJSON();
            assert.deepStrictEqual(result.query.selector, {
                age: {
                    $eq: 25,
                    $gt: 20
                }
            });
        });
        it('equals() should use $eq operator so it can coexist with other operators on the same field', () => {
            const builder = createQueryBuilder();
            builder
                .where('age').equals(25)
                .where('age').gt(20);
            const result = builder.toJSON();
            assert.deepStrictEqual(result.query.selector, {
                age: {
                    $eq: 25,
                    $gt: 20
                }
            });
        });
        it('operator followed by eq() should preserve both conditions', () => {
            const builder = createQueryBuilder();
            builder
                .where('age').gt(20)
                .where('age').eq(25);
            const result = builder.toJSON();
            assert.deepStrictEqual(result.query.selector, {
                age: {
                    $gt: 20,
                    $eq: 25
                }
            });
        });
        it('selector shorthand value should be preserved when chaining another operator on the same field', () => {
            // When a selector uses shorthand syntax (e.g., { age: 5 } instead of { age: { $eq: 5 } }),
            // chaining another operator on the same field should preserve the implicit equality condition.
            const builder = createQueryBuilder<{ age: number; }>({
                selector: {
                    age: 5
                }
            });
            builder.where('age').gt(3);
            const result = builder.toJSON();
            assert.deepStrictEqual(result.query.selector, {
                age: {
                    $eq: 5,
                    $gt: 3
                }
            });
        });
        it('selector shorthand null value should be preserved when chaining another operator', () => {
            const builder = createQueryBuilder<{ name: string | null; }>({
                selector: {
                    name: null
                }
            });
            builder.where('name').ne('bar');
            const result = builder.toJSON();
            assert.deepStrictEqual(result.query.selector, {
                name: {
                    $eq: null,
                    $ne: 'bar'
                }
            });
        });
    });
});
