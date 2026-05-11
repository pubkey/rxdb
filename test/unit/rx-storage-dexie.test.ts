import assert from 'assert';

import config, { describeParallel } from './config.ts';
import {
    randomToken,
    createRxDatabase
} from '../../plugins/core/index.mjs';

import {
    getDexieStoreSchema,
    fromDexieToStorage,
    fromStorageToDexie
} from '../../plugins/storage-dexie/index.mjs';

import { assertThrows } from 'async-test-util';

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
    /**
     * Regression test for the dexie 4.0.10 → 4.4.2 bump (this PR).
     *
     * Background: pre-dexie-4.2.1, when the underlying IndexedDB connection
     * was closed externally (e.g. iOS Safari evicting the WebKit Storage
     * XPC process under memory pressure / app backgrounding — known as
     * "jetsam"), Dexie's `idbdb.onclose` handler refired the `close` event
     * but did NOT call `db.close()` itself. As a result `Dexie.isOpen()`
     * kept returning `true` while the underlying connection was dead, and
     * the next IDB operation issued by RxDB `bulkWrite` (or any `get` /
     * `getAll`) opened a transaction against the dead connection. The
     * transaction's first op then threw:
     *   - "AbortError: Transaction aborted"
     *   - "BulkError: Attempt to delete range from database without an
     *      in-progress transaction"
     *   - "UnknownError: Attempt to get a record from database without an
     *      in-progress transaction"
     *
     * Reported and tracked at:
     *   - dexie issue #2186: https://github.com/dexie/Dexie.js/issues/2186
     *   - dexie PR    #2187: https://github.com/dexie/Dexie.js/pull/2187
     *
     * Fixed in dexie 4.2.1 by changing the onclose handler in
     * `src/classes/dexie/dexie-open.ts` to call
     * `db.close({ disableAutoOpen: false })` so the state transitions
     * consistently with explicit `db.close()`.
     */
    describe('issue #2186 — external IDB closure must transition Dexie to closed', () => {
        it('idbdb.onclose makes Dexie isOpen() return false (regression for iOS Safari jetsam)', async () => {
            const mySchema = {
                version: 0,
                primaryKey: 'id',
                type: 'object',
                properties: {
                    id: { type: 'string', maxLength: 100 }
                }
            };
            const db = await createRxDatabase({
                name: randomToken(10),
                storage: config.storage.getStorage(),
                eventReduce: true,
                ignoreDuplicate: true
            });
            const cols = await db.addCollections({
                items: { schema: mySchema }
            });

            // Reach the underlying Dexie instance through the dexie storage adapter.
            const internals: any = await cols.items.storageInstance.internals;
            const dexieDb: any = internals.dexieDb;
            assert.ok(dexieDb, 'expected dexie internals to expose dexieDb');
            assert.strictEqual(dexieDb.isOpen(), true);

            // Simulate iOS Safari jetsam: the underlying IDBDatabase fires
            // `close` externally. Pre-4.2.1 dexie just refired the event;
            // post-4.2.1 dexie invokes db.close() so state transitions.
            const idbdb = dexieDb.idbdb;
            assert.ok(idbdb, 'expected dexie to hold an open idbdb reference');
            assert.strictEqual(
                typeof idbdb.onclose,
                'function',
                'dexie should install an idbdb.onclose handler at open time'
            );
            idbdb.onclose(new Event('close'));

            // Let any synchronous-then-microtask close flow settle.
            await new Promise(resolve => setTimeout(resolve, 0));

            assert.strictEqual(
                dexieDb.isOpen(),
                false,
                'Dexie.isOpen() must return false after the underlying IDB ' +
                'connection is closed externally. On dexie < 4.2.1 this would ' +
                'still return true (the original report in dexie#2186), causing ' +
                'subsequent RxDB bulkWrites to fire "no in-progress transaction" ' +
                'errors against the dead connection.'
            );

            // db is already closed by the external-close path; don't call db.close() again.
        });
    });
});
