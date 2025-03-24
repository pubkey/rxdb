import config, { describeParallel } from './config.ts';
import assert from 'assert';

import {
    isRxCollection,
    isRxDatabase,
    createRxDatabase,
    randomToken,
    RxDatabase,
    isRxDatabaseFirstTimeInstantiated,
    defaultHashSha256,
    prepareQuery
} from '../../plugins/core/index.mjs';

import AsyncTestUtil from 'async-test-util';
import {
    schemaObjects,
    schemas,
    humansCollection,
    getPassword
} from '../../plugins/test-utils/index.mjs';
import {
    getRxStorageMemory
} from '../../plugins/storage-memory/index.mjs';
import {
    wrappedValidateAjvStorage
} from '../../plugins/validate-ajv/index.mjs';

describeParallel('rx-database.test.ts', () => {
    describe('createRxDatabase()', () => {
        describe('positive', () => {
            it('normal', async () => {
                const db = await createRxDatabase({
                    name: randomToken(10),
                    storage: config.storage.getStorage()
                });
                assert.ok(isRxDatabase(db));
                db.close();
            });
            it('with password', async () => {
                const db = await createRxDatabase({
                    name: randomToken(10),
                    storage: config.storage.getStorage(),
                    password: await getPassword()
                });
                assert.ok(isRxDatabase(db));
                db.close();
            });
            it('2 instances on same storage (if ignoreDuplicate is true)', async () => {
                if (!config.storage.hasMultiInstance) {
                    return;
                }
                const name = randomToken(10);
                const db = await createRxDatabase({
                    name,
                    storage: config.storage.getStorage(),
                    ignoreDuplicate: true
                });

                assert.strictEqual(
                    await isRxDatabaseFirstTimeInstantiated(db),
                    true,
                    'isRxDatabaseFirstTimeInstantiated must be true'
                );

                const db2 = await createRxDatabase({
                    name,
                    storage: config.storage.getStorage(),
                    ignoreDuplicate: true
                });

                assert.notStrictEqual(
                    db.token,
                    db2.token
                );

                assert.strictEqual(
                    await isRxDatabaseFirstTimeInstantiated(db2),
                    false,
                    'isRxDatabaseFirstTimeInstantiated must be false'
                );

                db.close();
                db2.close();
            });
            it('2 instances on same adapter -> ignoreDuplicate is false but first db gets closed', async () => {
                const name = randomToken(10);
                const db = await createRxDatabase({
                    name,
                    storage: config.storage.getStorage()
                });
                await db.close();
                const db2 = await createRxDatabase({
                    name,
                    storage: config.storage.getStorage()
                });
                db2.close();
            });
            it('do allow 2 databases with same name but different storage', async () => {
                if (config.storage.name.includes('memory')) {
                    return;
                }
                const name = randomToken(10);
                const db = await createRxDatabase({
                    name,
                    storage: wrappedValidateAjvStorage({ storage: getRxStorageMemory() })
                });
                const db2 = await createRxDatabase({
                    name,
                    storage: config.storage.getStorage()
                });
                db.close();
                db2.close();
            });
            it('2 password-instances on same adapter', async () => {
                if (!config.storage.hasMultiInstance) {
                    return;
                }
                const name = randomToken(10);
                const password = await getPassword();
                const db = await createRxDatabase({
                    name,
                    storage: config.storage.getStorage(),
                    password,
                    ignoreDuplicate: true
                });
                const db2 = await createRxDatabase({
                    name,
                    storage: config.storage.getStorage(),
                    password,
                    ignoreDuplicate: true
                });
                db.close();
                db2.close();
            });
            it('should not forget the options', async () => {
                const name = randomToken(10);
                const password = await getPassword();
                const db = await createRxDatabase({
                    name,
                    storage: config.storage.getStorage(),
                    password,
                    ignoreDuplicate: true,
                    options: {
                        foo: 'bar'
                    }
                });
                assert.strictEqual(db.options.foo, 'bar');
                db.close();
            });
            it('should not forget the instanceCreationOptions', async () => {
                const name = randomToken(10);
                const password = await getPassword();
                const db = await createRxDatabase({
                    name,
                    storage: config.storage.getStorage(),
                    instanceCreationOptions: {
                        ajax: 'bar'
                    },
                    password,
                    ignoreDuplicate: true
                });
                assert.strictEqual(db.internalStore.options.ajax, 'bar');
                db.close();
            });
            it('should respect the given hashFunction', async () => {
                const db = await createRxDatabase({
                    name: randomToken(10),
                    storage: config.storage.getStorage(),
                    async hashFunction(i: string) {
                        const hash = await defaultHashSha256(i);
                        return hash + 'xxx';
                    }
                });
                const hasHash = await db.hashFunction('foobar');
                assert.ok(hasHash.endsWith('xxx'));
                db.close();
            });
            /**
             * @link https://github.com/pubkey/rxdb/pull/4614
             */
            it('should have eventReduce: true as a default', async () => {
                const db = await createRxDatabase({
                    name: randomToken(10),
                    storage: config.storage.getStorage()
                });
                assert.strictEqual(db.eventReduce, true);
                db.close();

            });
        });
        describe('negative', () => {
            it('should crash with invalid token', async () => {
                await AsyncTestUtil.assertThrows(
                    () => createRxDatabase({
                        name: null,
                        storage: config.storage.getStorage(),
                    } as any),
                    'RxTypeError',
                    'null'
                );
            });
            it('should crash with and ending slash', async () => {
                await AsyncTestUtil.assertThrows(
                    () => createRxDatabase({
                        name: '/foo/bar/',
                        storage: config.storage.getStorage(),
                    } as any),
                    'RxError',
                    'ending'
                );
            });
            it('do not allow 2 databases with same name and storage', async () => {
                const name = randomToken(10);
                const storage = config.storage.getStorage();

                let db1: RxDatabase | undefined;
                let db2: RxDatabase | undefined;

                const db1Promise = createRxDatabase({
                    name,
                    storage,
                }).then((db1PromiseValue) => {
                    db1 = db1PromiseValue;
                    assert.ok(db2 === undefined);

                    setTimeout(() => {
                        db1PromiseValue.close();
                    }, 500);

                    return db1PromiseValue;
                });
                const db2Promise = createRxDatabase({
                    name,
                    storage,
                }).then((db2PromiseValue) => {
                    db2 = db2PromiseValue;
                    assert.ok(db1?.closed);

                    return db2PromiseValue;
                });


                const resolvedDb1 = await db1Promise;
                const resolvedDb2 = await db2Promise;

                assert.ok(resolvedDb1.closed);
                assert.ok(!resolvedDb2.closed);

                resolvedDb2.close();

                const db3 = await createRxDatabase({
                    name,
                    storage,
                });

                assert.ok(!db3.closed);

                db3.close();
            });
        });
    });
    describe('.addCollections()', () => {
        describe('positive', () => {
            it('human', async () => {
                const db = await createRxDatabase({
                    name: randomToken(10),
                    storage: config.storage.getStorage()
                });
                const collections = await db.addCollections({
                    human0: {
                        schema: schemas.human
                    }
                });
                const collection = collections.human0;
                assert.ok(isRxCollection(collection));

                // make sure defineGetter works
                assert.strictEqual(db.human0, collection);

                db.close();
            });
            it('create 2 times on same adapter', async () => {
                if (!config.storage.hasMultiInstance) {
                    return;
                }
                const name = randomToken(10);
                const collectionName = 'foobar';
                const db1 = await createRxDatabase({
                    name,
                    storage: config.storage.getStorage(),
                    ignoreDuplicate: true
                });
                const db2 = await createRxDatabase({
                    name,
                    storage: config.storage.getStorage(),
                    ignoreDuplicate: true
                });
                await db1.addCollections({
                    [collectionName]: {
                        schema: schemas.human
                    }
                });
                await db2.addCollections({
                    [collectionName]: {
                        schema: schemas.human
                    }
                });
                db1.close();
                db2.close();
            });
            it('should not do a write to the internalStore when creating a previous existing collection', async () => {
                if (!config.storage.hasMultiInstance) {
                    return;
                }
                const name = randomToken(10);
                const collectionName = 'foobar';
                const db1 = await createRxDatabase({
                    name,
                    storage: config.storage.getStorage(),
                    ignoreDuplicate: true
                });
                await db1.addCollections({
                    [collectionName]: {
                        schema: schemas.human
                    }
                });

                async function getStoreDocs(db: RxDatabase) {
                    const result = await db.internalStore.query(
                        prepareQuery(
                            db.internalStore.schema,
                            {
                                selector: {
                                    context: 'collection'
                                },
                                sort: [{ id: 'asc' }],
                                skip: 0
                            }
                        )
                    );
                    return result.documents;
                }

                const storeDocsBefore = await getStoreDocs(db1);
                await db1.close();

                const db2 = await createRxDatabase({
                    name,
                    storage: config.storage.getStorage(),
                    ignoreDuplicate: true
                });

                await db2.addCollections({
                    [collectionName]: {
                        schema: schemas.human
                    }
                });

                const storeDocsAfter = await getStoreDocs(db2);

                /**
                 * Revision must still be the same as before
                 * because no write happened.
                 */
                assert.strictEqual(
                    storeDocsBefore[0]._rev,
                    storeDocsAfter[0]._rev
                );

                await db2.close();
            });
        });
        describe('negative', () => {
            it('broken schema (nostringIndex)', async () => {
                const db = await createRxDatabase({
                    name: randomToken(10),
                    storage: config.storage.getStorage()
                });
                await AsyncTestUtil.assertThrows(
                    () => db.addCollections({
                        human6: {
                            schema: schemas.noStringIndex
                        }
                    }),
                    'RxError'
                );
                db.close();
            });
            it('call 2 times on same name', async () => {
                const db = await createRxDatabase({
                    name: randomToken(10),
                    storage: config.storage.getStorage()
                });
                await db.addCollections({
                    human2: {
                        schema: schemas.human
                    }
                });
                await AsyncTestUtil.assertThrows(
                    () => db.addCollections({
                        human2: {
                            schema: schemas.human
                        }
                    }),
                    'RxError'
                );
                db.close();
            });
            it('crypt-schema without db-password', async () => {
                const db = await createRxDatabase({
                    name: randomToken(10),
                    storage: config.storage.getStorage()
                });
                let hasThrown = false;
                try {
                    await db.addCollections({
                        human7: {
                            schema: schemas.encryptedHuman
                        }
                    });
                } catch (err) {
                    hasThrown = true;
                }
                assert.ok(hasThrown);
                db.close();
            });
            it('2 different schemas on same collection', async () => {
                const db = await createRxDatabase({
                    name: randomToken(10),
                    storage: config.storage.getStorage()
                });
                const cols = await db.addCollections({
                    human8: {
                        schema: schemas.human
                    }
                });
                await cols.human8.insert(schemaObjects.humanData());
                await AsyncTestUtil.assertThrows(
                    () => db.addCollections({
                        human8: {
                            schema: schemas.bigHuman
                        }
                    }),
                    'RxError',
                    'already exists'
                );
                db.close();
            });
            it('not allow collectionNames starting with lodash', async () => {
                const db = await createRxDatabase({
                    name: randomToken(10),
                    storage: config.storage.getStorage()
                });
                await AsyncTestUtil.assertThrows(
                    () => db.addCollections({
                        _test: {
                            schema: schemas.human
                        }
                    }),
                    'RxError',
                    'UT2'
                );
                db.close();
            });
            it('not allow collectionNames which are properties of RxDatabase', async () => {
                const db = await createRxDatabase({
                    name: randomToken(10),
                    storage: config.storage.getStorage()
                });
                const forbidden = [
                    'name',
                    'token',
                    'isLeader',
                    '$emit',
                    'close'
                ];
                let t = 0;
                while (t < forbidden.length) {
                    const colName = forbidden[t];
                    await AsyncTestUtil.assertThrows(
                        () => db.addCollections({
                            [colName]: {
                                schema: schemas.human
                            }
                        }),
                        'RxError',
                        'not allowed'
                    );
                    t++;
                }
                db.close();
            });
            it('create 2 times on same adapter with different schema', async () => {
                if (!config.storage.hasMultiInstance) {
                    return;
                }
                const name = randomToken(10);
                const collectionName = 'foobar';
                const db1 = await createRxDatabase({
                    name,
                    storage: config.storage.getStorage(),
                    ignoreDuplicate: true
                });
                const db2 = await createRxDatabase({
                    name,
                    storage: config.storage.getStorage(),
                    ignoreDuplicate: true
                });
                const col1 = await db1.addCollections({
                    [collectionName]: {
                        schema: schemas.human
                    }
                });
                await col1[collectionName].insert(schemaObjects.humanData());
                await AsyncTestUtil.assertThrows(
                    () => db2.addCollections({
                        [collectionName]: {
                            schema: schemas.bigHuman
                        }
                    }),
                    'RxError',
                    'different'
                );
                db1.close();
                db2.close();
            });
        });
    });
    describe('.close()', () => {
        describe('positive', () => {
            it('should not crash on close', async () => {
                const db = await createRxDatabase({
                    name: randomToken(10),
                    storage: config.storage.getStorage()
                });
                await db.addCollections({
                    foobar: {
                        schema: schemas.human
                    }
                });
                await db.close();
                assert.strictEqual(db.closed, true);
                await db.close();
            });
            it('should not crash if close is called twice', async () => {
                const db = await createRxDatabase({
                    name: randomToken(10),
                    storage: config.storage.getStorage()
                });
                await db.addCollections({
                    foobar: {
                        schema: schemas.human
                    }
                });
                await db.close();
                await db.close();
                assert.strictEqual(db.closed, true);
            });
        });
    });
    describe('.remove()', () => {
        it('should not crash', async () => {
            const c = await humansCollection.create(10);
            await c.database.remove();
        });
        it('should be possible to recreate the database with other password', async () => {
            const name = randomToken(10);
            const db = await createRxDatabase({
                name,
                storage: config.storage.getStorage(),
                password: await getPassword()
            });
            await db.remove();

            const db2 = await createRxDatabase({
                name,
                storage: config.storage.getStorage(),
                password: await getPassword()
            });
            await db2.remove();
        });
        it('should have deleted the local documents', async () => {
            const name = randomToken(10);
            const db = await createRxDatabase({
                name,
                storage: config.storage.getStorage(),
                localDocuments: true
            });

            const id = 'foobar';
            await db.insertLocal(id, { foo: 'bar' });

            await db.remove();

            const db2 = await createRxDatabase({
                name,
                storage: config.storage.getStorage(),
                localDocuments: true
            });

            const hasLocal = await db2.getLocal(id);
            assert.strictEqual(hasLocal, null);

            await db2.remove();
        });
    });
});
