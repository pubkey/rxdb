import assert from 'assert';

import config from './config';
import type {
    MangoQuery
} from '../../plugins/core';

import {
    NoSqlQueryBuilder,
    createQueryBuilder
} from '../../plugins/query-builder';


/**
 * This tests the plugin 'query-builder'
 */
config.parallel('query-builder.test.js', () => {
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

            // check builded json
            const builder2 = createQueryBuilder();
            builder2
                .where('age').gt(4)
                .where('name').ne('alice')
                .skip(startQuery.skip as number)
                .limit(startQuery.limit as number)
                .sort({ name: 'asc', lastname: 'desc' });
            const buildedJson = builder2.toJSON();
            assert.deepStrictEqual(startQuery, buildedJson.query);
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

            // check builded json
            const builder2 = createQueryBuilder();
            builder2
                .where('age').gt(5)
                .where('name').ne('alice');
            const buildedJson = builder2.toJSON();
            assert.deepStrictEqual(startQuery, buildedJson.query);
        });
        it('should have path', () => {
            const path = 'foobar';
            const builder2 = createQueryBuilder();
            builder2
                .where('age').gt(6)
                .where('name').ne('alice')
                .where(path);
            const buildedJson = builder2.toJSON();
            assert.strictEqual(buildedJson.path, path);
        });
        it('should work with big equal number', () => {
            const startQuery: MangoQuery = {
                selector: {
                    age: {
                        $gt: -9999999999999999999999999999
                    }
                },
                sort: [{ age: 'asc' }]
            };
            // check initial json
            const builder: NoSqlQueryBuilder = createQueryBuilder(startQuery);
            const initialJson = builder.toJSON();
            assert.deepStrictEqual(startQuery, initialJson.query);

            // check builded json
            const builder2 = createQueryBuilder();
            builder2
                .where('age')
                .gt(-9999999999999999999999999999)
                .sort('age');
            const buildedJson = builder2.toJSON();
            assert.deepStrictEqual(startQuery, buildedJson.query);
        });

    });
});
