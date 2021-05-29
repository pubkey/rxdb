/**
 * this test is to the import/export behaviour
 */
import assert from 'assert';

import * as schemas from './../helper/schemas';
import * as schemaObjects from './../helper/schema-objects';
import * as humansCollection from './../helper/humans-collection';

import {
    createRxDatabase,
    RxCollection,
    randomCouchString
} from '../../plugins/core';
import AsyncTestUtil from 'async-test-util';
import config from './config';

config.parallel('import-export.test.js', () => {
    describe('Collection', () => {
        describe('.dump()', () => {
            it('export the collection', async () => {
                const col = await humansCollection.create(5);
                const json = await col.dump();
                assert.strictEqual(json.name, 'human');
                assert.strictEqual(typeof json.schemaHash, 'string');
                assert.strictEqual(json.encrypted, false); // false because db has no encrypted field
                assert.strictEqual(json.passwordHash, null);
                assert.strictEqual(json.docs.length, 5);
                json.docs.map(doc => assert.strictEqual(typeof doc, 'object'));
                col.database.destroy();
            });
            it('export encrypted as encrypted', async () => {
                const db = await createRxDatabase<{ enchuman: RxCollection<schemaObjects.EncryptedObjectHumanDocumentType> }>({
                    name: randomCouchString(10),
                    adapter: 'memory',
                    password: randomCouchString(10)
                });
                const col = await db.collection<schemaObjects.EncryptedObjectHumanDocumentType>({
                    name: 'enchuman',
                    schema: schemas.encryptedObjectHuman
                });

                const fns = [];
                for (let i = 0; i < 10; i++)
                    fns.push(col.insert(schemaObjects.encryptedObjectHuman()));
                await Promise.all(fns);

                const json = await col.dump();

                assert.strictEqual(json.encrypted, true);
                assert.strictEqual(typeof json.passwordHash, 'string');
                assert.strictEqual(json.docs.length, 10);
                json.docs.forEach(doc => {
                    assert.strictEqual(typeof doc.secret, 'string');
                });
                db.destroy();
            });
            it('export encrypted as decrypted', async () => {
                const db = await createRxDatabase<{ enchuman: RxCollection<schemaObjects.EncryptedObjectHumanDocumentType> }>({
                    name: randomCouchString(10),
                    adapter: 'memory',
                    password: randomCouchString(10)
                });
                const col = await db.collection<schemaObjects.EncryptedObjectHumanDocumentType>({
                    name: 'enchuman',
                    schema: schemas.encryptedObjectHuman
                });
                const fns = [];
                for (let i = 0; i < 10; i++)
                    fns.push(col.insert(schemaObjects.encryptedObjectHuman()));
                await Promise.all(fns);

                const json = await col.dump(true);

                assert.strictEqual(json.encrypted, false);
                assert.strictEqual(json.passwordHash, null); // no hash when not encrypted
                assert.strictEqual(json.docs.length, 10);
                json.docs.map(doc => {
                    assert.strictEqual(typeof doc.secret, 'object');
                    assert.strictEqual(typeof doc.secret.name, 'string');
                    assert.strictEqual(typeof doc.secret.subname, 'string');
                });
                db.destroy();
            });
            it('decrypt a single value from an encrypted export', async () => {
                const db = await createRxDatabase<{ enchuman: RxCollection<schemaObjects.EncryptedObjectHumanDocumentType> }>({
                    name: randomCouchString(10),
                    adapter: 'memory',
                    password: randomCouchString(10)
                });
                const col = await db.collection<schemaObjects.EncryptedObjectHumanDocumentType>({
                    name: 'enchuman',
                    schema: schemas.encryptedObjectHuman
                });
                const fns = [];
                for (let i = 0; i < 10; i++) {
                    fns.push(col.insert(schemaObjects.encryptedObjectHuman()));
                }
                await Promise.all(fns);

                const json = await col.dump(false);

                const firstDoc = json.docs.pop() as any;
                const decrypted: any = col._crypter._decryptValue(firstDoc.secret);
                assert.strictEqual(typeof decrypted, 'object');
                assert.strictEqual(typeof decrypted['name'], 'string');
                assert.strictEqual(typeof decrypted['subname'], 'string');
                db.destroy();
            });
        });

        describe('.importDump()', () => {
            describe('positive', () => {
                it('import json', async () => {
                    const col = await humansCollection.createMultiInstance(
                        randomCouchString(10),
                        5
                    );
                    const json = await col.dump();
                    const emptyCol = await humansCollection.createMultiInstance(
                        randomCouchString(10),
                        0
                    );
                    const noDocs = await emptyCol.find().exec();
                    assert.strictEqual(noDocs.length, 0);

                    await emptyCol.importDump(json);
                    const docs = await emptyCol.find().exec();
                    assert.strictEqual(docs.length, 5);

                    col.database.destroy();
                    emptyCol.database.destroy();
                });
                it('import encrypted', async () => {
                    const password = randomCouchString(10);
                    const db = await createRxDatabase<{ enchuman: RxCollection<schemaObjects.EncryptedObjectHumanDocumentType> }>({
                        name: randomCouchString(10),
                        adapter: 'memory',
                        password
                    });
                    const col = await db.collection<schemaObjects.EncryptedObjectHumanDocumentType>({
                        name: 'enchuman',
                        schema: schemas.encryptedObjectHuman
                    });

                    const fns = [];
                    for (let i = 0; i < 10; i++)
                        fns.push(col.insert(schemaObjects.encryptedObjectHuman()));
                    await Promise.all(fns);

                    const json = await col.dump();

                    const db2 = await createRxDatabase<{ enchuman: RxCollection<schemaObjects.EncryptedObjectHumanDocumentType> }>({
                        name: randomCouchString(10),
                        adapter: 'memory',
                        password
                    });
                    const emptyCol = await db2.collection<schemaObjects.EncryptedObjectHumanDocumentType>({
                        name: 'enchuman',
                        schema: schemas.encryptedObjectHuman
                    });

                    // try to decrypt first
                    const firstDoc = json.docs[0];
                    const decrypted: any = emptyCol._crypter._decryptValue(firstDoc.secret);
                    assert.strictEqual(typeof decrypted, 'object');
                    assert.strictEqual(typeof decrypted['name'], 'string');
                    assert.strictEqual(typeof decrypted['subname'], 'string');

                    await emptyCol.importDump(json);
                    const docs = await emptyCol.find().exec();
                    assert.strictEqual(docs.length, 10);

                    const firstDocAfter = docs[0];
                    assert.strictEqual(typeof firstDocAfter.get('secret'), 'object');
                    assert.strictEqual(typeof firstDocAfter.get('secret').name, 'string');
                    assert.strictEqual(typeof firstDocAfter.get('secret').subname, 'string');
                    db.destroy();
                    db2.destroy();
                });
            });
            describe('negative', () => {
                it('should not import if schema is different', async () => {
                    const col = await humansCollection.createMultiInstance('pref1', 5);
                    const json = await col.dump();
                    const differentSchemaCol = await humansCollection.createNested();
                    await AsyncTestUtil.assertThrows(
                        // Explicitly typed as any because TS will catch this error
                        () => differentSchemaCol.importDump(json as any),
                        'RxError'
                    );
                    col.database.destroy();
                    differentSchemaCol.database.destroy();
                });
                it('should not import encrypted if password is different', async () => {
                    const db = await createRxDatabase<{ enchuman: RxCollection<schemaObjects.EncryptedObjectHumanDocumentType> }>({
                        name: randomCouchString(10),
                        adapter: 'memory',
                        password: randomCouchString(10)
                    });
                    const col = await db.collection<schemaObjects.EncryptedObjectHumanDocumentType>({
                        name: 'enchuman',
                        schema: schemas.encryptedObjectHuman
                    });

                    const db2 = await createRxDatabase<{ enchuman: RxCollection<schemaObjects.EncryptedObjectHumanDocumentType> }>({
                        name: randomCouchString(10),
                        adapter: 'memory',
                        password: randomCouchString(10)
                    });
                    const col2 = await db2.collection<schemaObjects.EncryptedObjectHumanDocumentType>({
                        name: 'enchuman',
                        schema: schemas.encryptedObjectHuman
                    });

                    const fns = [];
                    for (let i = 0; i < 10; i++)
                        fns.push(col.insert(schemaObjects.encryptedObjectHuman()));
                    await Promise.all(fns);

                    const json = await col.dump();
                    await AsyncTestUtil.assertThrows(
                        () => col2.importDump(json),
                        'RxError'
                    );
                    db.destroy();
                    db2.destroy();
                });
                it('should not import if schema not matching', async () => {
                    const db = await createRxDatabase<{ enchuman: RxCollection<schemaObjects.EncryptedObjectHumanDocumentType> }>({
                        name: randomCouchString(10),
                        adapter: 'memory',
                        password: randomCouchString(10)
                    });
                    const col = await db.collection<schemaObjects.EncryptedObjectHumanDocumentType>({
                        name: 'enchuman',
                        schema: schemas.encryptedObjectHuman
                    });
                    const fns = [];
                    for (let i = 0; i < 5; i++)
                        fns.push(col.insert(schemaObjects.encryptedObjectHuman()));
                    await Promise.all(fns);

                    // empty collection with same schema
                    const col2 = await db.collection<schemaObjects.EncryptedObjectHumanDocumentType>({
                        name: 'enchuman2',
                        schema: schemas.encryptedObjectHuman
                    });

                    const json = await col.dump();
                    // add one with broken schema
                    json.docs.push({
                        foo: 'bar',
                        _id: '0fg89sm5ui:1478730736884'
                    } as any); // Explicitly set to 'any' because TS will catch this error
                    await AsyncTestUtil.assertThrows(
                        () => col2.importDump(json),
                        'RxError',
                        [
                            'firstName',
                            'required'
                        ]
                    );
                    db.destroy();
                });
            });
        });
    });
    describe('Database', () => {
        describe('.dump()', () => {
            it('should export a valid dump', async () => {
                const col = await humansCollection.createMultiInstance(randomCouchString(10), 5);
                const json = await col.database.dump();

                assert.strictEqual(typeof json.name, 'string');
                assert.strictEqual(typeof json.instanceToken, 'string');
                assert.strictEqual(json.encrypted, false);
                assert.strictEqual(json.passwordHash, null);
                assert.strictEqual(typeof json.collections, 'object');
                assert.strictEqual(json.collections.length, 1);

                const colDump = json.collections[0];
                assert.strictEqual(colDump.name, 'human');
                assert.strictEqual(typeof colDump.schemaHash, 'string');
                assert.strictEqual(colDump.encrypted, false);
                assert.strictEqual(colDump.passwordHash, null);
                assert.strictEqual(colDump.docs.length, 5);
                colDump.docs.map(doc => assert.strictEqual(typeof doc, 'object'));
                col.database.destroy();
            });
            it('export encrypted as encrypted', async () => {
                const db = await createRxDatabase<{ enchuman: RxCollection<schemaObjects.EncryptedObjectHumanDocumentType> }>({
                    name: randomCouchString(10),
                    adapter: 'memory',
                    password: randomCouchString(10)
                });
                const col = await db.collection<schemaObjects.EncryptedObjectHumanDocumentType>({
                    name: 'enchuman',
                    schema: schemas.encryptedObjectHuman
                });
                const fns = [];
                for (let i = 0; i < 10; i++)
                    fns.push(col.insert(schemaObjects.encryptedObjectHuman()));
                await Promise.all(fns);
                const json = await db.dump();
                assert.strictEqual(json.encrypted, true);
                assert.strictEqual(typeof json.passwordHash, 'string');
                assert.strictEqual(json.collections[0].encrypted, true);
                assert.strictEqual(typeof json.collections[0].passwordHash, 'string');
                json.collections[0].docs
                    .forEach(docData => assert.strictEqual(typeof docData.secret, 'string'));
                db.destroy();
            });
            it('export encrypted as decrypted', async () => {
                const db = await createRxDatabase<{ enchuman: RxCollection<schemaObjects.EncryptedObjectHumanDocumentType> }>({
                    name: randomCouchString(10),
                    adapter: 'memory',
                    password: randomCouchString(10)
                });
                const col = await db.collection<schemaObjects.EncryptedObjectHumanDocumentType>({
                    name: 'enchuman',
                    schema: schemas.encryptedObjectHuman
                });
                await Promise.all(
                    new Array(10).fill(0)
                        .map(() => col.insert(schemaObjects.encryptedObjectHuman()))
                );
                const json = await db.dump(true);

                assert.strictEqual(json.encrypted, false);
                assert.strictEqual(typeof json.passwordHash, 'string');
                assert.strictEqual(json.collections[0].encrypted, false);
                assert.strictEqual(json.collections[0].passwordHash, null);
                json.collections[0].docs
                    .forEach(docData => {
                        assert.strictEqual(typeof docData.secret, 'object');
                        assert.strictEqual(typeof docData.secret.name, 'string');
                        assert.strictEqual(typeof docData.secret.subname, 'string');
                    });
                db.destroy();
            });
            it('export with multiple collections', async () => {
                const db = await createRxDatabase<{ enchuman: RxCollection<schemaObjects.EncryptedObjectHumanDocumentType> }>({
                    name: randomCouchString(10),
                    adapter: 'memory',
                    password: randomCouchString(10)
                });
                const col = await db.collection<schemaObjects.EncryptedObjectHumanDocumentType>({
                    name: 'enchuman',
                    schema: schemas.encryptedObjectHuman
                });
                const col2 = await db.collection<schemaObjects.EncryptedObjectHumanDocumentType>({
                    name: 'enchuman2',
                    schema: schemas.encryptedObjectHuman
                });

                const fns = [];
                for (let i = 0; i < 10; i++) {
                    fns.push(col.insert(schemaObjects.encryptedObjectHuman()));
                    fns.push(col2.insert(schemaObjects.encryptedObjectHuman()));
                }
                await Promise.all(fns);

                const json = await col.database.dump();
                assert.strictEqual(json.collections.length, 2);
                json.collections
                    .forEach(c => assert.strictEqual(c.docs.length, 10));
                db.destroy();
            });
            it('export 1 of 2 collections', async () => {
                const db = await createRxDatabase<{ enchuman: RxCollection<schemaObjects.EncryptedObjectHumanDocumentType> }>({
                    name: randomCouchString(10),
                    adapter: 'memory',
                    password: randomCouchString(10)
                });
                const col = await db.collection<schemaObjects.EncryptedObjectHumanDocumentType>({
                    name: 'enchuman',
                    schema: schemas.encryptedObjectHuman
                });
                const col2 = await db.collection<schemaObjects.EncryptedObjectHumanDocumentType>({
                    name: 'enchuman2',
                    schema: schemas.encryptedObjectHuman
                });

                const fns = [];
                for (let i = 0; i < 10; i++) {
                    fns.push(col.insert(schemaObjects.encryptedObjectHuman()));
                    fns.push(col2.insert(schemaObjects.encryptedObjectHuman()));
                }
                await Promise.all(fns);

                const json = await col.database.dump(false, ['enchuman']);
                assert.strictEqual(json.collections.length, 1);
                json.collections
                    .forEach(c => assert.strictEqual(c.docs.length, 10));
                db.destroy();
            });
        });
        describe('.importDump()', () => {
            describe('positive', () => {
                it('import dump', async () => {
                    const col = await humansCollection.create(5);
                    const db = col.database;
                    const json = await db.dump();

                    const col2 = await humansCollection.create(0);
                    const db2 = col2.database;
                    await db2.importDump(json);

                    const docs = await col2.find().exec();
                    assert.strictEqual(docs.length, 5);
                    db.destroy();
                    db2.destroy();
                });
                it('import encrypted', async () => {
                    const password = randomCouchString(10);
                    const db = await createRxDatabase<{ enchuman: RxCollection<schemaObjects.EncryptedObjectHumanDocumentType> }>({
                        name: randomCouchString(10),
                        adapter: 'memory',
                        password
                    });
                    const col = await db.collection<schemaObjects.EncryptedObjectHumanDocumentType>({
                        name: 'enchuman',
                        schema: schemas.encryptedObjectHuman
                    });
                    const db2 = await createRxDatabase<{ enchuman: RxCollection<schemaObjects.EncryptedObjectHumanDocumentType> }>({
                        name: randomCouchString(10),
                        adapter: 'memory',
                        password
                    });
                    const col2 = await db2.collection<schemaObjects.EncryptedObjectHumanDocumentType>({
                        name: 'enchuman',
                        schema: schemas.encryptedObjectHuman
                    });

                    const fns = [];
                    for (let i = 0; i < 10; i++)
                        fns.push(col.insert(schemaObjects.encryptedObjectHuman()));

                    await Promise.all(fns);
                    const json = await db.dump();

                    await db2.importDump(json);

                    const docs = await col2.find().exec();
                    assert.strictEqual(docs.length, 10);
                    db.destroy();
                    db2.destroy();
                });
            });
            describe('negative', () => {
                it('should not import if schema is different', async () => {

                    const db = await createRxDatabase<{ human: RxCollection<schemaObjects.HumanDocumentType> }>({
                        name: randomCouchString(10),
                        adapter: 'memory',
                        password: null,
                        multiInstance: true
                    });
                    const col = await db.collection<schemaObjects.HumanDocumentType>({
                        name: 'human',
                        schema: schemas.human
                    });

                    const db2 = await createRxDatabase<{ human: RxCollection<schemaObjects.NestedHumanDocumentType> }>({
                        name: randomCouchString(10),
                        adapter: 'memory',
                        password: null,
                        multiInstance: true
                    });
                    const col2 = await db2.collection<schemaObjects.NestedHumanDocumentType>({
                        name: 'human',
                        schema: schemas.nestedHuman
                    });

                    const fns = [];
                    for (let i = 0; i < 5; i++)
                        fns.push(col.insert(schemaObjects.human()));
                    await Promise.all(fns);

                    const json = await db.dump();
                    await AsyncTestUtil.assertThrows(
                        // Explicitly typed as any because TS will catch this error
                        () => db2.importDump(json as any),
                        'RxError'
                    );

                    const docs = await col2.find().exec();
                    assert.strictEqual(docs.length, 0);

                    db.destroy();
                    db2.destroy();
                });
                it('should not import encrypted if password is different', async () => {
                    const db = await createRxDatabase<{ enchuman: RxCollection<schemaObjects.EncryptedObjectHumanDocumentType> }>({
                        name: randomCouchString(10),
                        adapter: 'memory',
                        password: randomCouchString(10)
                    });
                    const col = await db.collection<schemaObjects.EncryptedObjectHumanDocumentType>({
                        name: 'enchuman',
                        schema: schemas.encryptedObjectHuman
                    });

                    const db2 = await createRxDatabase<{ enchuman: RxCollection<schemaObjects.EncryptedObjectHumanDocumentType> }>({
                        name: randomCouchString(10),
                        adapter: 'memory',
                        password: randomCouchString(10)
                    });
                    await db2.collection<schemaObjects.EncryptedObjectHumanDocumentType>({
                        name: 'enchuman',
                        schema: schemas.encryptedObjectHuman
                    });

                    const fns = [];
                    for (let i = 0; i < 10; i++)
                        fns.push(col.insert(schemaObjects.encryptedObjectHuman()));
                    await Promise.all(fns);

                    const json = await db.dump();
                    await AsyncTestUtil.assertThrows(
                        () => db2.importDump(json),
                        'RxError'
                    );
                    db.destroy();
                    db2.destroy();
                });
                it('should not import if schema not matching', async () => {
                    const db = await createRxDatabase<{ enchuman: RxCollection<schemaObjects.NestedHumanDocumentType> }>({
                        name: randomCouchString(10),
                        adapter: 'memory',
                        multiInstance: true
                    });
                    const col = await db.collection<schemaObjects.NestedHumanDocumentType>({
                        name: 'enchuman',
                        schema: schemas.nestedHuman
                    });

                    const db2 = await createRxDatabase<{ enchuman: RxCollection<schemaObjects.NestedHumanDocumentType> }>({
                        name: randomCouchString(10),
                        adapter: 'memory',
                        multiInstance: true
                    });
                    await db2.collection<schemaObjects.NestedHumanDocumentType>({
                        name: 'enchuman',
                        schema: schemas.nestedHuman
                    });

                    const fns = [];
                    for (let i = 0; i < 5; i++)
                        fns.push(col.insert(schemaObjects.nestedHuman()));
                    await Promise.all(fns);

                    const json = await db.dump();

                    // add one with broken schema
                    json.collections[0].docs.push({
                        foo: 'bar',
                        _id: '0fg89sm5ui:1478730736884'
                    } as any); // Explicitly set to 'any' because TS will catch this error

                    await AsyncTestUtil.assertThrows(
                        () => db2.importDump(json),
                        'RxError',
                        [
                            'firstName',
                            'required'
                        ]
                    );
                    db.destroy();
                    db2.destroy();
                });
            });
        });
    });
    describe('issues', () => {
        it('#319 collections must be created before importDump', async () => {
            const docSchema = {
                name: 'demo',
                version: 0,
                type: 'object',
                properties: {
                    firstName: {
                        primary: true,
                        type: 'string'
                    },
                    time: {
                        type: 'string'
                    }
                }
            };

            const db = await createRxDatabase({
                name: 'aaa',
                adapter: 'memory',
            });
            const db2 = await createRxDatabase({
                name: 'aaa1',
                adapter: 'memory',
            });
            const col = await db.collection({
                name: 'demo',
                schema: docSchema
            });
            await col.insert({
                firstName: 'nnnn'
            });
            const json = await db.dump();

            // should throw when the collection does not exist
            await AsyncTestUtil.assertThrows(
                () => db2.importDump(json),
                'RxError',
                'create the collections'
            );

            // should work when the collection exists
            const col2 = await db2.collection({
                name: 'demo',
                schema: docSchema
            });
            await db2.importDump(json);
            const docs = await col2.find().exec();
            assert.strictEqual(docs.length, 1);

            db.destroy();
            db2.destroy();
        });
        it('#1396 import/export should work with attachments', async () => {
            const sourceCol = await humansCollection.createAttachments(1);
            const doc = await sourceCol.findOne().exec(true);
            await doc.putAttachment({
                id: 'cat.txt',
                data: 'meow',
                type: 'text/plain'
            });
            const json = await sourceCol.dump();

            const destCol = await humansCollection.createAttachments(0);

            const noDocs = await destCol.find().exec();
            assert.strictEqual(noDocs.length, 0);

            // this line triggers an error
            await destCol.importDump(json);

            const docs = await destCol.find().exec();
            assert.strictEqual(docs.length, 1);

            const importedDoc = await destCol.findOne().exec();
            assert.ok(importedDoc);

            sourceCol.database.destroy();
            destCol.database.destroy();
        });
    });
});
