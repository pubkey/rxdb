import assert from 'assert';

import config from './config';
import {
    addRxPlugin,
    MangoQuery,
    randomCouchString,
    RxJsonSchema
} from '../../plugins/core';

import {
    RxStorageDexieStatics,
    getPouchQueryPlan,
    getDexieStoreSchema
} from '../../plugins/dexie';

import * as schemaObjects from '../helper/schema-objects';

import { RxDBKeyCompressionPlugin } from '../../plugins/key-compression';
addRxPlugin(RxDBKeyCompressionPlugin);
import { RxDBValidatePlugin } from '../../plugins/validate';
addRxPlugin(RxDBValidatePlugin);
import { humanMinimal } from '../helper/schemas';

/**
 * RxStoragePouch specific tests
 */
config.parallel('rx-storage-dexie.test.js', () => {
    describe('RxStorageDexieStatics', () => {
        describe('.getSortComparator()', () => {
            it('should sort in the correct order', () => {
                const docA = schemaObjects.human(
                    randomCouchString(10),
                    1
                );
                const docB = schemaObjects.human(
                    randomCouchString(10),
                    2
                );
                const query: MangoQuery = {
                    selector: {},
                    sort: [
                        { age: 'asc' }
                    ]
                }
                const comparator = RxStorageDexieStatics.getSortComparator(
                    humanMinimal,
                    query
                );
                const sortResult = comparator(docA, docB);
                assert.strictEqual(sortResult, -1);
                const sortResultReverse = comparator(docB, docA);
                assert.strictEqual(sortResultReverse, 1);
            });
        });
        describe('.getQueryMatcher()', () => {
            it('should find the matching document', () => {
                const docMatching = schemaObjects.human(
                    randomCouchString(10),
                    1
                );
                const docNotMatching = schemaObjects.human(
                    randomCouchString(10),
                    2
                );
                const query: MangoQuery = {
                    selector: {
                        age: 1
                    }
                };
                const matcher = RxStorageDexieStatics.getQueryMatcher(
                    humanMinimal,
                    query
                );
                const matching = matcher(docMatching as any);
                assert.ok(matching);

                const notMatching = matcher(docNotMatching as any);
                assert.strictEqual(notMatching, false);
            });
        });
    });
    describe('helper', () => {
        describe('.getDexieStoreSchema()', () => {
            it('should start with the primary key', () => {
                const dexieSchema = getDexieStoreSchema({
                    primaryKey: 'id',
                    type: 'object',
                    version: 0,
                    properties: {
                        id: {
                            type: 'string'
                        }
                    }
                });
                assert.strictEqual(dexieSchema, 'id');
            });
            it('should contains the indees', () => {
                const dexieSchema = getDexieStoreSchema({
                    primaryKey: 'id',
                    type: 'object',
                    version: 0,
                    properties: {
                        id: {
                            type: 'string'
                        },
                        age: {
                            type: 'number'
                        }
                    },
                    indexes: [
                        ['age', 'id']
                    ]
                });
                assert.strictEqual(dexieSchema, 'id, [age+id]');
            });
        });
    });
    describe('query', () => {
        describe('.getPouchQueryPlan()', () => {
            it('should use the correct index', () => {
                const schema: RxJsonSchema<any> = {
                    version: 0,
                    primaryKey: 'key',
                    type: 'object',
                    properties: {
                        key: {
                            type: 'string'
                        },
                        age: {
                            type: 'number'
                        }
                    },
                    indexes: [
                        ['age', 'key']
                    ]
                };

                const queryPlan = getPouchQueryPlan(
                    schema,
                    {
                        selector: {
                            age: {
                                $gt: 18
                            }
                        },
                        sort: [
                            { age: 'asc' },
                            { key: 'asc' }
                        ],
                        limit: 5,
                        skip: 1
                    }
                );

                assert.ok(queryPlan.index.name.includes('age'));
                assert.ok(queryPlan.index.name.includes('key'));
            });
        });
    });
});
