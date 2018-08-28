import assert from 'assert';
import config from './config';
import AsyncTestUtil from 'async-test-util';

import * as humansCollection from '../helper/humans-collection';
import * as schemas from '../helper/schemas';
import * as schemaObjects from '../helper/schema-objects';
import * as util from '../../dist/lib/util';
import RxDatabase from '../../dist/lib/rx-database';
import * as AttachmentPlugin from '../../dist/lib/plugins/attachments';

config.parallel('attachments.test.js', () => {
    describe('.putAttachment()', () => {
        it('should insert one attachment', async () => {
            const c = await humansCollection.createAttachments(1);
            const doc = await c.findOne().exec();
            const attachment = await doc.putAttachment({
                id: 'cat.txt',
                data: 'meow',
                type: 'text/plain'
            });
            assert.ok(attachment);
            assert.equal(attachment.id, 'cat.txt');
            assert.equal(attachment.type, 'text/plain');
            c.database.destroy();
        });
        it('should insert two attachments', async () => {
            const c = await humansCollection.createAttachments(1);
            const doc = await c.findOne().exec();
            await doc.putAttachment({
                id: 'cat.txt',
                data: 'meow',
                type: 'text/plain'
            });
            await doc.putAttachment({
                id: 'cat2.txt',
                data: 'meowmeow',
                type: 'text/plain'
            });
            c.database.destroy();
        });
        it('should insert 4 attachments in parallel', async () => {
            const c = await humansCollection.createAttachments(1);
            const doc = await c.findOne().exec();
            const attachments = await Promise.all(
                new Array(4)
                .fill(0)
                .map(() => doc.putAttachment({
                    id: AsyncTestUtil.randomString(5) + '.txt',
                    data: 'meow I am a kitty with a knife ' + AsyncTestUtil.randomString(5),
                    type: 'text/plain'
                }))
            );
            assert.equal(attachments.length, 4);
            assert.ok(attachments[1].id);
            c.database.destroy();
        });
        it('should insert an attachment with a big content', async () => {
            const c = await humansCollection.createAttachments(1);
            const doc = await c.findOne().exec();
            await doc.putAttachment({
                id: 'cat2.txt',
                data: [
                    AsyncTestUtil.randomString(100),
                    AsyncTestUtil.randomString(100),
                    AsyncTestUtil.randomString(100)
                ].join(' '), // use space here
                type: 'text/plain'
            });
            c.database.destroy();
        });
    });
    describe('.getAttachment()', () => {
        it('should get the attachment', async () => {
            const c = await humansCollection.createAttachments(1);
            const doc = await c.findOne().exec();
            await doc.putAttachment({
                id: 'cat.txt',
                data: 'meow I am a kitty with a knife',
                type: 'text/plain'
            });
            const attachment = doc.getAttachment('cat.txt');
            assert.ok(attachment);
            assert.equal(attachment.rev, 2);
            c.database.destroy();
        });
        it('should find the attachment after another doc-update', async () => {
            const c = await humansCollection.createAttachments(1);
            const doc = await c.findOne().exec();
            await doc.putAttachment({
                id: 'cat.txt',
                data: 'meow I am a kitty with a knife',
                type: 'text/plain'
            });

            await doc.atomicSet('age', 7);

            const attachment = doc.getAttachment('cat.txt');
            assert.ok(attachment);
            assert.equal(attachment.type, 'text/plain');
            c.database.destroy();
        });
        it('should find the attachment after database is re-created', async () => {
            const name = util.randomCouchString(10);
            const db = await RxDatabase.create({
                name,
                adapter: 'memory',
                multiInstance: false,
                ignoreDuplicate: true
            });
            const schemaJson = AsyncTestUtil.clone(schemas.human);
            schemaJson.attachments = {};
            const collection = await db.collection({
                name: 'humans',
                schema: schemaJson
            });
            await collection.insert(schemaObjects.human());
            const doc = await collection.findOne().exec();
            const docAge = doc.age;
            await doc.putAttachment({
                id: 'cat.txt',
                data: 'meow I am a kitty with a knife',
                type: 'text/plain'
            });
            await db.destroy();
            const db2 = await RxDatabase.create({
                name,
                adapter: 'memory',
                multiInstance: false,
                ignoreDuplicate: true
            });
            const c2 = await db2.collection({
                name: 'humans',
                schema: schemaJson
            });
            const doc2 = await c2.findOne().exec();
            assert.equal(docAge, doc2.age);
            const attachment = doc2.getAttachment('cat.txt');
            assert.ok(attachment);
            assert.equal(attachment.type, 'text/plain');
            c2.database.destroy();
        });
    });
    describe('RxAttachment.getData()', () => {
        it('should get the data', async () => {
            const c = await humansCollection.createAttachments(1);
            const doc = await c.findOne().exec();
            const dat = AsyncTestUtil.randomString(100) + ' ' + AsyncTestUtil.randomString(100);
            await doc.putAttachment({
                id: 'cat.txt',
                data: dat,
                type: 'text/plain'
            });
            const attachment = doc.getAttachment('cat.txt');
            const data = await attachment.getData();
            const dataString = await AttachmentPlugin.blobBufferUtil.toString(data);
            assert.equal(dataString, dat);
            c.database.destroy();
        });
    });
    describe('RxAttachment.getStringData()', () => {
        it('should get the data as string', async () => {
            const c = await humansCollection.createAttachments(1);
            const doc = await c.findOne().exec();
            const dat = AsyncTestUtil.randomString(100) + ' ' + AsyncTestUtil.randomString(100);
            await doc.putAttachment({
                id: 'cat.txt',
                data: dat,
                type: 'text/plain'
            });
            const attachment = doc.getAttachment('cat.txt');
            const data = await attachment.getStringData();
            assert.equal(data, dat);
            c.database.destroy();
        });
    });
    describe('RxAttachment.remove()', () => {
        it('should remove the attachment', async () => {
            const c = await humansCollection.createAttachments(1);
            const doc = await c.findOne().exec();
            await doc.putAttachment({
                id: 'cat.txt',
                data: 'meow I am a kitty with a knife',
                type: 'text/plain'
            });
            const attachment = doc.getAttachment('cat.txt');
            assert.ok(attachment);

            await attachment.remove();

            // ensure it does not exist
            const shouldBeNull = doc.getAttachment('cat.txt');
            assert.equal(null, shouldBeNull);

            c.database.destroy();
        });
    });
    describe('.allAttachments()', () => {
        it('should find all attachments', async () => {
            const c = await humansCollection.createAttachments(1);
            const doc = await c.findOne().exec();
            await Promise.all(
                new Array(10)
                .fill(0)
                .map(() => doc.putAttachment({
                    id: AsyncTestUtil.randomString(5) + '.txt',
                    data: 'meow I am a kitty with a knife ' + AsyncTestUtil.randomString(500),
                    type: 'text/plain'
                }))
            );
            const attachments = doc.allAttachments();
            assert.equal(attachments.length, 10);
            c.database.destroy();
        });
        it('should lazy-load the data for the attachment', async () => {
            const c = await humansCollection.createAttachments(1);
            const doc = await c.findOne().exec();
            await doc.putAttachment({
                id: 'janosch.txt',
                data: 'foo bar',
                type: 'text/plain'
            });
            const attachments = doc.allAttachments();
            const attachment = attachments[0];

            const data = await attachment.getData();
            const dataString = await AttachmentPlugin.blobBufferUtil.toString(data);
            assert.deepEqual(dataString, 'foo bar');
            c.database.destroy();
        });
    });
    describe('schema', () => {
        it('should throw when attachments not defined in the schema', async () => {
            const c = await humansCollection.create(1);
            const doc = await c.findOne().exec();
            await AsyncTestUtil.assertThrows(
                () => doc.putAttachment({
                    id: AsyncTestUtil.randomString(5) + '.txt',
                    data: 'meow I am a kitty with a knife ',
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
            const doc = await c.findOne().exec();
            const attachment = await doc.putAttachment({
                id: 'cat.txt',
                data: 'foo bar',
                type: 'text/plain'
            });

            const encryptedData = await doc.collection.pouch.getAttachment(doc.primary, 'cat.txt');
            const dataString = await AttachmentPlugin.blobBufferUtil.toString(encryptedData);
            assert.notEqual(dataString, 'foo bar');

            const data = await attachment.getStringData();
            assert.equal(data, 'foo bar');

            c.database.destroy();
        });
    });
    describe('.allAttachments$', () => {
        it('should emit on subscription', async () => {
            const c = await humansCollection.createEncryptedAttachments(1);
            const doc = await c.findOne().exec();
            await doc.putAttachment({
                id: 'cat.txt',
                data: 'foo bar',
                type: 'text/plain'
            });

            const emited = [];
            const sub = doc.allAttachments$.subscribe(attachments => emited.push(attachments));
            await AsyncTestUtil.waitUntil(() => emited.length === 1);

            assert.equal(emited[0].length, 1);
            assert.ok(emited[0][0].doc);

            sub.unsubscribe();
            c.database.destroy();
        });
    });
    describe('multiInstance', () => {
        it('should emit on other instance', async () => {
            const name = util.randomCouchString(10);
            const db = await RxDatabase.create({
                name,
                adapter: 'memory',
                multiInstance: true,
                ignoreDuplicate: true
            });
            const schemaJson = AsyncTestUtil.clone(schemas.human);
            schemaJson.attachments = {};
            const c = await db.collection({
                name: 'humans',
                schema: schemaJson
            });

            const db2 = await RxDatabase.create({
                name,
                adapter: 'memory',
                multiInstance: true,
                ignoreDuplicate: true
            });
            const c2 = await db2.collection({
                name: 'humans',
                schema: schemaJson
            });

            await c.insert(schemaObjects.human());
            const doc = await c.findOne().exec();
            const doc2 = await c2.findOne().exec();
            assert.equal(doc.age, doc2.age);

            const doc2Streamed = [];
            const sub = doc2.allAttachments$
                .subscribe(atc => doc2Streamed.push(atc));

            const putAttachment = await doc.putAttachment({
                id: 'cat.txt',
                data: 'meow I am a kitty',
                type: 'text/plain'
            });

            await AsyncTestUtil.waitUntil(
                () => doc2Streamed.length === 2
            );
            const attachment = doc2Streamed[1][0];
            const data = await attachment.getStringData();
            assert.equal(data, 'meow I am a kitty');

            // remove again
            await putAttachment.remove();

            await AsyncTestUtil.waitUntil(
                () => doc2Streamed.length === 3
            );
            assert.equal(doc2Streamed[2].length, 0);


            sub.unsubscribe();
            db.destroy();
            db2.destroy();
        });
    });
    describe('data-migration', () => {
        it('should also migrate the attachments', async () => {
            const name = util.randomCouchString(10);
            const db = await RxDatabase.create({
                name,
                adapter: 'memory',
                multiInstance: false,
                ignoreDuplicate: true
            });
            const schemaJson = AsyncTestUtil.clone(schemas.human);
            schemaJson.attachments = {};
            const c = await db.collection({
                name: 'humans',
                schema: schemaJson
            });
            await c.insert(schemaObjects.human());
            const doc = await c.findOne().exec();
            await doc.putAttachment({
                id: 'cat.txt',
                data: 'meow I am a kitty',
                type: 'text/plain'
            });
            await doc.putAttachment({
                id: 'cat2.txt',
                data: 'meow I am a kitty2',
                type: 'text/plain'
            });

            db.destroy();

            const schemaJsonV2 = AsyncTestUtil.clone(schemaJson);
            schemaJsonV2.version = 1;
            const db2 = await RxDatabase.create({
                name,
                adapter: 'memory',
                multiInstance: false,
                ignoreDuplicate: true
            });
            const c2 = await db2.collection({
                name: 'humans',
                schema: schemaJsonV2,
                autoMigrate: true,
                migrationStrategies: {
                    1: docData => docData
                }
            });

            const doc2 = await c2.findOne().exec();
            assert.ok(doc2);
            const attachment = doc2.getAttachment('cat.txt');
            const data = await attachment.getStringData();
            assert.equal(data, 'meow I am a kitty');
            assert.ok(attachment);

            const attachment2 = doc2.getAttachment('cat2.txt');
            assert.ok(attachment2);
            const data2 = await attachment2.getStringData();
            assert.equal(data2, 'meow I am a kitty2');

            db2.destroy();
        });
    });
    describe('orm', () => {
        it('should be able to call the defined function', async () => {
            const db = await RxDatabase.create({
                name: util.randomCouchString(10),
                adapter: 'memory',
                multiInstance: false,
                ignoreDuplicate: true
            });
            const schemaJson = AsyncTestUtil.clone(schemas.human);
            schemaJson.attachments = {};
            const c = await db.collection({
                name: 'humans',
                schema: schemaJson,
                attachments: {
                    foobar() {
                        return 'foobar ' + this.type;
                    }
                }
            });
            await c.insert(schemaObjects.human());
            const doc = await c.findOne().exec();
            const attachment = await doc.putAttachment({
                id: 'cat.txt',
                data: 'meow I am a kitty',
                type: 'text/plain'
            });

            assert.equal(attachment.foobar(), 'foobar text/plain');
            db.destroy();
        });
    });
    describe('issues', () => {
        it('#455 attachments not working', async () => {
            const myschema = {
                version: 0,
                type: 'object',
                properties: {
                    name: {
                        type: 'string',
                        primary: true,
                    },
                },
                attachments: {
                    encrypted: false,
                },
            };
            const myDB = await RxDatabase.create({
                name: 'mylocaldb' + util.randomCouchString(10),
                adapter: 'memory',
                multiInstance: true
            });
            const myCollection = await myDB.collection({
                name: 'mycollection',
                schema: myschema
            });
            const mydoc = myCollection.newDocument({
                name: 'mydoc'
            });
            await mydoc.save();
            const doc = await myCollection.findOne('mydoc').exec();
            await doc.putAttachment({
                id: 'sampledata',
                data: 'foo bar',
                type: 'application/octet-stream'
            });

            const doc2 = await myCollection.findOne('mydoc').exec();
            const attachment2 = doc2.getAttachment('sampledata');
            const data = await attachment2.getStringData();
            assert.equal(data, 'foo bar');
            await myDB.destroy();
        });
    });
});
