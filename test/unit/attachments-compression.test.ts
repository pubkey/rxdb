import assert from 'assert';
import config from './config.ts';
import AsyncTestUtil from 'async-test-util';

import {
    schemaObjects,
    schemas,
    humansCollection,
    HumanDocumentType,
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
    ensureNotFalsy,
    RxStorage,
    RxStorageInstanceCreationParams,
    RxAttachmentWriteData
} from '../../plugins/core/index.mjs';

import {
    wrappedAttachmentsCompressionStorage,
    compressBlob,
    decompressBlob,
    isCompressibleType
} from '../../plugins/attachments-compression/index.mjs';
import {
    wrappedKeyEncryptionCryptoJsStorage
} from '../../plugins/encryption-crypto-js/index.mjs';

const modes: CompressionMode[] = ['deflate', 'gzip'];
modes.forEach(mode => {
    describe('attachments-compression.test.ts (mode: ' + mode + ')', () => {
        if (
            !config.storage.hasAttachments
        ) {
            return;
        }

        // Deno's structuredClone() silently destroys Blob data, returning {}. https://github.com/denoland/deno/issues/12067#issuecomment-1975001079
        // fake-indexeddb (used by dexie in non-browser envs) relies on
        // structuredClone, so Blob attachment roundtrips are broken in Deno+dexie.
        // These tests pass fine on Node and Bun, which is sufficient coverage.
        if (isDeno && config.storage.name === 'dexie') {
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
                const blob = createBlob(plainData, 'text/plain');
                const compressed = await compressBlob(mode, blob);
                const decompressed = await decompressBlob(mode, compressed);

                const plainDecompressed = await blobToString(decompressed);
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
        describe('wrapper order', () => {
            type WrapperOrder = 'compression-around-encryption' | 'encryption-around-compression';
            const wrapperOrders: WrapperOrder[] = [
                'compression-around-encryption',
                'encryption-around-compression'
            ];
            wrapperOrders.forEach(wrapperOrder => {
                it('should store and read encrypted and compressed attachments (' + wrapperOrder + ')', async () => {
                    /**
                     * Passes all calls to the storage of the test config
                     * and collects the attachment data that reaches it.
                     */
                    const storedBlobs: Blob[] = [];
                    const baseStorage = config.storage.getStorage();
                    const collectingStorage: RxStorage<any, any> = Object.assign(
                        {},
                        baseStorage,
                        {
                            async createStorageInstance<RxDocType>(
                                params: RxStorageInstanceCreationParams<RxDocType, any>
                            ) {
                                const instance = await baseStorage.createStorageInstance(params);
                                const bulkWrite = instance.bulkWrite.bind(instance);
                                instance.bulkWrite = (rows, context) => {
                                    rows.forEach(row => {
                                        Object.values(row.document._attachments).forEach(attachment => {
                                            const data = (attachment as RxAttachmentWriteData).data;
                                            if (data) {
                                                storedBlobs.push(data);
                                            }
                                        });
                                    });
                                    return bulkWrite(rows, context);
                                };
                                return instance;
                            }
                        }
                    );
                    const storage = wrapperOrder === 'compression-around-encryption' ?
                        wrappedAttachmentsCompressionStorage({
                            storage: wrappedKeyEncryptionCryptoJsStorage({
                                storage: collectingStorage
                            })
                        }) :
                        wrappedKeyEncryptionCryptoJsStorage({
                            storage: wrappedAttachmentsCompressionStorage({
                                storage: collectingStorage
                            })
                        });
                    const db = await createRxDatabase<{ human: RxCollection<HumanDocumentType>; }>({
                        name: randomToken(10),
                        password: 'mypassword123',
                        storage,
                        multiInstance: false
                    });
                    const schemaJson = clone(schemas.human);
                    schemaJson.attachments = {
                        encrypted: true,
                        compression: mode
                    };
                    const collections = await db.addCollections({
                        human: {
                            schema: schemaJson
                        }
                    });
                    const c = collections.human;
                    const insertedDoc = await c.insert(schemaObjects.humanData());

                    // 'text/plain' is compressed, 'image/jpeg' is stored without compression
                    const textData = 'meow I am a secret kitty ' + new Array(50).fill('with a knife').join(' ');
                    const imageData = 'woof I am a secret doggo ' + randomToken(20);
                    await insertedDoc.putAttachment({
                        id: 'cat.txt',
                        data: createBlob(textData, 'text/plain'),
                        type: 'text/plain'
                    });
                    await insertedDoc.getLatest().putAttachment({
                        id: 'dog.jpg',
                        data: createBlob(imageData, 'image/jpeg'),
                        type: 'image/jpeg'
                    });

                    let doc = await c.findOne().exec(true);
                    assert.strictEqual(doc.allAttachments().length, 2);
                    assert.strictEqual(
                        await ensureNotFalsy(doc.getAttachment('cat.txt')).getStringData(),
                        textData
                    );
                    assert.strictEqual(
                        await ensureNotFalsy(doc.getAttachment('dog.jpg')).getStringData(),
                        imageData
                    );

                    // overwrite one attachment while the other one stays untouched
                    const updatedTextData = 'purr ' + textData;
                    await doc.putAttachment({
                        id: 'cat.txt',
                        data: createBlob(updatedTextData, 'text/plain'),
                        type: 'text/plain'
                    });
                    doc = await c.findOne().exec(true);
                    assert.strictEqual(
                        await ensureNotFalsy(doc.getAttachment('cat.txt')).getStringData(),
                        updatedTextData
                    );
                    assert.strictEqual(
                        await ensureNotFalsy(doc.getAttachment('dog.jpg')).getStringData(),
                        imageData
                    );

                    await ensureNotFalsy(doc.getAttachment('cat.txt')).remove();
                    doc = await c.findOne().exec(true);
                    assert.strictEqual(doc.getAttachment('cat.txt'), null);
                    assert.strictEqual(
                        await ensureNotFalsy(doc.getAttachment('dog.jpg')).getStringData(),
                        imageData
                    );

                    /**
                     * The plain text must not be in the stored data,
                     * also not after the compression is reverted.
                     */
                    assert.strictEqual(storedBlobs.length, 3);
                    for (const storedBlob of storedBlobs) {
                        const storedStrings = [await blobToString(storedBlob)];
                        try {
                            storedStrings.push(await blobToString(await decompressBlob(mode, storedBlob)));
                        } catch (err) { }
                        storedStrings.forEach(storedString => {
                            assert.ok(storedString.length > 0);
                            assert.strictEqual(storedString.includes('secret'), false);
                            assert.strictEqual(storedString.includes('knife'), false);
                        });
                    }

                    await db.close();
                });
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

        describe('selective compression', () => {
            it('should compress a compressible type (text/plain) and roundtrip correctly', async () => {
                const c = await createCompressedAttachmentsCollection(1);
                const doc = await c.findOne().exec(true);
                const plainData = 'hello world repeating text '.repeat(20);
                const originalBlob = createBlob(plainData, 'text/plain');
                const attachment = await doc.putAttachment({
                    id: 'readme.txt',
                    data: originalBlob,
                    type: 'text/plain'
                });
                assert.ok(attachment);

                // Stored size should be smaller than original (text compresses well)
                assert.ok(
                    attachment.length < originalBlob.size,
                    'compressed attachment (' + attachment.length + ') should be smaller than original (' + originalBlob.size + ')'
                );

                const data = await attachment.getData();
                const dataString = await blobToString(data);
                assert.strictEqual(dataString, plainData);
                c.database.close();
            });
            it('should NOT compress a non-compressible type (image/jpeg) but still roundtrip correctly', async () => {
                const c = await createCompressedAttachmentsCollection(1);
                const doc = await c.findOne().exec(true);

                // Create fake JPEG-like binary data
                const binaryData = new Uint8Array(200);
                for (let i = 0; i < binaryData.length; i++) {
                    binaryData[i] = i % 256;
                }
                const jpegBlob = new Blob([binaryData], { type: 'image/jpeg' });

                const attachment = await doc.putAttachment({
                    id: 'photo.jpg',
                    data: jpegBlob,
                    type: 'image/jpeg'
                });
                assert.ok(attachment);

                // Stored size should be exactly the original (not compressed, no overhead)
                assert.strictEqual(
                    attachment.length,
                    binaryData.length,
                    'non-compressible type stored size (' + attachment.length + ') should equal original (' + binaryData.length + ')'
                );

                const data = await attachment.getData();
                const retrievedBytes = new Uint8Array(await data.arrayBuffer());
                assert.strictEqual(retrievedBytes.length, binaryData.length);
                for (let i = 0; i < binaryData.length; i++) {
                    assert.strictEqual(retrievedBytes[i], binaryData[i]);
                }
                c.database.close();
            });
            it('should compress text but not jpeg on the same document', async () => {
                if (isDeno) {
                    return;
                }
                const c = await createCompressedAttachmentsCollection(1);
                const c2 = await humansCollection.createAttachments(1);
                const doc = await c.findOne().exec(true);
                const docUncompressed = await c2.findOne().exec(true);

                const textData = 'repeating text data for compression '.repeat(20);
                const binaryData = new Uint8Array(200);
                for (let i = 0; i < binaryData.length; i++) {
                    binaryData[i] = i % 256;
                }
                const jpegBlob = new Blob([binaryData], { type: 'image/jpeg' });

                // Store both on compressed collection
                const textAttachment = await doc.putAttachment({
                    id: 'readme.txt',
                    data: createBlob(textData, 'text/plain'),
                    type: 'text/plain'
                });
                const jpegAttachment = await doc.putAttachment({
                    id: 'photo.jpg',
                    data: jpegBlob,
                    type: 'image/jpeg'
                });

                // Store text on uncompressed collection for size comparison
                const textAttachmentUncompressed = await docUncompressed.putAttachment({
                    id: 'readme.txt',
                    data: createBlob(textData, 'text/plain'),
                    type: 'text/plain'
                });

                // Compressed text should be strictly smaller than uncompressed
                assert.ok(
                    textAttachment.length < textAttachmentUncompressed.length,
                    'compressed text (' + textAttachment.length + ') should be smaller than uncompressed (' + textAttachmentUncompressed.length + ')'
                );

                // JPEG stored size should be exactly the original (not compressed, no overhead)
                assert.strictEqual(
                    jpegAttachment.length,
                    binaryData.length,
                    'non-compressible JPEG stored size (' + jpegAttachment.length + ') should equal original (' + binaryData.length + ')'
                );

                // Both should roundtrip correctly
                const textResult = await blobToString(await textAttachment.getData());
                assert.strictEqual(textResult, textData);

                const jpegResult = new Uint8Array(await (await jpegAttachment.getData()).arrayBuffer());
                assert.strictEqual(jpegResult.length, binaryData.length);

                c.database.close();
                c2.database.close();
            });
        });

        describe('isCompressibleType()', () => {
            const defaultTypes = [
                'text/*',
                'application/json',
                'image/svg+xml'
            ];
            it('should match wildcard patterns', () => {
                assert.strictEqual(isCompressibleType('text/plain', defaultTypes), true);
                assert.strictEqual(isCompressibleType('text/html', defaultTypes), true);
                assert.strictEqual(isCompressibleType('text/css', defaultTypes), true);
            });
            it('should match exact patterns', () => {
                assert.strictEqual(isCompressibleType('application/json', defaultTypes), true);
                assert.strictEqual(isCompressibleType('image/svg+xml', defaultTypes), true);
            });
            it('should be case-insensitive', () => {
                assert.strictEqual(isCompressibleType('TEXT/PLAIN', defaultTypes), true);
                assert.strictEqual(isCompressibleType('Application/JSON', defaultTypes), true);
            });
            it('should NOT match non-compressible types', () => {
                assert.strictEqual(isCompressibleType('image/jpeg', defaultTypes), false);
                assert.strictEqual(isCompressibleType('image/png', defaultTypes), false);
                assert.strictEqual(isCompressibleType('video/mp4', defaultTypes), false);
                assert.strictEqual(isCompressibleType('audio/mpeg', defaultTypes), false);
            });
            it('should match types that include RFC 2045 parameters like charset', () => {
                // Blobs often expose a MIME type with parameters (e.g. 'application/json;charset=utf-8').
                // The parameter suffix must not prevent matching against an exact compressible pattern
                // like 'application/json'. Without the fix, these attachments silently bypass compression.
                assert.strictEqual(
                    isCompressibleType('application/json; charset=utf-8', defaultTypes),
                    true,
                    'application/json with charset parameter should be compressible'
                );
                assert.strictEqual(
                    isCompressibleType('application/json;charset=UTF-8', defaultTypes),
                    true,
                    'application/json with no-space charset parameter should be compressible'
                );
                assert.strictEqual(
                    isCompressibleType('image/svg+xml; charset=utf-8', defaultTypes),
                    true,
                    'image/svg+xml with charset parameter should be compressible'
                );
                // Non-compressible types with parameters must still be rejected.
                assert.strictEqual(
                    isCompressibleType('image/jpeg; boundary=foo', defaultTypes),
                    false,
                    'image/jpeg with parameter must not become compressible'
                );
            });
        });

        describe('MIME type preservation', () => {
            it('full roundtrip through storage should preserve MIME type on getData()', async () => {
                const c = await createCompressedAttachmentsCollection(1);
                const doc = await c.findOne().exec(true);
                await doc.putAttachment({
                    id: 'readme.txt',
                    data: createBlob('hello world', 'text/plain'),
                    type: 'text/plain'
                });
                const latestDoc = await c.findOne().exec(true);
                const attachment = latestDoc.getAttachment('readme.txt');
                const blob = await ensureNotFalsy(attachment).getData();
                assert.ok(
                    blob.type === 'text/plain' || blob.type === 'text/plain;charset=utf-8',
                    'retrieved Blob should have text/plain MIME type after compression roundtrip, got: ' + blob.type
                );
                c.database.close();
            });
            it('full roundtrip should preserve MIME type for non-compressible type', async () => {
                const c = await createCompressedAttachmentsCollection(1);
                const doc = await c.findOne().exec(true);
                const binaryData = new Uint8Array(50);
                for (let i = 0; i < binaryData.length; i++) {
                    binaryData[i] = i % 256;
                }
                const jpegBlob = new Blob([binaryData], { type: 'image/jpeg' });
                await doc.putAttachment({
                    id: 'photo.jpg',
                    data: jpegBlob,
                    type: 'image/jpeg'
                });
                const latestDoc = await c.findOne().exec(true);
                const attachment = latestDoc.getAttachment('photo.jpg');
                const blob = await ensureNotFalsy(attachment).getData();
                assert.strictEqual(blob.type, 'image/jpeg', 'retrieved Blob should have image/jpeg MIME type (non-compressed path)');
                c.database.close();
            });
        });


    });

});
