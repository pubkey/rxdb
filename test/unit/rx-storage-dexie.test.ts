import assert from 'assert';

import config, { describeParallel } from './config.ts';
import {
    clone,
    ensureNotFalsy,
    fillWithDefaultSettings,
    MangoQuery,
    normalizeMangoQuery,
    randomCouchString,
    now,
    createRevision,
    prepareQuery
} from '../../plugins/core/index.mjs';

import {
    getDexieStoreSchema,
    fromDexieToStorage,
    fromStorageToDexie
} from '../../plugins/storage-dexie/index.mjs';

import {
    schemaObjects,
    humanSchemaLiteral,
    HumanDocumentType
} from '../../plugins/test-utils/index.mjs';

/**
 * RxStorageDexie specific tests
 */
describeParallel('rx-storage-dexie.test.js', () => {
    if (config.storage.name !== 'dexie') {
        return;
    }
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
        });
        describe('.fromStorageToDexie()', () => {
            it('should convert unsupported IndexedDB key', () => {
                const result = fromStorageToDexie<any>(
                    ['_deleted'],
                    {
                        '|key': 'value',
                        '|objectArray': [{ ['|id']: '1' }],
                        '|nestedObject': {
                            key: 'value2',
                            '|objectArray': [{ '|id': '2' }],
                            stringArray: ['415', '51'],
                            '|numberArray': [1, 2, 3],
                            '|falsyValue': null
                        },
                        _deleted: false
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
                    },
                    '_deleted': '0'
                });
            });
        });
        describe('.fromDexieToStorage()', () => {
            it('should revert escaped unsupported IndexedDB key', () => {
                const result = fromDexieToStorage(['_deleted'], {
                    '__key': 'value',
                    '__objectArray': [{ ['__id']: '1' }],
                    '__nestedObject': {
                        key: 'value2',
                        '__objectArray': [{ '__id': '2' }],
                        stringArray: ['415', '51'],
                        '__numberArray': [1, 2, 3],
                        '__falsyValue': null
                    },
                    '_deleted': '1'
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
                        },
                        _deleted: true
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
                multiInstance: false,
                devMode: true
            });

            await storageInstance.bulkWrite(
                new Array(5).fill(0).map(() => {
                    const data = schemaObjects.humanData() as any;
                    data._attachments = {};
                    data._deleted = false;
                    data.age = 18;
                    data._meta = {
                        lwt: now()
                    };
                    data._rev = createRevision(databaseInstanceToken);
                    return {
                        document: data
                    };
                }),
                'dexie-test'
            );

            // const hasIndexes = await pouch.getIndexes();

            async function analyzeQuery(query: MangoQuery<HumanDocumentType>) {
                const preparedQuery = prepareQuery(
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
                index: ['_deleted', 'passportId', 'age']
            });

            // default should use default index
            assert.deepStrictEqual(
                defaultAnalyzed.queryPlan.index,
                ['_meta.lwt', 'passportId']
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
