import config from './config';
import assert from 'assert';
import memdown from 'memdown';

let leveldown: any;
if (config.platform.isNode())
    leveldown = require('leveldown');

const path = require('path');

import {
    isRxCollection,
    isRxDatabase,
    createRxDatabase,
    createRxSchema,
    randomCouchString,
    addRxPlugin,
    getPrimaryKeyOfInternalDocument,
    INTERNAL_CONTEXT_ENCRYPTION,
    getSingleDocument
} from '../../';


import {
    getPouchLocation,
    getRxStoragePouch
} from '../../plugins/pouchdb';

import AsyncTestUtil from 'async-test-util';
import * as schemas from '../helper/schemas';
import * as humansCollection from '../helper/humans-collection';
import * as schemaObjects from '../helper/schema-objects';

import { RxDBEncryptionPlugin } from '../../plugins/encryption';
import { InternalStorePasswordDocType } from '../../src/plugins/encryption';
addRxPlugin(RxDBEncryptionPlugin);

config.parallel('rx-database.test.js', () => {
    describe('.create()', () => {
        describe('positive', () => {
            it('memdown', async () => {
                if (!config.platform.isNode()) return;
                const db = await createRxDatabase({
                    name: randomCouchString(10),
                    storage: getRxStoragePouch(memdown)
                });
                assert.ok(isRxDatabase(db));
                db.destroy();
            });
            it('leveldown', async () => {
                if (!config.platform.isNode()) return;
                if (path.join('..', 'x') !== '..\\x') { // leveldown does not work on windows
                    const db = await createRxDatabase({
                        name: config.rootPath + 'test_tmp/' + randomCouchString(10),
                        storage: getRxStoragePouch(leveldown)
                    });
                    assert.ok(isRxDatabase(db));
                    db.destroy();
                }
            });
            it('with password', async () => {
                const db = await createRxDatabase({
                    name: randomCouchString(10),
                    storage: getRxStoragePouch('memory'),
                    password: randomCouchString(12)
                });
                assert.ok(isRxDatabase(db));
                db.destroy();
            });
            it('2 instances on same adapter (if ignoreDuplicate is true)', async () => {
                const name = randomCouchString(10);
                const db = await createRxDatabase({
                    name,
                    storage: getRxStoragePouch('memory'),
                    ignoreDuplicate: true
                });
                const db2 = await createRxDatabase({
                    name,
                    storage: getRxStoragePouch('memory'),
                    ignoreDuplicate: true
                });
                db.destroy();
                db2.destroy();
            });
            it('2 instances on same adapter -> ignoreDuplicate is false but first db gets destroyed', async () => {
                const name = randomCouchString(10);
                const db = await createRxDatabase({
                    name,
                    storage: getRxStoragePouch('memory')
                });
                await db.destroy();
                const db2 = await createRxDatabase({
                    name,
                    storage: getRxStoragePouch('memory')
                });
                db2.destroy();
            });
            it('2 password-instances on same adapter', async () => {
                const name = randomCouchString(10);
                const password = randomCouchString(12);
                const db = await createRxDatabase({
                    name,
                    storage: getRxStoragePouch('memory'),
                    password,
                    ignoreDuplicate: true
                });
                const db2 = await createRxDatabase({
                    name,
                    storage: getRxStoragePouch('memory'),
                    password,
                    ignoreDuplicate: true
                });
                db.destroy();
                db2.destroy();
            });
            it('should not forget the options', async () => {
                const name = randomCouchString(10);
                const password = randomCouchString(12);
                const db = await createRxDatabase({
                    name,
                    storage: getRxStoragePouch('memory'),
                    password,
                    ignoreDuplicate: true,
                    options: {
                        foo: 'bar'
                    }
                });
                assert.strictEqual(db.options.foo, 'bar');
                db.destroy();
            });
            it('should not forget the instanceCreationOptions', async () => {
                const name = randomCouchString(10);
                const password = randomCouchString(12);
                const db = await createRxDatabase({
                    name,
                    storage: getRxStoragePouch('memory'),
                    instanceCreationOptions: {
                        ajax: 'bar'
                    },
                    password,
                    ignoreDuplicate: true
                });
                assert.strictEqual(db.internalStore.options.ajax, 'bar');
                db.destroy();
            });
        });
        describe('negative', () => {
            it('should crash with invalid token', async () => {
                await AsyncTestUtil.assertThrows(
                    () => createRxDatabase({
                        name: null,
                        storage: getRxStoragePouch('memory'),
                    } as any),
                    'RxTypeError',
                    'null'
                );
            });
            it('should crash with and ending slash', async () => {
                await AsyncTestUtil.assertThrows(
                    () => createRxDatabase({
                        name: '/foo/bar/',
                        storage: getRxStoragePouch('memory'),
                    } as any),
                    'RxError',
                    'ending'
                );
            });
            it('should crash with invalid adapter', async () => {
                await AsyncTestUtil.assertThrows(
                    () => createRxDatabase({
                        name: randomCouchString(10),
                        storage: getRxStoragePouch({}),
                    }),
                    'RxError',
                    'adapter'
                );
            });
            it('should crash with invalid password (no string)', async () => {
                await AsyncTestUtil.assertThrows(
                    () => createRxDatabase({
                        name: randomCouchString(10),
                        storage: getRxStoragePouch('memory'),
                        password: {}
                    }),
                    'RxTypeError',
                    'password'
                );
            });
            it('should crash with invalid password (too short)', async () => {
                await AsyncTestUtil.assertThrows(
                    () => createRxDatabase({
                        name: randomCouchString(10),
                        storage: getRxStoragePouch('memory'),
                        password: randomCouchString(4)
                    }),
                    'RxError',
                    'min-length'
                );
            });
            it('BUG: should have a pwHash-doc after creating the database', async () => {
                const name = randomCouchString(10);
                const password = randomCouchString(10);
                const db = await createRxDatabase({
                    name,
                    storage: getRxStoragePouch('memory'),
                    password,
                    ignoreDuplicate: true
                });
                const doc = await getSingleDocument<InternalStorePasswordDocType>(
                    db.internalStore,
                    getPrimaryKeyOfInternalDocument(
                        'pwHash',
                        INTERNAL_CONTEXT_ENCRYPTION
                    )
                );
                if (!doc) {
                    throw new Error('error in test this should never happen ' + doc);
                }
                assert.strictEqual(typeof doc.data.hash, 'string');
                const db2 = await createRxDatabase({
                    name,
                    storage: getRxStoragePouch('memory'),
                    password,
                    ignoreDuplicate: true
                });
                const doc2 = await getSingleDocument<InternalStorePasswordDocType>(
                    db.internalStore,
                    getPrimaryKeyOfInternalDocument(
                        'pwHash',
                        INTERNAL_CONTEXT_ENCRYPTION
                    )
                );
                assert.ok(doc2);
                assert.strictEqual(typeof doc2.data.hash, 'string');

                db.destroy();
                db2.destroy();
            });
            it('prevent 2 instances with different passwords on same adapter', async () => {
                const name = randomCouchString(10);
                const db = await createRxDatabase({
                    name,
                    storage: getRxStoragePouch('memory'),
                    password: randomCouchString(10)
                });
                await AsyncTestUtil.assertThrows(
                    () => createRxDatabase({
                        name,
                        storage: getRxStoragePouch('memory'),
                        password: randomCouchString(10)
                    }),
                    'RxError'
                );
                db.destroy();
            });
            it('do not allow 2 databases with same name and adapter', async () => {
                const name = randomCouchString(10);
                const db = await createRxDatabase({
                    name,
                    storage: getRxStoragePouch('memory')
                });
                await AsyncTestUtil.assertThrows(
                    () => createRxDatabase({
                        name,
                        storage: getRxStoragePouch('memory')
                    }),
                    'RxError',
                    'ignoreDuplicate'
                );
                db.destroy();
            });
        });
    });
    describe('.addCollections()', () => {
        describe('positive', () => {
            it('human', async () => {
                const db = await createRxDatabase({
                    name: randomCouchString(10),
                    storage: getRxStoragePouch('memory')
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

                db.destroy();
            });
            it('the schema-object should be saved in the internal storage instance', async () => {
                const db = await createRxDatabase({
                    name: randomCouchString(10),
                    storage: getRxStoragePouch('memory')
                });
                await db.addCollections({
                    human0: {
                        schema: schemas.human
                    }
                });
                const colDoc = await (db.internalStore.internals.pouch as any).get('collection|human0-' + schemas.human.version);
                const compareSchema = createRxSchema(schemas.human);
                assert.deepStrictEqual(compareSchema.normalized, colDoc.data.schema);
                db.destroy();
            });
            it('use encrypted db', async () => {
                const db = await createRxDatabase({
                    name: randomCouchString(10),
                    storage: getRxStoragePouch('memory'),
                    password: randomCouchString(12)
                });
                const collections = await db.addCollections({
                    humanenc: {
                        schema: schemas.encryptedHuman
                    }
                });
                const collection = collections.humanenc;
                assert.ok(isRxCollection(collection));
                db.destroy();
            });
            it('collectionsCollection should contain schema.version', async () => {
                const db = await createRxDatabase({
                    name: randomCouchString(10),
                    storage: getRxStoragePouch('memory')
                });
                const collections = await db.addCollections({
                    human: {
                        schema: schemas.human
                    }
                });
                const collection = collections.human;
                const version = collection.schema.version;
                assert.deepStrictEqual(version, 0);
                const internalDoc = await (db.internalStore.internals.pouch as any).get('collection|human-' + version);
                assert.deepStrictEqual(internalDoc.data.version, version);
                db.destroy();
            });
            it('create 2 times on same adapter', async () => {
                const name = randomCouchString(10);
                const collectionName = 'foobar';
                const db1 = await createRxDatabase({
                    name,
                    storage: getRxStoragePouch('memory'),
                    ignoreDuplicate: true
                });
                const db2 = await createRxDatabase({
                    name,
                    storage: getRxStoragePouch('memory'),
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
                db1.destroy();
                db2.destroy();
            });
            it('should not do a write to the internalStore when creating a previous existing collection', async () => {
                const name = randomCouchString(10);
                const collectionName = 'foobar';
                const db1 = await createRxDatabase({
                    name,
                    storage: getRxStoragePouch('memory'),
                    ignoreDuplicate: true
                });
                await db1.addCollections({
                    [collectionName]: {
                        schema: schemas.human
                    }
                });
                await db1.destroy();

                const db2 = await createRxDatabase({
                    name,
                    storage: getRxStoragePouch('memory'),
                    ignoreDuplicate: true
                });

                // wrap internalStore to track writes
                const originalBulkWrite = db2.internalStore.bulkWrite.bind(db2.internalStore);
                let writeCount = 0;
                db2.internalStore.bulkWrite = (...args) => {
                    writeCount++;
                    return originalBulkWrite(...args);
                }

                await db2.addCollections({
                    [collectionName]: {
                        schema: schemas.human
                    }
                });
                await db2.destroy();

                assert.strictEqual(writeCount, 0);
            });
        });
        describe('negative', () => {
            it('broken schema (nostringIndex)', async () => {
                const db = await createRxDatabase({
                    name: randomCouchString(10),
                    storage: getRxStoragePouch('memory')
                });
                await AsyncTestUtil.assertThrows(
                    () => db.addCollections({
                        human6: {
                            schema: schemas.noStringIndex
                        }
                    }),
                    'RxError'
                );
                db.destroy();
            });
            it('call 2 times on same name', async () => {
                const db = await createRxDatabase({
                    name: randomCouchString(10),
                    storage: getRxStoragePouch('memory')
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
                db.destroy();
            });
            it('crypt-schema without db-password', async () => {
                const db = await createRxDatabase({
                    name: randomCouchString(10),
                    storage: getRxStoragePouch('memory')
                });
                await AsyncTestUtil.assertThrows(
                    () => db.addCollections({
                        human7: {
                            schema: schemas.encryptedHuman
                        }
                    }),
                    'RxError'
                );
                db.destroy();
            });
            it('2 different schemas on same collection', async () => {
                const db = await createRxDatabase({
                    name: randomCouchString(10),
                    storage: getRxStoragePouch('memory')
                });
                const cols = await db.addCollections({
                    human8: {
                        schema: schemas.human
                    }
                });
                await cols.human8.insert(schemaObjects.human());
                await AsyncTestUtil.assertThrows(
                    () => db.addCollections({
                        human8: {
                            schema: schemas.bigHuman
                        }
                    }),
                    'RxError',
                    'already exists'
                );
                db.destroy();
            });
            it('not allow collectionNames starting with lodash', async () => {
                const db = await createRxDatabase({
                    name: randomCouchString(10),
                    storage: getRxStoragePouch('memory')
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
                db.destroy();
            });
            it('not allow collectionNames which are properties of RxDatabase', async () => {
                const db = await createRxDatabase({
                    name: randomCouchString(10),
                    storage: getRxStoragePouch('memory')
                });
                const forbidden = [
                    'name',
                    'token',
                    'isLeader',
                    '$emit',
                    'destroy'
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
                db.destroy();
            });
            it('create 2 times on same adapter with different schema', async () => {
                const name = randomCouchString(10);
                const collectionName = 'foobar';
                const db1 = await createRxDatabase({
                    name,
                    storage: getRxStoragePouch('memory'),
                    ignoreDuplicate: true
                });
                const db2 = await createRxDatabase({
                    name,
                    storage: getRxStoragePouch('memory'),
                    ignoreDuplicate: true
                });
                const col1 = await db1.addCollections({
                    [collectionName]: {
                        schema: schemas.human
                    }
                });
                await col1[collectionName].insert(schemaObjects.human());
                await AsyncTestUtil.assertThrows(
                    () => db2.addCollections({
                        [collectionName]: {
                            schema: schemas.bigHuman
                        }
                    }),
                    'RxError',
                    'different'
                );
                db1.destroy();
                db2.destroy();
            });
        });
    });
    describe('.destroy()', () => {
        describe('positive', () => {
            it('should not crash on destroy', async () => {
                const db = await createRxDatabase({
                    name: randomCouchString(10),
                    storage: getRxStoragePouch('memory')
                });
                await db.addCollections({
                    foobar: {
                        schema: schemas.human
                    }
                });
                await db.destroy();
                assert.strictEqual(db.destroyed, true);
                await db.destroy();
            });
            it('should not crash if destroy is called twice', async () => {
                const db = await createRxDatabase({
                    name: randomCouchString(10),
                    storage: getRxStoragePouch('memory')
                });
                await db.addCollections({
                    foobar: {
                        schema: schemas.human
                    }
                });
                await db.destroy();
                await db.destroy();
                assert.strictEqual(db.destroyed, true);
            });
        });
    });
    describe('.remove()', () => {
        it('should not crash', async () => {
            const c = await humansCollection.create(10);
            await c.database.remove();
        });
        it('should be possible to recreate the database with other password', async () => {
            const name = randomCouchString(10);
            const db = await createRxDatabase({
                name,
                storage: getRxStoragePouch('memory'),
                password: 'fo222222obar'
            });
            await db.remove();

            const db2 = await createRxDatabase({
                name,
                storage: getRxStoragePouch('memory'),
                password: 'foo2222333333bar2'
            });
            await db2.remove();
        });
        it('should have deleted the local documents', async () => {
            const name = randomCouchString(10);
            const db = await createRxDatabase({
                name,
                storage: getRxStoragePouch('memory')
            });

            const id = 'foobar';
            await db.insertLocal(id, { foo: 'bar' });

            await db.remove();

            const db2 = await createRxDatabase({
                name,
                storage: getRxStoragePouch('memory')
            });

            const hasLocal = await db2.getLocal(id);
            assert.strictEqual(hasLocal, null);

            await db2.remove();
        });
    });
    describe('ISSUES', () => {
        it('#677 wrong pouch-location when path as collection-name', () => {
            const pouchPathNormal = getPouchLocation(
                'mydb',
                'humans',
                5
            );
            assert.strictEqual(pouchPathNormal, 'mydb-rxdb-5-humans');

            const pouchPath = getPouchLocation(
                'mydb',
                'subfolder/humans',
                5
            );
            assert.strictEqual(pouchPath, 'subfolder/mydb-rxdb-5-humans');
        });
    });

    describe('wait a bit', () => {
        it('w8 a bit', (done) => {
            setTimeout(done, 30);
        });
    });
});
