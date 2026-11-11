import assert from 'assert';

import config from './config.ts';
import {
    randomToken,
    createRxDatabase,
    RxCollection
} from '../../plugins/core/index.mjs';
import type {
    RxCollection,
    RxJsonSchema
} from '../../plugins/core/index.mjs';

import {
    getRxStorageDexie,
    getDexieStoreSchema,
    getRxStorageDexie,
    fromDexieToStorage,
    fromStorageToDexie
} from '../../plugins/storage-dexie/index.mjs';
import { wrappedValidateAjvStorage } from '../../plugins/validate-ajv/index.mjs';
import {
    isDeno,
    isFastMode,
    isNode
} from '../../plugins/test-utils/index.mjs';
import {
    indexedDB as fakeIndexedDB,
    IDBKeyRange as fakeIDBKeyRange
} from 'fake-indexeddb';
import { wrappedValidateAjvStorage } from '../../plugins/validate-ajv/index.mjs';
import type { RxJsonSchema } from '../../plugins/core/index.mjs';

import { assertThrows } from 'async-test-util';

/**
 * RxStorageDexie specific tests
 */
describe('rx-storage-dexie.test.js', () => {
    /**
     * These tests create the dexie storage by themselves
     * so that they run with every DEFAULT_STORAGE.
     */
    describe('explicitly created dexie storage', () => {
        type TodoDocType = {
            id: string;
            name: string;
            assignee?: {
                name?: string;
            };
        };
        function getDexieStorage() {
            return wrappedValidateAjvStorage({
                storage: getRxStorageDexie({
                    indexedDB: fakeIndexedDB,
                    IDBKeyRange: fakeIDBKeyRange
                })
            });
        }
        function getTodoSchema(
            required: RxJsonSchema<TodoDocType>['required'],
            assigneeRequired?: string[]
        ): RxJsonSchema<TodoDocType> {
            return {
                version: 0,
                primaryKey: 'id',
                type: 'object',
                properties: {
                    id: {
                        type: 'string',
                        maxLength: 100
                    },
                    name: {
                        type: 'string'
                    },
                    assignee: {
                        type: 'object',
                        properties: {
                            name: {
                                type: 'string',
                                maxLength: 100
                            }
                        },
                        required: assigneeRequired
                    }
                },
                required,
                indexes: ['assignee.name']
            };
        }
        it('should throw on an index on a nested field that is not required on each level', async () => {
            const schemas = [
                // parent object is optional
                getTodoSchema(['id', 'name'], ['name']),
                // nested field is optional
                getTodoSchema(['id', 'name', 'assignee']),
                // both are optional
                getTodoSchema(['id', 'name'])
            ];
            for (const schema of schemas) {
                const db = await createRxDatabase<{ todos: RxCollection<TodoDocType>; }>({
                    name: randomToken(10),
                    storage: getDexieStorage()
                });
                await assertThrows(
                    () => db.addCollections({
                        todos: {
                            schema
                        }
                    }),
                    'RxError',
                    'DXE1'
                );
                await db.close();
            }
        });
        it('should find all documents when the nested index field is required on each level', async () => {
            const db = await createRxDatabase<{ todos: RxCollection<TodoDocType>; }>({
                name: randomToken(10),
                storage: getDexieStorage()
            });
            await db.addCollections({
                todos: {
                    schema: getTodoSchema(['id', 'name', 'assignee'], ['name'])
                }
            });
            await db.todos.bulkInsert([
                { id: 'todo1', name: 'Learn RxDB', assignee: { name: 'Alice' } },
                { id: 'todo2', name: 'Buy groceries', assignee: { name: 'Bob' } }
            ]);
            const all = await db.todos.find({ sort: [{ id: 'asc' }] }).exec();
            assert.deepStrictEqual(all.map(d => d.id), ['todo1', 'todo2']);
            const byIndex = await db.todos.find({
                selector: { 'assignee.name': 'Bob' }
            }).exec();
            assert.deepStrictEqual(byIndex.map(d => d.id), ['todo2']);
            await db.remove();
        });
    });
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
        /**
         * IndexedDB has some non-indexable types, so this does not work in dexie.
         * @link https://github.com/pubkey/rxdb/pull/6643#issuecomment-2505310082
         */
        it('should throw on optional index', async () => {
            const mySchema = {
                version: 0,
                primaryKey: 'id',
                type: 'object',
                properties: {
                    id: {
                        type: 'string',
                        maxLength: 100
                    },
                    numberIndex: {
                        type: 'number',
                        minimum: 1,
                        maximum: 40,
                        multipleOf: 1,
                    },
                },
                indexes: ['numberIndex']
            };
            const name = randomToken(10);
            const db = await createRxDatabase({
                name,
                storage: config.storage.getStorage(),
                eventReduce: true,
                ignoreDuplicate: true
            });
            await assertThrows(
                () => db.addCollections({
                    mycollection: {
                        schema: mySchema
                    }
                }),
                'RxError',
                'DXE1'
            );
            db.close();
        });
    });
    describe('issues', () => {
        /**
         * The reference counting in dexie-helper.ts never closed the
         * underlying Dexie connections and never evicted the state cache entry.
         * When the application afterwards deletes the IndexedDB databases,
         * for example on logout to remove user data from a shared device,
         * the leaked connections get force-closed by the delete request.
         * Creating a database with the same name again in the same JS context
         * then got the closed Dexie instance out of the cache and threw
         * DatabaseClosedError.
         * @link https://github.com/pubkey/rxdb/issues/8793
         */
        it('#8793 should create the database again after the IndexedDB databases were deleted', async () => {
            // in nodejs and deno the dexie tests run on fake-indexeddb, see config.ts
            const idb: any = (isNode || isDeno || isFastMode()) ? fakeIndexedDB : (globalThis as any).indexedDB;

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
                        type: 'string'
                    }
                }
            };
            const name = randomToken(10);
            const createDb = async () => {
                const database = await createRxDatabase({
                    name,
                    storage: config.storage.getStorage()
                });
                await database.addCollections({
                    mycollection: {
                        schema: mySchema
                    }
                });
                return database;
            };

            // create a database, insert a document and close it again
            const db = await createDb();
            await db.mycollection.insert({
                passportId: 'foobar',
                firstName: 'Bob'
            });
            await db.close();

            /**
             * Delete the IndexedDB databases that belong to the RxDatabase,
             * like an application does on logout.
             */
            const idbNames: string[] = (await idb.databases())
                .map((d: any) => d.name)
                .filter((dbName: string) => dbName.includes(name));
            assert.ok(idbNames.length > 0);
            await Promise.all(
                idbNames.map(dbName => new Promise<void>((res, rej) => {
                    const deleteRequest = idb.deleteDatabase(dbName);
                    deleteRequest.onsuccess = () => res();
                    deleteRequest.onerror = () => rej(deleteRequest.error);
                }))
            );

            // create the same database again
            const db2 = await createDb();
            await db2.mycollection.insert({
                passportId: 'foobar',
                firstName: 'Bob'
            });
            const doc = await db2.mycollection.findOne().exec(true);
            assert.strictEqual(doc.firstName, 'Bob');

            await db2.close();
        });
    });
});

