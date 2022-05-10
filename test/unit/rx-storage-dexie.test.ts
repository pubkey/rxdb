import assert from 'assert';

import config from './config';
import {
    addRxPlugin,
    clone,
    ensureNotFalsy,
    fillWithDefaultSettings,
    getQueryPlan,
    MangoQuery,
    normalizeMangoQuery,
    normalizeRxJsonSchema,
    randomCouchString,
    RxJsonSchema
} from '../../';

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
import {
    HumanDocumentType,
    humanMinimal,
    humanSchemaLiteral,
    human
} from '../helper/schemas';

/**
 * RxStoragePouch specific tests
 */
config.parallel('rx-storage-dexie.test.js', () => {
    if (config.storage.name !== 'dexie') {
        return;
    }
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
                const query: MangoQuery<HumanDocumentType> = {
                    selector: {},
                    sort: [
                        { age: 'asc' }
                    ]
                }
                const schema = fillWithDefaultSettings(human);
                const preparedQuery = RxStorageDexieStatics.prepareQuery(
                    schema,
                    normalizeMangoQuery(schema, query)
                );
                const comparator = RxStorageDexieStatics.getSortComparator<HumanDocumentType>(
                    humanMinimal as any,
                    preparedQuery
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
                const schema = fillWithDefaultSettings(humanMinimal);
                const preparedQuery = RxStorageDexieStatics.prepareQuery(
                    schema,
                    normalizeMangoQuery(schema, query)
                );
                const matcher = RxStorageDexieStatics.getQueryMatcher(
                    schema,
                    preparedQuery
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
                            type: 'string',
                            maxLength: 100
                        }
                    }
                });
                assert.ok(dexieSchema.startsWith('id'));
            });
            it('should contains the indexes', () => {
                const dexieSchema = getDexieStoreSchema({
                    primaryKey: 'id',
                    type: 'object',
                    version: 0,
                    properties: {
                        id: {
                            type: 'string',
                            maxLength: 100
                        },
                        age: {
                            type: 'number'
                        }
                    },
                    indexes: [
                        ['age', 'id']
                    ]
                });
                assert.ok(dexieSchema.startsWith('id, [age+id]'));
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
                            type: 'string',
                            maxLength: 100
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

                const hasAgeField = queryPlan.index.def.fields.find((field: any) => Object.keys(field)[0] === 'age');
                assert.ok(hasAgeField);
                const hasKeyField = queryPlan.index.def.fields.find((field: any) => Object.keys(field)[0] === 'key');
                assert.ok(hasKeyField);
            });
        });
    });
    describe('.query()', () => {
        it('should respect a custom index', async () => {
            /**
             * This test should only run when dexie
             */
            assert.strictEqual(config.storage.name, 'dexie');

            const storage = config.storage.getStorage();

            let schema = clone(humanSchemaLiteral) as any;
            schema.indexes.push(['passportId', 'age']);
            /*
                        schema.indexes.push(['age']);
                        schema.indexes.push(['age', 'passportId']);
                        schema.indexes.push(['age', 'firstName', 'passportId']);
                        schema.indexes.push(['firstName', 'age', 'passportId']);
                        */
            schema = fillWithDefaultSettings(schema);

            const databaseName = randomCouchString(12);
            const storageInstance = await storage.createStorageInstance<HumanDocumentType>({
                databaseName,
                collectionName: randomCouchString(12),
                schema,
                options: {},
                multiInstance: false
            });

            await storageInstance.bulkWrite(
                new Array(5).fill(0).map(() => {
                    const data = schemaObjects.human() as any;
                    data._attachments = {};
                    data._deleted = false;
                    data.age = 18;
                    return {
                        document: data
                    }
                })
            );

            // const hasIndexes = await pouch.getIndexes();

            async function analyzeQuery(query: MangoQuery<HumanDocumentType>) {
                const preparedQuery = storage.statics.prepareQuery(
                    schema,
                    normalizeMangoQuery(schema, query)
                );
                const queryPlan = preparedQuery.queryPlan;
                const result = await storageInstance.query(preparedQuery);
                return {
                    query,
                    preparedQuery,
                    queryPlan,
                    result: result.documents
                };
            }

            const defaultAnalyzed = await analyzeQuery({
                selector: {},
                sort: [
                    { passportId: 'asc' }
                ]
            });

            const customIndexAnalyzed = await analyzeQuery({
                selector: {},
                sort: [
                    { passportId: 'asc' }
                ],
                index: ['passportId', 'age']
            });

            // default should use default index
            assert.deepStrictEqual(
                defaultAnalyzed.queryPlan.index,
                ['passportId']
            );

            // custom should use the custom index
            (customIndexAnalyzed.query as any).index.forEach((indexKey: string) => {
                if (indexKey !== 'passportId') {
                    assert.ok(ensureNotFalsy(customIndexAnalyzed.queryPlan.index).includes(indexKey));
                }
            });

            /**
             * The primaryPath must always be the last index field
             * to have deterministic sorting.
             */
            assert.ok(ensureNotFalsy(customIndexAnalyzed.queryPlan.index).includes('passportId'));

            // both queries should have returned the same documents
            assert.deepStrictEqual(
                defaultAnalyzed.result,
                customIndexAnalyzed.result
            );

            storageInstance.close();
        });
    });
});
