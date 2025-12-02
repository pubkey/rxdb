import assert from 'assert';
import config, { describeParallel } from './config.ts';
import AsyncTestUtil from 'async-test-util';

import {
    schemaObjects,
    schemas,
    getPassword,
    getEncryptedStorage,
    EncryptedHumanDocumentType,
    randomStringWithSpecialChars,
    getPullHandler,
    getPushHandler
} from '../../plugins/test-utils/index.mjs';

import {
    createRxDatabase,
    RxJsonSchema,
    randomToken,
    getSingleDocument,
    isRxCollection,
    RxCollection,
    STORAGE_TOKEN_DOCUMENT_ID,
    InternalStoreStorageTokenDocType,
    ensureNoStartupErrors,
    ensureNotFalsy,
    getComposedPrimaryKeyOfDocumentData,
    getFromMapOrThrow,
    RxStorage,
    WrappedRxStorageInstance
} from '../../plugins/core/index.mjs';

import {
    encryptString,
    decryptString
} from '../../plugins/encryption-crypto-js/index.mjs';
import { replicateRxCollection } from '../../plugins/replication/index.mjs';
import { getRxStorageMemory } from '../../plugins/storage-memory/index.mjs';
import { wrappedValidateAjvStorage } from '../../plugins/validate-ajv/index.mjs';


