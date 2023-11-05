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
    getRxStorageLoki as getRxStorageLokiOld
} from 'rxdb-old/plugins/storage-lokijs';

import {
    AfterMigrateBatchHandlerInput,
    migrateStorage
} from '../../plugins/migration-storage/index.mjs';

import * as schemaObjects from '../helper/schema-objects.ts';
import { HumanDocumentType, human } from '../helper/schemas.ts';
import config from './config.ts';


const testStorages = [
    // previous RxDB major version to newest version
    {
        name: 'prev-major to newest',
        hasAttachments: false,
        hasReplication: true,
        createRxDatabaseOld,
        createRxDatabaseNew: createRxDatabase,
        old: () => getRxStorageLokiOld(),
        new: () => config.storage.getStorage()
    },
    // newest version to newest version but other storage
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
        it('create both databases', async () => {
            const oldDb = await storages.createRxDatabaseOld({
                name: DB_PREFIX + randomCouchString(12),
                storage: storages.old() as any,
                multiInstance: false
            });
            await oldDb.addCollections({
                [randomCouchString(12)]: {
                    schema: human
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
            const oldDbName = name + '-old';
            const oldDb = await storages.createRxDatabaseOld({
                name: oldDbName,
                storage: storages.old() as any,
                multiInstance: false
            });
            await oldDb.addCollections({
                [collectionName]: {
                    schema: human
                }
            });

            const oldCol = oldDb[collectionName];

            const docsAmount = 100;
            const docsData: HumanDocumentType[] = new Array(docsAmount).fill(0).map((_x, idx) => {
                return schemaObjects.human(

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
            await migrateStorage(
                db,
                oldDbName,
                storages.old() as any,
                docsAmount / batchesAmount,
                input => handlerEmitted.push(input)
            );

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
        it('migrate new->new should also work', async () => {
            const name = DB_PREFIX + randomCouchString(12);
            const collectionName = randomCouchString(12);

            // create old database and insert data
            const oldDbName = name + '-old';
            const oldDb = await storages.createRxDatabaseNew({
                name: oldDbName,
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
                return schemaObjects.human();
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
            await migrateStorage(
                db,
                oldDbName,
                storages.new() as any,
                docsAmount / batchesAmount,
                input => handlerEmitted.push(input)
            );

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
});
