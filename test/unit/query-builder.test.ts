import assert from 'assert';
import clone from 'clone';

import config from './config';
import {
    createRxSchema,
    MangoQuery
} from '../../';
import * as RxDocument from '../../dist/lib/rx-document';
import * as util from '../../dist/lib/util';
import AsyncTestUtil from 'async-test-util';
import * as schemas from '../helper/schemas';
import * as schemaObjects from '../helper/schema-objects';
import * as humansCollection from '../helper/humans-collection';

import {
    NoSqlQueryBuilderClass,
    NoSqlQueryBuilder,
    createQueryBuilder
} from '../../dist/lib/plugins/query-builder/mquery/nosql-query-builder';


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
                .skip(startQuery.skip)
                .limit(startQuery.limit)
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
