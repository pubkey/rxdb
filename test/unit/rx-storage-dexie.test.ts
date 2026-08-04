import assert from 'assert';

import config from './config.ts';
import {
    randomToken,
    createRxDatabase
} from '../../plugins/core/index.mjs';

import {
    getDexieStoreSchema,
    fromDexieToStorage,
    fromStorageToDexie
} from '../../plugins/storage-dexie/index.mjs';
import {
    isDeno,
    isFastMode,
    isNode
} from '../../plugins/test-utils/index.mjs';
import {
    indexedDB as fakeIndexedDB
} from 'fake-indexeddb';

import { assertThrows } from 'async-test-util';

/**
 * RxStorageDexie specific tests
 */
describe('rx-storage-dexie.test.js', () => {
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
