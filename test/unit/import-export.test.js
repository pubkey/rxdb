/**
 * this test is to the import/export behaviour
 */
import assert from 'assert';

import * as schemas from './../helper/schemas';
import * as schemaObjects from './../helper/schema-objects';
import * as humansCollection from './../helper/humans-collection';

import * as RxDatabase from '../../dist/lib/rx-database';
import * as util from '../../dist/lib/util';
import AsyncTestUtil from 'async-test-util';
import config from './config';

config.parallel('import-export.test.js', () => {
    describe('Collection', () => {
        describe('.dump()', () => {
            it('export the collection', async () => {
                const col = await humansCollection.create(5);
                const json = await col.dump();
                assert.equal(json.name, 'human');
                assert.equal(typeof json.schemaHash, 'string');
                assert.equal(json.encrypted, false); // false because db has no encrypted field
                assert.equal(json.passwordHash, null);
                assert.equal(json.docs.length, 5);
                json.docs.map(doc => assert.equal(typeof doc, 'object'));
                col.database.destroy();
            });
            it('export encrypted as encrypted', async () => {
                const db = await RxDatabase.create({
                    name: util.randomCouchString(10),
                    adapter: 'memory',
                    password: util.randomCouchString(10)
                });
                const col = await db.collection({
                    name: 'enchuman',
                    schema: schemas.encryptedObjectHuman
                });

                const fns = [];
                for (let i = 0; i < 10; i++)
                    fns.push(col.insert(schemaObjects.encryptedObjectHuman()));
                await Promise.all(fns);

                const json = await col.dump();

                assert.equal(json.encrypted, true);
                assert.equal(typeof json.passwordHash, 'string');
                assert.equal(json.docs.length, 10);
                json.docs.forEach(doc => {
                    assert.equal(typeof doc.secret, 'string');
                });
                db.destroy();
            });
            it('export encrypted as decrypted', async () => {
                const db = await RxDatabase.create({
                    name: util.randomCouchString(10),
                    adapter: 'memory',
                    password: util.randomCouchString(10)
                });
                const col = await db.collection({
                    name: 'enchuman',
                    schema: schemas.encryptedObjectHuman
                });
                const fns = [];
                for (let i = 0; i < 10; i++)
                    fns.push(col.insert(schemaObjects.encryptedObjectHuman()));
                await Promise.all(fns);

                const json = await col.dump(true);

                assert.equal(json.encrypted, false);
                assert.equal(json.passwordHash, null); // no hash when not encrypted
                assert.equal(json.docs.length, 10);
                json.docs.map(doc => {
                    assert.equal(typeof doc.secret, 'object');
                    assert.equal(typeof doc.secret.name, 'string');
                    assert.equal(typeof doc.secret.subname, 'string');
                });
                db.destroy();
            });
            it('decrypt a single value from an encrypted export', async () => {
                const db = await RxDatabase.create({
                    name: util.randomCouchString(10),
                    adapter: 'memory',
                    password: util.randomCouchString(10)
                });
                const col = await db.collection({
                    name: 'enchuman',
                    schema: schemas.encryptedObjectHuman
                });
                const fns = [];
                for (let i = 0; i < 10; i++)
                    fns.push(col.insert(schemaObjects.encryptedObjectHuman()));
                await Promise.all(fns);

                const json = await col.dump(false);

                const firstDoc = json.docs.pop();
                const decrypted = col._crypter._decryptValue(firstDoc.secret);
                assert.equal(typeof decrypted, 'object');
                assert.equal(typeof decrypted.name, 'string');
                assert.equal(typeof decrypted.subname, 'string');
                db.destroy();
            });
        });

        describe('.importDump()', () => {
            describe('positive', () => {
                it('import json', async () => {
                    const col = await humansCollection.createMultiInstance(
                        util.randomCouchString(10),
                        5
                    );
                    const json = await col.dump();
                    const emptyCol = await humansCollection.createMultiInstance(
                        util.randomCouchString(10),
                        0
                    );
                    const noDocs = await emptyCol.find().exec();
                    assert.equal(noDocs.length, 0);

                    await emptyCol.importDump(json);
                    const docs = await emptyCol.find().exec();
                    assert.equal(docs.length, 5);

                    col.database.destroy();
                    emptyCol.database.destroy();
                });
                it('import encrypted', async () => {
                    const password = util.randomCouchString(10);
                    const db = await RxDatabase.create({
                        name: util.randomCouchString(10),
                        adapter: 'memory',
                        password
                    });
                    const col = await db.collection({
                        name: 'enchuman',
                        schema: schemas.encryptedObjectHuman
                    });

                    const fns = [];
                    for (let i = 0; i < 10; i++)
                        fns.push(col.insert(schemaObjects.encryptedObjectHuman()));
                    await Promise.all(fns);

                    const json = await col.dump();

                    const db2 = await RxDatabase.create({
                        name: util.randomCouchString(10),
                        adapter: 'memory',
                        password
                    });
                    const emptyCol = await db2.collection({
                        name: 'enchuman',
                        schema: schemas.encryptedObjectHuman
                    });

                    // try to decrypt first
                    const firstDoc = json.docs[0];
                    const decrypted = emptyCol._crypter._decryptValue(firstDoc.secret);
                    assert.equal(typeof decrypted, 'object');
                    assert.equal(typeof decrypted.name, 'string');
                    assert.equal(typeof decrypted.subname, 'string');

                    await emptyCol.importDump(json);
                    const docs = await emptyCol.find().exec();
                    assert.equal(docs.length, 10);

                    const firstDocAfter = docs[0];
                    assert.equal(typeof firstDocAfter.get('secret'), 'object');
                    assert.equal(typeof firstDocAfter.get('secret').name, 'string');
                    assert.equal(typeof firstDocAfter.get('secret').subname, 'string');
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
                        () => differentSchemaCol.importDump(json),
                        'RxError'
                    );
                    col.database.destroy();
                    differentSchemaCol.database.destroy();
                });
                it('should not import encrypted if password is different', async () => {
                    const db = await RxDatabase.create({
                        name: util.randomCouchString(10),
                        adapter: 'memory',
                        password: util.randomCouchString(10)
                    });
                    const col = await db.collection({
                        name: 'enchuman',
                        schema: schemas.encryptedObjectHuman
                    });

                    const db2 = await RxDatabase.create({
                        name: util.randomCouchString(10),
                        adapter: 'memory',
                        password: util.randomCouchString(10)
                    });
                    const col2 = await db2.collection({
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
                it('should not import when schema not matching', async () => {
                    const db = await RxDatabase.create({
                        name: util.randomCouchString(10),
                        adapter: 'memory',
                        password: util.randomCouchString(10)
                    });
                    const col = await db.collection({
                        name: 'enchuman',
                        schema: schemas.encryptedObjectHuman
                    });
                    const fns = [];
                    for (let i = 0; i < 5; i++)
                        fns.push(col.insert(schemaObjects.encryptedObjectHuman()));
                    await Promise.all(fns);

                    // empty collection with same schema
                    const col2 = await db.collection({
                        name: 'enchuman2',
                        schema: schemas.encryptedObjectHuman
                    });

                    const json = await col.dump();
                    // add one with broken schema
                    json.docs.push({
                        foo: 'bar',
                        _id: '0fg89sm5ui:1478730736884'
                    });
                    await AsyncTestUtil.assertThrows(
                        () => col2.importDump(json),
                        TypeError
                    );
                    db.destroy();
                });
            });
        });
    });
    describe('Database', () => {
        describe('.dump()', () => {
            it('should export a valid dump', async () => {
                const col = await humansCollection.createMultiInstance(util.randomCouchString(10), 5);
                const json = await col.database.dump();

                assert.equal(typeof json.name, 'string');
                assert.equal(typeof json.instanceToken, 'string');
                assert.equal(json.encrypted, false);
                assert.equal(json.passwordHash, null);
                assert.equal(typeof json.collections, 'object');
                assert.equal(json.collections.length, 1);

                const colDump = json.collections[0];
                assert.equal(colDump.name, 'human');
                assert.equal(typeof colDump.schemaHash, 'string');
                assert.equal(colDump.encrypted, false);
                assert.equal(colDump.passwordHash, null);
                assert.equal(colDump.docs.length, 5);
                colDump.docs.map(doc => assert.equal(typeof doc, 'object'));
                col.database.destroy();
            });
            it('export encrypted as encrypted', async () => {
                const db = await RxDatabase.create({
                    name: util.randomCouchString(10),
                    adapter: 'memory',
                    password: util.randomCouchString(10)
                });
                const col = await db.collection({
                    name: 'enchuman',
                    schema: schemas.encryptedObjectHuman
                });
                const fns = [];
                for (let i = 0; i < 10; i++)
                    fns.push(col.insert(schemaObjects.encryptedObjectHuman()));
                await Promise.all(fns);
                const json = await db.dump();
                assert.equal(json.encrypted, true);
                assert.equal(typeof json.passwordHash, 'string');
                assert.equal(json.collections[0].encrypted, true);
                assert.equal(typeof json.collections[0].passwordHash, 'string');
                json.collections[0].docs
                    .forEach(docData => assert.equal(typeof docData.secret, 'string'));
                db.destroy();
            });
            it('export encrypted as decrypted', async () => {
                const db = await RxDatabase.create({
                    name: util.randomCouchString(10),
                    adapter: 'memory',
                    password: util.randomCouchString(10)
                });
                const col = await db.collection({
                    name: 'enchuman',
                    schema: schemas.encryptedObjectHuman
                });
                await Promise.all(
                    new Array(10).fill(0)
                    .map(() => col.insert(schemaObjects.encryptedObjectHuman()))
                );
                const json = await db.dump(true);

                assert.equal(json.encrypted, false);
                assert.equal(typeof json.passwordHash, 'string');
                assert.equal(json.collections[0].encrypted, false);
                assert.equal(json.collections[0].passwordHash, null);
                json.collections[0].docs
                    .forEach(docData => {
                        assert.equal(typeof docData.secret, 'object');
                        assert.equal(typeof docData.secret.name, 'string');
                        assert.equal(typeof docData.secret.subname, 'string');
                    });
                db.destroy();
            });
            it('export with multiple collections', async () => {
                const db = await RxDatabase.create({
                    name: util.randomCouchString(10),
                    adapter: 'memory',
                    password: util.randomCouchString(10)
                });
                const col = await db.collection({
                    name: 'enchuman',
                    schema: schemas.encryptedObjectHuman
                });
                const col2 = await db.collection({
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
                assert.equal(json.collections.length, 2);
                json.collections
                    .forEach(col => assert.equal(col.docs.length, 10));
                db.destroy();
            });
            it('export 1 of 2 collections', async () => {
                const db = await RxDatabase.create({
                    name: util.randomCouchString(10),
                    adapter: 'memory',
                    password: util.randomCouchString(10)
                });
                const col = await db.collection({
                    name: 'enchuman',
                    schema: schemas.encryptedObjectHuman
                });
                const col2 = await db.collection({
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
                assert.equal(json.collections.length, 1);
                json.collections
                    .forEach(col => assert.equal(col.docs.length, 10));
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
                    assert.equal(docs.length, 5);
                    db.destroy();
                    db2.destroy();
                });
                it('import encrypted', async () => {
                    const password = util.randomCouchString(10);
                    const db = await RxDatabase.create({
                        name: util.randomCouchString(10),
                        adapter: 'memory',
                        password
                    });
                    const col = await db.collection({
                        name: 'enchuman',
                        schema: schemas.encryptedObjectHuman
                    });
                    const db2 = await RxDatabase.create({
                        name: util.randomCouchString(10),
                        adapter: 'memory',
                        password
                    });
                    const col2 = await db2.collection({
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
                    assert.equal(docs.length, 10);
                    db.destroy();
                    db2.destroy();
                });
            });
            describe('negative', () => {});
        });
    });
    describe('issues', () => {
        it('#319 collections must be created before importDump', async () => {
            const docSchema = {
                name: 'demo',
                version: 0,
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

            const db = await RxDatabase.create({
                name: 'aaa',
                adapter: 'memory',
            });
            const db2 = await RxDatabase.create({
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
            assert.equal(docs.length, 1);

            db.destroy();
            db2.destroy();
        });
    });
});
