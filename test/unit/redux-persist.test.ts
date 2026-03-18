import assert from 'assert';

import config, { describeParallel } from './config.ts';

import {
    createRxDatabase,
    randomToken,
    addRxPlugin
} from '../../plugins/core/index.mjs';
import {
    RxDBReduxPersistPlugin,
    getRxStorageReduxPersist,
    REDUX_PERSIST_COLLECTION_NAME
} from '../../plugins/redux-persist/index.mjs';
addRxPlugin(RxDBReduxPersistPlugin);

describeParallel('redux-persist.test.ts', () => {
    async function getDatabase(name: string = randomToken(10)) {
        const db = await createRxDatabase({
            name,
            storage: config.storage.getStorage(),
            ignoreDuplicate: true
        });
        return db;
    }

    describe('getRxStorageReduxPersist()', () => {
        it('should create a storage engine from an RxDatabase', async () => {
            const db = await getDatabase();
            const storage = await getRxStorageReduxPersist(db);
            assert.ok(storage);
            assert.strictEqual(typeof storage.getItem, 'function');
            assert.strictEqual(typeof storage.setItem, 'function');
            assert.strictEqual(typeof storage.removeItem, 'function');
            await db.close();
        });

        it('should create the internal collection', async () => {
            const db = await getDatabase();
            await getRxStorageReduxPersist(db);
            assert.ok(db.collections[REDUX_PERSIST_COLLECTION_NAME]);
            await db.close();
        });
    });

    describe('.getReduxPersistStorage()', () => {
        it('should be callable on the database prototype', async () => {
            const db = await getDatabase();
            const storage = await (db as any).getReduxPersistStorage();
            assert.ok(storage);
            assert.strictEqual(typeof storage.getItem, 'function');
            await db.close();
        });
    });

    describe('getItem()', () => {
        it('should return null for a non-existing key', async () => {
            const db = await getDatabase();
            const storage = await getRxStorageReduxPersist(db);
            const result = await storage.getItem('non-existing');
            assert.strictEqual(result, null);
            await db.close();
        });

        it('should return a previously stored value', async () => {
            const db = await getDatabase();
            const storage = await getRxStorageReduxPersist(db);
            await storage.setItem('mykey', '{"counter":1}');
            const result = await storage.getItem('mykey');
            assert.strictEqual(result, '{"counter":1}');
            await db.close();
        });
    });

    describe('setItem()', () => {
        it('should store a value', async () => {
            const db = await getDatabase();
            const storage = await getRxStorageReduxPersist(db);
            await storage.setItem('persist:root', '{"auth":"{}","_persist":"{\\"version\\":-1}"}');
            const result = await storage.getItem('persist:root');
            assert.strictEqual(result, '{"auth":"{}","_persist":"{\\"version\\":-1}"}');
            await db.close();
        });

        it('should overwrite an existing value (upsert)', async () => {
            const db = await getDatabase();
            const storage = await getRxStorageReduxPersist(db);
            await storage.setItem('mykey', 'value1');
            await storage.setItem('mykey', 'value2');
            const result = await storage.getItem('mykey');
            assert.strictEqual(result, 'value2');
            await db.close();
        });
    });

    describe('removeItem()', () => {
        it('should remove a stored value', async () => {
            const db = await getDatabase();
            const storage = await getRxStorageReduxPersist(db);
            await storage.setItem('mykey', 'myvalue');
            await storage.removeItem('mykey');
            const result = await storage.getItem('mykey');
            assert.strictEqual(result, null);
            await db.close();
        });

        it('should not throw when removing a non-existing key', async () => {
            const db = await getDatabase();
            const storage = await getRxStorageReduxPersist(db);
            await storage.removeItem('non-existing');
            await db.close();
        });
    });

    describe('multiple keys', () => {
        it('should handle multiple keys independently', async () => {
            const db = await getDatabase();
            const storage = await getRxStorageReduxPersist(db);
            await storage.setItem('key1', 'val1');
            await storage.setItem('key2', 'val2');
            await storage.setItem('key3', 'val3');

            assert.strictEqual(await storage.getItem('key1'), 'val1');
            assert.strictEqual(await storage.getItem('key2'), 'val2');
            assert.strictEqual(await storage.getItem('key3'), 'val3');

            await storage.removeItem('key2');
            assert.strictEqual(await storage.getItem('key1'), 'val1');
            assert.strictEqual(await storage.getItem('key2'), null);
            assert.strictEqual(await storage.getItem('key3'), 'val3');

            await db.close();
        });
    });

    describe('persistence across storage instances', () => {
        it('should persist data across multiple getRxStorageReduxPersist calls on the same db', async () => {
            const db = await getDatabase();
            const storage1 = await getRxStorageReduxPersist(db);
            await storage1.setItem('persist:root', '{"data":"test"}');

            const storage2 = await getRxStorageReduxPersist(db);
            const result = await storage2.getItem('persist:root');
            assert.strictEqual(result, '{"data":"test"}');
            await db.close();
        });
    });
});
