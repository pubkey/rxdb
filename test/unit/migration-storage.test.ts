import assert from 'assert';
import {
    randomCouchString,
    createRxDatabase,
    RxCollection,
    addRxPlugin,
    ensureNotFalsy,
    createBlob
} from '../../plugins/core/index.mjs';

import {
    RxDBAttachmentsPlugin
} from '../../plugins/attachments/index.mjs';
addRxPlugin(RxDBAttachmentsPlugin);

import {
    wrappedValidateAjvStorage
} from '../../plugins/validate-ajv/index.mjs';


import {
    createRxDatabase as createRxDatabaseOld,
    addRxPlugin as addRxPluginOld
} from 'rxdb-old';
import {
    RxDBAttachmentsPlugin as RxDBAttachmentsPluginOld
} from 'rxdb-old/plugins/attachments';
addRxPlugin(RxDBAttachmentsPlugin);
addRxPluginOld(RxDBAttachmentsPluginOld);
import {
    indexedDB as fakeIndexedDB,
    IDBKeyRange as fakeIDBKeyRange
} from 'fake-indexeddb';


import {
    getRxStorageLoki as getRxStorageLokiOld
} from 'rxdb-old/plugins/storage-lokijs';
import {
    getRxStorageDexie as getRxStorageDexieOld
} from 'rxdb-old/plugins/storage-dexie';

import {
    AfterMigrateBatchHandlerInput,
    migrateStorage
} from '../../plugins/migration-storage/index.mjs';

import {
    HumanDocumentType,
    human,
    schemaObjects
} from '../../plugins/test-utils/index.mjs';
import config from './config.ts';


const testStorages = [
    {
        name: 'prev-major to newest (loki)',
        hasAttachments: false,
        hasReplication: true,
        createRxDatabaseOld,
        createRxDatabaseNew: createRxDatabase,
        old: () => getRxStorageLokiOld(),
        new: () => config.storage.getStorage()
    },
    {
        name: 'prev-major to newest (dexie)',
        hasAttachments: false,
        hasReplication: true,
        createRxDatabaseOld,
        createRxDatabaseNew: createRxDatabase,
        old: () => getRxStorageDexieOld({
            indexedDB: fakeIndexedDB,
            IDBKeyRange: fakeIDBKeyRange
        }),
        new: () => config.storage.getStorage()
    },
    {
        name: 'newest to newest',
        hasAttachments: false,
        hasReplication: true,
        createRxDatabaseOld: createRxDatabase,
        createRxDatabaseNew: createRxDatabase,
        old: () => config.storage.getStorage(),
        new: () => config.storage.getStorage()
    }

    // {
    //     name: 'memory',
    //     hasAttachments: true,
    //     old: () => getRxStorageMemoryOld(),
    //     new: () => getRxStorageMemory()
    // }
];

const DB_PREFIX = 'test-db-';

