import assert from 'assert';
import config from './config';
import AsyncTestUtil, { wait } from 'async-test-util';

import * as humansCollection from '../helper/humans-collection';
import * as schemas from '../helper/schemas';
import * as schemaObjects from '../helper/schema-objects';
import {
    clone,
    createRxDatabase,
    randomCouchString,
    RxDocument,
    RxJsonSchema,
    blobBufferUtil,
    MigrationStrategies,
    WithAttachmentsData,
    RxCollection
} from '../../';
import { HumanDocumentType } from '../helper/schemas';
import { RxDocumentWriteData } from '../../src/types';


config.parallel('attachments.test.ts', () => {
    if (!config.storage.hasAttachments) {
        return;
    }
    describe('.putAttachment()', () => {
        it('should insert one attachment', async () => {
            const c = await humansCollection.createAttachments(1);
            const doc = await c.findOne().exec(true);
            const attachment = await doc.putAttachment({
                id: 'cat.txt',
                data: blobBufferUtil.createBlobBuffer('meow', 'text/plain'),
                type: 'text/plain'
            });
            assert.ok(attachment);
            assert.strictEqual(attachment.id, 'cat.txt');
            assert.strictEqual(attachment.type, 'text/plain');
            c.database.destroy();
        });
        it('should insert two attachments', async () => {
            const c = await humansCollection.createAttachments(1);
            const doc = await c.findOne().exec(true);
            await doc.putAttachment({
                id: 'cat.txt',
                data: blobBufferUtil.createBlobBuffer('meow', 'text/plain'),
                type: 'text/plain'
            });
            await doc.putAttachment({
                id: 'cat2.txt',
                data: blobBufferUtil.createBlobBuffer('meowmeow', 'text/plain'),
                type: 'text/plain'
            });
            c.database.destroy();
        });
        it('should insert 4 attachments in parallel', async () => {
            const c = await humansCollection.createAttachments(1);
            const doc = await c.findOne().exec(true);
            const attachments = await Promise.all(
                new Array(4)
                    .fill(0)
                    .map(() => doc.putAttachment({
                        id: AsyncTestUtil.randomString(5) + '.txt',
                        data: blobBufferUtil.createBlobBuffer('meow I am a kitty with a knife ' + AsyncTestUtil.randomString(5), 'text/plain'),
                        type: 'text/plain'
                    }))
            );
            assert.strictEqual(attachments.length, 4);
            assert.ok(attachments[1].id);
            c.database.destroy();
        });
        it('should insert an attachment with a big content', async () => {
            const c = await humansCollection.createAttachments(1);
            const doc = await c.findOne().exec(true);
            await doc.putAttachment({
                id: 'cat2.txt',
                data: blobBufferUtil.createBlobBuffer([
                    AsyncTestUtil.randomString(100),
                    AsyncTestUtil.randomString(100),
                    AsyncTestUtil.randomString(100)
                ].join(' '), 'text/plain'), // use space here
                type: 'text/plain'
            });
            c.database.destroy();
        });
        it('should not update the document if skipIfSame=true and same data', async () => {
            const c = await humansCollection.createAttachments(1);
            const doc = await c.findOne().exec(true);
            const data = blobBufferUtil.createBlobBuffer(AsyncTestUtil.randomString(100), 'text/plain');
            await doc.putAttachment({
                id: 'cat.txt',
                data,
                type: 'text/plain'
            }, true);
            const revBefore = doc.revision;
            await doc.putAttachment({
                id: 'cat.txt',
                data,
                type: 'text/plain'
            }, true);
            await wait(50);
            assert.strictEqual(
                revBefore,
                doc.revision
            );

            c.database.destroy();
        });
        it('should update the document if skipIfSame=true and different data', async () => {
            const c = await humansCollection.createAttachments(1);
            const doc = await c.findOne().exec(true);
            await doc.putAttachment({
                id: 'cat.txt',
                data: blobBufferUtil.createBlobBuffer(AsyncTestUtil.randomString(100), 'text/plain'),
                type: 'text/plain'
            }, true);
            const revBefore = doc.revision;
            await doc.putAttachment({
                id: 'cat.txt',
                data: blobBufferUtil.createBlobBuffer(AsyncTestUtil.randomString(100), 'text/plain'),
                type: 'text/plain'
            }, false);
            await wait(50);
            assert.notStrictEqual(
                revBefore,
                doc.revision
            );
            c.database.destroy();
        });
    });
    describe('.getAttachment()', () => {
        it('should get the attachment', async () => {
            const c = await humansCollection.createAttachments(1);
            const doc = await c.findOne().exec(true);
            await doc.putAttachment({
                id: 'cat.txt',
                data: blobBufferUtil.createBlobBuffer('meow I am a kitty with a knife', 'text/plain'),
                type: 'text/plain'
            });
            const attachment: any = doc.getAttachment('cat.txt');
            assert.ok(attachment);
            c.database.destroy();
        });
        it('should find the attachment after another doc-update', async () => {
            const c = await humansCollection.createAttachments(1);
            const doc = await c.findOne().exec(true);
            await doc.putAttachment({
                id: 'cat.txt',
                data: blobBufferUtil.createBlobBuffer('meow I am a kitty with a knife', 'text/plain'),
                type: 'text/plain'
            });

            await doc.atomicPatch({
                age: 7
            });

            const attachment: any = doc.getAttachment('cat.txt');
            assert.ok(attachment);
            assert.strictEqual(attachment.type, 'text/plain');
            c.database.destroy();
        });
        it('should find the attachment after database is re-created', async () => {
            if (!config.storage.hasPersistence) {
                return;
            }
            const name = randomCouchString(10);
            const db = await createRxDatabase({
                name,
                storage: config.storage.getStorage(),
                multiInstance: false,
                ignoreDuplicate: true
            });
            const schemaJson = AsyncTestUtil.clone(schemas.human);
            schemaJson.attachments = {};
            const collections = await db.addCollections({
                humans: {
                    schema: schemaJson
                }
            });
            await collections.humans.insert(schemaObjects.human());
            const doc = await collections.humans.findOne().exec(true);
            const docAge = doc.age;
            await doc.putAttachment({
                id: 'cat.txt',
                data: blobBufferUtil.createBlobBuffer('meow I am a kitty with a knife', 'text/plain'),
                type: 'text/plain'
            });
            await db.destroy();
            const db2 = await createRxDatabase({
                name,
                storage: config.storage.getStorage(),
                multiInstance: false,
                ignoreDuplicate: true
            });
            const cols2 = await db2.addCollections({
                humans: {
                    schema: schemaJson
                }
            });
            const c2 = cols2.humans;
            const doc2 = await c2.findOne().exec();
            assert.strictEqual(docAge, doc2.age);
            const attachment = doc2.getAttachment('cat.txt');
            assert.ok(attachment);
            assert.strictEqual(attachment.type, 'text/plain');
            c2.database.destroy();
        });
    });
    describe('RxAttachment.getData()', () => {
        it('should get the data', async () => {
            const c = await humansCollection.createAttachments(1);
            const doc = await c.findOne().exec(true);
            const dat = AsyncTestUtil.randomString(100) + ' ' + AsyncTestUtil.randomString(100);
            await doc.putAttachment({
                id: 'cat.txt',
                data: blobBufferUtil.createBlobBuffer(dat, 'text/plain'),
                type: 'text/plain'
            });
            const attachment: any = doc.getAttachment('cat.txt');
            const data = await attachment.getData();
            const dataString = await blobBufferUtil.toString(data);
            assert.strictEqual(dataString, dat);
            c.database.destroy();
        });
    });
    describe('RxAttachment.getStringData()', () => {
        it('should get the data as string', async () => {
            const c = await humansCollection.createAttachments(1);
            const doc = await c.findOne().exec(true);
            const dat = AsyncTestUtil.randomString(100) + ' ' + AsyncTestUtil.randomString(100);
            await doc.putAttachment({
                id: 'cat.txt',
                data: blobBufferUtil.createBlobBuffer(dat, 'text/plain'),
                type: 'text/plain'
            });
            const attachment: any = doc.getAttachment('cat.txt');
            const data = await attachment.getStringData();
            assert.strictEqual(data, dat);
            c.database.destroy();
        });
    });
    describe('RxAttachment.remove()', () => {
        it('should remove the attachment', async () => {
            const c = await humansCollection.createAttachments(1);
            const doc = await c.findOne().exec(true);
            await doc.putAttachment({
                id: 'cat.txt',
                data: blobBufferUtil.createBlobBuffer('meow I am a kitty with a knife', 'text/plain'),
                type: 'text/plain'
            });
            const attachment: any = doc.getAttachment('cat.txt');
            assert.ok(attachment);

            await attachment.remove();

            // ensure it does not exist
            const shouldBeNull = doc.getAttachment('cat.txt');
            assert.strictEqual(null, shouldBeNull);

            c.database.destroy();
        });
    });
    describe('.allAttachments()', () => {
        it('should find all attachments', async () => {
            const c = await humansCollection.createAttachments(1);
            const doc = await c.findOne().exec(true);
            await Promise.all(
                new Array(10)
                    .fill(0)
                    .map(() => doc.putAttachment({
                        id: AsyncTestUtil.randomString(5) + '.txt',
                        data: blobBufferUtil.createBlobBuffer('meow I am a kitty with a knife ' + AsyncTestUtil.randomString(500), 'text/plain'),
                        type: 'text/plain'
                    }))
            );
            const attachments = doc.allAttachments();
            assert.strictEqual(attachments.length, 10);
            c.database.destroy();
        });
        it('should lazy-load the data for the attachment', async () => {
            const c = await humansCollection.createAttachments(1);
            const doc = await c.findOne().exec(true);
            await doc.putAttachment({
                id: 'janosch.txt',
                data: blobBufferUtil.createBlobBuffer('foo bar', 'text/plain'),
                type: 'text/plain'
            });
            const attachments = doc.allAttachments();
            const attachment = attachments[0];

            const data = await attachment.getData();
            const dataString = await blobBufferUtil.toString(data);
            assert.deepStrictEqual(dataString, 'foo bar');
            c.database.destroy();
        });
    });
    describe('schema', () => {
        it('should throw when attachments not defined in the schema', async () => {
            const c = await humansCollection.create(1);
            const doc: any = await c.findOne().exec();
            await AsyncTestUtil.assertThrows(
                () => doc.putAttachment({
                    id: AsyncTestUtil.randomString(5) + '.txt',
                    data: blobBufferUtil.createBlobBuffer('meow I am a kitty with a knife ', 'text/plain'),
                    type: 'text/plain'
                }),
                'RxError',
                'schema'
            );
            c.database.destroy();
        });
    });
    describe('encryption', () => {
        it('should store the data encrypted', async () => {
            const c = await humansCollection.createEncryptedAttachments(1);
            const doc = await c.findOne().exec(true);
            const attachment = await doc.putAttachment({
                id: 'cat.txt',
                data: blobBufferUtil.createBlobBuffer('foo bar aaa', 'text/plain'),
                type: 'text/plain'
            });

            // the data stored in the storage must be encrypted
            if (config.storage.name === 'pouchdb') {
                const encryptedData = await doc.collection.storageInstance.internals.pouch.getAttachment(doc.primary, 'cat.txt');
                const dataString = await blobBufferUtil.toString(encryptedData);
                assert.notStrictEqual(dataString, 'foo bar aaa');
            }

            // getting the data again must be decrypted
            const data = await attachment.getStringData();
            assert.strictEqual(data, 'foo bar aaa');
            c.database.destroy();
        });
    });
    describe('.allAttachments$', () => {
        it('should emit on subscription', async () => {
            const c = await humansCollection.createEncryptedAttachments(1);
            const doc = await c.findOne().exec(true);
            await doc.putAttachment({
                id: 'cat.txt',
                data: blobBufferUtil.createBlobBuffer('foo bar', 'text/plain'),
                type: 'text/plain'
            });

            const emited: any[] = [];
            const sub = doc.allAttachments$
                .subscribe((attachments: any[]) => emited.push(attachments));
            await AsyncTestUtil.waitUntil(() => emited.length === 1);

            assert.strictEqual(emited[0].length, 1);
            assert.ok(emited[0][0].doc);

            sub.unsubscribe();
            c.database.destroy();
        });
    });
    describe('multiInstance', () => {
        if (!config.storage.hasMultiInstance) {
            return;
        }
        it('should emit on other instance', async () => {
            const name = randomCouchString(10);
            type Collections = { humans: RxCollection<HumanDocumentType, {}, {}> };
            type Document = RxDocument<HumanDocumentType>;
            const db = await createRxDatabase<Collections>({
                name,
                storage: config.storage.getStorage(),
                multiInstance: true,
                ignoreDuplicate: true
            });
            const schemaJson: RxJsonSchema<HumanDocumentType> = AsyncTestUtil.clone(schemas.human);
            schemaJson.attachments = {};


            const c = await db.addCollections<Collections>({
                humans: {
                    schema: schemaJson
                }
            });

            const db2 = await createRxDatabase<Collections>({
                name,
                storage: config.storage.getStorage(),
                multiInstance: true,
                ignoreDuplicate: true
            });
            const c2 = await db2.addCollections<Collections>({
                humans: {
                    schema: schemaJson
                }
            });

            await c.humans.insert(schemaObjects.human());
            const doc: Document = await c.humans.findOne().exec(true);
            const doc2: Document = await c2.humans.findOne().exec(true);
            assert.strictEqual(doc.age, doc2.age);

            const doc2Streamed: any[] = [];
            const sub = doc2.allAttachments$
                .subscribe(atc => {
                    doc2Streamed.push(atc);
                });

            const putAttachment = await doc.putAttachment({
                id: 'cat.txt',
                data: blobBufferUtil.createBlobBuffer('meow I am a kitty', 'text/plain'),
                type: 'text/plain'
            });

            await AsyncTestUtil.waitUntil(() => {
                return doc2Streamed.length === 2;
            }, 10 * 1000, 100);
            const attachment = doc2Streamed[1][0];
            const data = await attachment.getStringData();
            assert.strictEqual(data, 'meow I am a kitty');

            // remove again
            await putAttachment.remove();

            await AsyncTestUtil.waitUntil(
                () => doc2Streamed.length === 3
            );

            assert.strictEqual(doc2Streamed[2].length, 0);
            sub.unsubscribe();
            db.destroy();
            db2.destroy();
        });
    });
    describe('migration', () => {
        if (!config.storage.hasPersistence) {
            return;
        }
        it('should keep the attachments during migration', async () => {
            const dbName = randomCouchString(10);
            type DocData = {
                id: string;
            };
            const schema0: RxJsonSchema<DocData> = {
                version: 0,
                type: 'object',
                primaryKey: 'id',
                properties: {
                    id: {
                        type: 'string',
                        maxLength: 100
                    }
                },
                attachments: {},
                required: ['id']
            };
            const schema1: RxJsonSchema<DocData> = clone(schema0);
            schema1.version = 1;

            const db = await createRxDatabase({
                name: dbName,
                storage: config.storage.getStorage(),
            });
            const col = await db.addCollections({
                heroes: {
                    schema: schema0
                }
            });
            const doc: RxDocument<DocData> = await col.heroes.insert({
                id: 'alice'
            });
            await doc.putAttachment({
                id: 'foobar',
                data: blobBufferUtil.createBlobBuffer('barfoo', 'text/plain'),
                type: 'text/plain'
            });
            await db.destroy();

            const db2 = await createRxDatabase({
                name: dbName,
                storage: config.storage.getStorage(),
            });

            const migrationStrategies: MigrationStrategies = {
                1: (oldDoc: WithAttachmentsData<DocData>) => {
                    const attachmentData = oldDoc._attachments;
                    assert.ok(attachmentData);
                    return oldDoc;
                }
            };

            const col2 = await db2.addCollections({
                heroes: {
                    schema: schema1,
                    migrationStrategies
                }
            });

            const doc2: RxDocument<DocData> = await col2.heroes.findOne().exec();

            assert.strictEqual(doc2.allAttachments().length, 1);
            const firstAttachment = doc2.allAttachments()[0];
            const data = await firstAttachment.getStringData();
            assert.strictEqual(data, 'barfoo');

            db2.destroy();
        });
        it('should delete the attachment during migration', async () => {
            const dbName = randomCouchString(10);
            type DocData = {
                id: string;
            };
            const schema0: RxJsonSchema<DocData> = {
                version: 0,
                primaryKey: 'id',
                type: 'object',
                properties: {
                    id: {
                        type: 'string',
                        maxLength: 100
                    }
                },
                attachments: {},
                required: ['id']
            };
            const schema1: RxJsonSchema<DocData> = clone(schema0);
            schema1.version = 1;

            const db = await createRxDatabase({
                name: dbName,
                storage: config.storage.getStorage(),
            });
            const col = await db.addCollections({
                heroes: {
                    schema: schema0
                }
            });
            const doc: RxDocument<DocData> = await col.heroes.insert({
                id: 'alice'
            });
            await doc.putAttachment({
                id: 'foobar',
                data: blobBufferUtil.createBlobBuffer('barfoo', 'text/plain'),
                type: 'text/plain'
            });
            await db.destroy();

            const db2 = await createRxDatabase({
                name: dbName,
                storage: config.storage.getStorage(),
            });
            const migrationStrategies: MigrationStrategies = {
                1: (oldDoc: WithAttachmentsData<DocData>) => {
                    oldDoc._attachments = {};
                    return oldDoc;
                }
            };
            const col2 = await db2.addCollections({
                heroes: {
                    schema: schema1,
                    migrationStrategies
                }
            });
            const doc2: RxDocument<DocData> = await col2.heroes.findOne().exec();
            assert.strictEqual(doc2.allAttachments().length, 0);

            db2.destroy();
        });
        it('should be able to change the attachment data during migration', async () => {
            const dbName = randomCouchString(10);
            type DocData = {
                id: string;
            };
            const schema0: RxJsonSchema<DocData> = {
                version: 0,
                primaryKey: 'id',
                type: 'object',
                properties: {
                    id: {
                        type: 'string',
                        maxLength: 100
                    }
                },
                attachments: {},
                required: ['id']
            };
            const schema1: RxJsonSchema<DocData> = clone(schema0);
            schema1.version = 1;

            const db = await createRxDatabase({
                name: dbName,
                storage: config.storage.getStorage(),
            });
            const col = await db.addCollections({
                heroes: {
                    schema: schema0
                }
            });
            const doc: RxDocument<DocData> = await col.heroes.insert({
                id: 'alice'
            });
            await doc.putAttachment({
                id: 'foobar',
                data: blobBufferUtil.createBlobBuffer('barfoo1', 'text/plain'),
                type: 'text/plain'
            });
            await db.destroy();

            const db2 = await createRxDatabase({
                name: dbName,
                storage: config.storage.getStorage(),
            });
            const migrationStrategies: MigrationStrategies = {
                1: async (oldDoc: RxDocumentWriteData<DocData>) => {
                    if (!oldDoc._attachments) {
                        throw new Error('oldDoc._attachments missing');
                    }
                    const myAttachment = oldDoc._attachments.foobar;
                    const blobBuffer = await blobBufferUtil.createBlobBuffer(
                        'barfoo2',
                        myAttachment.type
                    );
                    (myAttachment as any).data = await blobBufferUtil.toBase64String(blobBuffer);

                    oldDoc._attachments = {
                        foobar: myAttachment
                    };
                    return oldDoc;
                }
            };
            const col2 = await db2.addCollections({
                heroes: {
                    schema: schema1,
                    migrationStrategies
                }
            });

            const doc2: RxDocument<DocData> = await col2.heroes.findOne().exec();
            assert.strictEqual(doc2.allAttachments().length, 1);
            const firstAttachment = doc2.allAttachments()[0];
            const data = await firstAttachment.getStringData();
            assert.strictEqual(data, 'barfoo2');


            db2.destroy();
        });
    });
    describe('orm', () => {
        it('should be able to call the defined function', async () => {
            const db = await createRxDatabase({
                name: randomCouchString(10),
                storage: config.storage.getStorage(),
                multiInstance: false,
                ignoreDuplicate: true
            });
            const schemaJson = AsyncTestUtil.clone(schemas.human);
            schemaJson.attachments = {};
            const c = await db.addCollections({
                humans: {
                    schema: schemaJson,
                    attachments: {
                        foobar() {
                            return 'foobar ' + this.type;
                        }
                    }
                }
            });
            await c.humans.insert(schemaObjects.human());
            const doc = await c.humans.findOne().exec();
            const attachment = await doc.putAttachment({
                id: 'cat.txt',
                data: blobBufferUtil.createBlobBuffer('meow I am a kitty', 'text/plain'),
                type: 'text/plain'
            });

            assert.strictEqual(attachment.foobar(), 'foobar text/plain');
            db.destroy();
        });
    });
    describe('issues', () => {
        it('#455 attachments not working', async () => {
            const myschema = {
                version: 0,
                primaryKey: 'name',
                type: 'object',
                properties: {
                    name: {
                        type: 'string',
                        maxLength: 100
                    },
                },
                attachments: {
                    encrypted: false,
                },
            };
            const myDB = await createRxDatabase({
                name: 'mylocaldb' + randomCouchString(10),
                storage: config.storage.getStorage(),
                multiInstance: true
            });
            const myCollections = await myDB.addCollections({
                mycollection: {
                    schema: myschema
                }
            });
            const myCollection = myCollections.mycollection;
            const mydoc = myCollection.newDocument({
                name: 'mydoc'
            });
            await mydoc.save();
            const doc = await myCollection.findOne('mydoc').exec();
            await doc.putAttachment({
                id: 'sampledata',
                data: blobBufferUtil.createBlobBuffer('foo bar', 'text/plain'),
                type: 'application/octet-stream'
            });

            const doc2 = await myCollection.findOne('mydoc').exec();
            const attachment2 = doc2.getAttachment('sampledata');
            const data = await attachment2.getStringData();
            assert.strictEqual(data, 'foo bar');
            await myDB.destroy();
        });
        it('calling allAttachments() fails when document has none', async () => {
            const name = randomCouchString(10);
            const db = await createRxDatabase({
                name,
                storage: config.storage.getStorage(),
                multiInstance: false,
                ignoreDuplicate: true
            });
            const schemaJson = AsyncTestUtil.clone(schemas.human);
            schemaJson.attachments = {};
            const c = await db.addCollections({
                humans: {
                    schema: schemaJson
                }
            });
            await c.humans.insert(schemaObjects.human());
            const doc = await c.humans.findOne().exec();

            const attachments = await doc.allAttachments();
            assert.strictEqual(attachments.length, 0);

            db.destroy();
        });
    });
});