/**
 * These tests create the dexie storage by themselves
 * so that they run independent of the DEFAULT_STORAGE.
 */
describe('rx-storage-dexie.test.js (own storage)', () => {
    function getOwnDexieStorage() {
        // in nodejs and deno the dexie tests run on fake-indexeddb, see config.ts
        const useFakeIndexedDB = isNode || isDeno || isFastMode();
        return wrappedValidateAjvStorage({
            storage: getRxStorageDexie(
                useFakeIndexedDB ? {
                    indexedDB: fakeIndexedDB,
                    IDBKeyRange: fakeIDBKeyRange
                } : {}
            )
        });
    }
    describe('document keys', () => {
        it('should not change keys that start with two underscores', async () => {
            type DocType = {
                id: string;
                data: {
                    [key: string]: any;
                };
            };
            const mySchema: RxJsonSchema<DocType> = {
                version: 0,
                primaryKey: 'id',
                type: 'object',
                properties: {
                    id: {
                        type: 'string',
                        maxLength: 100
                    },
                    data: {
                        type: 'object',
                        additionalProperties: true
                    }
                },
                required: ['id', 'data']
            };
            const name = randomToken(10);
            const createDb = async () => {
                const database = await createRxDatabase<{ mycollection: RxCollection<DocType>; }>({
                    name,
                    storage: getOwnDexieStorage()
                });
                await database.addCollections({
                    mycollection: {
                        schema: mySchema
                    }
                });
                return database;
            };
            const data = {
                __typename: 'Todo',
                '|pipe': 'foobar',
                plain: 'barfoo',
                nested: [{ __v: 1, '|v': 2 }]
            };

            const db = await createDb();
            await db.mycollection.insert({
                id: 'foobar',
                data
            });
            await db.close();

            // open the same database again so that the document is read out of the storage
            const db2 = await createDb();
            const doc = await db2.mycollection.findOne('foobar').exec(true);
            assert.deepStrictEqual(doc.toJSON().data, data);
            const queryResult = await db2.mycollection.find({
                selector: {
                    'data.__typename': 'Todo'
                }
            }).exec();
            assert.strictEqual(queryResult.length, 1);

            await db2.remove();
        });
    });
});