testStorages.forEach(storages => {
    describe('migration-storage.test.ts (' + storages.name + ')', () => {
        describe('basic migrations', () => {
            it('create both databases', async () => {
                const oldDb = await (storages.createRxDatabaseOld as any)({
                    name: DB_PREFIX + randomCouchString(12),
                    storage: storages.old() as any,
                    multiInstance: false
                });
                await oldDb.addCollections({
                    [randomCouchString(12)]: {
                        schema: human as any
                    }
                });
                await oldDb.destroy();

                const db = await storages.createRxDatabaseNew({
                    name: DB_PREFIX + randomCouchString(12),
                    storage: wrappedValidateAjvStorage({
                        storage: storages.new()
                    }),
                    multiInstance: false
                });
                await db.addCollections({
                    [randomCouchString(12)]: {
                        schema: human
                    }
                });
                await db.destroy();
            });
            it('should migrate all documents', async () => {
                const name = DB_PREFIX + randomCouchString(12);
                const collectionName = randomCouchString(12);

                // create old database and insert data
                const oldDatabaseName = name + '-old';
                const oldDb: any = await (storages.createRxDatabaseOld as any)({
                    name: oldDatabaseName,
                    storage: storages.old() as any,
                    multiInstance: false
                });
                await oldDb.addCollections({
                    [collectionName]: {
                        schema: human as any
                    }
                });

                const oldCol: RxCollection = oldDb[collectionName];

                const docsAmount = 100;
                const docsData: HumanDocumentType[] = new Array(docsAmount).fill(0).map((_x) => {
                    return schemaObjects.humanData(

                    );
                });

                const insertResult = await oldCol.bulkInsert(docsData);

                if (storages.hasAttachments) {
                    await Promise.all(
                        insertResult.success.map(async (doc) => {
                            await doc.putAttachment({
                                id: 'text.txt',
                                data: createBlob(
                                    'foobar',
                                    'text/plain'
                                ),
                                type: 'text/plain'
                            });
                        })
                    );
                }

                await oldDb.destroy();

                // create new database
                const db = await storages.createRxDatabaseNew({
                    name,
                    storage: wrappedValidateAjvStorage({
                        storage: storages.new()
                    }),
                    multiInstance: false
                });

                await db.addCollections({
                    [collectionName]: {
                        schema: human
                    }
                });
                const col: RxCollection<HumanDocumentType> = db[collectionName];
                const emptyDocs = await col.find().exec();
                assert.strictEqual(emptyDocs.length, 0);


                // migrate
                const handlerEmitted: AfterMigrateBatchHandlerInput[] = [];
                const batchesAmount = 4;
                await migrateStorage({
                    database: db,
                    oldDatabaseName,
                    oldStorage: storages.old() as any,
                    batchSize: docsAmount / batchesAmount,
                    parallel: false,
                    afterMigrateBatch: input => handlerEmitted.push(input)
                });

                // check new database
                const newDocs = await col.find().exec();
                assert.strictEqual(newDocs.length, docsAmount);
                assert.strictEqual(handlerEmitted.length, batchesAmount);
                const firstDoc = newDocs[0];
                const newDocPlain = firstDoc.toJSON(true);
                assert.ok(newDocPlain._meta.lwt);

                // check attachment
                if (storages.hasAttachments) {
                    const attachment = firstDoc.getAttachment('text.txt');
                    const attachmentData = await ensureNotFalsy(attachment).getStringData();
                    assert.strictEqual(attachmentData, 'foobar');
                }

                // check handler output
                const firstEmit = handlerEmitted[0];
                assert.deepStrictEqual(firstEmit.writeToNewResult.error, []);

                await db.remove();
            });
            it('should migrate in parallel', async () => {
                const name = DB_PREFIX + randomCouchString(12);
                const collectionName = randomCouchString(12);

                // create old database and insert data
                const oldDatabaseName = name + '-old';
                const oldDb = await (storages.createRxDatabaseOld as any)({
                    name: oldDatabaseName,
                    storage: storages.old() as any,
                    multiInstance: false
                });
                await oldDb.addCollections({
                    [collectionName]: {
                        schema: human as any
                    }
                });

                const oldCol: RxCollection = oldDb[collectionName];

                const docsAmount = 100;
                const docsData: HumanDocumentType[] = new Array(docsAmount).fill(0).map((_x) => {
                    return schemaObjects.humanData(

                    );
                });

                const insertResult = await oldCol.bulkInsert(docsData);

                if (storages.hasAttachments) {
                    await Promise.all(
                        insertResult.success.map(async (doc) => {
                            await doc.putAttachment({
                                id: 'text.txt',
                                data: createBlob(
                                    'foobar',
                                    'text/plain'
                                ),
                                type: 'text/plain'
                            });
                        })
                    );
                }

                await oldDb.destroy();

                // create new database
                const db = await storages.createRxDatabaseNew({
                    name,
                    storage: wrappedValidateAjvStorage({
                        storage: storages.new()
                    }),
                    multiInstance: false
                });

                await db.addCollections({
                    [collectionName]: {
                        schema: human
                    }
                });
                const col: RxCollection<HumanDocumentType> = db[collectionName];
                const emptyDocs = await col.find().exec();
                assert.strictEqual(emptyDocs.length, 0);


                // migrate
                const handlerEmitted: AfterMigrateBatchHandlerInput[] = [];
                const batchesAmount = 4;
                await migrateStorage({
                    database: db,
                    oldDatabaseName,
                    oldStorage: storages.old() as any,
                    batchSize: docsAmount / batchesAmount,
                    parallel: true,
                    afterMigrateBatch: input => handlerEmitted.push(input)
                });

                // check new database
                const newDocs = await col.find().exec();
                assert.strictEqual(newDocs.length, docsAmount);
                assert.strictEqual(handlerEmitted.length, batchesAmount);
                const firstDoc = newDocs[0];
                const newDocPlain = firstDoc.toJSON(true);
                assert.ok(newDocPlain._meta.lwt);

                // check attachment
                if (storages.hasAttachments) {
                    const attachment = firstDoc.getAttachment('text.txt');
                    const attachmentData = await ensureNotFalsy(attachment).getStringData();
                    assert.strictEqual(attachmentData, 'foobar');
                }

                // check handler output
                const firstEmit = handlerEmitted[0];
                assert.deepStrictEqual(firstEmit.writeToNewResult.error, []);

                await db.remove();
            });
            it('migrate new->new should also work', async () => {
                const name = DB_PREFIX + randomCouchString(12);
                const collectionName = randomCouchString(12);

                // create old database and insert data
                const oldDatabaseName = name + '-old';
                const oldDb = await storages.createRxDatabaseNew({
                    name: oldDatabaseName,
                    storage: storages.new(),
                    multiInstance: false
                });
                await oldDb.addCollections({
                    [collectionName]: {
                        schema: human
                    }
                });

                const oldCol = oldDb[collectionName];

                const docsAmount = 100;
                const docsData: HumanDocumentType[] = new Array(docsAmount).fill(0).map((_x) => {
                    return schemaObjects.humanData();
                });

                const insertResult = await oldCol.bulkInsert(docsData);

                if (storages.hasAttachments) {
                    await Promise.all(
                        insertResult.success.map(async (doc) => {
                            await doc.putAttachment({
                                id: 'text.txt',
                                data: createBlob(
                                    'foobar',
                                    'text/plain'
                                ),
                                type: 'text/plain'
                            });
                        })
                    );
                }

                await oldDb.destroy();

                // create new database
                const db = await storages.createRxDatabaseNew({
                    name,
                    storage: wrappedValidateAjvStorage({
                        storage: storages.new()
                    }),
                    multiInstance: false
                });

                await db.addCollections({
                    [collectionName]: {
                        schema: human
                    }
                });
                const col: RxCollection<HumanDocumentType> = db[collectionName];
                const emptyDocs = await col.find().exec();
                assert.strictEqual(emptyDocs.length, 0);


                // migrate
                const handlerEmitted: AfterMigrateBatchHandlerInput[] = [];
                const batchesAmount = 4;
                await migrateStorage({
                    database: db,
                    oldDatabaseName,
                    oldStorage: storages.new() as any,
                    batchSize: docsAmount / batchesAmount,
                    afterMigrateBatch: input => handlerEmitted.push(input)
                });

                // check new database
                const newDocs = await col.find().exec();
                assert.strictEqual(newDocs.length, docsAmount);

                assert.strictEqual(handlerEmitted.length, batchesAmount);
                const firstDoc = newDocs[0];
                const newDocPlain = firstDoc.toJSON(true);
                assert.ok(newDocPlain._meta.lwt);

                // check attachment
                if (storages.hasAttachments) {
                    const attachment = firstDoc.getAttachment('text.txt');
                    const attachmentData = await ensureNotFalsy(attachment).getStringData();
                    assert.strictEqual(attachmentData, 'foobar');
                }

                // check handler output
                const firstEmit = handlerEmitted[0];
                assert.deepStrictEqual(firstEmit.writeToNewResult.error, []);

                await db.destroy();
            });
        });
        describe('issues', () => {
            it('migration with multiple collections', async () => {
                const oldDatabaseName = DB_PREFIX + randomCouchString(12);
                const oldDb = await (storages.createRxDatabaseOld as any)({
                    name: oldDatabaseName,
                    storage: storages.old() as any,
                    multiInstance: false
                });
                await oldDb.addCollections({
                    col1: {
                        schema: human as any
                    },
                    col2: {
                        schema: human as any
                    },
                    col3: {
                        schema: human as any
                    }
                });
                await oldDb.col1.insert(schemaObjects.humanData());
                await oldDb.col2.insert(schemaObjects.humanData());
                await oldDb.col3.insert(schemaObjects.humanData());
                await oldDb.destroy();

                const db = await storages.createRxDatabaseNew({
                    name: DB_PREFIX + randomCouchString(12),
                    storage: wrappedValidateAjvStorage({
                        storage: storages.new()
                    }),
                    multiInstance: false
                });
                await db.addCollections({
                    col1: {
                        schema: human as any
                    },
                    col2: {
                        schema: human as any
                    },
                    col3: {
                        schema: human as any
                    }
                });

                await migrateStorage({
                    database: db,
                    oldDatabaseName,
                    oldStorage: storages.old() as any,
                    batchSize: 1
                });

                // ensure documents exist in new collection
                await db.col1.findOne().exec(true);
                await db.col2.findOne().exec(true);
                await db.col2.findOne().exec(true);

                await db.remove();
            });
        });
    });
});
