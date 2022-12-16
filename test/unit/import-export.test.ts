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
    randomCouchString,
    blobBufferUtil,
} from '../../';

import AsyncTestUtil from 'async-test-util';
import config from './config';
import { HumanDocumentType } from './../helper/schemas';
import {
    wrappedKeyEncryptionStorage
} from '../../plugins/encryption';

config.parallel('import-export.test.js', () => {
    describe('Collection', () => {
        describe('.exportJSON()', () => {
            it('export the collection', async () => {
                const col = await humansCollection.create(5);
                const json = await col.exportJSON();
                assert.strictEqual(json.name, 'human');
                assert.strictEqual(typeof json.schemaHash, 'string');
                assert.strictEqual(json.docs.length, 5);
                json.docs.map(doc => assert.strictEqual(typeof doc, 'object'));
                col.database.destroy();
            });
            it('export encrypted as decrypted', async () => {
                const db = await createRxDatabase<{ enchuman: RxCollection<schemaObjects.EncryptedObjectHumanDocumentType>; }>({
                    name: randomCouchString(10),
                    storage: wrappedKeyEncryptionStorage({
                        storage: config.storage.getStorage()
                    }),
                    password: randomCouchString(10)
                });
                const cols = await db.addCollections({
                    enchuman: {
                        schema: schemas.encryptedObjectHuman
                    }
                });
                const col = cols.enchuman;

                const fns = [];
                for (let i = 0; i < 10; i++)
                    fns.push(col.insert(schemaObjects.encryptedObjectHuman()));
                await Promise.all(fns);

                const json = await col.exportJSON();
                assert.strictEqual(json.docs.length, 10);
                json.docs.map(doc => {
                    assert.strictEqual(typeof doc.secret, 'object');
                    assert.strictEqual(typeof doc.secret.name, 'string');
                    assert.strictEqual(typeof doc.secret.subname, 'string');
                });
                db.destroy();
            });
        });
        describe('.importJSON()', () => {
            describe('positive', () => {
                it('import json', async () => {
                    if (!config.storage.hasMultiInstance) {
                        return;
                    }
                    const col = await humansCollection.createMultiInstance(
                        randomCouchString(10),
                        5
                    );
                    const json = await col.exportJSON();
                    const emptyCol = await humansCollection.createMultiInstance(
                        randomCouchString(10),
                        0
                    );
                    const noDocs = await emptyCol.find().exec();
                    assert.strictEqual(noDocs.length, 0);

                    await emptyCol.importJSON(json);
                    const docs = await emptyCol.find().exec();
                    assert.strictEqual(docs.length, 5);

                    col.database.destroy();
                    emptyCol.database.destroy();
                });
            });
            describe('negative', () => {
                it('should not import if schema is different', async () => {
                    if (!config.storage.hasMultiInstance) {
                        return;
                    }
                    const col = await humansCollection.createMultiInstance('pref1', 5);
                    const json = await col.exportJSON();
                    const differentSchemaCol = await humansCollection.createNested();
                    await AsyncTestUtil.assertThrows(
                        // Explicitly typed as any because TS will catch this error
                        () => differentSchemaCol.importJSON(json as any),
                        'RxError'
                    );
                    col.database.destroy();
                    differentSchemaCol.database.destroy();
                });
            });
        });
    });
    describe('Database', () => {
        describe('.exportJSON()', () => {
            it('should export a valid dump', async () => {
                if (!config.storage.hasMultiInstance) {
                    return;
                }
                const col = await humansCollection.createMultiInstance(randomCouchString(10), 5);
                const json = await col.database.exportJSON();

                assert.strictEqual(typeof json.name, 'string');
                assert.strictEqual(typeof json.instanceToken, 'string');
                assert.strictEqual(typeof json.collections, 'object');
                assert.strictEqual(json.collections.length, 1);

                const colDump = json.collections[0];
                assert.strictEqual(colDump.name, 'human');
                assert.strictEqual(typeof colDump.schemaHash, 'string');
                assert.strictEqual(colDump.docs.length, 5);
                colDump.docs.map((doc: any) => assert.strictEqual(typeof doc, 'object'));
                col.database.destroy();
            });
            it('export encrypted as decrypted', async () => {
                const db = await createRxDatabase<{ enchuman: RxCollection<schemaObjects.EncryptedObjectHumanDocumentType>; }>({
                    name: randomCouchString(10),
                    storage: wrappedKeyEncryptionStorage({
                        storage: config.storage.getStorage()
                    }),
                    password: randomCouchString(10)
                });
                const cols = await db.addCollections({
                    enchuman: {
                        schema: schemas.encryptedObjectHuman
                    }
                });
                const col = cols.enchuman;
                await Promise.all(
                    new Array(10).fill(0)
                        .map(() => col.insert(schemaObjects.encryptedObjectHuman()))
                );
                const json = await db.exportJSON();

                json.collections[0].docs
                    .forEach(docData => {
                        assert.strictEqual(typeof docData.secret, 'object');
                        assert.strictEqual(typeof docData.secret.name, 'string');
                        assert.strictEqual(typeof docData.secret.subname, 'string');
                    });
                db.destroy();
            });
            it('export with multiple collections', async () => {
                const db = await createRxDatabase<{ enchuman: RxCollection<schemaObjects.EncryptedObjectHumanDocumentType>; }>({
                    name: randomCouchString(10),
                    storage: wrappedKeyEncryptionStorage({
                        storage: config.storage.getStorage()
                    }),
                    password: randomCouchString(10)
                });
                const cols = await db.addCollections({
                    enchuman: {
                        schema: schemas.encryptedObjectHuman
                    }
                });
                const col = cols.enchuman;
                const cols2 = await db.addCollections({
                    enchuman2: {
                        schema: schemas.encryptedObjectHuman
                    }
                });
                const col2 = cols2.enchuman2;

                const fns = [];
                for (let i = 0; i < 10; i++) {
                    fns.push(col.insert(schemaObjects.encryptedObjectHuman()));
                    fns.push(col2.insert(schemaObjects.encryptedObjectHuman()));
                }
                await Promise.all(fns);

                const json = await col.database.exportJSON();
                assert.strictEqual(json.collections.length, 2);
                json.collections
                    .forEach((c: any) => assert.strictEqual(c.docs.length, 10));
                db.destroy();
            });
            it('export 1 of 2 collections', async () => {
                const db = await createRxDatabase<{ enchuman: RxCollection<schemaObjects.EncryptedObjectHumanDocumentType>; }>({
                    name: randomCouchString(10),
                    storage: wrappedKeyEncryptionStorage({
                        storage: config.storage.getStorage()
                    }),
                    password: randomCouchString(10)
                });
                const cols = await db.addCollections({
                    enchuman: {
                        schema: schemas.encryptedObjectHuman
                    },
                    enchuman2: {
                        schema: schemas.encryptedObjectHuman
                    }
                });
                const col = cols.enchuman;
                const col2 = cols.enchuman2;

                const fns = [];
                for (let i = 0; i < 10; i++) {
                    fns.push(col.insert(schemaObjects.encryptedObjectHuman()));
                    fns.push(col2.insert(schemaObjects.encryptedObjectHuman()));
                }
                await Promise.all(fns);

                const json = await col.database.exportJSON(['enchuman']);
                assert.strictEqual(json.collections.length, 1);
                json.collections
                    .forEach((c: any) => assert.strictEqual(c.docs.length, 10));
                db.destroy();
            });
        });
        describe('.importJSON()', () => {
            describe('positive', () => {
                it('import dump', async () => {
                    const col = await humansCollection.create(5);
                    const db = col.database;
                    const json = await db.exportJSON();

                    const col2 = await humansCollection.create(0);
                    const db2 = col2.database;
                    await db2.importJSON(json);

                    const docs = await col2.find().exec();
                    assert.strictEqual(docs.length, 5);
                    db.destroy();
                    db2.destroy();
                });
            });
            describe('negative', () => {
                it('should not import if schema is different', async () => {

                    const db = await createRxDatabase<{ human: RxCollection<HumanDocumentType>; }>({
                        name: randomCouchString(10),
                        storage: config.storage.getStorage(),
                        password: null,
                        multiInstance: true
                    });
                    const cols = await db.addCollections({
                        human: {
                            schema: schemas.human
                        }
                    });
                    const col = cols.human;

                    const db2 = await createRxDatabase<{ human: RxCollection<schemaObjects.NestedHumanDocumentType>; }>({
                        name: randomCouchString(10),
                        storage: config.storage.getStorage(),
                        password: null,
                        multiInstance: true
                    });
                    const cols2 = await db2.addCollections({
                        human: {
                            schema: schemas.nestedHuman
                        }
                    });
                    const col2 = cols2.human;

                    const fns = [];
                    for (let i = 0; i < 5; i++) {
                        fns.push(col.insert(schemaObjects.human()));
                    }
                    await Promise.all(fns);

                    const json = await db.exportJSON();
                    await AsyncTestUtil.assertThrows(
                        // Explicitly typed as any because TS will catch this error
                        () => db2.importJSON(json as any),
                        'RxError'
                    );

                    const docs = await col2.find().exec();
                    assert.strictEqual(docs.length, 0);

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
                primaryKey: 'firstName',
                type: 'object',
                properties: {
                    firstName: {
                        type: 'string',
                        maxLength: 100
                    },
                    time: {
                        type: 'string'
                    }
                }
            };
            const db = await createRxDatabase({
                name: randomCouchString(10),
                storage: config.storage.getStorage(),
            });
            const db2 = await createRxDatabase({
                name: randomCouchString(10),
                storage: config.storage.getStorage(),
            });
            const cols = await db.addCollections({
                demo: {
                    schema: docSchema
                }
            });
            const col = cols.demo;
            await col.insert({
                firstName: 'nnnn'
            });
            const json = await db.exportJSON();

            // should throw when the collection does not exist
            await AsyncTestUtil.assertThrows(
                () => db2.importJSON(json),
                'RxError',
                'create the collections'
            );

            // should work when the collection exists
            const cols2 = await db2.addCollections({
                demo: {
                    schema: docSchema
                }
            });
            const col2 = cols2.demo;
            await db2.importJSON(json);
            const docs = await col2.find().exec();
            assert.strictEqual(docs.length, 1);

            db.destroy();
            db2.destroy();
        });
        it('#1396 import/export should work with attachments', async () => {
            if (!config.storage.hasAttachments) {
                return;
            }
            const sourceCol = await humansCollection.createAttachments(1);
            const doc = await sourceCol.findOne().exec(true);
            await doc.putAttachment({
                id: 'cat.txt',
                data: blobBufferUtil.createBlobBuffer('meow', 'text/plain'),
                type: 'text/plain'
            });
            const json = await sourceCol.exportJSON();

            const destCol = await humansCollection.createAttachments(0);

            const noDocs = await destCol.find().exec();
            assert.strictEqual(noDocs.length, 0);

            // this line triggers an error
            await destCol.importJSON(json);

            const docs = await destCol.find().exec();
            assert.strictEqual(docs.length, 1);

            const importedDoc = await destCol.findOne().exec();
            assert.ok(importedDoc);

            sourceCol.database.destroy();
            destCol.database.destroy();
        });
    });
});
