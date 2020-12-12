import assert from 'assert';
import config from './config';
import AsyncTestUtil from 'async-test-util';

import * as schemas from '../helper/schemas';
import * as schemaObjects from '../helper/schema-objects';
import * as humansCollection from '../helper/humans-collection';

import {
    createRxSchema,
    createRxDatabase,
    RxJsonSchema,
    randomCouchString,
    createCrypter
} from '../../plugins/core';

config.parallel('encryption.test.js', () => {
    describe('Crypter.js', () => {
        it('create', () => {
            const schema = createRxSchema(schemas.human);
            const c = createCrypter('foobar', schema);
            assert.strictEqual(c.constructor.name, 'Crypter');
        });
        describe('._encryptValue()', () => {
            it('string', () => {
                const schema = createRxSchema(schemas.human);
                const c = createCrypter('mypw', schema);
                const value = 'foobar';
                const encrypted = c._encryptValue(value);
                assert.strictEqual(typeof encrypted, 'string');
                assert.ok(!encrypted.includes(value));
                assert.ok(encrypted.length > value.length);
            });
            it('object', () => {
                const schema = createRxSchema(schemas.human);
                const c = createCrypter('mypw', schema);
                const value = {
                    foo: 'bar'
                };
                const encrypted = c._encryptValue(value);
                assert.strictEqual(typeof encrypted, 'string');

                assert.ok(!encrypted.includes(value.foo));
                assert.ok(encrypted.length > 5);
            });
        });
        describe('._decryptValue()', () => {
            it('string', () => {
                const schema = createRxSchema(schemas.human);
                const c = createCrypter('mypw', schema);
                const value = 'foobar';
                const encrypted = c._encryptValue(value);
                const decrypted = c._decryptValue(encrypted);
                assert.deepStrictEqual(decrypted, value);
            });
            it('object', () => {
                const schema = createRxSchema(schemas.human);
                const c = createCrypter('mypw', schema);
                const value = {
                    foo: 'bar'
                };
                const encrypted = c._encryptValue(value);
                const decrypted = c._decryptValue(encrypted);
                assert.deepStrictEqual(decrypted, value);
            });
        });

        describe('.encrypt()', () => {
            it('string', () => {
                const schema = createRxSchema(schemas.encryptedHuman);
                const c = createCrypter('mypw', schema);
                const value = schemaObjects.encryptedHuman();
                const encrypted = c.encrypt(value);
                assert.notStrictEqual(encrypted.secret, value.secret);
                assert.strictEqual(typeof encrypted.secret, 'string');
                assert.strictEqual(value.passportId, encrypted.passportId);
            });
            it('object', () => {
                const schema = createRxSchema(schemas.encryptedObjectHuman);
                const c = createCrypter('mypw', schema);
                const value = schemaObjects.encryptedObjectHuman();
                const encrypted = c.encrypt(value);
                assert.notDeepStrictEqual(encrypted.secret, value.secret);
                assert.strictEqual(typeof encrypted.secret, 'string');
                assert.strictEqual(value.passportId, encrypted.passportId);
            });
        });
        describe('.decrypt()', () => {
            it('string', () => {
                const schema = createRxSchema(schemas.encryptedHuman);
                const c = createCrypter('mypw', schema);
                const value = schemaObjects.encryptedHuman();
                const encrypted = c.encrypt(value);
                const decrypted = c.decrypt(encrypted);
                assert.deepStrictEqual(decrypted, value);
            });
            it('object', () => {
                const schema = createRxSchema(schemas.encryptedObjectHuman);
                const c = createCrypter('mypw', schema);
                const value = schemaObjects.encryptedObjectHuman();
                const encrypted = c.encrypt(value);
                const decrypted = c.decrypt(encrypted);
                assert.deepStrictEqual(decrypted, value);
            });
        });
    });
    describe('Collection.insert()', () => {
        describe('positive', () => {
            it('should insert one encrypted value (string)', async () => {
                const c = await humansCollection.createEncrypted(0);
                const agent = schemaObjects.encryptedHuman();
                await c.insert(agent);
                const doc = await c.findOne().exec(true);
                const secret = doc.get('secret');
                assert.strictEqual(agent.secret, secret);
                c.database.destroy();
            });
            it('should insert one encrypted value (object)', async () => {
                const db = await createRxDatabase({
                    name: randomCouchString(10),
                    adapter: 'memory',
                    password: randomCouchString(10)
                });
                const c = await db.collection({
                    name: 'enchuman',
                    schema: schemas.encryptedObjectHuman
                });
                const agent = schemaObjects.encryptedObjectHuman();
                await c.insert(agent);
                const doc = await c.findOne().exec();
                const secret = doc.get('secret');
                assert.strictEqual(agent.secret.name, secret.name);
                assert.strictEqual(agent.secret.subname, secret.subname);
                db.destroy();
            });
        });
        describe('negative', () => { });
    });
    describe('RxDocument.save()', () => {
        describe('positive', () => {
            it('should save one encrypted value (string)', async () => {
                const c = await humansCollection.createEncrypted(0);
                const agent = schemaObjects.encryptedHuman();
                await c.insert(agent);
                const doc = await c.findOne().exec(true);
                const secret = doc.get('secret');
                assert.strictEqual(agent.secret, secret);
                const newSecret = randomCouchString(10);
                await doc.atomicSet('secret', newSecret);
                const docNew = await c.findOne().exec(true);
                assert.strictEqual(newSecret, docNew.get('secret'));
                c.database.destroy();
            });
            it('should save one encrypted value (object)', async () => {
                const db = await createRxDatabase({
                    name: randomCouchString(10),
                    adapter: 'memory',
                    password: randomCouchString(10)
                });
                const c = await db.collection({
                    name: 'enchuman',
                    schema: schemas.encryptedObjectHuman
                });
                const agent = schemaObjects.encryptedObjectHuman();
                await c.insert(agent);
                const newSecret = {
                    name: randomCouchString(10),
                    subname: randomCouchString(10)
                };
                const doc = await c.findOne().exec(true);
                const secret = doc.get('secret');

                assert.strictEqual(agent.secret.name, secret.name);
                assert.strictEqual(agent.secret.subname, secret.subname);

                await doc.atomicSet('secret', newSecret);
                const docNew = await c.findOne().exec(true);

                assert.strictEqual(newSecret.name, docNew.get('secret.name'));
                assert.strictEqual(newSecret.subname, docNew.get('secret.subname'));
                db.destroy();
            });
        });

        describe('negative', () => { });
    });
    describe('ISSUES', () => {
        it('#837 Recover from wrong database password', async () => {
            const name = randomCouchString(10) + '837';
            const password = randomCouchString(10);

            // 1. create and destroy encrypted db
            const db1 = await createRxDatabase({
                name,
                adapter: 'memory',
                password
            });
            await db1.destroy();

            // 2. reopen with wrong password
            await AsyncTestUtil.assertThrows(
                () => createRxDatabase({
                    name,
                    adapter: 'memory',
                    password: 'foobarfoobar'
                }),
                'RxError',
                'different password'
            );

            // 3. reopen with correct password
            const db2 = await createRxDatabase({
                name,
                adapter: 'memory',
                password
            });
            assert.ok(db2);
            await db2.destroy();
        });
        it('#917 Unexpected end of JSON input', async () => {
            const schema: RxJsonSchema = {
                title: 'hero schema',
                description: 'describes a simple hero',
                version: 0,
                type: 'object',
                properties: {
                    name: {
                        type: 'string',
                        primary: true
                    },
                    color: {
                        type: 'string'
                    },
                    happy: {
                        type: 'boolean'
                    }
                },
                required: ['color'],
                encrypted: [
                    'color',
                    'happy'
                ]
            };
            const dbName = randomCouchString(10);

            const db = await createRxDatabase({
                name: dbName,
                adapter: 'memory',
                password: 'myLongAndStupidPassword'
            });

            const collection = await db.collection({
                name: 'heroes',
                schema
            });

            // insert a document
            const record = await collection.findOne().exec();
            if (!record) {
                await collection.upsert({
                    name: 'big-billy',
                    color: 'arugula',
                });
            }

            // will throw exception
            await collection.findOne().exec();

            db.destroy();
        });
    });

});
