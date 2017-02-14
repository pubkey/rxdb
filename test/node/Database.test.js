import assert from 'assert';
import {
    default as memdown
} from 'memdown';
import {
    default as leveldown
} from 'leveldown';

const path = require('path');

import * as RxDatabase from '../../dist/lib/index';
import * as RxSchema from '../../dist/lib/RxSchema';
import * as util from '../../dist/lib/util';
import * as schemas from '../helper/schemas';

process.on('unhandledRejection', function(err) {
    throw err;
});

describe('RxDatabase.test.js', () => {

    describe('.create()', () => {
        describe('positive', () => {
            it('memdown', async() => {
                const db = await RxDatabase.create({
                    name: util.randomCouchString(10),
                    adapter: memdown
                });
                assert.equal(db.constructor.name, 'RxDatabase');
                db.destroy();
            });
            it('leveldown', async() => {
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
                    adapter: memdown,
                    password: util.randomCouchString(12)
                });
                assert.equal(db.constructor.name, 'RxDatabase');
                db.destroy();
            });
            it('2 instances on same adapter', async() => {
                const name = util.randomCouchString(10);
                const db = await RxDatabase.create({
                    name,
                    adapter: memdown
                });
                const db2 = await RxDatabase.create({
                    name,
                    adapter: memdown
                });
                db.destroy();
                db2.destroy();
            });
            it('2 password-instances on same adapter', async() => {
                const name = util.randomCouchString(10);
                const password = util.randomCouchString(12);
                const db = await RxDatabase.create({
                    name,
                    adapter: memdown,
                    password
                });
                const db2 = await RxDatabase.create({
                    name,
                    adapter: memdown,
                    password
                });
                db.destroy();
                db2.destroy();
            });
        });
        describe('negative', () => {
            it('should crash with invalid token', async() => {
                await util.assertThrowsAsync(
                    () => RxDatabase.create({
                        name: null,
                        adapter: memdown
                    }),
                    TypeError
                );
            });
            it('should crash with invalid adapter', async() => {
                await util.assertThrowsAsync(
                    () => RxDatabase.create({
                        name: util.randomCouchString(10),
                        adapter: {}
                    }),
                    Error
                );
            });
            it('should crash with invalid password (no string)', async() => {
                await util.assertThrowsAsync(
                    () => RxDatabase.create({
                        name: util.randomCouchString(10),
                        adapter: memdown,
                        password: {}
                    }),
                    TypeError
                );
            });
            it('should crash with invalid password (too short)', async() => {
                await util.assertThrowsAsync(
                    () => RxDatabase.create({
                        name: util.randomCouchString(10),
                        adapter: memdown,
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
                    adapter: memdown,
                    password
                });
                const doc = await db._adminPouch.get('_local/pwHash');
                assert.equal(typeof doc.value, 'string');
                const db2 = await RxDatabase.create({
                    name,
                    adapter: memdown,
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
                    adapter: memdown,
                    password: util.randomCouchString(10)
                });
                await util.assertThrowsAsync(
                    () => RxDatabase.create({
                        name,
                        adapter: memdown,
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
                    adapter: memdown
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
                    adapter: memdown
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
                    adapter: memdown
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
                    adapter: memdown,
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
                    adapter: memdown
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
            it('call 2 times with same params', async() => {
                const db = await RxDatabase.create({
                    name: util.randomCouchString(10),
                    adapter: memdown
                });
                await db.collection({
                    name: 'human2',
                    schema: schemas.human
                });
                await db.collection({
                    name: 'human2',
                    schema: schemas.human
                });
                db.destroy();
            });
            it('call to times when one is encrypted', async() => {
                const db1 = await RxDatabase.create({
                    name: util.randomCouchString(10),
                    adapter: memdown
                });
                const db2 = await RxDatabase.create({
                    name: util.randomCouchString(10),
                    adapter: memdown,
                    password: util.randomCouchString(10)
                });
                await db1.collection({
                    name: 'human3',
                    schema: schemas.human
                });
                await db2.collection({
                    name: 'human4',
                    schema: schemas.encryptedHuman
                });
                await db1.collection({
                    name: 'human3',
                    schema: schemas.human
                });

                db1.destroy();
                db2.destroy();
            });
            it('create 2 times on same adapter', async() => {
                const name = util.randomCouchString(10);
                const collectionName = 'foobar';
                const db1 = await RxDatabase.create({
                    name,
                    adapter: memdown
                });
                const db2 = await RxDatabase.create({
                    name,
                    adapter: memdown
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
                    adapter: memdown
                });
                await util.assertThrowsAsync(
                    () => db.collection({
                        name: 'human6',
                        schema: schemas.nostringIndex
                    }),
                    Error
                );
                db.destroy();
            });
            it('crypt-schema without db-password', async() => {
                const db = await RxDatabase.create({
                    name: util.randomCouchString(10),
                    adapter: memdown
                });
                await util.assertThrowsAsync(
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
                    adapter: memdown
                });
                await db.collection({
                    name: 'human8',
                    schema: schemas.human
                });
                await util.assertThrowsAsync(
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
                    adapter: memdown
                });
                await util.assertThrowsAsync(
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
                    adapter: memdown
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
                    await util.assertThrowsAsync(
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
                    adapter: memdown
                });
                const db2 = await RxDatabase.create({
                    name,
                    adapter: memdown
                });
                await db1.collection({
                    name: collectionName,
                    schema: schemas.human
                });
                await util.assertThrowsAsync(
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
                    adapter: memdown
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
                    adapter: memdown
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

    describe('wait a bit', () => {
        it('w8 a bit', (done) => {
            setTimeout(done, 30);
        });
    });

});
