import assert from 'assert';

import config from './config';
import {
    clone,
    ensureNotFalsy,
    fillWithDefaultSettings,
    MangoQuery,
    normalizeMangoQuery,
    randomCouchString,
    now,
    createRevision
} from '../../';

import {
    RxStorageDexieStatics,
    getDexieStoreSchema,
    fromDexieToStorage,
    fromStorageToDexie
} from '../../plugins/storage-dexie';

import * as schemaObjects from '../helper/schema-objects';
import {
    HumanDocumentType,
    humanMinimal,
    humanSchemaLiteral,
    human
} from '../helper/schemas';
import { assertThrows } from 'async-test-util';

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
                };
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
        describe('.fromStorageToDexie()', () => {
            it('should convert unsupported IndexedDB key', () => {
                const result = fromStorageToDexie(
                    {
                        '|key': 'value',
                        '|objectArray': [{ ['|id']: '1' }],
                        '|nestedObject': {
                            key: 'value2',
                            '|objectArray': [{ '|id': '2' }],
                            stringArray: ['415', '51'],
                            '|numberArray': [1, 2, 3],
                            '|falsyValue': null
                        }
                    }
                );
                assert.deepStrictEqual(result, {
                    '__key': 'value',
                    '__objectArray': [{ ['__id']: '1' }],
                    '__nestedObject': {
                        key: 'value2',
                        '__objectArray': [{ '__id': '2' }],
                        stringArray: ['415', '51'],
                        '__numberArray': [1, 2, 3],
                        '__falsyValue': null
                    }
                });
            });
        });
        describe('.fromDexieToStorage()', () => {
            it('should revert escaped unsupported IndexedDB key', () => {
                const result = fromDexieToStorage({
                    '__key': 'value',
                    '__objectArray': [{ ['__id']: '1' }],
                    '__nestedObject': {
                        key: 'value2',
                        '__objectArray': [{ '__id': '2' }],
                        stringArray: ['415', '51'],
                        '__numberArray': [1, 2, 3],
                        '__falsyValue': null
                    }
                }
                );
                assert.deepStrictEqual(result,
                    {
                        '|key': 'value',
                        '|objectArray': [{ ['|id']: '1' }],
                        '|nestedObject': {
                            key: 'value2',
                            '|objectArray': [{ '|id': '2' }],
                            stringArray: ['415', '51'],
                            '|numberArray': [1, 2, 3],
                            '|falsyValue': null
                        }
                    });
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
            const databaseInstanceToken = randomCouchString(10);
            const storageInstance = await storage.createStorageInstance<HumanDocumentType>({
                databaseInstanceToken,
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
                    data._meta = {
                        lwt: now()
                    };
                    data._rev = createRevision(databaseInstanceToken, data);
                    return {
                        document: data
                    };
                }),
                'dexie-test'
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
        /**
         * @link https://github.com/w3c/IndexedDB/issues/76
         */
        it('should throw the correct error on boolean index', async () => {
            const storage = config.storage.getStorage();

            let schema = clone(humanSchemaLiteral) as any;
            schema.properties.bool = {
                type: 'boolean'
            };
            schema.required.push('bool');
            schema.indexes.push(['bool', 'passportId']);
            schema = fillWithDefaultSettings(schema);

            await assertThrows(
                () => storage.createStorageInstance<HumanDocumentType>({
                    databaseInstanceToken: randomCouchString(10),
                    databaseName: randomCouchString(10),
                    collectionName: randomCouchString(12),
                    schema,
                    options: {},
                    multiInstance: false
                }),
                'RxError',
                'DXE1'
            );
        });
    });
});
