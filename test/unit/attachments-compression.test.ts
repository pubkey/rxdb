import assert from 'assert';
import config, { describeParallel } from './config.ts';
import AsyncTestUtil from 'async-test-util';

import {
    schemaObjects,
    schemas,
    humansCollection,
    HumanDocumentType,
    isBun,
    isDeno
} from '../../plugins/test-utils/index.mjs';
import {
    clone,
    createRxDatabase,
    randomToken,
    RxCollection,
    createBlob,
    blobToString,
    CompressionMode,
    b64EncodeUnicode,
    b64DecodeUnicode
} from '../../plugins/core/index.mjs';

import {
    wrappedAttachmentsCompressionStorage,
    compressBase64,
    decompressBase64
} from '../../plugins/attachments-compression/index.mjs';

const modes: CompressionMode[] = ['deflate', 'gzip'];
modes.forEach(mode => {
    describeParallel('attachments-compression.test.ts (mode: ' + mode + ')', () => {
        if (
            !config.storage.hasAttachments
            /**
             * TODO re-enable when bun supports CompressionStream
             * @link https://github.com/oven-sh/bun/issues/1723
             */
            || isBun
        ) {
            return;
        }

        async function createCompressedAttachmentsCollection(
            size = 1,
            name = 'human',
            multiInstance = true
        ): Promise<RxCollection<HumanDocumentType, {}, {}>> {
            if (!name) {
                name = 'human';
            }
            const db = await createRxDatabase<{ [prop: string]: RxCollection<HumanDocumentType>; }>({
                name: randomToken(10),
                storage: wrappedAttachmentsCompressionStorage({
                    storage: config.storage.getStorage()
                }),
                multiInstance,
                eventReduce: true,
                ignoreDuplicate: true
            });

            const schemaJson = clone(schemas.human);
            schemaJson.attachments = {
                compression: mode
            };

            const collections = await db.addCollections({
                [name]: {
                    schema: schemaJson
                }
            });

            // insert data
            if (size > 0) {
                const docsData = new Array(size)
                    .fill(0)
                    .map(() => schemaObjects.humanData());
                await collections[name].bulkInsert(docsData);
            }

            return collections[name];
        }


        describe('basics', () => {
            it('compress->decompress', async () => {
                const plainData = 'foobar';
                const compressed = await compressBase64(mode, b64EncodeUnicode(plainData));
                const decompressedBase64 = await decompressBase64(mode, compressed);

                const plainDecompressed = b64DecodeUnicode(decompressedBase64);
                assert.strictEqual(
                    plainData,
                    plainDecompressed
                );
            });

        });

        describe('CRUD', () => {
            it('should insert one attachment', async () => {
                const c = await createCompressedAttachmentsCollection();
                const doc = await c.findOne().exec(true);
                const attachment = await doc.putAttachment({
                    id: 'cat.txt',
                    data: createBlob('meow', 'text/plain'),
                    type: 'text/plain'
                });
                assert.ok(attachment);
                assert.strictEqual(attachment.id, 'cat.txt');
                assert.strictEqual(attachment.type, 'text/plain');
                c.database.remove();
            });
            it('should get the attachment', async () => {
                const c = await createCompressedAttachmentsCollection();
                let doc = await c.findOne().exec(true);
                await doc.putAttachment({
                    id: 'cat.txt',
                    data: createBlob('meow I am a kitty with a knife', 'text/plain'),
                    type: 'text/plain'
                });
                doc = await c.findOne().exec(true);
                const attachment: any = doc.getAttachment('cat.txt');
                assert.ok(attachment);
                c.database.close();
            });
            it('should get the data', async () => {
                const c = await createCompressedAttachmentsCollection();
                let doc = await c.findOne().exec(true);
                const dat = AsyncTestUtil.randomString(100) + ' ' + AsyncTestUtil.randomString(100);
                await doc.putAttachment({
                    id: 'cat.txt',
                    data: createBlob(dat, 'text/plain'),
                    type: 'text/plain'
                });
                doc = await c.findOne().exec(true);
                const attachment: any = doc.getAttachment('cat.txt');
                const data = await attachment.getData();
                const dataString = await blobToString(data);
                assert.strictEqual(dataString, dat);
                c.database.close();
            });
        });
        describe('compare size', () => {
            it('should have a smaller size when compression is used', async () => {
                if (isDeno) {
                    // too slow on deno
                    return;
                }
                const c = await createCompressedAttachmentsCollection(1);
                const c2 = await humansCollection.createAttachments(1);

                const plainData = 'foobar '.repeat(10);

                const docCompressed = await c.findOne().exec(true);
                const attachmentCompressed = await docCompressed.putAttachment({
                    id: 'cat.txt',
                    data: createBlob(plainData, 'text/plain'),
                    type: 'text/plain'
                });

                const docB = await c2.findOne().exec(true);
                const attachmentB = await docB.putAttachment({
                    id: 'cat.txt',
                    data: createBlob(plainData, 'text/plain'),
                    type: 'text/plain'
                });
                assert.ok(
                    (attachmentCompressed.length * 1.5) < attachmentB.length
                );
                c.database.close();
                c2.database.close();
            });
        });


    });

});
