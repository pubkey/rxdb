import assert from 'assert';

import config, { describeParallel } from './config.ts';

import {
    createRxDatabase,
    randomToken,
    addRxPlugin,
    RxCollection
} from '../../plugins/core/index.mjs';
import {
    RxDBReduxPersistPlugin,
    getRxStorageReduxPersist,
    REDUX_PERSIST_SCHEMA,
    ReduxPersistDocType
} from '../../plugins/redux-persist/index.mjs';
addRxPlugin(RxDBReduxPersistPlugin);

describeParallel('redux-persist.test.ts', () => {
    async function getCollection(name: string = randomToken(10)): Promise<{
        collection: RxCollection<ReduxPersistDocType>;
        db: any;
    }> {
        const db = await createRxDatabase({
            name,
            storage: config.storage.getStorage(),
            ignoreDuplicate: true
        });
        await db.addCollections({
            reduxstate: {
                schema: REDUX_PERSIST_SCHEMA
            }
        });
        return { collection: db.reduxstate, db };
    }

    describe('getRxStorageReduxPersist()', () => {
        it('should create a storage engine from an RxCollection', async () => {
            const { collection, db } = await getCollection();
            const storage = getRxStorageReduxPersist(collection);
            assert.ok(storage);
            assert.strictEqual(typeof storage.getItem, 'function');
            assert.strictEqual(typeof storage.setItem, 'function');
            assert.strictEqual(typeof storage.removeItem, 'function');
            await db.close();
        });

        it('should work with a custom-named collection', async () => {
            const db = await createRxDatabase({
                name: randomToken(10),
                storage: config.storage.getStorage(),
                ignoreDuplicate: true
            });
            await db.addCollections({
                mycustomcol: {
                    schema: REDUX_PERSIST_SCHEMA
                }
            });
            const storage = getRxStorageReduxPersist(db.mycustomcol);
            await storage.setItem('testkey', 'testval');
            const result = await storage.getItem('testkey');
            assert.strictEqual(result, 'testval');
            await db.close();
        });
    });

    describe('getItem()', () => {
        it('should return null for a non-existing key', async () => {
            const { collection, db } = await getCollection();
            const storage = getRxStorageReduxPersist(collection);
            const result = await storage.getItem('non-existing');
            assert.strictEqual(result, null);
            await db.close();
        });

        it('should return a previously stored value', async () => {
            const { collection, db } = await getCollection();
            const storage = getRxStorageReduxPersist(collection);
            await storage.setItem('mykey', '{"counter":1}');
            const result = await storage.getItem('mykey');
            assert.strictEqual(result, '{"counter":1}');
            await db.close();
        });

        it('should handle JSON-serialized Redux state', async () => {
            const { collection, db } = await getCollection();
            const storage = getRxStorageReduxPersist(collection);
            const state = JSON.stringify({
                auth: { isLoggedIn: true, token: 'abc123' },
                ui: { theme: 'dark', sidebar: false },
                _persist: { version: -1, rehydrated: true }
            });
            await storage.setItem('persist:root', state);
            const result = await storage.getItem('persist:root');
            assert.strictEqual(result, state);
            const parsed = JSON.parse(result as string);
            assert.strictEqual(parsed.auth.isLoggedIn, true);
            assert.strictEqual(parsed.ui.theme, 'dark');
            await db.close();
        });
    });

    describe('setItem()', () => {
        it('should store a value', async () => {
            const { collection, db } = await getCollection();
            const storage = getRxStorageReduxPersist(collection);
            await storage.setItem('persist:root', '{"auth":"{}","_persist":"{\\"version\\":-1}"}');
            const result = await storage.getItem('persist:root');
            assert.strictEqual(result, '{"auth":"{}","_persist":"{\\"version\\":-1}"}');
            await db.close();
        });

        it('should overwrite an existing value (upsert)', async () => {
            const { collection, db } = await getCollection();
            const storage = getRxStorageReduxPersist(collection);
            await storage.setItem('mykey', 'value1');
            await storage.setItem('mykey', 'value2');
            const result = await storage.getItem('mykey');
            assert.strictEqual(result, 'value2');
            await db.close();
        });

        it('should handle empty string values', async () => {
            const { collection, db } = await getCollection();
            const storage = getRxStorageReduxPersist(collection);
            await storage.setItem('emptykey', '');
            const result = await storage.getItem('emptykey');
            assert.strictEqual(result, '');
            await db.close();
        });

        it('should handle large values', async () => {
            const { collection, db } = await getCollection();
            const storage = getRxStorageReduxPersist(collection);
            const largeValue = 'x'.repeat(10000);
            await storage.setItem('largekey', largeValue);
            const result = await storage.getItem('largekey');
            assert.strictEqual(result, largeValue);
            await db.close();
        });
    });

    describe('removeItem()', () => {
        it('should remove a stored value', async () => {
            const { collection, db } = await getCollection();
            const storage = getRxStorageReduxPersist(collection);
            await storage.setItem('mykey', 'myvalue');
            await storage.removeItem('mykey');
            const result = await storage.getItem('mykey');
            assert.strictEqual(result, null);
            await db.close();
        });

        it('should not throw when removing a non-existing key', async () => {
            const { collection, db } = await getCollection();
            const storage = getRxStorageReduxPersist(collection);
            await storage.removeItem('non-existing');
            await db.close();
        });

        it('should only remove the specified key', async () => {
            const { collection, db } = await getCollection();
            const storage = getRxStorageReduxPersist(collection);
            await storage.setItem('key1', 'val1');
            await storage.setItem('key2', 'val2');
            await storage.removeItem('key1');
            assert.strictEqual(await storage.getItem('key1'), null);
            assert.strictEqual(await storage.getItem('key2'), 'val2');
            await db.close();
        });
    });

    describe('multiple keys', () => {
        it('should handle multiple keys independently', async () => {
            const { collection, db } = await getCollection();
            const storage = getRxStorageReduxPersist(collection);
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

        it('should handle redux-persist typical keys', async () => {
            const { collection, db } = await getCollection();
            const storage = getRxStorageReduxPersist(collection);

            // redux-persist stores keys like persist:root and persist:<reducerKey>
            await storage.setItem('persist:root', '{"auth":"{\\"token\\":\\"abc\\"}","_persist":"{\\"version\\":-1}"}');
            await storage.setItem('persist:auth', '{"token":"abc","user":"john"}');
            await storage.setItem('persist:settings', '{"theme":"dark"}');

            assert.strictEqual(
                await storage.getItem('persist:root'),
                '{"auth":"{\\"token\\":\\"abc\\"}","_persist":"{\\"version\\":-1}"}'
            );
            assert.strictEqual(
                await storage.getItem('persist:auth'),
                '{"token":"abc","user":"john"}'
            );
            assert.strictEqual(
                await storage.getItem('persist:settings'),
                '{"theme":"dark"}'
            );

            await db.close();
        });
    });

    describe('persistence', () => {
        it('should persist data visible to direct collection queries', async () => {
            const { collection, db } = await getCollection();
            const storage = getRxStorageReduxPersist(collection);
            await storage.setItem('persist:root', '{"data":"test"}');

            // Query the collection directly to verify data is stored
            const doc = await collection.findOne({
                selector: { key: 'persist:root' }
            }).exec();
            assert.ok(doc);
            assert.strictEqual(doc.value, '{"data":"test"}');
            await db.close();
        });

        it('should read data written directly to the collection', async () => {
            const { collection, db } = await getCollection();
            const storage = getRxStorageReduxPersist(collection);

            // Write directly to collection
            await collection.insert({ key: 'directkey', value: 'directvalue' });

            // Read through the storage engine
            const result = await storage.getItem('directkey');
            assert.strictEqual(result, 'directvalue');
            await db.close();
        });

        it('should work with multiple storage instances on the same collection', async () => {
            const { collection, db } = await getCollection();
            const storage1 = getRxStorageReduxPersist(collection);
            const storage2 = getRxStorageReduxPersist(collection);

            await storage1.setItem('shared', 'fromStorage1');
            const result = await storage2.getItem('shared');
            assert.strictEqual(result, 'fromStorage1');

            await storage2.setItem('shared', 'fromStorage2');
            const result2 = await storage1.getItem('shared');
            assert.strictEqual(result2, 'fromStorage2');

            await db.close();
        });
    });

    describe('REDUX_PERSIST_SCHEMA', () => {
        it('should have the correct structure', () => {
            assert.strictEqual(REDUX_PERSIST_SCHEMA.version, 0);
            assert.strictEqual(REDUX_PERSIST_SCHEMA.primaryKey, 'key');
            assert.strictEqual(REDUX_PERSIST_SCHEMA.properties.key.type, 'string');
            assert.strictEqual(REDUX_PERSIST_SCHEMA.properties.value.type, 'string');
        });
    });

    describe('custom schema', () => {
        it('should work with a custom schema that has key and value fields', async () => {
            const db = await createRxDatabase({
                name: randomToken(10),
                storage: config.storage.getStorage(),
                ignoreDuplicate: true
            });
            await db.addCollections({
                customredux: {
                    schema: {
                        version: 0,
                        primaryKey: 'key',
                        type: 'object',
                        properties: {
                            key: {
                                type: 'string',
                                maxLength: 512
                            },
                            value: {
                                type: 'string'
                            }
                        },
                        required: ['key', 'value']
                    }
                }
            });
            const storage = getRxStorageReduxPersist(db.customredux);
            await storage.setItem('test', 'works');
            assert.strictEqual(await storage.getItem('test'), 'works');
            await db.close();
        });
    });
});
