import assert from 'assert';
import config from './config';
import AsyncTestUtil from 'async-test-util';

import * as schemas from '../helper/schemas';
import * as schemaObjects from '../helper/schema-objects';
import * as humansCollection from '../helper/humans-collection';

import {
    createRxSchema,
    RxSchema,
    createRxDatabase
} from '../../';
import {
    create
} from '../../dist/lib/crypter';
import * as util from '../../dist/lib/util';
import RxDB from '../../';
import {
    Crypter
} from '../../src/crypter';

config.parallel('encryption.test.js', () => {
    function createCrypter(
        name: string,
        schema: RxSchema
    ): Crypter {
        return create(name, schema) as Crypter;
    }
    describe('Schema.encryptedPaths', () => {
        describe('positive', () => {
            it('get an encrypted path', async () => {
                const schema = createRxSchema(schemas.encryptedHuman);
                const encPaths = schema.encryptedPaths;
                assert.equal(Object.keys(encPaths).length, 1);
                assert.equal(Object.keys(encPaths)[0], 'secret');
                assert.deepEqual(encPaths.secret, {
                    type: 'string',
                    encrypted: true
                });
            });
            it('get all encrypted paths', async () => {
                const schema = createRxSchema(schemas.encryptedDeepHuman);
                const encPaths = schema.encryptedPaths;
                assert.equal(Object.keys(encPaths).length, 4);
                assert.equal(Object.keys(encPaths)[0], 'firstLevelPassword');
                assert.equal(Object.keys(encPaths)[1], 'secretData');
                assert.equal(Object.keys(encPaths)[2], 'deepSecret.darkhole.pw');
                assert.equal(Object.keys(encPaths)[3], 'nestedSecret.darkhole');
            });
            it('get no encrypted path', async () => {
                const schema = createRxSchema(schemas.human);
                const encPaths = schema.encryptedPaths;
                assert.equal(Object.keys(encPaths).length, 0);
            });
        });
        describe('negative', () => { });
    });
    describe('Crypter.js', () => {
        it('create', () => {
            const schema = createRxSchema(schemas.human);
            const c = createCrypter('foobar', schema);
            assert.equal(c.constructor.name, 'Crypter');
        });
        describe('._encryptValue()', () => {
            it('string', () => {
                const schema = createRxSchema(schemas.human);
                const c = createCrypter('mypw', schema);
                const value = 'foobar';
                const encrypted = c._encryptValue(value);
                assert.equal(typeof encrypted, 'string');
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
                assert.equal(typeof encrypted, 'string');

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
                assert.deepEqual(decrypted, value);
            });
            it('object', () => {
                const schema = createRxSchema(schemas.human);
                const c = createCrypter('mypw', schema);
                const value = {
                    foo: 'bar'
                };
                const encrypted = c._encryptValue(value);
                const decrypted = c._decryptValue(encrypted);
                assert.deepEqual(decrypted, value);
            });
        });

        describe('.encrypt()', () => {
            it('string', () => {
                const schema = createRxSchema(schemas.encryptedHuman);
                const c = createCrypter('mypw', schema);
                const value = schemaObjects.encryptedHuman();
                const encrypted = c.encrypt(value);
                assert.notEqual(encrypted.secret, value.secret);
                assert.equal(typeof encrypted.secret, 'string');
                assert.equal(value.passportId, encrypted.passportId);
            });
            it('object', () => {
                const schema = createRxSchema(schemas.encryptedObjectHuman);
                const c = createCrypter('mypw', schema);
                const value = schemaObjects.encryptedObjectHuman();
                const encrypted = c.encrypt(value);
                assert.notDeepEqual(encrypted.secret, value.secret);
                assert.equal(typeof encrypted.secret, 'string');
                assert.equal(value.passportId, encrypted.passportId);
            });
        });
        describe('.decrypt()', () => {
            it('string', () => {
                const schema = createRxSchema(schemas.encryptedHuman);
                const c = createCrypter('mypw', schema);
                const value = schemaObjects.encryptedHuman();
                const encrypted = c.encrypt(value);
                const decrypted = c.decrypt(encrypted);
                assert.deepEqual(decrypted, value);
            });
            it('object', () => {
                const schema = createRxSchema(schemas.encryptedObjectHuman);
                const c = createCrypter('mypw', schema);
                const value = schemaObjects.encryptedObjectHuman();
                const encrypted = c.encrypt(value);
                const decrypted = c.decrypt(encrypted);
                assert.deepEqual(decrypted, value);
            });
        });
    });
    describe('Collection.insert()', () => {
        describe('positive', () => {
            it('should insert one encrypted value (string)', async () => {
                const c = await humansCollection.createEncrypted(0);
                const agent = schemaObjects.encryptedHuman();
                await c.insert(agent);
                const doc = await c.findOne().exec();
                const secret = doc.get('secret');
                assert.equal(agent.secret, secret);
                c.database.destroy();
            });
            it('should insert one encrypted value (object)', async () => {
                const db = await createRxDatabase({
                    name: util.randomCouchString(10),
                    adapter: 'memory',
                    password: util.randomCouchString(10)
                });
                const c = await db.collection({
                    name: 'enchuman',
                    schema: schemas.encryptedObjectHuman
                });
                const agent = schemaObjects.encryptedObjectHuman();
                await c.insert(agent);
                const doc = await c.findOne().exec();
                const secret = doc.get('secret');
                assert.equal(agent.secret.name, secret.name);
                assert.equal(agent.secret.subname, secret.subname);
                db.destroy();
            });
        });
        describe('negative', () => { });
    });
    describe('Document.save()', () => {
        describe('positive', () => {
            it('should save one encrypted value (string)', async () => {
                const c = await humansCollection.createEncrypted(0);
                const agent = schemaObjects.encryptedHuman();
                await c.insert(agent);
                const doc = await c.findOne().exec();
                const secret = doc.get('secret');
                assert.equal(agent.secret, secret);
                const newSecret = util.randomCouchString(10);
                await doc.atomicSet('secret', newSecret);
                const docNew = await c.findOne().exec();
                assert.equal(newSecret, docNew.get('secret'));
                c.database.destroy();
            });
            it('should save one encrypted value (object)', async () => {
                const db = await createRxDatabase({
                    name: util.randomCouchString(10),
                    adapter: 'memory',
                    password: util.randomCouchString(10)
                });
                const c = await db.collection({
                    name: 'enchuman',
                    schema: schemas.encryptedObjectHuman
                });
                const agent = schemaObjects.encryptedObjectHuman();
                await c.insert(agent);
                const newSecret = {
                    name: util.randomCouchString(10),
                    subname: util.randomCouchString(10)
                };
                const doc = await c.findOne().exec();
                const secret = doc.get('secret');

                assert.equal(agent.secret.name, secret.name);
                assert.equal(agent.secret.subname, secret.subname);

                await doc.atomicSet('secret', newSecret);
                const docNew = await c.findOne().exec();

                assert.equal(newSecret.name, docNew.get('secret.name'));
                assert.equal(newSecret.subname, docNew.get('secret.subname'));
                db.destroy();
            });
        });

        describe('negative', () => { });
    });
    describe('ISSUES', () => {
        it('#837 Recover from wrong database password', async () => {
            const name = util.randomCouchString(10) + '837';
            const password = util.randomCouchString(10);

            // 1. create and destroy encrypted db
            const db1 = await RxDB.create({
                name,
                adapter: 'memory',
                password
            });
            await db1.destroy();

            // 2. reopen with wrong password
            await AsyncTestUtil.assertThrows(
                () => RxDB.create({
                    name,
                    adapter: 'memory',
                    password: 'foobarfoobar'
                }),
                'RxError',
                'different password'
            );

            // 3. reopen with correct password
            const db2 = await RxDB.create({
                name,
                adapter: 'memory',
                password
            });
            assert.ok(db2);
            await db2.destroy();
        });
        it('#917 Unexpected end of JSON input', async () => {
            const schema = {
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
                        type: 'string',
                        encrypted: true
                    },
                    happy: {
                        type: 'boolean',
                        encrypted: true
                    }
                },
                required: ['color']
            };
            const dbName = util.randomCouchString(10);

            const db = await RxDB.create({
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