describeParallel('encryption.test.ts', () => {
    async function createEncryptedCollection(
        amount: number = 10,
        useStorage?: typeof storage
    ): Promise<RxCollection<EncryptedHumanDocumentType>> {
        if (useStorage) {
            useStorage = getEncryptedStorage(useStorage);
        } else {
            useStorage = storage;
        }
        const db = await createRxDatabase<{ encryptedhuman: RxCollection<EncryptedHumanDocumentType>; }>({
            name: randomToken(10),
            storage: useStorage,
            eventReduce: true,
            password: await getPassword()
        });
        // setTimeout(() => db.close(), dbLifetime);
        const collections = await db.addCollections({
            encryptedhuman: {
                schema: schemas.encryptedHuman
            }
        });

        // insert data
        if (amount > 0) {
            const docsData = new Array(amount)
                .fill(0)
                .map(() => schemaObjects.encryptedHumanData());
            await collections.encryptedhuman.bulkInsert(docsData);
        }

        return collections.encryptedhuman;
    }
    let storage: RxStorage<any, any>;
    describe('init', () => {
        it('create storage', () => {
            storage = getEncryptedStorage();
        });
    });
    describe('basics', () => {
        describe('.encryptString()', () => {
            it('string', () => {
                const value = 'foobar';
                const encrypted = encryptString(value, 'mypw');
                assert.strictEqual(typeof encrypted, 'string');
                assert.ok(!encrypted.includes(value));
                assert.ok(encrypted.length > value.length);
            });
        });
        describe('.decryptString()', () => {
            it('string', () => {
                const value = 'foobar';
                const encrypted = encryptString(value, 'mypw');
                const decrypted = decryptString(encrypted, 'mypw');
                assert.deepStrictEqual(decrypted, value);
            });
            it('should encrypt and decrypt an extremely long string', () => {
                const value = randomToken(5000);
                const pwd = 'pwd';
                const encrypted = encryptString(value, pwd);
                const decrypted = decryptString(encrypted, pwd);
                assert.notStrictEqual(value, encrypted);
                assert.ok(encrypted.length > value.length);
                assert.strictEqual(typeof encrypted, 'string');
                assert.strictEqual(value, decrypted);
            });
            it('should encrypt and decrypt an extremely long password', () => {
                const value = 'foobar';
                const pwd = randomToken(5000);
                const encrypted = encryptString(value, pwd);
                const decrypted = decryptString(encrypted, pwd);
                assert.notStrictEqual(value, encrypted);
                assert.ok(encrypted.length > value.length);
                assert.strictEqual(typeof encrypted, 'string');
                assert.strictEqual(value, decrypted);
            });
        });
    });
    describe('RxDatabase creation', () => {
        it('should crash with invalid password (empty object)', async () => {
            await AsyncTestUtil.assertThrows(
                () => createRxDatabase({
                    name: randomToken(10),
                    storage,
                    password: {}
                }),
                'RxTypeError',
                'EN1'
            );
        });
        it('BUG: should have stored the password hash when creating the database', async () => {
            const name = randomToken(10);
            const password = await getPassword();
            const db = await createRxDatabase({
                name,
                storage,
                password,
                ignoreDuplicate: true
            });
            await db.storageTokenDocument;
            const doc = await getSingleDocument<InternalStoreStorageTokenDocType>(
                db.internalStore,
                STORAGE_TOKEN_DOCUMENT_ID
            );
            if (!doc) {
                throw new Error('error in test this should never happen ' + doc);
            }
            assert.strictEqual(typeof doc.data.passwordHash, 'string');
            const db2 = await createRxDatabase({
                name,
                storage,
                password,
                ignoreDuplicate: true
            });
            await ensureNoStartupErrors(db2);
            const doc2 = await getSingleDocument<InternalStoreStorageTokenDocType>(
                db.internalStore,
                STORAGE_TOKEN_DOCUMENT_ID
            );
            assert.ok(doc2);
            assert.strictEqual(typeof doc2.data.passwordHash, 'string');

            db.close();
            db2.close();
        });
        it('prevent 2 instances with different passwords on same adapter', async () => {
            if (!config.storage.hasPersistence) {
                return;
            }
            const name = randomToken(10);
            const db = await createRxDatabase({
                name,
                storage,
                password: await getPassword(),
                ignoreDuplicate: true
            });
            await db.storageToken;
            const db2 = await createRxDatabase({
                name,
                storage,
                password: await getPassword(),
                ignoreDuplicate: true
            });

            /**
             * Because the database creation does some
             * tasks lazy, we have to run addCollections
             * so that ensureNoStartupErrors(rxDatabase) can throw
             * its stored errors.
             */
            await AsyncTestUtil.assertThrows(
                () => db2.addCollections({
                    humanenc: {
                        schema: schemas.encryptedHuman
                    }
                }),
                'RxError',
                'DB1'
            );
            db.close();
            db2.close();
        });
    });
    describe('RxCollection creation', () => {
        it('create encrypted collection', async () => {
            const db = await createRxDatabase({
                name: randomToken(10),
                storage,
                password: await getPassword()
            });
            const collections = await db.addCollections({
                humanenc: {
                    schema: schemas.encryptedHuman
                }
            });
            const collection = collections.humanenc;
            assert.ok(isRxCollection(collection));
            db.remove();
        });
    });
    describe('RxCollection.insert()', () => {
        it('should insert one encrypted value (string)', async () => {
            const c = await createEncryptedCollection(0);
            const agent = schemaObjects.encryptedHumanData();
            await c.insert(agent);
            const doc = await c.findOne().exec(true);
            const secret = doc.get('secret');
            assert.strictEqual(agent.secret, secret);
            c.database.remove();
        });
        it('should insert one encrypted value (object)', async () => {
            const db = await createRxDatabase({
                name: randomToken(10),
                storage,
                password: await getPassword()
            });
            const c = await db.addCollections({
                enchuman: {
                    schema: schemas.encryptedObjectHuman
                }
            });
            const agent = schemaObjects.encryptedObjectHumanData();
            await c.enchuman.insert(agent);
            const doc = await c.enchuman.findOne().exec();
            const secret = doc.get('secret');
            assert.strictEqual(agent.secret.name, secret.name);
            assert.strictEqual(agent.secret.subname, secret.subname);
            db.remove();
        });
        /**
         * @link https://github.com/pubkey/rxdb/issues/5624
         */
        it('#5624 insert with really big encrypted string', async () => {
            if (
                config.storage.name === 'foundationdb' ||
                config.storage.name === 'denokv'
            ) {
                // Error: Value length exceeds limit
                return;
            }
            const db = await createRxDatabase({
                name: randomToken(10),
                storage,
                password: await getPassword()
            });
            const c = await db.addCollections({
                enchuman: {
                    schema: schemas.encryptedHuman
                }
            });
            const secret = randomStringWithSpecialChars(1000 * 220, 1000 * 250);
            const agent = schemaObjects.encryptedHumanData();
            agent.secret = secret;
            await c.enchuman.insert(agent);
            const doc = await c.enchuman.findOne().exec();
            const secretAfter = doc.get('secret');
            assert.strictEqual(secret, secretAfter);
            db.remove();
        });
    });
    describe('RxDocument.save()', () => {
        it('should save one encrypted value (string)', async () => {
            const c = await createEncryptedCollection(0);
            const agent = schemaObjects.encryptedHumanData();
            await c.insert(agent);
            const doc = await c.findOne().exec(true);
            const secret = doc.get('secret');
            assert.strictEqual(agent.secret, secret);
            const newSecret = randomToken(10);

            await doc.incrementalPatch({ secret: newSecret });
            const docNew = await c.findOne().exec(true);
            assert.strictEqual(newSecret, docNew.get('secret'));
            c.database.remove();
        });
        it('should save one encrypted value (object)', async () => {
            const db = await createRxDatabase({
                name: randomToken(10),
                storage,
                password: await getPassword()
            });
            const c = await db.addCollections({
                enchuman: {
                    schema: schemas.encryptedObjectHuman
                }
            });
            const agent = schemaObjects.encryptedObjectHumanData();
            await c.enchuman.insert(agent);
            const newSecret = {
                name: randomToken(10),
                subname: randomToken(10)
            };
            const doc = await c.enchuman.findOne().exec(true);
            const secret = doc.get('secret');

            assert.strictEqual(agent.secret.name, secret.name);
            assert.strictEqual(agent.secret.subname, secret.subname);

            await doc.incrementalPatch({ secret: newSecret });
            const docNew = await c.enchuman.findOne().exec(true);

            assert.strictEqual(newSecret.name, docNew.get('secret.name'));
            assert.strictEqual(newSecret.subname, docNew.get('secret.subname'));
            db.remove();
        });
    });
    describe('replication', () => {
        if (!config.storage.hasReplication) {
            return;
        }
        it('replication state meta should not contain a secret in cleartext', async () => {
            if (config.storage.hasEncryption) {
                return;
            }
            const clientCollection = await createEncryptedCollection(0, wrappedValidateAjvStorage({ storage: getRxStorageMemory() }));
            const remoteCollection = await createEncryptedCollection(0, wrappedValidateAjvStorage({ storage: getRxStorageMemory() }));
            const secret = 'secret-' + randomToken(10);
            const human = schemaObjects.encryptedHumanData(secret);
            await remoteCollection.insert(human);

            const replicationState = replicateRxCollection({
                collection: clientCollection,
                replicationIdentifier: randomToken(10),
                live: true,
                pull: {
                    handler: getPullHandler<EncryptedHumanDocumentType, any>(remoteCollection as any)
                },
                push: {
                    handler: getPushHandler(remoteCollection as any)
                }
            });
            await replicationState.awaitInSync();
            const replicatedDoc = await clientCollection.findOne(human.passportId).exec(true);
            assert.strictEqual(replicatedDoc.secret, secret);

            const metaInstance = (
                ensureNotFalsy(replicationState.metaInstance) as WrappedRxStorageInstance<any, any, any>
            ).originalStorageInstance;

            const metaDocId = getComposedPrimaryKeyOfDocumentData(
                metaInstance.schema,
                {
                    itemId: human.passportId,
                    isCheckpoint: '0'
                }
            );
            const metaDoc = getFromMapOrThrow(metaInstance.internals.documents, metaDocId);
            const asString = JSON.stringify(metaDoc);
            assert.ok(!asString.includes(secret));


            /**
             * Removing encrypted databases was broken,
             * so remove instead of close here.
             */
            await clientCollection.database.remove();
            await remoteCollection.database.remove();
        });
    });
    describe('ISSUES', () => {
        it('#837 Recover from wrong database password', async () => {
            if (!config.storage.hasPersistence) {
                return;
            }

            const name = randomToken(10) + '837';
            const password = await getPassword();

            // 1. create and close encrypted db
            const db1 = await createRxDatabase({
                name,
                storage,
                password
            });
            await db1.storageToken;
            await db1.close();

            // 2. reopen with wrong password

            const db2 = await createRxDatabase({
                name,
                storage,
                password: await getPassword()
            });
            await db2.storageToken;

            await AsyncTestUtil.assertThrows(
                () => ensureNoStartupErrors(db2),
                'RxError',
                'different password'
            );
            await db2.close();

            // 3. reopen with correct password
            const db3 = await createRxDatabase({
                name,
                storage,
                password
            });
            assert.ok(db3);
            await db3.remove();
        });
        it('#917 Unexpected end of JSON input', async () => {
            const schema: RxJsonSchema<{ name: string; color: string; happy: boolean; }> = {
                title: 'hero schema',
                description: 'describes a simple hero',
                version: 0,
                primaryKey: 'name',
                type: 'object',
                properties: {
                    name: {
                        type: 'string',
                        maxLength: 100
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
            const dbName = randomToken(10);

            const db = await createRxDatabase({
                name: dbName,
                storage,
                password: await getPassword()
            });

            const collections = await db.addCollections({
                heroes: {
                    schema
                }
            });
            const collection = collections.heroes;

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

            db.remove();
        });
        describe('#157 Cannot sort on field(s) "XXX" when using the default index', () => {
            it('schema example 1', async () => {
                const schema: RxJsonSchema<{ user_id: string; user_pwd: string; last_login: number; status: string; }> = {
                    keyCompression: false,
                    version: 0,
                    primaryKey: 'user_id',
                    type: 'object',
                    properties: {
                        user_id: {
                            type: 'string',
                            maxLength: 100
                        },
                        user_pwd: {
                            type: 'string',
                        },
                        last_login: {
                            type: 'number'
                        },
                        status: {
                            type: 'string'
                        }
                    },
                    required: ['user_pwd', 'last_login', 'status'],
                    encrypted: [
                        'user_pwd'
                    ]
                };
                const db = await createRxDatabase({
                    name: randomToken(10),
                    storage,
                    password: await getPassword()
                });
                const colName = randomToken(10);
                const collections = await db.addCollections({
                    [colName]: {
                        schema
                    }
                });
                const collection = collections[colName];

                const query = collection
                    .findOne()
                    .where('status')
                    .eq('foobar');

                const resultDoc = await query.exec();
                assert.strictEqual(resultDoc, null);

                const queryAll = collection
                    .find()
                    .where('status')
                    .eq('foobar');

                const resultsAll = await queryAll.exec();
                assert.strictEqual(resultsAll.length, 0);
                db.remove();
            });
            it('schema example 2', async () => {
                const schema: RxJsonSchema<{ id: string; value: number; }> = {
                    keyCompression: false,
                    version: 0,
                    primaryKey: 'id',
                    type: 'object',
                    properties: {
                        id: {
                            type: 'string',
                            maxLength: 100
                        },
                        value: {
                            type: 'number',
                            minimum: 0,
                            maximum: 1000000,
                            multipleOf: 1
                        }
                    },
                    indexes: ['value'],
                    required: ['value']
                };
                const db = await createRxDatabase({
                    name: randomToken(10),
                    storage,
                    password: await getPassword()
                });

                const colName = randomToken(10);
                const collections = await db.addCollections({
                    [colName]: {
                        schema
                    }
                });
                const collection = collections[colName];

                const queryAll = collection
                    .find()
                    .sort({
                        value: 'desc'
                    });

                const resultsAll = await queryAll.exec();
                assert.strictEqual(resultsAll.length, 0);
                await db.remove();
            });
        });
    });
});
