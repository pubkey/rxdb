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
    deepEqual,
    RxAttachmentData,
    RxAttachmentWriteData,
    WithDeletedAndAttachments
} from '../../plugins/core/index.mjs';
import { replicateRxCollection } from '../../plugins/replication/index.mjs';

import {
    wrappedAttachmentsCompressionStorage,
    compressBlob,
    decompressBlob,
    isCompressibleType
} from '../../plugins/attachments-compression/index.mjs';

const modes: CompressionMode[] = ['deflate', 'gzip'];

/**
 * Returns the size of the attachment data that is stored in the storage of the test config.
 * Reads through a second plain storage instance that does not have the compression wrapper.
 */
async function getStoredAttachmentSize(
    collection: RxCollection<HumanDocumentType>,
    documentId: string,
    attachmentId: string
): Promise<number> {
    const schema = clone(collection.schema.jsonSchema);
    delete ensureNotFalsy(schema.attachments).compression;
    const storageInstance = await config.storage.getStorage().createStorageInstance<HumanDocumentType>({
        databaseInstanceToken: randomToken(10),
        databaseName: collection.database.name,
        collectionName: collection.name,
        schema,
        options: {},
        multiInstance: collection.database.multiInstance,
        devMode: true
    });
    const docs = await storageInstance.findDocumentsById([documentId], false);
    const storedDigest = docs[0]._attachments[attachmentId].digest;
    const data = await storageInstance.getAttachmentData(documentId, attachmentId, storedDigest);
    await storageInstance.close();
    return data.size;
}
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
                await docCompressed.putAttachment({
                    id: 'compare-size.txt',
                    data: createBlob(plainData, 'text/plain'),
                    type: 'text/plain'
                });

                const docB = await c2.findOne().exec(true);
                const attachmentB = await docB.putAttachment({
                    id: 'cat.txt',
                    data: createBlob(plainData, 'text/plain'),
                    type: 'text/plain'
                });
                if (config.storage.hasPersistence) {
                    const storedSize = await getStoredAttachmentSize(c, docCompressed.primary, 'compare-size.txt');
                    assert.ok(
                        (storedSize * 1.5) < attachmentB.length
                    );
                }
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
                    id: 'compressible.txt',
                    data: originalBlob,
                    type: 'text/plain'
                });
                assert.ok(attachment);

                // Stored size should be smaller than original (text compresses well)
                if (config.storage.hasPersistence) {
                    const storedSize = await getStoredAttachmentSize(c, doc.primary, 'compressible.txt');
                    assert.ok(
                        storedSize < originalBlob.size,
                        'compressed attachment (' + storedSize + ') should be smaller than original (' + originalBlob.size + ')'
                    );
                }
                assert.strictEqual(attachment.length, originalBlob.size);

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
                    id: 'mixed.txt',
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
                if (config.storage.hasPersistence) {
                    const storedTextSize = await getStoredAttachmentSize(c, doc.primary, 'mixed.txt');
                    assert.ok(
                        storedTextSize < textAttachmentUncompressed.length,
                        'compressed text (' + storedTextSize + ') should be smaller than uncompressed (' + textAttachmentUncompressed.length + ')'
                    );
                }

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

        describe('replication', () => {
            it('should push a local change of a pulled document that has a compressed attachment', async () => {
                const c = await createCompressedAttachmentsCollection(0, undefined, false);
                const blob = createBlob('Milk, eggs, bread. '.repeat(20), 'text/plain');
                const digest = await c.database.hashFunction(blob);
                type MasterDoc = WithDeletedAndAttachments<HumanDocumentType>;
                const toStubs = (docState: MasterDoc) => {
                    const stubs: { [attachmentId: string]: RxAttachmentData; } = {};
                    Object.entries(docState._attachments ?? {}).forEach(([attachmentId, att]) => {
                        stubs[attachmentId] = {
                            digest: att.digest,
                            length: att.length,
                            type: att.type
                        };
                    });
                    return Object.assign({}, docState, { _attachments: stubs });
                };

                // the master has one document with one attachment
                let masterState: MasterDoc = Object.assign(
                    schemaObjects.humanData('todo1'),
                    {
                        _deleted: false,
                        _attachments: {
                            'list.txt': {
                                digest,
                                length: blob.size,
                                type: 'text/plain'
                            }
                        }
                    }
                );
                // each handler call returns new objects like a backend that answers with JSON
                const getMasterWithData = (): MasterDoc => {
                    const attachments: { [attachmentId: string]: RxAttachmentWriteData; } = {};
                    Object.entries(toStubs(masterState)._attachments).forEach(([attachmentId, stub]) => {
                        attachments[attachmentId] = Object.assign({}, stub, { data: blob.slice(0, blob.size, blob.type) });
                    });
                    return Object.assign({}, masterState, { _attachments: attachments });
                };

                let pushCalls = 0;
                let conflicts = 0;
                const replicationState = replicateRxCollection<HumanDocumentType, { done: boolean; }>({
                    collection: c,
                    replicationIdentifier: 'compressed-attachments-replication',
                    live: true,
                    pull: {
                        handler: (checkpoint) => Promise.resolve(checkpoint ? {
                            documents: [],
                            checkpoint
                        } : {
                            documents: [getMasterWithData()],
                            checkpoint: { done: true }
                        })
                    },
                    push: {
                        handler: (rows) => {
                            pushCalls++;
                            const row = rows[0];
                            // conflict detection: the assumed master state must be equal to the master state
                            if (
                                !row.assumedMasterState ||
                                !deepEqual(toStubs(row.assumedMasterState), toStubs(masterState))
                            ) {
                                conflicts++;
                                return Promise.resolve([getMasterWithData()]);
                            }
                            masterState = toStubs(row.newDocumentState);
                            return Promise.resolve([]);
                        }
                    }
                });
                await replicationState.awaitInSync();
                assert.strictEqual(pushCalls, 0, 'must not push a document that was only pulled');

                const doc = await c.findOne('todo1').exec(true);
                await doc.incrementalPatch({ firstName: 'changed' });
                await replicationState.awaitInSync();
                assert.strictEqual(conflicts, 0);
                assert.strictEqual(masterState.firstName, 'changed');
                assert.deepStrictEqual(toStubs(masterState)._attachments, {
                    'list.txt': {
                        digest,
                        length: blob.size,
                        type: 'text/plain'
                    }
                });
                const docAfter = await c.findOne('todo1').exec(true);
                assert.strictEqual(docAfter.firstName, 'changed');
                const attachment = ensureNotFalsy(docAfter.getAttachment('list.txt'));
                assert.strictEqual(attachment.digest, digest);
                assert.strictEqual(attachment.length, blob.size);
                assert.strictEqual(await blobToString(await attachment.getData()), await blobToString(blob));

                await c.database.remove();
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
