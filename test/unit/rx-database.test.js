import platform from 'detect-browser';
import assert from 'assert';
import memdown from 'memdown';

let leveldown;
let leveldb;
if (platform.isNode()) {
    leveldown = require('leveldown');
    leveldb = require('pouchdb-adapter-leveldb');
}

const path = require('path');

import * as RxDatabase from '../../dist/lib/index';
import * as RxSchema from '../../dist/lib/rx-schema';
import * as util from '../../dist/lib/util';
import AsyncTestUtil from 'async-test-util';
import * as schemas from '../helper/schemas';
import * as humansCollection from '../helper/humans-collection';

describe('rx-database.test.js', () => {
    describe('.create()', () => {
        describe('positive', () => {
            it('memdown', async() => {
                if (!platform.isNode()) return;
                const db = await RxDatabase.create({
                    name: util.randomCouchString(10),
                    adapter: memdown
                });
                assert.equal(db.constructor.name, 'RxDatabase');
                db.destroy();
            });
            it('leveldown', async() => {
                if (!platform.isNode()) return;
                if (path.join('..', 'x') != '..\\x') { // leveldown does not work on windows
                    const db = await RxDatabase.create({
                        name: '../test_tmp/' + util.randomCouchString(10),
                        adapter: leveldown
                    });
                    assert.equal(db.constructor.name, 'RxDatabase');
                    db.destroy();
                }
            });
            it('with password', async() => {
                const db = await RxDatabase.create({
                    name: util.randomCouchString(10),
                    adapter: 'memory',
                    password: util.randomCouchString(12)
                });
                assert.equal(db.constructor.name, 'RxDatabase');
                db.destroy();
            });
            it('2 instances on same adapter', async() => {
                const name = util.randomCouchString(10);
                const db = await RxDatabase.create({
                    name,
                    adapter: 'memory'
                });
                const db2 = await RxDatabase.create({
                    name,
                    adapter: 'memory'
                });
                db.destroy();
                db2.destroy();
            });
            it('2 password-instances on same adapter', async() => {
                const name = util.randomCouchString(10);
                const password = util.randomCouchString(12);
                const db = await RxDatabase.create({
                    name,
                    adapter: 'memory',
                    password
                });
                const db2 = await RxDatabase.create({
                    name,
                    adapter: 'memory',
                    password
                });
                db.destroy();
                db2.destroy();
            });
        });
        describe('negative', () => {
            it('should crash with invalid token', async() => {
                await AsyncTestUtil.assertThrows(
                    () => RxDatabase.create({
                        name: null,
                        adapter: 'memory'
                    }),
                    TypeError
                );
            });
            it('should crash with invalid adapter', async() => {
                await AsyncTestUtil.assertThrows(
                    () => RxDatabase.create({
                        name: util.randomCouchString(10),
                        adapter: {}
                    }),
                    Error
                );
            });
            it('should crash with invalid password (no string)', async() => {
                await AsyncTestUtil.assertThrows(
                    () => RxDatabase.create({
                        name: util.randomCouchString(10),
                        adapter: 'memory',
                        password: {}
                    }),
                    TypeError
                );
            });
            it('should crash with invalid password (too short)', async() => {
                await AsyncTestUtil.assertThrows(
                    () => RxDatabase.create({
                        name: util.randomCouchString(10),
                        adapter: 'memory',
                        password: util.randomCouchString(4)
                    }),
                    Error
                );
            });
            it('BUG: should have a pwHash-doc after creating the database', async() => {
                const name = util.randomCouchString(10);
                const password = util.randomCouchString(10);
                const db = await RxDatabase.create({
                    name,
                    adapter: 'memory',
                    password
                });
                const doc = await db._adminPouch.get('_local/pwHash');
                assert.equal(typeof doc.value, 'string');
                const db2 = await RxDatabase.create({
                    name,
                    adapter: 'memory',
                    password
                });
                const doc2 = await db._adminPouch.get('_local/pwHash');
                assert.equal(typeof doc.value, 'string');

                db.destroy();
                db2.destroy();
            });
            it('prevent 2 instances with different passwords on same adapter', async() => {
                const name = util.randomCouchString(10);
                const db = await RxDatabase.create({
                    name,
                    adapter: 'memory',
                    password: util.randomCouchString(10)
                });
                await AsyncTestUtil.assertThrows(
                    () => RxDatabase.create({
                        name,
                        adapter: 'memory',
                        password: util.randomCouchString(10)
                    }),
                    Error
                );
                db.destroy();
            });
        });
    });
    describe('.collection()', () => {
        describe('positive', () => {
            it('human', async() => {
                const db = await RxDatabase.create({
                    name: util.randomCouchString(10),
                    adapter: 'memory'
                });
                const collection = await db.collection({
                    name: 'human0',
                    schema: schemas.human
                });
                assert.equal(collection.constructor.name, 'RxCollection');

                // make sure defineGetter works
                assert.equal(db.human0, collection);

                db.destroy();
            });
            it('the schema-object should be saved in the collectionsCollection', async() => {
                const db = await RxDatabase.create({
                    name: util.randomCouchString(10),
                    adapter: 'memory'
                });
                const collection = await db.collection({
                    name: 'human0',
                    schema: schemas.human
                });
                const colDoc = await db._collectionsPouch.get('human0-' + schemas.human.version);
                const compareSchema = RxSchema.create(schemas.human);
                assert.deepEqual(compareSchema.normalized, colDoc.schema);
            });
            it('use Schema-Object', async() => {
                const db = await RxDatabase.create({
                    name: util.randomCouchString(10),
                    adapter: 'memory'
                });
                const schema = RxDatabase.RxSchema.create(schemas.human);
                const collection = await db.collection({
                    name: 'human1',
                    schema
                });
                assert.equal(collection.constructor.name, 'RxCollection');
                db.destroy();
            });
            it('use encrypted db', async() => {
                const db = await RxDatabase.create({
                    name: util.randomCouchString(10),
                    adapter: 'memory',
                    password: util.randomCouchString(12)
                });
                const collection = await db.collection({
                    name: 'humanenc',
                    schema: schemas.encryptedHuman
                });
                assert.equal(collection.constructor.name, 'RxCollection');
                db.destroy();
            });
            it('collectionsCollection should contain schema.version', async() => {
                const db = await RxDatabase.create({
                    name: util.randomCouchString(10),
                    adapter: 'memory'
                });
                const collection = await db.collection({
                    name: 'human',
                    schema: schemas.human
                });
                const version = collection.schema.version;
                assert.deepEqual(version, 0);
                const internalDoc = await db._collectionsPouch.get('human-' + version);
                assert.deepEqual(internalDoc.version, version);
                db.destroy();
            });
            it('create 2 times on same adapter', async() => {
                const name = util.randomCouchString(10);
                const collectionName = 'foobar';
                const db1 = await RxDatabase.create({
                    name,
                    adapter: 'memory'
                });
                const db2 = await RxDatabase.create({
                    name,
                    adapter: 'memory'
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
        });
        describe('negative', () => {
            it('broken schema (nostringIndex)', async() => {
                const db = await RxDatabase.create({
                    name: util.randomCouchString(10),
                    adapter: 'memory'
                });
                await AsyncTestUtil.assertThrows(
                    () => db.collection({
                        name: 'human6',
                        schema: schemas.nostringIndex
                    }),
                    Error
                );
                db.destroy();
            });
            it('call 2 times on same name', async() => {
                const db = await RxDatabase.create({
                    name: util.randomCouchString(10),
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
                    Error
                );
                db.destroy();
            });
            it('crypt-schema without db-password', async() => {
                const db = await RxDatabase.create({
                    name: util.randomCouchString(10),
                    adapter: 'memory'
                });
                await AsyncTestUtil.assertThrows(
                    () => db.collection({
                        name: 'human7',
                        schema: schemas.encryptedHuman
                    }),
                    Error
                );
                db.destroy();
            });
            it('2 different schemas on same collection', async() => {
                const db = await RxDatabase.create({
                    name: util.randomCouchString(10),
                    adapter: 'memory'
                });
                await db.collection({
                    name: 'human8',
                    schema: schemas.human
                });
                await AsyncTestUtil.assertThrows(
                    () => db.collection({
                        name: 'human8',
                        schema: schemas.bigHuman
                    }),
                    Error
                );
                db.destroy();
            });
            it('not allow collectionNames starting with lodash', async() => {
                const db = await RxDatabase.create({
                    name: util.randomCouchString(10),
                    adapter: 'memory'
                });
                await AsyncTestUtil.assertThrows(
                    () => db.collection({
                        name: '_test',
                        schema: schemas.human
                    }),
                    Error
                );
                db.destroy();
            });
            it('not allow collectionNames which are properties of RxDatabase', async() => {
                const db = await RxDatabase.create({
                    name: util.randomCouchString(10),
                    adapter: 'memory'
                });
                const forbidden = [
                    'name',
                    'token',
                    'prepare',
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
                        Error
                    );
                    t++;
                }
                db.destroy();
            });
            it('create 2 times on same adapter with different schema', async() => {
                const name = util.randomCouchString(10);
                const collectionName = 'foobar';
                const db1 = await RxDatabase.create({
                    name,
                    adapter: 'memory'
                });
                const db2 = await RxDatabase.create({
                    name,
                    adapter: 'memory'
                });
                await db1.collection({
                    name: collectionName,
                    schema: schemas.human
                });
                await AsyncTestUtil.assertThrows(
                    () => db2.collection({
                        name: collectionName,
                        schema: schemas.bigHuman
                    }),
                    Error
                );
                db1.destroy();
                db2.destroy();
            });
        });
    });
    describe('.destroy()', () => {
        describe('positive', () => {
            it('should not crash on destroy', async() => {
                const db = await RxDatabase.create({
                    name: util.randomCouchString(10),
                    adapter: 'memory'
                });
                await db.collection({
                    name: 'foobar',
                    schema: schemas.human
                });
                db.destroy();
                assert.equal(db.destroyed, true);
                db.destroy();
            });
            it('should not crash if destroy is called twice', async() => {
                const db = await RxDatabase.create({
                    name: util.randomCouchString(10),
                    adapter: 'memory'
                });
                await db.collection({
                    name: 'foobar',
                    schema: schemas.human
                });
                db.destroy();
                db.destroy();
                assert.equal(db.destroyed, true);
            });
        });
    });
    describe('.remove()', () => {
        it('should not crash', async() => {
            const c = await humansCollection.create(10);
            await c.database.remove();
        });
        it('should be possible to recreate the database with other password', async() => {
            const db = await RxDatabase.create({
                name: util.randomCouchString(10),
                adapter: 'memory',
                password: 'fo222222obar'
            });
            await db.remove();

            const db2 = await RxDatabase.create({
                name: util.randomCouchString(10),
                adapter: 'memory',
                password: 'foo2222333333bar2'
            });
            await db2.remove();
        });
    });

    describe('wait a bit', () => {
        it('w8 a bit', (done) => {
            setTimeout(done, 30);
        });
    });

});
