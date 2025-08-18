import assert from 'assert';
import {
    randomToken,
    createRxDatabase,
    RxCollection,
    addRxPlugin,
    ensureNotFalsy,
    createBlob,
    RxDatabase
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
    getRxStorageDexie as getRxStorageDexieOld
} from 'rxdb-old/plugins/storage-dexie';

import {
    AfterMigrateBatchHandlerInput,
    migrateStorage
} from '../../plugins/migration-storage/index.mjs';

import {
    HumanDocumentType,
    human,
    isBun,
    schemaObjects
} from '../../plugins/test-utils/index.mjs';
import config from './config.ts';


const testStorages = [
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


/**
 * In RxDB v15, this was called .destroy() instead of .close()
 */
function destroyOrClose(db: RxDatabase | any) {
    if (typeof db.destroy === 'function') {
        return db.destroy();
    } else {
        return db.close();
    }
}

testStorages.forEach(storages => {
    describe('migration-storage.test.ts (' + storages.name + ')', () => {
        if(isBun){
            // TODO the dexie-memory-storage which is used in these test
            // is really slow in bun, so we disabled these tests for bun.
            return;
        }
        describe('basic migrations', () => {
            it('create both databases', async () => {
                const oldDb = await (storages.createRxDatabaseOld as any)({
                    name: DB_PREFIX + randomToken(12),
                    storage: storages.old() as any,
                    multiInstance: false
                });
                await oldDb.addCollections({
                    [randomToken(12)]: {
                        schema: human as any
                    }
                });
                await destroyOrClose(oldDb);

                const db = await storages.createRxDatabaseNew({
                    name: DB_PREFIX + randomToken(12),
                    storage: wrappedValidateAjvStorage({
                        storage: storages.new()
                    }),
                    multiInstance: false
                });
                await db.addCollections({
                    [randomToken(12)]: {
                        schema: human
                    }
                });
                await db.close();
            });
            it('should migrate all documents', async () => {
                const name = DB_PREFIX + randomToken(12);
                const collectionName = randomToken(12);

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

                await destroyOrClose(oldDb);

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
                const name = DB_PREFIX + randomToken(12);
                const collectionName = randomToken(12);

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

                await destroyOrClose(oldDb);

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
                const name = DB_PREFIX + randomToken(12);
                const collectionName = randomToken(12);

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

                await destroyOrClose(oldDb);

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

                await db.close();
            });
        });
        describe('issues', () => {
            it('migration with multiple collections', async () => {
                const oldDatabaseName = DB_PREFIX + randomToken(12);
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
                await destroyOrClose(oldDb);

                const db = await storages.createRxDatabaseNew({
                    name: DB_PREFIX + randomToken(12),
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

            it('#7351 migration old -> new with migration strategy', async () => {
                if(storages.name !== 'prev-major to newest (dexie)'){
                    return;
                }
                const oldDatabaseName = DB_PREFIX + randomToken(12);
                const oldDb = await (storages.createRxDatabaseOld as any)({
                    name: oldDatabaseName,
                    storage: storages.old() as any,
                    multiInstance: false
                });
                const schema0 = {
                    version: 0,
                    primaryKey: 'id',
                    type: 'object',
                    properties: {
                        id: {
                            type: 'string',
                            
                        }
                    }
                };
                const schema1 = {
                    version: 1,
                    primaryKey: 'id',
                    type: 'object',
                    properties: {
                        id: {
                            type: 'string',
                            maxLength: 100
                        }
                    },
                    required: ['id']
                };
                await oldDb.addCollections({
                    col1: {
                        schema: schema0 as any
                    }
                });
                
                await destroyOrClose(oldDb);

                const db = await storages.createRxDatabaseNew({
                    name: oldDatabaseName,
                    storage: wrappedValidateAjvStorage({
                        storage: storages.new()
                    }),
                    multiInstance: false
                });
                await db.addCollections({
                    col1: {
                        schema: schema1 as any,
                        migrationStrategies: {
                            1: (doc) => {
                                return doc;
                            }
                        }
                    }
                });


                await db.remove();
            });
        });
    });
});
