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
    getPouchLocation,
    randomCouchString,
    addRxPlugin
} from '../../plugins/core';
import AsyncTestUtil from 'async-test-util';
import * as schemas from '../helper/schemas';
import * as humansCollection from '../helper/humans-collection';
import * as schemaObjects from '../helper/schema-objects';

import { RxDBEncryptionPlugin } from '../../plugins/encryption';
addRxPlugin(RxDBEncryptionPlugin);

config.parallel('rx-database.test.js', () => {
    describe('.create()', () => {
        describe('positive', () => {
            it('memdown', async () => {
                if (!config.platform.isNode()) return;
                const db = await createRxDatabase({
                    name: randomCouchString(10),
                    adapter: memdown
                });
                assert.ok(isRxDatabase(db));
                db.destroy();
            });
            it('leveldown', async () => {
                if (!config.platform.isNode()) return;
                if (path.join('..', 'x') !== '..\\x') { // leveldown does not work on windows
                    const db = await createRxDatabase({
                        name: config.rootPath + 'test_tmp/' + randomCouchString(10),
                        adapter: leveldown
                    });
                    assert.ok(isRxDatabase(db));
                    db.destroy();
                }
            });
            it('with password', async () => {
                const db = await createRxDatabase({
                    name: randomCouchString(10),
                    adapter: 'memory',
                    password: randomCouchString(12)
                });
                assert.ok(isRxDatabase(db));
                db.destroy();
            });
            it('2 instances on same adapter (if ignoreDuplicate is true)', async () => {
                const name = randomCouchString(10);
                const db = await createRxDatabase({
                    name,
                    adapter: 'memory',
                    ignoreDuplicate: true
                });
                const db2 = await createRxDatabase({
                    name,
                    adapter: 'memory',
                    ignoreDuplicate: true
                });
                db.destroy();
                db2.destroy();
            });
            it('2 instances on same adapter -> ignoreDuplicate is false but first db gets destroyed', async () => {
                const name = randomCouchString(10);
                const db = await createRxDatabase({
                    name,
                    adapter: 'memory'
                });
                await db.destroy();
                const db2 = await createRxDatabase({
                    name,
                    adapter: 'memory'
                });
                db2.destroy();
            });
            it('2 password-instances on same adapter', async () => {
                const name = randomCouchString(10);
                const password = randomCouchString(12);
                const db = await createRxDatabase({
                    name,
                    adapter: 'memory',
                    password,
                    ignoreDuplicate: true
                });
                const db2 = await createRxDatabase({
                    name,
                    adapter: 'memory',
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
                    adapter: 'memory',
                    password,
                    ignoreDuplicate: true,
                    options: {
                        foo: 'bar'
                    }
                });
                assert.strictEqual(db.options.foo, 'bar');
                db.destroy();
            });
            it('should not forget the pouchSettings', async () => {
                const name = randomCouchString(10);
                const password = randomCouchString(12);
                const db = await createRxDatabase({
                    name,
                    adapter: 'memory',
                    password,
                    ignoreDuplicate: true,
                    pouchSettings: {
                        ajax: 'bar'
                    }
                });
                assert.strictEqual(db.pouchSettings.ajax, 'bar');
                db.destroy();
            });
        });
        describe('negative', () => {
            it('should crash with invalid token', async () => {
                await AsyncTestUtil.assertThrows(
                    () => createRxDatabase({
                        name: null,
                        adapter: 'memory'
                    } as any),
                    'RxTypeError',
                    'null'
                );
            });
            it('should crash with and ending slash', async () => {
                await AsyncTestUtil.assertThrows(
                    () => createRxDatabase({
                        name: '/foo/bar/',
                        adapter: 'memory'
                    } as any),
                    'RxError',
                    'ending'
                );
            });
            it('should crash with invalid adapter', async () => {
                await AsyncTestUtil.assertThrows(
                    () => createRxDatabase({
                        name: randomCouchString(10),
                        adapter: {}
                    }),
                    'RxError',
                    'adapter'
                );
            });
            it('should crash with invalid password (no string)', async () => {
                await AsyncTestUtil.assertThrows(
                    () => createRxDatabase({
                        name: randomCouchString(10),
                        adapter: 'memory',
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
                        adapter: 'memory',
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
                    adapter: 'memory',
                    password,
                    ignoreDuplicate: true
                });
                const doc = await db.internalStore.get('_local/pwHash');
                assert.strictEqual(typeof doc.value, 'string');
                const db2 = await createRxDatabase({
                    name,
                    adapter: 'memory',
                    password,
                    ignoreDuplicate: true
                });
                const doc2 = await db.internalStore.get('_local/pwHash');
                assert.ok(doc2);
                assert.strictEqual(typeof doc.value, 'string');

                db.destroy();
                db2.destroy();
            });
            it('prevent 2 instances with different passwords on same adapter', async () => {
                const name = randomCouchString(10);
                const db = await createRxDatabase({
                    name,
                    adapter: 'memory',
                    password: randomCouchString(10)
                });
                await AsyncTestUtil.assertThrows(
                    () => createRxDatabase({
                        name,
                        adapter: 'memory',
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
                    adapter: 'memory'
                });
                await AsyncTestUtil.assertThrows(
                    () => createRxDatabase({
                        name,
                        adapter: 'memory'
                    }),
                    'RxError',
                    'ignoreDuplicate'
                );
                db.destroy();
            });
        });
    });
    describe('.collection()', () => {
        describe('positive', () => {
            it('human', async () => {
                const db = await createRxDatabase({
                    name: randomCouchString(10),
                    adapter: 'memory'
                });
                const collection = await db.collection({
                    name: 'human0',
                    schema: schemas.human
                });
                assert.ok(isRxCollection(collection));

                // make sure defineGetter works
                assert.strictEqual(db.human0, collection);

                db.destroy();
            });
            it('the schema-object should be saved in the collectionsCollection', async () => {
                const db = await createRxDatabase({
                    name: randomCouchString(10),
                    adapter: 'memory'
                });
                await db.collection({
                    name: 'human0',
                    schema: schemas.human
                });
                const colDoc = await db.internalStore.get('human0-' + schemas.human.version);
                const compareSchema = createRxSchema(schemas.human);
                assert.deepStrictEqual(compareSchema.normalized, colDoc.schema);
                db.destroy();
            });
            it('use encrypted db', async () => {
                const db = await createRxDatabase({
                    name: randomCouchString(10),
                    adapter: 'memory',
                    password: randomCouchString(12)
                });
                const collection = await db.collection({
                    name: 'humanenc',
                    schema: schemas.encryptedHuman
                });
                assert.ok(isRxCollection(collection));
                db.destroy();
            });
            it('collectionsCollection should contain schema.version', async () => {
                const db = await createRxDatabase({
                    name: randomCouchString(10),
                    adapter: 'memory'
                });
                const collection = await db.collection({
                    name: 'human',
                    schema: schemas.human
                });
                const version = collection.schema.version;
                assert.deepStrictEqual(version, 0);
                const internalDoc = await db.internalStore.get('human-' + version);
                assert.deepStrictEqual(internalDoc.version, version);
                db.destroy();
            });
            it('create 2 times on same adapter', async () => {
                const name = randomCouchString(10);
                const collectionName = 'foobar';
                const db1 = await createRxDatabase({
                    name,
                    adapter: 'memory',
                    ignoreDuplicate: true
                });
                const db2 = await createRxDatabase({
                    name,
                    adapter: 'memory',
                    ignoreDuplicate: true
                });
                await db1.collection({
                    name: collectionName,
                    schema: schemas.human
                });
                await db2.collection({
                    name: collectionName,
                    schema: schemas.human
                });
                db1.destroy();
                db2.destroy();
            });
            it('get the collection by passing the name', async () => {
                const db = await createRxDatabase({
                    name: randomCouchString(10),
                    adapter: 'memory'
                });
                const collection = await db.collection({
                    name: 'human',
                    schema: schemas.human
                });
                const col2 = await db.collection('human' as any);
                assert.ok(collection === col2);
                db.destroy();
            });
        });
        describe('negative', () => {
            it('broken schema (nostringIndex)', async () => {
                const db = await createRxDatabase({
                    name: randomCouchString(10),
                    adapter: 'memory'
                });
                await AsyncTestUtil.assertThrows(
                    () => db.collection({
                        name: 'human6',
                        schema: schemas.noStringIndex
                    }),
                    'RxError'
                );
                db.destroy();
            });
            it('call 2 times on same name', async () => {
                const db = await createRxDatabase({
                    name: randomCouchString(10),
                    adapter: 'memory'
                });
                await db.collection({
                    name: 'human2',
                    schema: schemas.human
                });
                await AsyncTestUtil.assertThrows(
                    () => db.collection({
                        name: 'human2',
                        schema: schemas.human
                    }),
                    'RxError'
                );
                db.destroy();
            });
            it('crypt-schema without db-password', async () => {
                const db = await createRxDatabase({
                    name: randomCouchString(10),
                    adapter: 'memory'
                });
                await AsyncTestUtil.assertThrows(
                    () => db.collection({
                        name: 'human7',
                        schema: schemas.encryptedHuman
                    }),
                    'RxError'
                );
                db.destroy();
            });
            it('2 different schemas on same collection', async () => {
                const db = await createRxDatabase({
                    name: randomCouchString(10),
                    adapter: 'memory'
                });
                const col = await db.collection({
                    name: 'human8',
                    schema: schemas.human
                });
                await col.insert(schemaObjects.human());
                await AsyncTestUtil.assertThrows(
                    () => db.collection({
                        name: 'human8',
                        schema: schemas.bigHuman
                    }),
                    'RxError',
                    'already exists'
                );
                db.destroy();
            });
            it('not allow collectionNames starting with lodash', async () => {
                const db = await createRxDatabase({
                    name: randomCouchString(10),
                    adapter: 'memory'
                });
                await AsyncTestUtil.assertThrows(
                    () => db.collection({
                        name: '_test',
                        schema: schemas.human
                    }),
                    'RxError',
                    'underscore'
                );
                db.destroy();
            });
            it('not allow collectionNames which are properties of RxDatabase', async () => {
                const db = await createRxDatabase({
                    name: randomCouchString(10),
                    adapter: 'memory'
                });
                const forbidden = [
                    'name',
                    'token',
                    'isLeader',
                    '$emit',
                    'destroy',
                    'subject'
                ];
                let t = 0;
                while (t < forbidden.length) {
                    const colName = forbidden[t];
                    await AsyncTestUtil.assertThrows(
                        () => db.collection({
                            name: colName,
                            schema: schemas.human
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
                    adapter: 'memory',
                    ignoreDuplicate: true
                });
                const db2 = await createRxDatabase({
                    name,
                    adapter: 'memory',
                    ignoreDuplicate: true
                });
                const col1 = await db1.collection({
                    name: collectionName,
                    schema: schemas.human
                });
                await col1.insert(schemaObjects.human());
                await AsyncTestUtil.assertThrows(
                    () => db2.collection({
                        name: collectionName,
                        schema: schemas.bigHuman
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
                    adapter: 'memory'
                });
                await db.collection({
                    name: 'foobar',
                    schema: schemas.human
                });
                db.destroy();
                assert.strictEqual(db.destroyed, true);
                db.destroy();
            });
            it('should not crash if destroy is called twice', async () => {
                const db = await createRxDatabase({
                    name: randomCouchString(10),
                    adapter: 'memory'
                });
                await db.collection({
                    name: 'foobar',
                    schema: schemas.human
                });
                db.destroy();
                db.destroy();
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
            const db = await createRxDatabase({
                name: randomCouchString(10),
                adapter: 'memory',
                password: 'fo222222obar'
            });
            await db.remove();

            const db2 = await createRxDatabase({
                name: randomCouchString(10),
                adapter: 'memory',
                password: 'foo2222333333bar2'
            });
            await db2.remove();
        });
    });
    describe('.dangerousRemoveCollectionInfo()', () => {
        it('should be possible to hard-overwrite the collections', async () => {
            const name = randomCouchString(10);
            const db = await createRxDatabase({
                name,
                adapter: 'memory',
                password: 'fo222222obar'
            });
            const col = await db.collection({
                name: 'human',
                schema: schemas.simpleHuman
            });
            await col.insert({
                passportId: 'foo',
                age: '10'
            });
            await db.destroy();

            const db2 = await createRxDatabase({
                name,
                adapter: 'memory',
                password: 'fo222222obar'
            });

            await db2.dangerousRemoveCollectionInfo();

            const col2 = await db2.collection({
                name: 'human',
                schema: schemas.humanAgeIndex
            });
            assert.ok(col2);

            await db2.destroy();
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
