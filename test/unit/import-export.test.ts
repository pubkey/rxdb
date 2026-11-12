/**
 * this test is to the import/export behaviour
 */
import assert from 'assert';

import {
    createRxDatabase,
    RxCollection,
    RxDatabase,
    RxDumpImportConflictMode,
    RxError,
    randomToken,
    createBlob,
    createBlobFromBase64,
    blobToString,
    ensureNotFalsy
} from '../../plugins/core/index.mjs';

import AsyncTestUtil from 'async-test-util';
import config from './config.ts';
import {
    schemaObjects,
    schemas,
    humansCollection,
    getPassword,
    getEncryptedStorage,
    isDeno,
    HumanDocumentType,
    EncryptedObjectHumanDocumentType,
    NestedHumanDocumentType
} from '../../plugins/test-utils/index.mjs';

describe('import-export.test.js', () => {
    describe('Collection', () => {
        describe('.exportJSON()', () => {
            it('export the collection', async () => {
                const col = await humansCollection.create(5);
                const json = await col.exportJSON();
                assert.strictEqual(json.name, 'human');
                assert.strictEqual(typeof json.schemaHash, 'string');
                assert.strictEqual(json.docs.length, 5);
                json.docs.map(doc => assert.strictEqual(typeof doc, 'object'));
                col.database.close();
            });
            it('export encrypted as decrypted', async () => {
                const db = await createRxDatabase<{ enchuman: RxCollection<EncryptedObjectHumanDocumentType>; }>({
                    name: randomToken(10),
                    storage: getEncryptedStorage(),
                    password: await getPassword()
                });
                const cols = await db.addCollections({
                    enchuman: {
                        schema: schemas.encryptedObjectHuman
                    }
                });
                const col = cols.enchuman;

                const fns = [];
                for (let i = 0; i < 10; i++) {
                    fns.push(col.insert(schemaObjects.encryptedObjectHumanData()));
                }
                await Promise.all(fns);

                const json = await col.exportJSON();
                assert.strictEqual(json.docs.length, 10);
                json.docs.map(doc => {
                    assert.strictEqual(typeof doc.secret, 'object');
                    assert.strictEqual(typeof doc.secret.name, 'string');
                    assert.strictEqual(typeof doc.secret.subname, 'string');
                });
                db.remove();
            });
        });
        describe('.importJSON()', () => {
            describe('positive', () => {
                it('import json', async () => {
                    if (!config.storage.hasMultiInstance) {
                        return;
                    }
                    const col = await humansCollection.createMultiInstance(
                        randomToken(10),
                        5
                    );
                    const json = await col.exportJSON();
                    const emptyCol = await humansCollection.createMultiInstance(
                        randomToken(10),
                        0
                    );
                    const noDocs = await emptyCol.find().exec();
                    assert.strictEqual(noDocs.length, 0);

                    await emptyCol.importJSON(json);
                    const docs = await emptyCol.find().exec();
                    assert.strictEqual(docs.length, 5);

                    col.database.remove();
                    emptyCol.database.remove();
                });
            });
            describe('negative', () => {
                it('should not import if schema is different', async () => {
                    if (!config.storage.hasMultiInstance) {
                        return;
                    }
                    const col = await humansCollection.createMultiInstance(randomToken(10), 5);
                    const json = await col.exportJSON();
                    const differentSchemaCol = await humansCollection.createNested();
                    await AsyncTestUtil.assertThrows(
                        // Explicitly typed as any because TS will catch this error
                        () => differentSchemaCol.importJSON(json as any),
                        'RxError'
                    );
                    col.database.remove();
                    differentSchemaCol.database.remove();
                });
            });
            describe('conflict mode', () => {
                /**
                 * Creates a dump with the documents 'alice' and 'bob'
                 * and a collection that only contains
                 * a different state of 'alice'.
                 */
                async function createDumpAndTarget() {
                    const sourceCol = await humansCollection.create(0);
                    await sourceCol.bulkInsert([
                        schemaObjects.humanData('alice', 20, 'dump-alice'),
                        schemaObjects.humanData('bob', 30, 'dump-bob')
                    ]);
                    const json = await sourceCol.exportJSON();
                    await sourceCol.database.close();

                    const col = await humansCollection.create(0);
                    await col.insert(schemaObjects.humanData('alice', 50, 'existing-alice'));
                    return { json, col };
                }
                async function getFirstNames(col: RxCollection<HumanDocumentType>): Promise<string[]> {
                    const docs = await col.find({ sort: [{ passportId: 'asc' }] }).exec();
                    return docs.map(doc => doc.passportId + ':' + doc.firstName);
                }
                it('should skip the existing documents by default', async () => {
                    const { json, col } = await createDumpAndTarget();
                    await col.importJSON(json);
                    assert.deepStrictEqual(
                        await getFirstNames(col),
                        ['alice:existing-alice', 'bob:dump-bob']
                    );
                    const alice = await col.findOne('alice').exec(true);
                    assert.strictEqual(alice.age, 50);
                    await col.database.close();
                });
                it('skip: should keep the existing documents and import the others', async () => {
                    const { json, col } = await createDumpAndTarget();
                    await col.importJSON(json, 'skip');
                    assert.deepStrictEqual(
                        await getFirstNames(col),
                        ['alice:existing-alice', 'bob:dump-bob']
                    );

                    // importing the same dump again must change nothing
                    await col.importJSON(json, 'skip');
                    assert.deepStrictEqual(
                        await getFirstNames(col),
                        ['alice:existing-alice', 'bob:dump-bob']
                    );
                    await col.database.close();
                });
                it('abort: should throw and import nothing when a document already exists', async () => {
                    const { json, col } = await createDumpAndTarget();
                    const err = await AsyncTestUtil.assertThrows(
                        () => col.importJSON(json, 'abort'),
                        'RxError',
                        'JD4'
                    );
                    assert.strictEqual((err as RxError).code, 'JD4');
                    assert.deepStrictEqual((err as RxError).parameters.ids, ['alice']);
                    assert.strictEqual((err as RxError).parameters.collection, col.name);
                    assert.deepStrictEqual(
                        await getFirstNames(col),
                        ['alice:existing-alice']
                    );
                    await col.database.close();
                });
                it('abort: should import when no document already exists', async () => {
                    const { json, col } = await createDumpAndTarget();
                    const alice = await col.findOne('alice').exec(true);
                    await alice.remove();
                    await col.insert(schemaObjects.humanData('carol', 40, 'existing-carol'));

                    await col.importJSON(json, 'abort');
                    assert.deepStrictEqual(
                        await getFirstNames(col),
                        ['alice:dump-alice', 'bob:dump-bob', 'carol:existing-carol']
                    );
                    await col.database.close();
                });
                it('merge: should overwrite the existing documents and insert the others', async () => {
                    const { json, col } = await createDumpAndTarget();
                    const aliceBefore = await col.findOne('alice').exec(true);
                    const emitted: string[] = [];
                    const sub = col.findOne('alice').$.subscribe(doc => emitted.push(ensureNotFalsy(doc).firstName));

                    await col.importJSON(json, 'merge');
                    assert.deepStrictEqual(
                        await getFirstNames(col),
                        ['alice:dump-alice', 'bob:dump-bob']
                    );
                    const alice = await col.findOne('alice').exec(true);
                    assert.strictEqual(alice.age, 20);
                    assert.strictEqual(aliceBefore.getLatest().firstName, 'dump-alice');
                    assert.ok(
                        parseInt(alice.revision.split('-')[0], 10) >
                        parseInt(aliceBefore.revision.split('-')[0], 10)
                    );
                    await AsyncTestUtil.waitUntil(() => emitted.length === 2);
                    assert.deepStrictEqual(emitted, ['existing-alice', 'dump-alice']);
                    sub.unsubscribe();

                    // the merged document can still be updated
                    await alice.incrementalPatch({ firstName: 'patched-alice' });
                    assert.deepStrictEqual(
                        await getFirstNames(col),
                        ['alice:patched-alice', 'bob:dump-bob']
                    );
                    await col.database.close();
                });
                it('merge: should overwrite the existing documents of an encrypted collection', async () => {
                    async function createEncryptedCollection() {
                        const db = await createRxDatabase<{ enchuman: RxCollection<EncryptedObjectHumanDocumentType>; }>({
                            name: randomToken(10),
                            storage: getEncryptedStorage(),
                            password: await getPassword()
                        });
                        const cols = await db.addCollections({
                            enchuman: {
                                schema: schemas.encryptedObjectHuman
                            }
                        });
                        return cols.enchuman;
                    }
                    const sourceCol = await createEncryptedCollection();
                    const dumpDoc = schemaObjects.encryptedObjectHumanData();
                    await sourceCol.insert(dumpDoc);
                    const json = await sourceCol.exportJSON();
                    await sourceCol.database.close();

                    const col = await createEncryptedCollection();
                    const existingDoc = schemaObjects.encryptedObjectHumanData();
                    existingDoc.passportId = dumpDoc.passportId;
                    await col.insert(existingDoc);

                    await col.importJSON(json, 'skip');
                    let doc = await col.findOne(dumpDoc.passportId).exec(true);
                    assert.deepStrictEqual(doc.toJSON().secret, existingDoc.secret);

                    await col.importJSON(json, 'merge');
                    doc = await col.findOne(dumpDoc.passportId).exec(true);
                    assert.deepStrictEqual(doc.toJSON().secret, dumpDoc.secret);
                    assert.strictEqual((await col.find().exec()).length, 1);
                    await col.database.close();
                });
                it('should handle a deleted document as not existing in every mode', async () => {
                    const modes: (RxDumpImportConflictMode | undefined)[] = [undefined, 'skip', 'abort', 'merge'];
                    for (const mode of modes) {
                        const { json, col } = await createDumpAndTarget();
                        const alice = await col.findOne('alice').exec(true);
                        await alice.remove();
                        assert.deepStrictEqual(await getFirstNames(col), []);

                        await col.importJSON(json, mode);
                        assert.deepStrictEqual(
                            await getFirstNames(col),
                            ['alice:dump-alice', 'bob:dump-bob'],
                            'mode ' + mode
                        );
                        const imported = await col.findOne('alice').exec(true);
                        assert.strictEqual(imported.deleted, false);
                        await col.database.close();
                    }
                });
                it('should import an empty dump in every mode', async () => {
                    const modes: (RxDumpImportConflictMode | undefined)[] = [undefined, 'skip', 'abort', 'merge'];
                    const emptyCol = await humansCollection.create(0);
                    const json = await emptyCol.exportJSON();
                    assert.strictEqual(json.docs.length, 0);
                    await emptyCol.database.close();

                    const col = await humansCollection.create(0);
                    await col.insert(schemaObjects.humanData('alice', 50, 'existing-alice'));
                    for (const mode of modes) {
                        await col.importJSON(json, mode);
                        assert.deepStrictEqual(
                            await getFirstNames(col),
                            ['alice:existing-alice'],
                            'mode ' + mode
                        );
                    }
                    await col.database.close();
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
                const col = await humansCollection.createMultiInstance(randomToken(10), 5);
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
                col.database.remove();
            });
            it('export encrypted as decrypted', async () => {
                const db = await createRxDatabase<{ enchuman: RxCollection<EncryptedObjectHumanDocumentType>; }>({
                    name: randomToken(10),
                    storage: getEncryptedStorage(),
                    password: await getPassword()
                });
                const cols = await db.addCollections({
                    enchuman: {
                        schema: schemas.encryptedObjectHuman
                    }
                });
                const col = cols.enchuman;
                await Promise.all(
                    new Array(10).fill(0)
                        .map(() => col.insert(schemaObjects.encryptedObjectHumanData()))
                );
                const json = await db.exportJSON();

                json.collections[0].docs
                    .forEach(docData => {
                        assert.strictEqual(typeof docData.secret, 'object');
                        assert.strictEqual(typeof docData.secret.name, 'string');
                        assert.strictEqual(typeof docData.secret.subname, 'string');
                    });
                db.remove();
            });
            it('export with multiple collections', async () => {
                const db = await createRxDatabase<{ enchuman: RxCollection<EncryptedObjectHumanDocumentType>; }>({
                    name: randomToken(10),
                    storage: getEncryptedStorage(),
                    password: await getPassword()
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
                    fns.push(col.insert(schemaObjects.encryptedObjectHumanData()));
                    fns.push(col2.insert(schemaObjects.encryptedObjectHumanData()));
                }
                await Promise.all(fns);

                const json = await col.database.exportJSON();
                assert.strictEqual(json.collections.length, 2);
                json.collections
                    .forEach((c: any) => assert.strictEqual(c.docs.length, 10));
                db.remove();
            });
            it('export 1 of 2 collections', async () => {
                const db = await createRxDatabase<{ enchuman: RxCollection<EncryptedObjectHumanDocumentType>; }>({
                    name: randomToken(10),
                    storage: getEncryptedStorage(),
                    password: await getPassword()
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
                    fns.push(col.insert(schemaObjects.encryptedObjectHumanData()));
                    fns.push(col2.insert(schemaObjects.encryptedObjectHumanData()));
                }
                await Promise.all(fns);

                const json = await col.database.exportJSON(['enchuman']);
                assert.strictEqual(json.collections.length, 1);
                json.collections
                    .forEach((c: any) => assert.strictEqual(c.docs.length, 10));
                db.remove();
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
                    db.remove();
                    db2.remove();
                });
            });
            describe('negative', () => {
                it('should not import if schema is different', async () => {
                    const db = await createRxDatabase<{ human: RxCollection<HumanDocumentType>; }>({
                        name: randomToken(10),
                        storage: config.storage.getStorage(),
                        multiInstance: true
                    });
                    const cols = await db.addCollections({
                        human: {
                            schema: schemas.human
                        }
                    });
                    const col = cols.human;

                    const db2 = await createRxDatabase<{ human: RxCollection<NestedHumanDocumentType>; }>({
                        name: randomToken(10),
                        storage: config.storage.getStorage(),
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
                        fns.push(col.insert(schemaObjects.humanData()));
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

                    db.remove();
                    db2.remove();
                });
            });
            describe('conflict mode', () => {
                type TwoCollections = {
                    human: RxCollection<HumanDocumentType>;
                    human2: RxCollection<HumanDocumentType>;
                };
                async function createDatabase(): Promise<RxDatabase<TwoCollections>> {
                    const db = await createRxDatabase<TwoCollections>({
                        name: randomToken(10),
                        storage: config.storage.getStorage()
                    });
                    await db.addCollections({
                        human: {
                            schema: schemas.human
                        },
                        human2: {
                            schema: schemas.human
                        }
                    });
                    return db;
                }
                /**
                 * Creates a dump where both collections contain 'alice' and 'bob'
                 * and a database where only the collection human2
                 * contains a different state of 'alice'.
                 */
                async function createDumpAndTarget() {
                    const sourceDb = await createDatabase();
                    await sourceDb.human.bulkInsert([
                        schemaObjects.humanData('alice', 20, 'dump-alice'),
                        schemaObjects.humanData('bob', 30, 'dump-bob')
                    ]);
                    await sourceDb.human2.bulkInsert([
                        schemaObjects.humanData('alice', 20, 'dump-alice'),
                        schemaObjects.humanData('bob', 30, 'dump-bob')
                    ]);
                    const json = await sourceDb.exportJSON();
                    await sourceDb.close();

                    const db = await createDatabase();
                    await db.human2.insert(schemaObjects.humanData('alice', 50, 'existing-alice'));
                    return { json, db };
                }
                async function getFirstNames(col: RxCollection<HumanDocumentType>): Promise<string[]> {
                    const docs = await col.find({ sort: [{ passportId: 'asc' }] }).exec();
                    return docs.map(doc => doc.passportId + ':' + doc.firstName);
                }
                it('should skip the existing documents by default', async () => {
                    const { json, db } = await createDumpAndTarget();
                    await db.importJSON(json);
                    assert.deepStrictEqual(await getFirstNames(db.human), ['alice:dump-alice', 'bob:dump-bob']);
                    assert.deepStrictEqual(await getFirstNames(db.human2), ['alice:existing-alice', 'bob:dump-bob']);
                    await db.close();
                });
                it('skip: should keep the existing documents and import the others', async () => {
                    const { json, db } = await createDumpAndTarget();
                    await db.importJSON(json, 'skip');
                    await db.importJSON(json, 'skip');
                    assert.deepStrictEqual(await getFirstNames(db.human), ['alice:dump-alice', 'bob:dump-bob']);
                    assert.deepStrictEqual(await getFirstNames(db.human2), ['alice:existing-alice', 'bob:dump-bob']);
                    await db.close();
                });
                it('abort: should throw and import nothing into any collection', async () => {
                    const { json, db } = await createDumpAndTarget();
                    const err = await AsyncTestUtil.assertThrows(
                        () => db.importJSON(json, 'abort'),
                        'RxError',
                        'JD4'
                    );
                    assert.strictEqual((err as RxError).code, 'JD4');
                    assert.deepStrictEqual((err as RxError).parameters.ids, ['alice']);
                    assert.strictEqual((err as RxError).parameters.collection, 'human2');
                    assert.deepStrictEqual(await getFirstNames(db.human), []);
                    assert.deepStrictEqual(await getFirstNames(db.human2), ['alice:existing-alice']);

                    const existing = await db.human2.findOne('alice').exec(true);
                    await existing.remove();
                    await db.importJSON(json, 'abort');
                    assert.deepStrictEqual(await getFirstNames(db.human), ['alice:dump-alice', 'bob:dump-bob']);
                    assert.deepStrictEqual(await getFirstNames(db.human2), ['alice:dump-alice', 'bob:dump-bob']);
                    await db.close();
                });
                it('merge: should overwrite the existing documents and insert the others', async () => {
                    const { json, db } = await createDumpAndTarget();
                    await db.importJSON(json, 'merge');
                    assert.deepStrictEqual(await getFirstNames(db.human), ['alice:dump-alice', 'bob:dump-bob']);
                    assert.deepStrictEqual(await getFirstNames(db.human2), ['alice:dump-alice', 'bob:dump-bob']);
                    const alice = await db.human2.findOne('alice').exec(true);
                    assert.strictEqual(alice.age, 20);
                    await db.close();
                });
                it('should handle a deleted document as not existing in every mode', async () => {
                    const modes: (RxDumpImportConflictMode | undefined)[] = [undefined, 'skip', 'abort', 'merge'];
                    for (const mode of modes) {
                        const { json, db } = await createDumpAndTarget();
                        const alice = await db.human2.findOne('alice').exec(true);
                        await alice.remove();

                        await db.importJSON(json, mode);
                        assert.deepStrictEqual(
                            await getFirstNames(db.human2),
                            ['alice:dump-alice', 'bob:dump-bob'],
                            'mode ' + mode
                        );
                        await db.close();
                    }
                });
                it('should import an empty dump in every mode', async () => {
                    const modes: (RxDumpImportConflictMode | undefined)[] = [undefined, 'skip', 'abort', 'merge'];
                    const emptyDb = await createDatabase();
                    const json = await emptyDb.exportJSON();
                    await emptyDb.close();

                    const db = await createDatabase();
                    await db.human2.insert(schemaObjects.humanData('alice', 50, 'existing-alice'));
                    for (const mode of modes) {
                        await db.importJSON(json, mode);
                        assert.deepStrictEqual(await getFirstNames(db.human), [], 'mode ' + mode);
                        assert.deepStrictEqual(await getFirstNames(db.human2), ['alice:existing-alice'], 'mode ' + mode);
                    }
                    await db.close();
                });
            });
        });
    });
    describe('issues', () => {
        it('#319 collections must be created before importDump', async () => {
            const docSchema = {
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
                name: randomToken(10),
                storage: config.storage.getStorage(),
            });
            const db2 = await createRxDatabase({
                name: randomToken(10),
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

            db.remove();
            db2.remove();
        });
        it('#1396 import/export should work with attachments', async () => {
            if (!config.storage.hasAttachments) {
                return;
            }
            const sourceCol = await humansCollection.createAttachments(1);
            const doc = await sourceCol.findOne().exec(true);
            await doc.putAttachment({
                id: 'cat.txt',
                data: createBlob('meow', 'text/plain'),
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

            sourceCol.database.remove();
            destCol.database.remove();
        });
    });
    describe('attachments', () => {
        // Deno's structuredClone() silently destroys Blob data, returning {}. https://github.com/denoland/deno/issues/12067#issuecomment-1975001079
        // fake-indexeddb (used by dexie in non-browser envs) relies on
        // structuredClone, so Blob attachment roundtrips are broken in Deno+dexie.
        // These tests pass fine on Node and Bun, which is sufficient coverage.
        if (isDeno && config.storage.name === 'dexie') {
            return;
        }
        it('should not contain the attachments by default', async () => {
            if (!config.storage.hasAttachments) {
                return;
            }
            const col = await humansCollection.createAttachments(1);
            const doc = await col.findOne().exec(true);
            await doc.putAttachment({
                id: 'cat.txt',
                data: createBlob('meow', 'text/plain'),
                type: 'text/plain'
            });

            const json = await col.exportJSON();
            assert.strictEqual(json.docs.length, 1);
            assert.strictEqual(typeof json.docs[0]._attachments, 'undefined');

            col.database.close();
        });
        it('should contain the attachments data as base64', async () => {
            if (!config.storage.hasAttachments) {
                return;
            }
            const col = await humansCollection.createAttachments(1);
            const doc = await col.findOne().exec(true);
            await doc.putAttachment({
                id: 'cat.txt',
                data: createBlob('meow', 'text/plain'),
                type: 'text/plain'
            });

            const json = await col.exportJSON({ attachments: true });
            const attachments = ensureNotFalsy(json.docs[0]._attachments);
            const attachment = attachments['cat.txt'];
            assert.ok(attachment);
            assert.strictEqual(attachment.type, 'text/plain');
            assert.strictEqual(attachment.length, 4);
            assert.strictEqual(
                await blobToString(await createBlobFromBase64(attachment.data, attachment.type)),
                'meow'
            );

            /**
             * The dump must be JSON friendly
             * so that it can be stored in a file.
             */
            const stringified = JSON.stringify(json);
            assert.ok(stringified.includes('cat.txt'));

            col.database.close();
        });
        it('should restore the attachments on import', async () => {
            if (!config.storage.hasAttachments) {
                return;
            }
            const sourceCol = await humansCollection.createAttachments(1);
            const doc = await sourceCol.findOne().exec(true);
            await doc.putAttachment({
                id: 'cat.txt',
                data: createBlob('meow', 'text/plain'),
                type: 'text/plain'
            });
            await doc.putAttachment({
                id: 'dog.txt',
                data: createBlob('wuff', 'text/plain'),
                type: 'text/plain'
            });

            const json = await sourceCol.exportJSON({ attachments: true });
            /**
             * Ensure that only plain JSON is transferred,
             * the same way a user would store the dump in a file.
             */
            const parsedJson = JSON.parse(JSON.stringify(json));

            const destCol = await humansCollection.createAttachments(0);
            await destCol.importJSON(parsedJson);

            const importedDoc = await destCol.findOne().exec(true);
            const importedAttachments = importedDoc.allAttachments();
            assert.strictEqual(importedAttachments.length, 2);

            const catAttachment = ensureNotFalsy(importedDoc.getAttachment('cat.txt'));
            assert.strictEqual(catAttachment.type, 'text/plain');
            assert.strictEqual(catAttachment.length, 4);
            assert.strictEqual(await catAttachment.getStringData(), 'meow');
            assert.strictEqual(
                await ensureNotFalsy(importedDoc.getAttachment('dog.txt')).getStringData(),
                'wuff'
            );

            sourceCol.database.close();
            destCol.database.close();
        });
        it('should handle the attachments of existing documents depending on the conflict mode', async () => {
            if (!config.storage.hasAttachments) {
                return;
            }
            const sourceCol = await humansCollection.createAttachments(0);
            const sourceDoc = await sourceCol.insert(schemaObjects.humanData('alice', 20, 'dump-alice'));
            await sourceDoc.putAttachment({
                id: 'cat.txt',
                data: createBlob('dump-meow', 'text/plain'),
                type: 'text/plain'
            });
            const json = JSON.parse(JSON.stringify(
                await sourceCol.exportJSON({ attachments: true })
            ));
            const jsonWithoutAttachments = await sourceCol.exportJSON();
            await sourceCol.database.close();

            async function createTarget() {
                const col = await humansCollection.createAttachments(0);
                const doc = await col.insert(schemaObjects.humanData('alice', 50, 'existing-alice'));
                await doc.putAttachment({
                    id: 'cat.txt',
                    data: createBlob('meow', 'text/plain'),
                    type: 'text/plain'
                });
                await doc.getLatest().putAttachment({
                    id: 'dog.txt',
                    data: createBlob('wuff', 'text/plain'),
                    type: 'text/plain'
                });
                return col;
            }
            async function getAttachmentsData(col: RxCollection<HumanDocumentType>) {
                const doc = await col.findOne('alice').exec(true);
                const ret: { [attachmentId: string]: string; } = {};
                for (const attachment of doc.allAttachments()) {
                    ret[attachment.id] = await attachment.getStringData();
                }
                return { firstName: doc.firstName, attachments: ret };
            }

            // skip keeps the existing document with its attachments
            const skipCol = await createTarget();
            await skipCol.importJSON(json);
            assert.deepStrictEqual(await getAttachmentsData(skipCol), {
                firstName: 'existing-alice',
                attachments: { 'cat.txt': 'meow', 'dog.txt': 'wuff' }
            });
            await skipCol.database.close();

            // merge overwrites the attachments of the dump and keeps the others, like an upsert
            const mergeCol = await createTarget();
            await mergeCol.importJSON(json, 'merge');
            assert.deepStrictEqual(await getAttachmentsData(mergeCol), {
                firstName: 'dump-alice',
                attachments: { 'cat.txt': 'dump-meow', 'dog.txt': 'wuff' }
            });
            await mergeCol.database.close();

            // merge of a dump without attachments keeps the existing attachments
            const mergeWithoutCol = await createTarget();
            await mergeWithoutCol.importJSON(jsonWithoutAttachments, 'merge');
            assert.deepStrictEqual(await getAttachmentsData(mergeWithoutCol), {
                firstName: 'dump-alice',
                attachments: { 'cat.txt': 'meow', 'dog.txt': 'wuff' }
            });
            await mergeWithoutCol.database.close();
        });
        it('should work on the database level', async () => {
            if (!config.storage.hasAttachments) {
                return;
            }
            const sourceCol = await humansCollection.createAttachments(1);
            const doc = await sourceCol.findOne().exec(true);
            await doc.putAttachment({
                id: 'cat.txt',
                data: createBlob('meow', 'text/plain'),
                type: 'text/plain'
            });

            const withoutAttachments = await sourceCol.database.exportJSON();
            assert.strictEqual(typeof withoutAttachments.collections[0].docs[0]._attachments, 'undefined');

            const json = await sourceCol.database.exportJSON({ attachments: true });
            assert.ok(ensureNotFalsy(json.collections[0].docs[0]._attachments)['cat.txt']);

            const withCollectionNames = await sourceCol.database.exportJSON(
                [sourceCol.name],
                { attachments: true }
            );
            assert.strictEqual(withCollectionNames.collections.length, 1);
            assert.ok(ensureNotFalsy(withCollectionNames.collections[0].docs[0]._attachments)['cat.txt']);

            const destCol = await humansCollection.createAttachments(0);
            await destCol.database.importJSON(JSON.parse(JSON.stringify(json)));

            const importedDoc = await destCol.findOne().exec(true);
            assert.strictEqual(
                await ensureNotFalsy(importedDoc.getAttachment('cat.txt')).getStringData(),
                'meow'
            );

            sourceCol.database.close();
            destCol.database.close();
        });
    });
});
