import assert from 'assert';
import {
    default as randomToken
} from 'random-token';
import {
    default as memdown
} from 'memdown';
import * as _ from 'lodash';


import * as schemas from './helper/schemas';
import * as schemaObjects from './helper/schema-objects';
import * as humansCollection from './helper/humans-collection';

import * as RxDatabase from '../lib/RxDatabase';
import * as RxSchema from '../lib/RxSchema';
import * as util from '../lib/util';

process.on('unhandledRejection', function(err) {
    throw err;
});


describe('Encryption.test.js', () => {

    describe('Schema.getEncryptedPaths()', () => {
        describe('positive', () => {
            it('get an encrypted path', async() => {
                const schema = RxSchema.create(schemas.encryptedHuman);
                const encPaths = schema.getEncryptedPaths();
                assert.equal(Object.keys(encPaths).length, 1);
                assert.equal(Object.keys(encPaths)[0], 'secret');
                assert.deepEqual(encPaths.secret, {
                    type: 'string',
                    encrypted: true
                });
            });
            it('get all encrypted paths', async() => {
                const schema = RxSchema.create(schemas.encryptedDeepHuman);
                const encPaths = schema.getEncryptedPaths();
                assert.equal(Object.keys(encPaths).length, 4);
                assert.equal(Object.keys(encPaths)[0], 'firstLevelPassword');
                assert.equal(Object.keys(encPaths)[1], 'secretData');
                assert.equal(Object.keys(encPaths)[2], 'deepSecret.darkhole.pw');
                assert.equal(Object.keys(encPaths)[3], 'nestedSecret.darkhole');
            });
            it('get no encrypted path', async() => {
                const schema = RxSchema.create(schemas.human);
                const encPaths = schema.getEncryptedPaths();
                assert.equal(Object.keys(encPaths).length, 0);
            });
        });
        describe('negative', () => {});
    });


    describe('Database encrypt/decrypt', () => {

        describe('positive', () => {
            it('should en/decrypt (string)', async() => {
                const db = await RxDatabase.create(randomToken(10), memdown, randomToken(10));
                const value = randomToken(10);
                const crypted = db._encrypt(value);
                assert.notEqual(value, crypted);
                const decrypted = db._decrypt(crypted);
                assert.equal(value, decrypted);
            });
            it('should en/decrypt (object)', async() => {
                const db = await RxDatabase.create(randomToken(10), memdown, randomToken(10));
                const value = {
                    k1: randomToken(10),
                    k2: randomToken(10),
                    nested: {
                        k3: randomToken(10),
                        k4: randomToken(10)
                    }
                };
                const crypted = db._encrypt(value);
                assert.notEqual(value, crypted);
                const decrypted = db._decrypt(crypted);
                assert.deepEqual(value, decrypted);
            });
        });
        describe('negative', () => {
            it('crash if no password given', async() => {
                const db = await RxDatabase.create(randomToken(10), memdown);
                const value = randomToken(10);
                await util.assertThrowsAsync(
                    () => db._encrypt(value),
                    Error
                );
            });
        });
    });

    describe('Collection.insert()', () => {
        describe('positive', () => {
            it('should insert one encrypted value (string)', async() => {
                const c = await humansCollection.createEncrypted(0);
                const agent = schemaObjects.encryptedHuman();
                await c.insert(agent);
                const doc = await c.findOne().exec();
                const secret = doc.get('secret');
                assert.equal(agent.secret, secret);
            });
            it('should insert one encrypted value (object)', async() => {
                const db = await RxDatabase.create(randomToken(10), memdown, randomToken(10));
                const c = await db.collection('enchuman', schemas.encryptedObjectHuman);
                const agent = schemaObjects.encryptedObjectHuman();
                await c.insert(agent);
                const doc = await c.findOne().exec();
                const secret = doc.get('secret');
                assert.deepEqual(agent.secret, secret);
            });
        });
        describe('negative', () => {
            it('should not insert nested if root not there', async() => {
                const db = await RxDatabase.create(randomToken(10), memdown, randomToken(10));
                const c = await db.collection('enchuman', schemas.encryptedObjectHuman);
                const agentData = schemaObjects.encryptedObjectHuman();
                await c.insert(agentData);
                const doc = await c.findOne()
                    .select({
                        passportId: 1
                    })
                    .exec();
                await util.assertThrowsAsync(
                    () => doc.set('secret.subname', randomToken(10)),
                    Error
                );
            });
        });
    });

    describe('Document.save()', () => {

        describe('positive', () => {

            it('should save one encrypted value (string)', async() => {
                const c = await humansCollection.createEncrypted(0);
                const agent = schemaObjects.encryptedHuman();
                await c.insert(agent);
                const doc = await c.findOne().exec();
                const secret = doc.get('secret');
                assert.equal(agent.secret, secret);
                const newSecret = randomToken(10);
                doc.set('secret', newSecret);
                await doc.save();
                const docNew = await c.findOne().exec();
                assert.equal(newSecret, docNew.get('secret'));
            });

            it('should save one encrypted value (object)', async() => {
                const db = await RxDatabase.create(randomToken(10), memdown, randomToken(10));
                const c = await db.collection('enchuman', schemas.encryptedObjectHuman);
                const agent = schemaObjects.encryptedObjectHuman();
                await c.insert(agent);
                const newSecret = {
                    name: randomToken(10),
                    subname: randomToken(10)
                };
                const doc = await c.findOne().exec();
                const secret = doc.get('secret');
                assert.deepEqual(agent.secret, secret);
                doc.set('secret', newSecret);
                await doc.save();
                const docNew = await c.findOne().exec();
                assert.deepEqual(newSecret, docNew.get('secret'));
            });

        });

        describe('negative', () => {});

    });

});
