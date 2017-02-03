import assert from 'assert';
import {
    default as randomToken
} from 'random-token';

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
                const db = await RxDatabase.create(randomToken(10), memdown);
                assert.equal(db.constructor.name, 'RxDatabase');
                db.destroy();
            });
            it('leveldown', async() => {
                if (path.join('..', 'x') != '..\\x') { // leveldown does not work on windows
                    const db = await RxDatabase.create('../test_tmp/' + randomToken(10), leveldown);
                    assert.equal(db.constructor.name, 'RxDatabase');
                    db.destroy();
                }
            });
            it('with password', async() => {
                const db = await RxDatabase.create(randomToken(10), memdown, randomToken(12));
                assert.equal(db.constructor.name, 'RxDatabase');
                db.destroy();
            });
            it('2 instances on same adapter', async() => {
                const dbname = randomToken(10);
                const db = await RxDatabase.create(dbname, memdown);
                const db2 = await RxDatabase.create(dbname, memdown);
                db.destroy();
                db2.destroy();
            });
            it('2 password-instances on same adapter', async() => {
                const dbname = randomToken(10);
                const password = randomToken(12);
                const db = await RxDatabase.create(dbname, memdown, password);
                const db2 = await RxDatabase.create(dbname, memdown, password);
                db.destroy();
                db2.destroy();
            });
        });
        describe('negative', () => {
            it('should crash with invalid token', async() => {
                await util.assertThrowsAsync(
                    () => RxDatabase.create(null, memdown),
                    TypeError
                );
            });
            it('should crash with invalid adapter', async() => {
                await util.assertThrowsAsync(
                    () => RxDatabase.create(randomToken(10), {}),
                    Error
                );
            });
            it('should crash with invalid password (no string)', async() => {
                await util.assertThrowsAsync(
                    () => RxDatabase.create(randomToken(10), memdown, {}),
                    TypeError
                );
            });
            it('should crash with invalid password (too short)', async() => {
                await util.assertThrowsAsync(
                    () => RxDatabase.create(randomToken(10), memdown, randomToken(4)),
                    Error
                );
            });
            it('BUG: should have a pwHash-doc after creating the database', async() => {
                const dbname = randomToken(10);
                const pw = randomToken(10);
                const db = await RxDatabase.create(dbname, memdown, pw);
                const doc = await db.administrationCollection.pouch.get('_local/pwHash');
                assert.equal(typeof doc.value, 'string');
                const db2 = await RxDatabase.create(dbname, memdown, pw);
                const doc2 = await db.administrationCollection.pouch.get('_local/pwHash');
                assert.equal(typeof doc.value, 'string');

                db.destroy();
                db2.destroy();
            });
            it('prevent 2 instances with different passwords on same adapter', async() => {
                const dbname = randomToken(10);
                const db = await RxDatabase.create(dbname, memdown, randomToken(10));
                await util.assertThrowsAsync(
                    () => RxDatabase.create(dbname, memdown, randomToken(10)),
                    Error
                );
                db.destroy();
            });
        });
    });
    describe('.collection()', () => {
        describe('positive', () => {
            it('human', async() => {
                const db = await RxDatabase.create(randomToken(10), memdown);
                const collection = await db.collection('human0', schemas.human);
                assert.equal(collection.constructor.name, 'RxCollection');
                db.destroy();
            });
            it('the schema-object should be saved in the collectionsCollection', async() => {
                const db = await RxDatabase.create(randomToken(10), memdown);
                const collection = await db.collection('human0', schemas.human);
                const colDoc = await db.collectionsCollection.pouch.get('human0');
                const compareSchema = RxSchema.create(schemas.human);
                assert.deepEqual(compareSchema.normalized, colDoc.schema);
            });
            it('use Schema-Object', async() => {
                const db = await RxDatabase.create(randomToken(10), memdown);
                const schema = RxDatabase.RxSchema.create(schemas.human);
                const collection = await db.collection('human1', schema);
                assert.equal(collection.constructor.name, 'RxCollection');
                db.destroy();
            });
            it('use encrypted db', async() => {
                const db = await RxDatabase.create(randomToken(10), memdown, randomToken(12));
                const collection = await db.collection('humanenc', schemas.encryptedHuman);
                assert.equal(collection.constructor.name, 'RxCollection');
                db.destroy();
            });
            it('call 2 times with same params', async() => {
                const db = await RxDatabase.create(randomToken(10), memdown);
                await db.collection('human2', schemas.human);
                await db.collection('human2', schemas.human);
                db.destroy();
            });

            it('call to times when one is encrypted', async() => {
                const db1 = await RxDatabase.create(randomToken(10), memdown);
                const db2 = await RxDatabase.create(randomToken(10), memdown, randomToken(10));
                await db1.collection('human3', schemas.human);
                await db2.collection('human4', schemas.encryptedHuman);
                await db1.collection('human3', schemas.human);

                db1.destroy();
                db2.destroy();
            });
            it('create 2 times on same adapter', async() => {
                const dbname = randomToken(10);
                const collectionName = 'foobar';
                const db1 = await RxDatabase.create(dbname, memdown);
                const db2 = await RxDatabase.create(dbname, memdown);
                await db1.collection(collectionName, schemas.human);
                await db2.collection(collectionName, schemas.human);
                db1.destroy();
                db2.destroy();
            });
        });
        describe('negative', () => {
            it('broken schema (nostringIndex)', async() => {
                const db = await RxDatabase.create(randomToken(10), memdown);
                await util.assertThrowsAsync(
                    () => db.collection('human6', schemas.nostringIndex),
                    Error
                );
                db.destroy();
            });

            it('crypt-schema without db-password', async() => {
                const db = await RxDatabase.create(randomToken(10), memdown);
                await util.assertThrowsAsync(
                    () => db.collection('human7', schemas.encryptedHuman),
                    Error
                );
                db.destroy();
            });

            it('2 different schemas on same collection', async() => {
                const db = await RxDatabase.create(randomToken(10), memdown);
                await db.collection('human8', schemas.human);
                await util.assertThrowsAsync(
                    () => db.collection('human8', schemas.bigHuman),
                    Error
                );
                db.destroy();
            });
            it('not allow collectionNames starting with lodash', async() => {
                const db = await RxDatabase.create(randomToken(10), memdown);
                await util.assertThrowsAsync(
                    () => db.collection('_test', schemas.human),
                    Error
                );
                db.destroy();
            });
            it('create 2 times on same adapter with different schema', async() => {
                const dbname = randomToken(10);
                const collectionName = 'foobar';
                const db1 = await RxDatabase.create(dbname, memdown);
                const db2 = await RxDatabase.create(dbname, memdown);
                await db1.collection(collectionName, schemas.human);
                await util.assertThrowsAsync(
                    () => db2.collection(collectionName, schemas.bigHuman),
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
                const db = await RxDatabase.create(randomToken(10), memdown);
                await db.collection('foobar', schemas.human);
                db.destroy();
                assert.equal(db.destroyed, true);
                db.destroy();
            });
            it('should not crash if destroy is called twice', async() => {
                const db = await RxDatabase.create(randomToken(10), memdown);
                await db.collection('foobar', schemas.human);
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
