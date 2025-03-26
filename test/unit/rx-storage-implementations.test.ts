import assert from 'assert';

import config, { describeParallel } from './config.ts';
import {
    addRxPlugin,
    randomToken,
    getPseudoSchemaForVersion,
    lastOfArray,
    writeSingle,
    flattenEvents,
    flatClone,
    RxJsonSchema,
    ensureNotFalsy,
    shuffleArray,
    now,
    getSingleDocument,
    parseRevision,
    fillWithDefaultSettings,
    createRevision,
    flatCloneDocWithMeta,
    ById,
    stackCheckpoints,
    deepFreeze,
    stripAttachmentsDataFromDocument,
    getAttachmentSize,
    blobToBase64String,
    createBlob,
    getBlobSize,
    getSortComparator,
    getQueryMatcher,
    getFromMapOrCreate,
    EventBulk,
    FilledMangoQuery,
    PreparedQuery,
    RxDocumentData,
    RxDocumentWriteData,
    RxStorageBulkWriteResponse,
    RxStorageChangeEvent,
    RxStorageInstance,
    prepareQuery,
    getChangedDocumentsSince,
    stripMetaDataFromDocument,
    getWrittenDocumentsFromBulkWriteResponse
} from '../../plugins/core/index.mjs';
import {
    getCompressionStateByRxJsonSchema
} from '../../plugins/key-compression/index.mjs';
import { RxDBQueryBuilderPlugin } from '../../plugins/query-builder/index.mjs';
import { defaultHashSha256 } from '../../plugins/utils/index.mjs';
import {
    clone,
    randomString,
    wait,
    assertThrows,
    waitUntil
} from 'async-test-util';
import { filter, map } from 'rxjs';

import {
    schemaObjects,
    schemas,
    isFastMode,
    EXAMPLE_REVISION_1,
    EXAMPLE_REVISION_2,
    EXAMPLE_REVISION_3,
    EXAMPLE_REVISION_4,
    HumanDocumentType,
    isDeno
} from '../../plugins/test-utils/index.mjs';
import { compressObject } from 'jsonschema-key-compression';

addRxPlugin(RxDBQueryBuilderPlugin);

declare type TestDocType = { key: string; value: string; };
declare type OptionalValueTestDoc = { key: string; value?: string; };
declare type MultiInstanceInstances = {
    a: RxStorageInstance<TestDocType, any, any>;
    b: RxStorageInstance<TestDocType, any, any>;
};

function getWriteData(
    ownParams: Partial<RxDocumentData<TestDocType>> = {}
): RxDocumentData<TestDocType> {
    return Object.assign(
        {
            key: randomString(10),
            value: 'barfoo',
            _deleted: false,
            _attachments: {},
            _meta: {
                lwt: now()
            },
            _rev: EXAMPLE_REVISION_1
        },
        ownParams
    );
}

function getTestDataSchema(): RxJsonSchema<RxDocumentData<TestDocType>> {
    return fillWithDefaultSettings({
        version: 0,
        type: 'object',
        primaryKey: 'key',
        properties: {
            key: {
                type: 'string',
                maxLength: 100
            },
            value: {
                type: 'string',
                maxLength: 100
            }
        },
        required: [
            'key',
            'value'
        ],
        indexes: [
            'value'
        ]
    });
}

function getNestedDocSchema() {
    const schema: RxJsonSchema<RxDocumentData<NestedDoc>> = fillWithDefaultSettings({
        version: 0,
        primaryKey: 'id',
        type: 'object',
        properties: {
            id: {
                type: 'string',
                maxLength: 100
            },
            nes: {
                type: 'object',
                properties: {
                    ted: {
                        type: 'string',
                        maxLength: 100
                    }
                },
                required: [
                    'ted'
                ]
            }
        },
        indexes: [
            ['nes.ted', 'id']
        ],
        required: [
            'id',
            'nes'
        ]
    });
    return schema;
}

declare type RandomDoc = {
    id: string;
    equal: string;
    random: string;
    increment: number;
};

declare type NestedDoc = {
    id: string;
    nes: {
        ted: string;
    };
};

const testContext = 'rx-storage-implementations.test.ts';

describeParallel('rx-storage-implementations.test.ts (implementation: ' + config.storage.name + ')', () => {
    describe('RxStorageInstance', () => {
        describe('creation', () => {
            it('open and close', async () => {
                const collectionName = randomToken(12);
                const databaseName = randomToken(12);
                const storageInstance = await config.storage.getStorage().createStorageInstance<TestDocType>({
                    databaseInstanceToken: randomToken(10),
                    databaseName,
                    collectionName,
                    schema: getPseudoSchemaForVersion<TestDocType>(0, 'key'),
                    options: {},
                    multiInstance: false,
                    devMode: true
                });

                // it must have not mutated the collectionName
                assert.strictEqual(storageInstance.collectionName, collectionName);
                assert.strictEqual(storageInstance.databaseName, databaseName);

                await storageInstance.remove();
            });
            it('open many instances on the same database name', async () => {
                const databaseName = randomToken(12);
                // denokv is too slow here and will run in timeouts, so we use a lower amount
                const amount = isDeno ? 5 : 20;
                const storage = config.storage.getStorage();
                const instances = await Promise.all(
                    new Array(amount).fill(0).map(() => storage.createStorageInstance<TestDocType>({
                        databaseInstanceToken: randomToken(10),
                        databaseName,
                        collectionName: randomToken(12),
                        schema: getPseudoSchemaForVersion<TestDocType>(0, 'key'),
                        options: {},
                        multiInstance: false,
                        devMode: true
                    }))
                );
                await Promise.all(instances.map(instance => instance.remove()));
            });
            /**
             * This test ensures that people do not accidentally set
             * keyCompression: true in the schema but then forget to use
             * the key-compression RxStorage wrapper.
             */
            it('must throw if keyCompression is set but no key-compression plugin is used', async () => {
                const schema = getPseudoSchemaForVersion<TestDocType>(0, 'key');
                schema.keyCompression = true;
                let hasThrown = false;
                try {
                    await config.storage.getStorage().createStorageInstance<TestDocType>({
                        databaseInstanceToken: randomToken(10),
                        databaseName: randomToken(12),
                        collectionName: randomToken(12),
                        schema,
                        options: {},
                        multiInstance: false,
                        devMode: true
                    });
                } catch (error: any) {
                    const errorString = error.toString();
                    assert.ok(errorString.includes('UT5'));
                    hasThrown = true;
                }
                assert.ok(hasThrown);
            });
            /**
             * This test ensures that people do not accidentally set
             * encrypted stuff in the schema but then forget to use
             * the encryption RxStorage wrapper.
             */
            it('must throw if encryption is defined in schema is set but no encryption plugin is used', async () => {
                if (config.storage.hasEncryption) {
                    return;
                }
                const schema = getPseudoSchemaForVersion<TestDocType>(0, 'key');
                schema.encrypted = ['value'];
                let hasThrown = false;
                try {
                    await config.storage.getStorage().createStorageInstance<TestDocType>({
                        databaseInstanceToken: randomToken(10),
                        databaseName: randomToken(12),
                        collectionName: randomToken(12),
                        schema,
                        options: {},
                        multiInstance: false,
                        devMode: true
                    });
                } catch (error: any) {
                    const errorString = error.toString();
                    assert.ok(errorString.includes('UT6'));
                    hasThrown = true;
                }
                assert.ok(hasThrown);
            });
        });
        describe('.bulkWrite()', () => {
            it('should write the document', async () => {
                const storageInstance = await config.storage.getStorage().createStorageInstance<TestDocType>({
                    databaseInstanceToken: randomToken(10),
                    databaseName: randomToken(12),
                    collectionName: randomToken(12),
                    schema: getPseudoSchemaForVersion<TestDocType>(0, 'key'),
                    options: {},
                    multiInstance: false,
                    devMode: true
                });

                const docData: RxDocumentWriteData<TestDocType> = {
                    key: 'foobar',
                    value: 'barfoo1',
                    _deleted: false,
                    _meta: {
                        lwt: now()
                    },
                    _rev: EXAMPLE_REVISION_1,
                    _attachments: {}
                };
                const writeRows = [{
                    document: clone(docData)
                }];
                const writeResponse = await storageInstance.bulkWrite(
                    writeRows,
                    testContext
                );

                assert.deepStrictEqual(writeResponse.error, []);
                const success = getWrittenDocumentsFromBulkWriteResponse(
                    'key',
                    writeRows,
                    writeResponse
                );
                const first = success[0];
                assert.deepStrictEqual(stripMetaDataFromDocument(docData), stripMetaDataFromDocument(first));
                storageInstance.remove();
            });
            it('should error on conflict', async () => {
                const storageInstance = await config.storage.getStorage().createStorageInstance<TestDocType>({
                    databaseInstanceToken: randomToken(10),
                    databaseName: randomToken(12),
                    collectionName: randomToken(12),
                    schema: getPseudoSchemaForVersion<TestDocType>(0, 'key'),
                    options: {},
                    multiInstance: false,
                    devMode: true
                });

                const writeData: RxDocumentWriteData<TestDocType> = {
                    key: 'foobar',
                    value: 'barfoo',
                    _deleted: false,
                    _attachments: {},
                    _rev: EXAMPLE_REVISION_1,
                    _meta: {
                        lwt: now()
                    }
                };


                await storageInstance.bulkWrite(
                    [{
                        document: writeData
                    }],
                    testContext
                );
                const writeResponse = await storageInstance.bulkWrite(
                    [{
                        document: writeData
                    }],
                    testContext
                );

                const first = writeResponse.error[0];
                assert.strictEqual(first.status, 409);
                assert.strictEqual(first.documentId, 'foobar');

                /**
                 * The conflict error state must contain the
                 * document state in the database.
                 * This ensures that we can continue resolving the conflict
                 * without having to pull the document out of the db first.
                 */
                assert.ok((first as any).documentInDb.value, writeData.value);

                /**
                 * The documentInDb must not have any additional attributes.
                 * Some RxStorage implementations store meta fields
                 * together with normal document data.
                 * These fields must never be leaked to 409 conflict errors
                 */
                assert.deepStrictEqual(
                    Object.keys((first as any).documentInDb).sort(),
                    Object.keys(writeData).sort()
                );

                assert.ok(first.writeRow);

                storageInstance.remove();
            });
            it('when inserting the same document at the same time, the first call must succeed while the second has a conflict', async () => {
                const storageInstance = await config.storage.getStorage().createStorageInstance<TestDocType>({
                    databaseInstanceToken: randomToken(10),
                    databaseName: randomToken(12),
                    collectionName: randomToken(12),
                    schema: getPseudoSchemaForVersion<TestDocType>(0, 'key'),
                    options: {},
                    multiInstance: false,
                    devMode: true
                });
                const writeData: RxDocumentWriteData<TestDocType> = {
                    key: 'foobar',
                    value: 'barfoo',
                    _deleted: false,
                    _attachments: {},
                    _rev: EXAMPLE_REVISION_1,
                    _meta: {
                        lwt: now()
                    }
                };

                const [first, second] = await Promise.all([
                    storageInstance.bulkWrite(
                        [{
                            document: Object.assign({}, writeData, {
                                value: 'first'
                            })
                        }],
                        testContext
                    ),
                    storageInstance.bulkWrite(
                        [{
                            document: Object.assign({}, writeData, {
                                value: 'second'
                            })
                        }],
                        testContext
                    )
                ]);



                assert.deepStrictEqual(first.error, []);
                assert.strictEqual(second.error[0].status, 409);
                assert.strictEqual(second.error[0].writeRow.document.value, 'second');

                storageInstance.remove();
            });
            it('should not find the deleted document when findDocumentsById(false)', async () => {
                const storageInstance = await config.storage.getStorage().createStorageInstance<TestDocType>({
                    databaseInstanceToken: randomToken(10),
                    databaseName: randomToken(12),
                    collectionName: randomToken(12),
                    schema: getPseudoSchemaForVersion<TestDocType>(0, 'key'),
                    options: {},
                    multiInstance: false,
                    devMode: true
                });

                // make an insert
                const insertData = {
                    key: 'foobar',
                    value: 'barfoo1',
                    _deleted: false,
                    _rev: EXAMPLE_REVISION_1,
                    _attachments: {},
                    _meta: {
                        lwt: now()
                    }
                };
                const insertResponse = await storageInstance.bulkWrite(
                    [{
                        document: insertData
                    }],
                    testContext
                );
                assert.deepStrictEqual(insertResponse.error, []);

                // make an update
                const updateData = flatCloneDocWithMeta(insertData);
                updateData.value = 'barfoo2';
                updateData._rev = EXAMPLE_REVISION_2;
                updateData._meta.lwt = now();
                const updateResponse = await storageInstance.bulkWrite(
                    [{
                        previous: insertData,
                        document: updateData
                    }],
                    testContext
                );
                assert.deepStrictEqual(updateResponse.error, []);

                // make the delete
                const deleteData = flatCloneDocWithMeta(updateData);
                deleteData.value = 'barfoo_deleted';
                deleteData._deleted = true;
                deleteData._meta.lwt = now();
                const deleteResponse = await storageInstance.bulkWrite(
                    [{
                        previous: updateData,
                        document: deleteData
                    }],
                    testContext
                );
                assert.deepStrictEqual(deleteResponse.error, []);

                const foundDoc = await storageInstance.findDocumentsById(['foobar'], false);
                assert.deepStrictEqual(foundDoc, []);

                storageInstance.remove();
            });
            it('should NOT be able to overwrite a deleted the document', async () => {
                const storageInstance = await config.storage.getStorage().createStorageInstance<TestDocType>({
                    databaseInstanceToken: randomToken(10),
                    databaseName: randomToken(12),
                    collectionName: randomToken(12),
                    schema: getPseudoSchemaForVersion<TestDocType>(0, 'key'),
                    options: {},
                    multiInstance: false,
                    devMode: true
                });

                const docId = 'undeleteMe';
                const doc1 = {
                    key: docId,
                    value: 'barfoo1',
                    _deleted: false,
                    _attachments: {},
                    _rev: EXAMPLE_REVISION_1,
                    _meta: {
                        lwt: now()
                    }
                };
                const insertResponse = await storageInstance.bulkWrite(
                    [{
                        document: doc1
                    }],
                    testContext
                );

                assert.deepStrictEqual(insertResponse.error, []);

                const doc2 = Object.assign({}, doc1, {
                    value: 'barfoo2',
                    _rev: EXAMPLE_REVISION_2,
                    _meta: {
                        lwt: now()
                    }
                });
                const updateResponse = await storageInstance.bulkWrite(
                    [{
                        previous: doc1,
                        document: doc2
                    }],
                    testContext
                );
                assert.deepStrictEqual(updateResponse.error, []);

                const doc3 = Object.assign({}, doc2, {
                    _deleted: true,
                    _rev: EXAMPLE_REVISION_3,
                    _meta: {
                        lwt: now()
                    }
                });
                const deleteResponse = await storageInstance.bulkWrite(
                    [{
                        previous: doc2,
                        document: doc3
                    }],
                    testContext
                );
                assert.deepStrictEqual(deleteResponse.error, []);

                /**
                 * Doing an un-delete without sending the previous state,
                 * must cause a conflict error.
                 *
                 * This is the behavior at the RxStorage level.
                 * In contrast, RxDB itself will allow to re-insert an already deleted RxDocument.
                 */
                const undeleteConflictResponse = await storageInstance.bulkWrite(
                    [{
                        document: Object.assign({}, doc3, {
                            _deleted: false,
                            value: 'aaa',
                            _rev: EXAMPLE_REVISION_4,
                            _meta: {
                                lwt: now()
                            }
                        })
                    }],
                    testContext
                );
                assert.ok(undeleteConflictResponse.error[0]);

                /**
                 * Doing the un-delete with sending the previous,
                 * should work.
                 */
                const undeleteResponse = await storageInstance.bulkWrite(
                    [{
                        previous: doc3,
                        document: Object.assign({}, doc3, {
                            _deleted: false,
                            value: 'aaa',
                            _rev: EXAMPLE_REVISION_4,
                            _meta: {
                                lwt: now()
                            }
                        })
                    }],
                    testContext
                );
                assert.deepStrictEqual(undeleteResponse.error, []);

                const foundDoc = await storageInstance.findDocumentsById([docId], false);
                assert.ok(foundDoc[0]);
                assert.deepStrictEqual(foundDoc[0].value, 'aaa');

                storageInstance.remove();
            });
            /**
             * Updating a deleted document can happen
             * when a deleted document is replicated from the client to the server
             * and the server modifies a different field and sends the updated document back to the client.
             * @link https://github.com/pubkey/rxdb/pull/3734
             */
            it('should be able to update the state of a deleted document', async () => {
                const storageInstance = await config.storage.getStorage().createStorageInstance<TestDocType>({
                    databaseInstanceToken: randomToken(10),
                    databaseName: randomToken(12),
                    collectionName: randomToken(12),
                    schema: getPseudoSchemaForVersion<TestDocType>(0, 'key'),
                    options: {},
                    multiInstance: false,
                    devMode: true
                });
                const docId = 'foobar';

                // insert
                const docData1: RxDocumentData<TestDocType> = {
                    key: docId,
                    value: 'barfoo1',
                    _deleted: false,
                    _attachments: {},
                    _rev: EXAMPLE_REVISION_1,
                    _meta: {
                        lwt: now()
                    }
                };
                const insertResponse = await storageInstance.bulkWrite([{
                    document: docData1
                }], testContext);
                assert.deepStrictEqual(insertResponse.error, []);

                // delete
                const docData2 = Object.assign({}, docData1, {
                    _deleted: true,
                    _rev: EXAMPLE_REVISION_2,
                    _meta: { lwt: now() }
                });
                const deleteResponse = await storageInstance.bulkWrite([{
                    previous: docData1,
                    document: docData2
                }], testContext);
                assert.deepStrictEqual(deleteResponse.error, []);

                // modify deleted
                const docData3 = Object.assign({}, docData2, {
                    value: 'barfoo2',
                    _deleted: true,
                    _rev: EXAMPLE_REVISION_3,
                    _meta: { lwt: now() }
                });
                const modifyResponse = await storageInstance.bulkWrite([{
                    previous: docData2,
                    document: docData3
                }], testContext);
                assert.deepStrictEqual(modifyResponse.error, []);

                // check modified
                const docs = await storageInstance.findDocumentsById([docId], true);
                const doc = docs[0];
                assert.ok(doc);
                assert.strictEqual(doc.value, 'barfoo2');

                storageInstance.remove();
            });
            it('should be able to unset a property', async () => {
                const schema = getTestDataSchema();
                const storageInstance = await config.storage.getStorage().createStorageInstance<OptionalValueTestDoc>({
                    databaseInstanceToken: randomToken(10),
                    databaseName: randomToken(12),
                    collectionName: randomToken(12),
                    schema: schema as any,
                    options: {},
                    multiInstance: false,
                    devMode: true
                });
                const docId = 'foobar';
                const insertData: RxDocumentWriteData<OptionalValueTestDoc> = {
                    key: docId,
                    value: 'barfoo1',
                    _attachments: {},
                    _deleted: false,
                    _rev: EXAMPLE_REVISION_1,
                    _meta: {
                        lwt: now()
                    }
                };
                await storageInstance.bulkWrite(
                    [{
                        document: insertData
                    }],
                    testContext
                );
                const insertDataAfterWrite: RxDocumentData<OptionalValueTestDoc> = Object.assign(
                    {},
                    insertData,
                    {
                        _rev: insertData._rev
                    }
                );

                const updateDoc = {
                    key: docId,
                    _attachments: {},
                    _deleted: false,
                    _rev: EXAMPLE_REVISION_2,
                    _meta: {
                        lwt: now()
                    }
                };
                await storageInstance.bulkWrite(
                    [{
                        previous: insertDataAfterWrite,
                        document: updateDoc
                    }],
                    testContext
                );
                const updateResponseDoc = updateDoc;
                delete (updateResponseDoc as any)._deleted;
                delete (updateResponseDoc as any)._rev;
                delete (updateResponseDoc as any)._meta;

                assert.deepEqual(
                    updateResponseDoc,
                    {
                        key: docId,
                        _attachments: {}
                    }
                );

                storageInstance.remove();
            });
            it('should be able to store a complex document with key compression', async () => {
                const databaseName = randomToken(12);
                const schema = fillWithDefaultSettings(schemas.averageSchema());
                const compressionState = getCompressionStateByRxJsonSchema(schema);
                const storageInstance = await config.storage.getStorage().createStorageInstance<any>({
                    databaseInstanceToken: randomToken(10),
                    databaseName,
                    collectionName: randomToken(12),
                    schema: compressionState.compressedSchema,
                    options: {},
                    multiInstance: false,
                    devMode: true
                });

                const plainData = schemaObjects.averageSchemaData();
                const docData = Object.assign(
                    plainData,
                    {
                        _attachments: {},
                        _deleted: false,
                        _rev: EXAMPLE_REVISION_1,
                        _meta: {
                            lwt: now()
                        }
                    }
                );
                const compressedDocData = compressObject(
                    compressionState.table,
                    docData
                );
                const writeResponse = await storageInstance.bulkWrite([
                    {
                        document: compressedDocData
                    }
                ], testContext);
                assert.deepStrictEqual(writeResponse.error, []);

                const getDocFromDb = await storageInstance.findDocumentsById([docData.id], false);
                assert.deepStrictEqual(
                    stripMetaDataFromDocument(getDocFromDb[0]),
                    stripMetaDataFromDocument(compressedDocData as any)
                );

                storageInstance.remove();
            });
            it('should be able to do a write where only _meta fields are changed', async () => {
                const databaseInstanceToken = randomToken(10);
                const storageInstance = await config.storage.getStorage().createStorageInstance<TestDocType>({
                    databaseInstanceToken,
                    databaseName: randomToken(12),
                    collectionName: randomToken(12),
                    schema: getPseudoSchemaForVersion<TestDocType>(0, 'key'),
                    options: {},
                    multiInstance: false,
                    devMode: true
                });

                const key = 'foobar';
                let docData: RxDocumentData<TestDocType> = {
                    key,
                    value: 'barfoo1',
                    _attachments: {},
                    _deleted: false,
                    _rev: EXAMPLE_REVISION_1,
                    _meta: {
                        lwt: now(),
                        foobar: 0
                    }
                };
                docData._rev = createRevision(databaseInstanceToken);

                const res1 = await storageInstance.bulkWrite(
                    [{
                        document: clone(docData)
                    }],
                    testContext
                );
                assert.deepStrictEqual(res1.error, []);
                docData = clone(docData);

                // change once
                let newDocData: RxDocumentData<TestDocType> = flatCloneDocWithMeta(docData);
                newDocData._meta.foobar = 1;
                newDocData._meta.lwt = now();
                newDocData._rev = createRevision(databaseInstanceToken, docData);

                const res2 = await storageInstance.bulkWrite(
                    [{
                        previous: docData,
                        document: clone(newDocData)
                    }],
                    testContext
                );
                assert.deepStrictEqual(res2.error, []);
                docData = clone(newDocData);

                // change again
                newDocData = flatCloneDocWithMeta(docData);
                newDocData._meta.foobar = 2;
                newDocData._meta.lwt = now();
                newDocData._rev = createRevision(databaseInstanceToken, docData);
                assert.strictEqual(parseRevision(newDocData._rev).height, 3);

                const res3 = await storageInstance.bulkWrite(
                    [{
                        previous: docData,
                        document: clone(newDocData)
                    }],
                    testContext
                );
                assert.deepStrictEqual(res3.error, []);
                docData = newDocData;


                const viaStorage = await storageInstance.findDocumentsById([key], true);
                const viaStorageDoc = ensureNotFalsy(viaStorage[0]);
                assert.strictEqual(parseRevision(viaStorageDoc._rev).height, 3);

                storageInstance.remove();
            });
            it('should be able to create another instance after a write', async () => {
                const databaseName = randomToken(12);
                const storageInstance = await config.storage.getStorage().createStorageInstance<TestDocType>({
                    databaseInstanceToken: randomToken(10),
                    databaseName,
                    collectionName: randomToken(12),
                    schema: getPseudoSchemaForVersion<TestDocType>(0, 'key'),
                    options: {},
                    multiInstance: false,
                    devMode: true
                });
                const docData: RxDocumentWriteData<TestDocType> = {
                    key: 'foobar',
                    value: 'barfoo1',
                    _attachments: {},
                    _deleted: false,
                    _rev: EXAMPLE_REVISION_1,
                    _meta: {
                        lwt: now()
                    }
                };
                await storageInstance.bulkWrite(
                    [{
                        document: clone(docData)
                    }],
                    testContext
                );
                const storageInstance2 = await config.storage.getStorage().createStorageInstance<TestDocType>({
                    databaseInstanceToken: randomToken(10),
                    databaseName,
                    collectionName: randomToken(12),
                    schema: getPseudoSchemaForVersion<TestDocType>(0, 'key'),
                    options: {},
                    multiInstance: false,
                    devMode: true
                });
                await storageInstance2.bulkWrite(
                    [{
                        document: Object.assign(
                            clone(docData),
                            {
                                _rev: EXAMPLE_REVISION_2,
                            }
                        )
                    }],
                    testContext
                );
                await Promise.all([
                    storageInstance.close(),
                    storageInstance2.close()
                ]);
            });
            it('should be able to jump more then 1 revision height in a single write operation', async () => {
                const storageInstance = await config.storage.getStorage().createStorageInstance<TestDocType>({
                    databaseInstanceToken: randomToken(10),
                    databaseName: randomToken(12),
                    collectionName: randomToken(12),
                    schema: getPseudoSchemaForVersion<TestDocType>(0, 'key'),
                    options: {},
                    multiInstance: false,
                    devMode: true
                });

                // insert
                const docData: RxDocumentData<TestDocType> = {
                    key: 'foobar',
                    value: 'barfoo1',
                    _deleted: false,
                    _meta: {
                        lwt: now()
                    },
                    _rev: EXAMPLE_REVISION_1,
                    _attachments: {}
                };
                const insertResponse = await storageInstance.bulkWrite(
                    [{
                        document: clone(docData)
                    }],
                    testContext
                );
                assert.deepStrictEqual(insertResponse.error, []);

                // update
                const updated = clone(docData);
                updated.value = 'barfoo2';
                updated._meta.lwt = now();
                updated._rev = EXAMPLE_REVISION_4;
                const updateResponse = await storageInstance.bulkWrite(
                    [{
                        previous: clone(docData),
                        document: updated
                    }],
                    testContext
                );
                assert.deepStrictEqual(updateResponse.error, []);

                // find again
                const getDocFromDb = await storageInstance.findDocumentsById([docData.key], false);
                const docFromDb = getDocFromDb[0];
                assert.strictEqual(docFromDb._rev, EXAMPLE_REVISION_4);

                storageInstance.close();
            });
            it('must be able create multiple storage instances on the same database and write documents', async () => {
                const collectionsAmount = 3;
                const docsAmount = 3;
                const databaseName = randomToken(10);
                const databaseInstanceToken = randomToken(10);

                const storage = config.storage.getStorage();
                const storageInstances = await Promise.all(
                    new Array(collectionsAmount)
                        .fill(0)
                        .map(async () => {
                            const storageInstance = await storage.createStorageInstance<TestDocType>({
                                databaseInstanceToken,
                                databaseName,
                                collectionName: randomToken(12),
                                schema: getPseudoSchemaForVersion<TestDocType>(0, 'key'),
                                options: {},
                                multiInstance: false,
                                devMode: true
                            });
                            await Promise.all(
                                new Array(docsAmount)
                                    .fill(0)
                                    .map(async (_v, docId) => {
                                        const writeData: RxDocumentWriteData<TestDocType> = {
                                            key: docId + '',
                                            value: randomToken(5),
                                            _rev: EXAMPLE_REVISION_1,
                                            _deleted: false,
                                            _meta: {
                                                lwt: now()
                                            },
                                            _attachments: {}
                                        };
                                        await storageInstance.bulkWrite([{ document: writeData }], testContext);
                                    })
                            );
                            return storageInstance;
                        })
                );
                await Promise.all(
                    storageInstances.map(i => i.remove())
                );
            });
            // Some storages had problems storing non-utf-8 chars like "é"
            it('write and read with umlauts', async () => {
                const storageInstance = await config.storage.getStorage().createStorageInstance<TestDocType>({
                    databaseInstanceToken: randomToken(10),
                    databaseName: randomToken(12),
                    collectionName: randomToken(12),
                    schema: getPseudoSchemaForVersion<TestDocType>(0, 'key'),
                    options: {},
                    multiInstance: false,
                    devMode: true
                });
                const umlauts = 'äöüßé';

                // insert
                const docData: RxDocumentData<TestDocType> = {
                    key: 'foobar' + umlauts,
                    value: 'value' + umlauts,
                    _deleted: false,
                    _meta: {
                        lwt: now()
                    },
                    _rev: EXAMPLE_REVISION_1,
                    _attachments: {}
                };
                const insertResponse = await storageInstance.bulkWrite(
                    [{
                        document: clone(docData)
                    }],
                    testContext
                );
                assert.deepStrictEqual(insertResponse.error, []);

                // find again
                const getDocFromDb = await storageInstance.findDocumentsById([docData.key], false);
                const docFromDb = getDocFromDb[0];
                assert.strictEqual(
                    docFromDb.value,
                    'value' + umlauts
                );


                // store another doc
                const docData2: RxDocumentData<TestDocType> = {
                    key: 'foobar2' + umlauts,
                    value: 'value2' + umlauts,
                    _deleted: false,
                    _meta: {
                        lwt: now()
                    },
                    _rev: EXAMPLE_REVISION_1,
                    _attachments: {}
                };
                await storageInstance.bulkWrite(
                    [{
                        document: clone(docData2)
                    }],
                    testContext
                );
                const getDocFromDb2 = await storageInstance.findDocumentsById([docData2.key], false);
                assert.ok(getDocFromDb2[0]);

                storageInstance.close();
            });
            it('the plain storage should throw when overwriting a deleted doc with an insert without passing the previous', async () => {
                const storageInstance = await config.storage.getStorage().createStorageInstance<TestDocType>({
                    databaseInstanceToken: randomToken(10),
                    databaseName: randomToken(12),
                    collectionName: randomToken(12),
                    schema: getPseudoSchemaForVersion<TestDocType>(0, 'key'),
                    options: {},
                    multiInstance: false,
                    devMode: true
                });

                // insert
                const docData: RxDocumentData<TestDocType> = {
                    key: 'foobar',
                    value: 'value',
                    _deleted: false,
                    _meta: {
                        lwt: now()
                    },
                    _rev: EXAMPLE_REVISION_1,
                    _attachments: {}
                };
                const insertResponse = await storageInstance.bulkWrite(
                    [{
                        document: clone(docData)
                    }],
                    testContext
                );
                assert.deepStrictEqual(insertResponse.error, []);

                // delete
                const deletedDoc = Object.assign({}, clone(docData), {
                    _rev: EXAMPLE_REVISION_2,
                    _deleted: true,
                    _meta: {
                        lwt: now()
                    }
                });
                const deleteResponse = await storageInstance.bulkWrite(
                    [{
                        previous: docData,
                        document: deletedDoc
                    }],
                    testContext
                );
                assert.deepStrictEqual(deleteResponse.error, []);

                // insert deleted
                const insert2Doc = Object.assign({}, clone(docData), {
                    _rev: EXAMPLE_REVISION_1,
                    _deleted: false,
                    _meta: {
                        lwt: now()
                    }
                });
                const insert2WriteRows = [{
                    document: insert2Doc
                }];
                const insert2Response = await storageInstance.bulkWrite(
                    insert2WriteRows,
                    testContext
                );
                const error = insert2Response.error[0];
                assert.ok(error);
                assert.strictEqual(error.status, 409);
                storageInstance.close();
            });
        });
        describe('.prepareQuery()', () => {
            it('must not crash', () => {
                const query: FilledMangoQuery<any> = {
                    selector: {
                        value: {
                            $gt: ''
                        }
                    },
                    limit: 1000,
                    sort: [{ value: 'asc' }],
                    skip: 0
                };
                const preparedQuery = prepareQuery(
                    getTestDataSchema(),
                    query
                );
                assert.ok(preparedQuery);
            });
            it('must not mutate the input', () => {
                const query: FilledMangoQuery<any> = {
                    selector: {
                        value: {
                            $gt: ''
                        }
                    },
                    limit: 1000,
                    sort: [{ value: 'asc' }],
                    skip: 0
                };
                const preparedQuery = prepareQuery(
                    deepFreeze(getTestDataSchema()),
                    deepFreeze(query)
                );
                assert.ok(preparedQuery);
            });
        });
        describe('.getSortComparator()', () => {
            it('should sort in the correct order', async () => {
                const storageInstance = await config.storage.getStorage().createStorageInstance<{
                    _id: string;
                    age: number;
                }>({
                    databaseInstanceToken: randomToken(10),
                    databaseName: randomToken(12),
                    collectionName: randomToken(12),
                    schema: fillWithDefaultSettings({
                        version: 0,
                        type: 'object',
                        primaryKey: '_id',
                        properties: {
                            _id: {
                                type: 'string',
                                maxLength: 100
                            },
                            age: {
                                type: 'number'
                            }
                        },
                        required: [
                            '_id',
                            'age'
                        ]
                    }),
                    options: {},
                    multiInstance: false,
                    devMode: true
                });

                const query: FilledMangoQuery<any> = {
                    selector: {},
                    limit: 1000,
                    sort: [
                        { age: 'asc' }
                    ],
                    skip: 0
                };
                const comparator = getSortComparator(
                    storageInstance.schema,
                    query
                );

                const doc1: any = schemaObjects.humanData();
                doc1._id = 'aa';
                doc1.age = 1;
                const doc2: any = schemaObjects.humanData();
                doc2._id = 'bb';
                doc2.age = 100;

                // should sort in the correct order
                assert.deepStrictEqual(
                    [doc1, doc2],
                    [doc1, doc2].sort(comparator)
                );

                storageInstance.remove();
            });
            it('should still sort in correct order when docs do not match the selector', async () => {
                const storageInstance = await config.storage.getStorage().createStorageInstance<TestDocType>({
                    databaseInstanceToken: randomToken(10),
                    databaseName: randomToken(12),
                    collectionName: randomToken(12),
                    schema: getTestDataSchema(),
                    options: {},
                    multiInstance: false,
                    devMode: true
                });

                const matchingValue = 'foobar';
                const query: FilledMangoQuery<TestDocType> = {
                    selector: {
                        value: {
                            $eq: matchingValue
                        }
                    },
                    sort: [
                        { key: 'asc' }
                    ],
                    skip: 0
                };

                const comparator = getSortComparator(
                    storageInstance.schema,
                    query
                );

                const docs: TestDocType[] = [
                    {
                        value: matchingValue,
                        key: 'aaa'
                    },
                    {
                        value: 'barfoo',
                        key: 'bbb'
                    }
                ];

                const result = comparator(
                    docs[0],
                    docs[1]

                );
                assert.strictEqual(result, -1);

                storageInstance.remove();
            });
            it('should work with a more complex query', async () => {
                const storageInstance = await config.storage.getStorage().createStorageInstance<TestDocType>({
                    databaseInstanceToken: randomToken(10),
                    databaseName: randomToken(12),
                    collectionName: randomToken(12),
                    schema: getTestDataSchema(),
                    options: {},
                    multiInstance: false,
                    devMode: true
                });

                const matchingValue = 'aaa';
                const query: FilledMangoQuery<TestDocType> = {
                    selector: {
                        $or: [
                            {
                                value: matchingValue,
                                key: matchingValue
                            },
                            {
                                value: 'barfoo',
                                key: 'barfoo'
                            }
                        ],
                        key: matchingValue
                    },
                    sort: [
                        { key: 'asc' }
                    ],
                    skip: 0
                };

                const comparator = getSortComparator(
                    storageInstance.schema,
                    query
                );

                const docs: TestDocType[] = [
                    {
                        value: matchingValue,
                        key: matchingValue
                    },
                    {
                        value: 'bbb',
                        key: 'bbb'
                    }
                ];

                const result = comparator(
                    docs[0],
                    docs[1]

                );
                assert.strictEqual(result, -1);

                storageInstance.remove();
            });
        });
        describe('.getQueryMatcher()', () => {
            it('should match the right docs', async () => {
                const storageInstance = await config.storage.getStorage().createStorageInstance<HumanDocumentType>({
                    databaseInstanceToken: randomToken(10),
                    databaseName: randomToken(12),
                    collectionName: randomToken(12),
                    schema: getPseudoSchemaForVersion(0, '_id' as any),
                    options: {},
                    multiInstance: false,
                    devMode: true
                });

                const query: FilledMangoQuery<HumanDocumentType> = {
                    selector: {
                        age: {
                            $gt: 10,
                            $ne: 50
                        }
                    },
                    sort: [
                        { _id: 'asc' }
                    ],
                    skip: 0
                };

                const queryMatcher = getQueryMatcher(
                    storageInstance.schema,
                    query
                );

                const doc1: any = schemaObjects.humanData();
                doc1._id = 'aa';
                doc1.age = 1;
                const doc2: any = schemaObjects.humanData();
                doc2._id = 'bb';
                doc2.age = 100;

                assert.strictEqual(queryMatcher(doc1), false);
                assert.strictEqual(queryMatcher(doc2), true);

                storageInstance.remove();
            });
            it('should also match deleted documents', async () => {
                const storageInstance = await config.storage.getStorage().createStorageInstance<{ _id: string; }>({
                    databaseInstanceToken: randomToken(10),
                    databaseName: randomToken(12),
                    collectionName: randomToken(12),
                    schema: getPseudoSchemaForVersion<{ _id: string; }>(0, '_id' as any),
                    options: {},
                    multiInstance: false,
                    devMode: true
                });

                const query: FilledMangoQuery<{ _id: string; }> = {
                    selector: {},
                    sort: [
                        { _id: 'asc' }
                    ],
                    skip: 0
                };

                const queryMatcher = getQueryMatcher(
                    storageInstance.schema,
                    query
                );

                const doc1: any = schemaObjects.humanData();
                doc1._deleted = true;
                assert.strictEqual(
                    queryMatcher(doc1),
                    true
                );

                storageInstance.remove();
            });
            it('should match the nested document', () => {
                const schema = getNestedDocSchema();
                const query: FilledMangoQuery<NestedDoc> = {
                    selector: {
                        'nes.ted': {
                            $eq: 'barfoo'
                        }
                    },
                    sort: [
                        { id: 'asc' }
                    ],
                    skip: 0
                };

                const queryMatcher = getQueryMatcher(
                    schema,
                    query
                );

                const notMatchingDoc = {
                    id: 'foobar',
                    nes: {
                        ted: 'xxx'
                    },
                    _deleted: false,
                    _attachments: {},
                    _rev: EXAMPLE_REVISION_1,
                    _meta: {
                        lwt: now()
                    }
                };
                const matchingDoc = {
                    id: 'foobar',
                    nes: {
                        ted: 'barfoo'
                    },
                    _deleted: false,
                    _attachments: {},
                    _rev: EXAMPLE_REVISION_1,
                    _meta: {
                        lwt: now()
                    }
                };

                assert.strictEqual(
                    queryMatcher(notMatchingDoc),
                    false
                );
                assert.strictEqual(
                    queryMatcher(matchingDoc),
                    true
                );
            });
        });
        describe('.query()', () => {
            it('should find all documents', async () => {
                const storageInstance = await config.storage
                    .getStorage()
                    .createStorageInstance<{ key: string; value: string; }>({
                        databaseInstanceToken: randomToken(10),
                        databaseName: randomToken(12),
                        collectionName: randomToken(12),
                        schema: getPseudoSchemaForVersion<{ key: string; value: string; }>(0, 'key'),
                        options: {},
                        multiInstance: false,
                        devMode: true
                    });

                const writeData = {
                    key: 'foobar',
                    value: 'barfoo',
                    _deleted: false,
                    _attachments: {},
                    _rev: EXAMPLE_REVISION_1,
                    _meta: {
                        lwt: now()
                    }
                };

                await storageInstance.bulkWrite(
                    [{
                        document: writeData
                    }],
                    testContext
                );


                const writeData2 = {
                    key: 'foobar2',
                    value: 'barfoo2',
                    _deleted: false,
                    _attachments: {},
                    _rev: EXAMPLE_REVISION_1,
                    _meta: {
                        lwt: now()
                    }
                };
                await storageInstance.bulkWrite(
                    [{
                        document: writeData2
                    }],
                    testContext
                );

                const preparedQuery = prepareQuery(
                    storageInstance.schema,
                    {
                        selector: {
                            _deleted: false
                        },
                        sort: [{ key: 'asc' }],
                        skip: 0
                    }
                );
                const allDocs = await storageInstance.query(preparedQuery);
                const first = allDocs.documents[0];
                assert.ok(first);
                assert.strictEqual(first.value, 'barfoo');

                storageInstance.remove();
            });
            it('should sort in the correct order', async () => {
                const storageInstance = await config.storage
                    .getStorage()
                    .createStorageInstance<{ key: string; value: string; }>({
                        databaseInstanceToken: randomToken(10),
                        databaseName: randomToken(12),
                        collectionName: randomToken(12),
                        schema: getTestDataSchema(),
                        options: {},
                        multiInstance: false,
                        devMode: true
                    });

                await storageInstance.bulkWrite([
                    {
                        document: getWriteData({ value: 'a' })
                    },
                    {
                        document: getWriteData({ value: 'b' })
                    },
                    {
                        document: getWriteData({ value: 'c' })
                    },
                ], testContext);

                const preparedQuery = prepareQuery(
                    storageInstance.schema,
                    {
                        selector: {},
                        sort: [
                            { value: 'desc' }
                        ],
                        skip: 0
                    }
                );
                const allDocs = await storageInstance.query(preparedQuery);

                assert.strictEqual(allDocs.documents.length, 3);
                assert.strictEqual(allDocs.documents[0].value, 'c');
                assert.strictEqual(allDocs.documents[1].value, 'b');
                assert.strictEqual(allDocs.documents[2].value, 'a');

                storageInstance.remove();
            });
            /**
             * Notice that the RxStorage itself runs whatever query you give it,
             * filtering out deleted documents is done by RxDB, not by the storage.
             */
            it('must find deleted documents', async () => {
                const storageInstance = await config.storage
                    .getStorage()
                    .createStorageInstance<{ key: string; value: string; }>({
                        databaseInstanceToken: randomToken(10),
                        databaseName: randomToken(12),
                        collectionName: randomToken(12),
                        schema: getPseudoSchemaForVersion<{ key: string; value: string; }>(0, 'key'),
                        options: {},
                        multiInstance: false,
                        devMode: true
                    });

                const writeData = {
                    key: 'foobar',
                    value: 'barfoo',
                    _deleted: false,
                    _attachments: {},
                    _rev: EXAMPLE_REVISION_1,
                    _meta: {
                        lwt: now()
                    }
                };

                await storageInstance.bulkWrite(
                    [{
                        document: writeData
                    }],
                    testContext
                );

                // delete it
                const writeData2 = Object.assign({}, writeData, {
                    _deleted: true,
                    _rev: EXAMPLE_REVISION_2,
                    _meta: {
                        lwt: now()
                    }
                });
                await storageInstance.bulkWrite(
                    [{
                        previous: writeData,
                        document: writeData2
                    }],
                    testContext
                );

                const preparedQuery = prepareQuery(
                    storageInstance.schema,
                    {
                        selector: {},
                        sort: [{ key: 'asc' }],
                        skip: 0
                    }
                );
                const allDocs = await storageInstance.query(preparedQuery);
                const first = allDocs.documents[0];
                assert.ok(first);
                assert.strictEqual(first.value, 'barfoo');

                storageInstance.remove();

            });
            /**
             * For event-reduce to work,
             * we must ensure we there is always a deterministic sort order.
             */
            it('should have the same deterministic order of .query() and .getSortComparator()', async () => {
                const schema: RxJsonSchema<RxDocumentData<RandomDoc>> = fillWithDefaultSettings({
                    version: 0,
                    primaryKey: 'id',
                    type: 'object',
                    properties: {
                        id: {
                            type: 'string',
                            maxLength: 100
                        },
                        equal: {
                            type: 'string',
                            maxLength: 20,
                            enum: ['foobar']
                        },
                        increment: {
                            type: 'number',
                            minimum: 0,
                            maximum: 1000,
                            multipleOf: 1
                        },
                        random: {
                            type: 'string',
                            maxLength: 100
                        }
                    },
                    indexes: [
                        /**
                         * RxDB will always append the primaryKey to an index
                         * if the primaryKey was not used in the index before.
                         * This ensures we have a deterministic sorting when querying documents
                         * from that index.
                         */
                        ['equal', 'id'],
                        ['increment', 'id'],
                        ['random', 'id'],
                        [
                            'equal',
                            'increment',
                            'id'
                        ]
                    ],
                    required: [
                        'id',
                        'equal',
                        'increment',
                        'random'
                    ]
                });
                const storageInstance = await config.storage
                    .getStorage()
                    .createStorageInstance<RandomDoc>({
                        databaseInstanceToken: randomToken(10),
                        databaseName: randomToken(12),
                        collectionName: randomToken(12),
                        schema,
                        options: {},
                        multiInstance: false,
                        devMode: true
                    });

                const docsAmount = 6;
                const docData: RxDocumentWriteData<RandomDoc>[] = new Array(docsAmount)
                    .fill(0)
                    .map((_x, idx) => ({
                        id: randomString(10),
                        equal: 'foobar',
                        random: randomString(10),
                        increment: idx + 1,
                        _deleted: false,
                        _attachments: {},
                        _rev: EXAMPLE_REVISION_1,
                        _meta: {
                            lwt: now()
                        }
                    }));

                const writeRows = docData.map(d => ({ document: d }));
                const writeResponse: RxStorageBulkWriteResponse<RandomDoc> = await storageInstance.bulkWrite(
                    writeRows,
                    testContext
                );
                if (Object.keys(writeResponse.error).length > 0) {
                    throw new Error('could not save');
                }
                const docs = getWrittenDocumentsFromBulkWriteResponse(
                    'id',
                    writeRows,
                    writeResponse
                );

                async function testQuery(query: FilledMangoQuery<RandomDoc>): Promise<void> {
                    const preparedQuery = prepareQuery(
                        storageInstance.schema,
                        query
                    );
                    const docsViaQuery = (await storageInstance.query(preparedQuery)).documents;
                    if (docsViaQuery.length !== docsAmount) {
                        throw new Error('docs missing');
                    }
                    const sortComparator = getSortComparator(
                        storageInstance.schema,
                        query
                    );
                    const docsViaSort = shuffleArray(docs).sort(sortComparator);
                    assert.deepStrictEqual(
                        docsViaQuery.map(d => stripMetaDataFromDocument(d)),
                        docsViaSort.map(d => stripMetaDataFromDocument(d)),
                    );
                }
                const queries: FilledMangoQuery<RandomDoc>[] = [
                    {
                        selector: {},
                        sort: [
                            { id: 'asc' }
                        ],
                        skip: 0
                    },
                    {
                        selector: {},
                        sort: [
                            { equal: 'asc' },
                            /**
                             * RxDB will always append the primaryKey as last sort parameter
                             * if the primary key is not used in the sorting before.
                             */
                            { id: 'asc' }
                        ],
                        skip: 0
                    },
                    {
                        selector: {},
                        sort: [
                            { increment: 'desc' },
                            { id: 'asc' }
                        ],
                        skip: 0
                    },
                    {
                        selector: {},
                        sort: [
                            { equal: 'asc' },
                            { increment: 'desc' },
                            { id: 'asc' }
                        ],
                        skip: 0
                    }
                ];
                for (const query of queries) {
                    await testQuery(query);
                }

                storageInstance.remove();
            });
            it('should be able to search over a nested object', async () => {
                const schema = getNestedDocSchema();
                const storageInstance = await config.storage
                    .getStorage()
                    .createStorageInstance<NestedDoc>({
                        databaseInstanceToken: randomToken(10),
                        databaseName: randomToken(12),
                        collectionName: randomToken(12),
                        schema,
                        options: {},
                        multiInstance: false,
                        devMode: true
                    });
                const insertResult = await storageInstance.bulkWrite([
                    {
                        document: {
                            id: 'foobar',
                            nes: {
                                ted: 'barfoo'
                            },
                            _deleted: false,
                            _attachments: {},
                            _rev: EXAMPLE_REVISION_1,
                            _meta: {
                                lwt: now()
                            }
                        }
                    }
                ], testContext);
                assert.deepStrictEqual(insertResult.error, []);

                const preparedQuery = prepareQuery<NestedDoc>(
                    schema,
                    {
                        selector: {
                            'nes.ted': {
                                $eq: 'barfoo'
                            }
                        },
                        sort: [
                            { 'nes.ted': 'asc' },
                            { id: 'asc' }
                        ],
                        skip: 0
                    }
                );

                const results = await storageInstance.query(preparedQuery);
                assert.strictEqual(results.documents.length, 1);

                storageInstance.remove();
            });
            /**
             * This failed on some storages when there are more
             * documents then the batchSize of the RxStorage
             */
            it('querying many documents should work', async function () {
                this.timeout(30 * 1000);
                const schema = getTestDataSchema();
                const storageInstance = await config.storage
                    .getStorage()
                    .createStorageInstance<TestDocType>({
                        databaseInstanceToken: randomToken(10),
                        databaseName: randomToken(12),
                        collectionName: randomToken(12),
                        schema,
                        options: {},
                        multiInstance: false,
                        devMode: true
                    });

                const amount = 100;

                await storageInstance.bulkWrite(
                    new Array(amount)
                        .fill(0)
                        .map((_v, idx) => ({
                            document: getWriteData({
                                key: idx.toString().padStart(5, '0') + '-' + randomString(10),
                                value: idx + ''
                            })
                        })),
                    testContext
                );

                const preparedQuery = prepareQuery<TestDocType>(
                    schema,
                    {
                        selector: {},
                        skip: 0,
                        sort: [
                            { key: 'asc' }
                        ]
                    }
                );
                const results = await storageInstance.query(preparedQuery);
                assert.strictEqual(results.documents.length, amount);

                storageInstance.remove();
            });
        });
        describe('.count()', () => {
            it('should count the correct amount', async () => {
                const schema = getTestDataSchema();
                const storageInstance = await config.storage
                    .getStorage()
                    .createStorageInstance<TestDocType>({
                        databaseInstanceToken: randomToken(10),
                        databaseName: randomToken(12),
                        collectionName: randomToken(12),
                        schema,
                        options: {},
                        multiInstance: false,
                        devMode: true
                    });
                const preparedQueryAll = prepareQuery<TestDocType>(
                    schema,
                    {
                        selector: {},
                        sort: [
                            { key: 'asc' }
                        ],
                        skip: 0
                    }
                );
                async function ensureCountIs(nr: number) {
                    const result = await storageInstance.count(preparedQueryAll);
                    assert.strictEqual(result.count, nr);
                }
                await ensureCountIs(0);


                await storageInstance.bulkWrite([{ document: getWriteData() }], testContext);
                await ensureCountIs(1);

                const writeData = getWriteData();
                await storageInstance.bulkWrite([{ document: writeData }], testContext);
                await ensureCountIs(2);


                // DELETE
                await storageInstance.bulkWrite(
                    [{
                        previous: writeData,
                        document: Object.assign({}, writeData, {
                            _rev: EXAMPLE_REVISION_2,
                            _deleted: true,
                            _meta: {
                                lwt: now()
                            }
                        })
                    }],
                    testContext
                );

                // must still be 2 because the storage itself also counts deleted docs
                await ensureCountIs(2);

                storageInstance.remove();
            });
        });
        describe('.findDocumentsById()', () => {
            it('should find the documents', async () => {
                const storageInstance = await config.storage.getStorage().createStorageInstance<TestDocType>({
                    databaseInstanceToken: randomToken(10),
                    databaseName: randomToken(12),
                    collectionName: randomToken(12),
                    schema: getPseudoSchemaForVersion<TestDocType>(0, 'key'),
                    options: {},
                    multiInstance: false,
                    devMode: true
                });

                const docData = {
                    key: 'foobar',
                    value: 'barfoo',
                    _deleted: false,
                    _attachments: {},
                    _rev: EXAMPLE_REVISION_1,
                    _meta: {
                        lwt: now()
                    }
                };
                await storageInstance.bulkWrite(
                    [{
                        document: docData
                    }],
                    testContext
                );

                const found = await storageInstance.findDocumentsById(['foobar'], false);
                const foundDoc = found[0];
                assert.deepStrictEqual(
                    stripMetaDataFromDocument(foundDoc),
                    stripMetaDataFromDocument(docData)
                );

                storageInstance.remove();
            });
            it('should find deleted documents', async () => {
                const storageInstance = await config.storage.getStorage().createStorageInstance<TestDocType>({
                    databaseInstanceToken: randomToken(10),
                    databaseName: randomToken(12),
                    collectionName: randomToken(12),
                    schema: getPseudoSchemaForVersion<TestDocType>(0, 'key'),
                    options: {},
                    multiInstance: false,
                    devMode: true
                });

                const doc1 = {
                    key: 'foobar',
                    value: 'barfoo',
                    _deleted: false,
                    _attachments: {},
                    _rev: EXAMPLE_REVISION_1,
                    _meta: {
                        lwt: now()
                    }
                };
                await storageInstance.bulkWrite(
                    [{
                        document: doc1
                    }],
                    testContext
                );

                await storageInstance.bulkWrite(
                    [{
                        previous: doc1,
                        document: {
                            key: 'foobar',
                            value: 'barfoo2',
                            _deleted: true,
                            _attachments: {},
                            _rev: EXAMPLE_REVISION_2,
                            _meta: {
                                lwt: now()
                            }
                        }
                    }],
                    testContext
                );

                const found = await storageInstance.findDocumentsById(['foobar'], true);
                const foundDeleted = found[0];

                // even on deleted documents, we must get the other properties.
                assert.strictEqual(foundDeleted.value, 'barfoo2');
                assert.strictEqual(foundDeleted._deleted, true);

                storageInstance.remove();
            });
            it('if withDeleted=true then even the non-deleted document must be found', async () => {
                const storageInstance = await config.storage.getStorage().createStorageInstance<TestDocType>({
                    databaseInstanceToken: randomToken(10),
                    databaseName: randomToken(12),
                    collectionName: randomToken(12),
                    schema: getPseudoSchemaForVersion<TestDocType>(0, 'key'),
                    options: {},
                    multiInstance: false,
                    devMode: true
                });

                const writeRows = [
                    {
                        document: {
                            key: 'del',
                            value: 'barfoo',
                            _deleted: false,
                            _attachments: {},
                            _rev: EXAMPLE_REVISION_1,
                            _meta: {
                                lwt: now()
                            }
                        }
                    },
                    {
                        document: {
                            key: 'non-del',
                            value: 'barfoo',
                            _deleted: false,
                            _attachments: {},
                            _rev: EXAMPLE_REVISION_1,
                            _meta: {
                                lwt: now()
                            }
                        }
                    }
                ];
                const insertResult = await storageInstance.bulkWrite(
                    writeRows,
                    testContext
                );
                const success = getWrittenDocumentsFromBulkWriteResponse(
                    'key',
                    writeRows,
                    insertResult
                );

                const previous = success.find(d => d.key === 'del');
                const deleteWriteResult = await storageInstance.bulkWrite(
                    [{
                        previous,
                        document: {
                            key: 'del',
                            value: 'barfoo',
                            _deleted: true,
                            _attachments: {},
                            _rev: EXAMPLE_REVISION_2,
                            _meta: {
                                lwt: now()
                            }
                        }
                    }],
                    testContext
                );
                assert.deepStrictEqual(deleteWriteResult.error, []);

                const found = await storageInstance.findDocumentsById([
                    'del',
                    'non-del'
                ], true);

                assert.strictEqual(
                    Object.keys(found).length,
                    2
                );

                storageInstance.remove();
            });
            /**
             * Some storage implementations ran into some limits
             * like SQLite SQLITE_MAX_VARIABLE_NUMBER etc.
             * Writing many documents must just work and the storage itself
             * has to workaround any problems with that.
             */
            it('should be able to insert and fetch many documents', async () => {
                if (isDeno || config.storage.name === 'sqlite-trial') {
                    // DenoKV is too slow and would timeout on this test
                    return;
                }
                const storageInstance = await config.storage.getStorage().createStorageInstance<TestDocType>({
                    databaseInstanceToken: randomToken(10),
                    databaseName: randomToken(12),
                    collectionName: randomToken(12),
                    schema: getTestDataSchema(),
                    options: {},
                    multiInstance: false,
                    devMode: true
                });

                const amount = isFastMode() ? 100 : 10000;
                const writeRows = new Array(amount)
                    .fill(0)
                    .map(() => ({ document: getWriteData() }));

                // insert
                const writeResult = await storageInstance.bulkWrite(writeRows, 'insert-many-' + amount);
                assert.deepStrictEqual(writeResult.error, []);

                // fetch again
                const fetchResult = await storageInstance.findDocumentsById(writeRows.map(r => r.document.key), false);
                assert.deepEqual(Object.keys(fetchResult).length, amount);

                storageInstance.remove();
            });
        });
        describe('.getChangedDocumentsSince()', () => {
            it('should get the latest change', async () => {
                const storageInstance = await config.storage.getStorage().createStorageInstance<{ key: string; }>({
                    databaseInstanceToken: randomToken(10),
                    databaseName: randomToken(12),
                    collectionName: randomToken(12),
                    schema: getPseudoSchemaForVersion(0, 'key'),
                    options: {},
                    multiInstance: false,
                    devMode: true
                });
                let checkpoint: any;
                async function getChanges(): Promise<RxDocumentData<{ key: string; }>[]> {
                    const res = await getChangedDocumentsSince(storageInstance, 10, checkpoint);
                    if (res.documents.length > 0) {
                        checkpoint = res.checkpoint;
                    }
                    return res.documents;
                }

                // should not return anything if nothing has happened
                const docsEmpty = await getChanges();
                assert.strictEqual(docsEmpty.length, 0);

                // insert one
                const doc1 = {
                    key: 'foobar',
                    _deleted: false,
                    _attachments: {},
                    _rev: EXAMPLE_REVISION_1,
                    _meta: {
                        lwt: now()
                    }
                };
                await storageInstance.bulkWrite([
                    {
                        document: doc1
                    }
                ], testContext);
                const docsAfterInsert = await getChanges();
                assert.strictEqual(docsAfterInsert.length, 1);
                assert.strictEqual(docsAfterInsert[0].key, 'foobar');


                /**
                 * When there are no resulting documents on
                 * a call to getChangedDocumentsSince(),
                 * the exact same given checkpoint must be returned.
                 * By doing this, we can remove much complexity everywhere else
                 * when we work with checkpoints.
                 */
                const checkpointTest = checkpoint;
                const emptyResult = await getChangedDocumentsSince(storageInstance, 10, checkpointTest);
                assert.strictEqual(emptyResult.documents.length, 0);
                assert.deepStrictEqual(emptyResult.checkpoint, checkpointTest);

                // delete one
                await storageInstance.bulkWrite([
                    {
                        previous: doc1,
                        document: {
                            key: 'foobar',
                            _deleted: true,
                            _attachments: {},
                            _rev: EXAMPLE_REVISION_2,
                            _meta: {
                                lwt: now()
                            }
                        }
                    }
                ], testContext);
                const docsAfterDelete = await getChanges();
                assert.strictEqual(docsAfterDelete.length, 1);
                assert.strictEqual(docsAfterDelete[0].key, 'foobar');
                assert.strictEqual(docsAfterDelete[0]._deleted, true);


                // get only the last change when requesting with empty checkpoint
                const resTotal = await getChangedDocumentsSince(storageInstance, 100);
                assert.strictEqual(resTotal.documents.length, 1);
                assert.strictEqual(resTotal.documents[0].key, 'foobar');
                assert.strictEqual(resTotal.documents[0]._deleted, true);

                storageInstance.remove();
            });
            it('should return the correct amount of documents', async () => {
                const databaseInstanceToken = randomToken(10);
                const storageInstance = await config.storage.getStorage().createStorageInstance<TestDocType>({
                    databaseInstanceToken,
                    databaseName: randomToken(12),
                    collectionName: randomToken(12),
                    schema: getTestDataSchema(),
                    options: {},
                    multiInstance: false,
                    devMode: true
                });

                let previous: any;
                const foo1 = getWriteData({ key: 'foobar', value: '0' });
                const insertResult = await storageInstance.bulkWrite([
                    {
                        document: foo1
                    },
                    // also add another random document
                    {
                        document: getWriteData()
                    }
                ], testContext);
                assert.deepStrictEqual(insertResult.error, []);
                previous = foo1;

                // update the document many times
                let t = 0;
                while (t < 10) {
                    t++;
                    const newDocInner = clone(previous);
                    newDocInner.value = t + '';
                    const newRevInner = createRevision(databaseInstanceToken, previous);
                    newDocInner._rev = newRevInner;
                    newDocInner._meta.lwt = now();
                    const updateResult = await storageInstance.bulkWrite([
                        {
                            previous,
                            document: newDocInner
                        }
                    ], testContext);
                    assert.deepStrictEqual(updateResult.error, []);
                    previous = newDocInner;
                }

                // should return both documents when called without checkpoint
                const resultWithoutCheckpoint = await getChangedDocumentsSince(storageInstance, 10);
                assert.strictEqual(resultWithoutCheckpoint.documents.length, 2);
                // the foobar-doc must have the latest value
                const foobarRow = resultWithoutCheckpoint.documents.find(doc => doc.key === 'foobar');
                assert.strictEqual(ensureNotFalsy(foobarRow).value, '10');

                // insert many more documents
                const insertManyResult = await storageInstance.bulkWrite(
                    new Array(10)
                        .fill(0)
                        .map(() => ({ document: getWriteData() })),
                    testContext
                );
                assert.deepStrictEqual(insertManyResult.error, []);

                // should return both documents when called without checkpoint
                const resultManyWithoutCheckpoint = await getChangedDocumentsSince(storageInstance, 100);
                assert.strictEqual(resultManyWithoutCheckpoint.documents.length, 12);


                // first get 5 and then another 5 and then again.
                const resultFirstFive = await getChangedDocumentsSince(storageInstance, 5);
                const resultSecondFive = await getChangedDocumentsSince(storageInstance, 5, resultFirstFive.checkpoint);
                const resultThirdFive = await getChangedDocumentsSince(storageInstance, 5, resultSecondFive.checkpoint);
                assert.strictEqual(resultFirstFive.documents.length + resultSecondFive.documents.length + resultThirdFive.documents.length, 12);
                const resultFourthFive = await getChangedDocumentsSince(storageInstance, 5, resultThirdFive.checkpoint);
                assert.strictEqual(resultFourthFive.documents.length, 0);


                // delete the document
                const newDoc = clone(previous);
                newDoc.value = t + '';
                newDoc._deleted = true;
                newDoc._meta.lwt = now();
                const newRev = createRevision(databaseInstanceToken, previous);
                newDoc._rev = newRev;
                const deleteResult = await storageInstance.bulkWrite([
                    {
                        previous,
                        document: newDoc
                    }
                ], testContext);
                assert.deepStrictEqual(deleteResult.error, []);

                const resultAfterDelete = await getChangedDocumentsSince(storageInstance, 5, resultThirdFive.checkpoint);
                assert.strictEqual(resultAfterDelete.documents.length, 1);
                assert.strictEqual(resultAfterDelete.documents[0]._deleted, true);

                storageInstance.remove();
            });
            it('should be able to correctly iterate over the checkpoints', async () => {
                const storageInstance = await config.storage.getStorage().createStorageInstance<TestDocType>({
                    databaseInstanceToken: randomToken(10),
                    databaseName: randomToken(12),
                    collectionName: randomToken(12),
                    schema: getTestDataSchema(),
                    options: {},
                    multiInstance: false,
                    devMode: true
                });

                const writeAmount = isFastMode() ? 40 : 90;
                await storageInstance.bulkWrite(
                    new Array(writeAmount / 5)
                        .fill(0)
                        .map(() => ({ document: getWriteData() })),
                    testContext
                );
                let writesDone = writeAmount / 5;
                let lastCheckpoint: any;
                const docs: ById<RxDocumentData<TestDocType>> = {};

                let fetchRuns = 0;
                while (Object.keys(docs).length < writeAmount) {
                    fetchRuns++;
                    const result = await getChangedDocumentsSince(
                        storageInstance,
                        writeAmount / 10,
                        lastCheckpoint
                    );
                    result.documents.forEach(doc => {
                        const id = doc.key;
                        docs[id] = doc;
                    });
                    lastCheckpoint = result.checkpoint;
                    if (writesDone < writeAmount) {
                        await storageInstance.bulkWrite(
                            new Array(writeAmount / 5)
                                .fill(0)
                                .map(() => ({ document: getWriteData() })),
                            testContext
                        );
                        writesDone = writesDone + (writeAmount / 5);
                    }
                }

                assert.strictEqual(fetchRuns, 10);
                assert.strictEqual(Object.keys(docs).length, writeAmount);
                assert.strictEqual(writesDone, writeAmount);

                storageInstance.remove();
            });
        });
        describe('.changeStream()', () => {
            it('should emit exactly one event on write', async () => {
                const storageInstance = await config.storage.getStorage().createStorageInstance<TestDocType>({
                    databaseInstanceToken: randomToken(10),
                    databaseName: randomToken(12),
                    collectionName: randomToken(12),
                    schema: getPseudoSchemaForVersion<TestDocType>(0, 'key'),
                    options: {},
                    multiInstance: false,
                    devMode: true
                });

                const emitted: EventBulk<RxStorageChangeEvent<TestDocType>, any>[] = [];
                const sub = storageInstance.changeStream()
                    .pipe(
                        /**
                         * Ensure the observable of changeStream()
                         * is compatible with rxjs operators.
                         */
                        map(x => x),
                        filter(() => true)
                    )
                    .subscribe(x => {
                        // console.log(JSON.stringify({ x, testStartTime }, null, 4));
                        emitted.push(x);
                    });

                const writeData: RxDocumentWriteData<TestDocType> = {
                    key: 'foobar',
                    value: 'one',
                    _deleted: false,
                    _rev: EXAMPLE_REVISION_1,
                    _attachments: {},
                    _meta: {
                        lwt: now()
                    }
                };

                const context = randomToken();

                // insert
                await storageInstance.bulkWrite([{
                    document: writeData
                }], context);

                /**
                 * Do not await any time after the insert.
                 * By definition, a call to bulkWrite()
                 * must have emitted all of its resulting events
                 * BEFORE the call to bulkWrite() returns.
                 */
                assert.strictEqual(emitted.length, 1, 'must have emitted exactly once');
                assert.strictEqual(emitted[0].events.length, 1);

                // should contain the _meta data
                assert.ok((emitted)[0].events[0].documentData._meta.lwt);
                assert.ok((emitted)[0].checkpoint, 'must have checkpoint');

                /**
                 * Using the checkpoint from the event must not return any newer documents.
                 * This ensures that during replication, we can continue from the given checkpoint
                 * without missing out any document writes.
                 */
                await storageInstance.bulkWrite(
                    new Array(10).fill(0).map(() => ({ document: getWriteData() })),
                    context
                );
                const lastEvent = lastOfArray(emitted);

                assert.strictEqual(
                    lastEvent?.context,
                    context
                );

                /**
                 * We cannot just use the checkpoint of the last event,
                 * because by definition, the checkpoints must be stacked up
                 * so that they are compatible with the sharding RxStorage.
                 */
                const lastCheckpoint = stackCheckpoints(
                    emitted.map(ev => ev.checkpoint)
                );
                const emptyResult = await getChangedDocumentsSince(
                    storageInstance,
                    100,
                    lastCheckpoint
                );
                assert.strictEqual(
                    emptyResult.documents.length,
                    0
                );


                sub.unsubscribe();
                storageInstance.remove();
            });
            it('should emit all events', async () => {
                const storageInstance = await config.storage.getStorage().createStorageInstance<TestDocType>({
                    databaseInstanceToken: randomToken(10),
                    databaseName: randomToken(12),
                    collectionName: randomToken(12),
                    schema: getPseudoSchemaForVersion<TestDocType>(0, 'key'),
                    options: {},
                    multiInstance: false,
                    devMode: true
                });

                const emitted: EventBulk<RxStorageChangeEvent<TestDocType>, any>[] = [];
                const sub = storageInstance.changeStream().subscribe(x => {
                    emitted.push(x);
                });

                let previous: RxDocumentData<TestDocType> | undefined;
                const writeData = {
                    key: 'foobar',
                    value: 'one',
                    _rev: EXAMPLE_REVISION_1,
                    _deleted: false,
                    _attachments: {},
                    _meta: {
                        lwt: now()
                    }
                };

                // insert
                await storageInstance.bulkWrite([{
                    previous,
                    document: writeData
                }], testContext);
                previous = writeData;

                // update
                const originalBeforeUpdate = clone(writeData);
                const doc2 = Object.assign({}, writeData, {
                    _rev: EXAMPLE_REVISION_2,
                    _meta: {
                        lwt: now()
                    }
                });
                await storageInstance.bulkWrite([{
                    previous,
                    document: doc2
                }], testContext);
                previous = doc2;

                // should not mutate the input or add additional properties to output
                originalBeforeUpdate._rev = (previous as any)._rev;
                originalBeforeUpdate._meta = (previous as any)._meta;
                assert.deepStrictEqual(originalBeforeUpdate, previous);

                // delete
                const deleteBulkWriteResponse = await storageInstance.bulkWrite([{
                    previous,
                    document: Object.assign({}, writeData, {
                        _rev: EXAMPLE_REVISION_3,
                        _deleted: true,
                        _meta: {
                            lwt: now()
                        }
                    })
                }], testContext);
                assert.deepStrictEqual(deleteBulkWriteResponse.error, []);

                await waitUntil(() => {
                    return flattenEvents(emitted).length === 3;
                });
                const emittedEvents = flattenEvents(emitted);
                const lastEvent = lastOfArray(emittedEvents);
                if (!lastEvent) {
                    throw new Error('missing last event');
                }

                /**
                 * The previous doc data must still contain the given revision height.
                 * This changed because in the past we increased the rev height
                 * to be compliant with strange PouchDB behavior.
                 */
                const lastRevision = parseRevision(ensureNotFalsy(lastEvent.previousDocumentData)._rev);
                assert.strictEqual(lastRevision.height, 2);

                assert.strictEqual(lastEvent.operation, 'DELETE');
                assert.ok(lastEvent.previousDocumentData);

                sub.unsubscribe();
                storageInstance.remove();
            });
            it('it should not emit an empty eventBulk when the write had only errors', async () => {
                const storageInstance = await config.storage.getStorage().createStorageInstance<TestDocType>({
                    databaseInstanceToken: randomToken(10),
                    databaseName: randomToken(12),
                    collectionName: randomToken(12),
                    schema: getPseudoSchemaForVersion<TestDocType>(0, 'key'),
                    options: {},
                    multiInstance: false,
                    devMode: true
                });

                const emitted: EventBulk<RxStorageChangeEvent<TestDocType>, any>[] = [];
                const sub = storageInstance.changeStream().subscribe(x => {
                    emitted.push(x);
                });

                const writeData = {
                    key: 'foobar',
                    value: 'one',
                    _rev: EXAMPLE_REVISION_1,
                    _deleted: false,
                    _attachments: {},
                    _meta: {
                        lwt: now()
                    }
                };

                // insert
                const firstWriteResult = await storageInstance.bulkWrite([{
                    document: writeData
                }], testContext);
                assert.deepStrictEqual(firstWriteResult.error, []);

                // insert again to cause conflict error
                const secondWriteResult = await storageInstance.bulkWrite([{
                    document: writeData
                }], testContext);
                assert.ok(secondWriteResult.error[0]);

                assert.strictEqual(emitted.length, 1);
                assert.strictEqual(emitted[0].events.length, 1);

                sub.unsubscribe();
                storageInstance.remove();
            });
        });
        describe('attachments', () => {
            if (!config.storage.hasAttachments) {
                return;
            }
            it('should be able to store and retrieve an attachment', async () => {
                const storageInstance = await config.storage.getStorage().createStorageInstance<TestDocType>({
                    databaseInstanceToken: randomToken(10),
                    databaseName: randomToken(12),
                    collectionName: randomToken(12),
                    schema: Object.assign(
                        getPseudoSchemaForVersion<TestDocType>(0, 'key'),
                        {
                            attachments: {}
                        }
                    ),
                    options: {},
                    multiInstance: false,
                    devMode: true
                });
                const attachmentData = new Array(20).fill('a').join('');


                const dataBlob = createBlob(
                    attachmentData,
                    'text/plain'
                );
                const dataStringBase64 = await blobToBase64String(dataBlob);
                const dataLength = getAttachmentSize(dataStringBase64);

                const writeData: RxDocumentWriteData<TestDocType> = {
                    key: 'foobar',
                    value: 'one',
                    _rev: EXAMPLE_REVISION_1,
                    _deleted: false,
                    _meta: {
                        lwt: now()
                    },
                    _attachments: {
                        foo: {
                            length: dataLength,
                            data: dataStringBase64,
                            type: 'text/plain',
                            digest: await defaultHashSha256(dataStringBase64)
                        }
                    }
                };
                const writeResult = await writeSingle<TestDocType>(
                    storageInstance,
                    {
                        document: writeData
                    },
                    testContext
                );
                assert.strictEqual(typeof (writeResult._attachments.foo as any).data, 'undefined');
                assert.ok(writeResult._attachments.foo.digest.length > 3);

                const attachmentDataAfter = await storageInstance.getAttachmentData('foobar', 'foo', writeResult._attachments.foo.digest);
                assert.strictEqual(attachmentDataAfter, dataStringBase64);

                storageInstance.remove();
            });
            it('should return the correct attachment object on all document fetch methods', async () => {
                const storageInstance = await config.storage.getStorage().createStorageInstance<TestDocType>({
                    databaseInstanceToken: randomToken(10),
                    databaseName: randomToken(12),
                    collectionName: randomToken(12),
                    schema: Object.assign(
                        getPseudoSchemaForVersion<TestDocType>(0, 'key'),
                        {
                            attachments: {}
                        }
                    ),
                    options: {},
                    multiInstance: false,
                    devMode: true
                });
                const emitted: EventBulk<RxStorageChangeEvent<any>, any>[] = [];
                const sub = storageInstance.changeStream().subscribe(x => {
                    emitted.push(x);
                });

                const attachmentData = new Array(20).fill('a').join('');
                const dataBlob = createBlob(
                    attachmentData,
                    'text/plain'
                );

                const dataStringBase64 = await blobToBase64String(dataBlob);
                const dataLength = getAttachmentSize(dataStringBase64);

                const writeData: RxDocumentWriteData<TestDocType> = {
                    key: 'foobar',
                    value: 'one',
                    _rev: EXAMPLE_REVISION_1,
                    _deleted: false,
                    _meta: {
                        lwt: now()
                    },
                    _attachments: {
                        foo: {
                            length: dataLength,
                            data: dataStringBase64,
                            type: 'text/plain',
                            digest: await defaultHashSha256(dataStringBase64)
                        }
                    }
                };


                const writeResult = await writeSingle<TestDocType>(
                    storageInstance,
                    {
                        document: writeData
                    },
                    testContext
                );
                await waitUntil(() => flattenEvents(emitted).length === 1);

                assert.strictEqual(writeResult._attachments.foo.type, 'text/plain');

                /**
                 * When getting the document from the storage again,
                 * it should contain the same attachment digest and length
                 */
                const docFromStorage = await getSingleDocument(
                    storageInstance,
                    'foobar'
                );
                assert.strictEqual(
                    writeResult._attachments.foo.digest,
                    ensureNotFalsy(docFromStorage)._attachments.foo.digest
                );
                assert.strictEqual(
                    writeResult._attachments.foo.length,
                    ensureNotFalsy(docFromStorage)._attachments.foo.length
                );

                // check in query() result
                const queryResult = await storageInstance.query(
                    prepareQuery(
                        storageInstance.schema,
                        {
                            selector: {},
                            sort: [
                                { key: 'asc' }
                            ],
                            skip: 0
                        }
                    )
                );
                assert.strictEqual(queryResult.documents[0]._attachments.foo.type, 'text/plain');
                assert.strictEqual(queryResult.documents[0]._attachments.foo.length, dataLength);

                // check in findDocumentsById() result
                const byId = await storageInstance.findDocumentsById([writeData.key], false);
                const byIdDoc = byId[0];
                assert.strictEqual(byIdDoc._attachments.foo.type, 'text/plain');
                assert.strictEqual(byIdDoc._attachments.foo.length, dataLength);
                assert.ok(!(byIdDoc._attachments.foo as any).data);

                // test the emitted event
                const firstEventAttachment = flattenEvents(emitted)[0].documentData._attachments.foo;
                assert.strictEqual(firstEventAttachment.type, 'text/plain');
                assert.strictEqual(firstEventAttachment.length, dataLength);
                assert.ok(!(firstEventAttachment as any).data);

                const changesResult = await getChangedDocumentsSince(storageInstance, 1000);
                const firstChange = changesResult.documents[0];
                if (!firstChange) {
                    throw new Error('first change missing');
                }
                assert.strictEqual(firstChange.key, 'foobar');

                sub.unsubscribe();
                storageInstance.remove();
            });
            it('should be able to add multiple attachments, one each write', async () => {
                const storageInstance = await config.storage.getStorage().createStorageInstance<TestDocType>({
                    databaseInstanceToken: randomToken(10),
                    databaseName: randomToken(12),
                    collectionName: randomToken(12),
                    schema: Object.assign(
                        getPseudoSchemaForVersion<TestDocType>(0, 'key'),
                        {
                            attachments: {}
                        }
                    ),
                    options: {},
                    multiInstance: false,
                    devMode: true
                });

                let previous: RxDocumentData<TestDocType> | undefined;

                const dataBlob = createBlob(randomString(20), 'text/plain');
                const dataStringBase64 = await blobToBase64String(dataBlob);
                const writeData: RxDocumentWriteData<TestDocType> = {
                    key: 'foobar',
                    value: 'one',
                    _rev: EXAMPLE_REVISION_1,
                    _deleted: false,
                    _meta: {
                        lwt: now()
                    },
                    _attachments: {
                        foo: {
                            length: getBlobSize(dataBlob),
                            data: dataStringBase64,
                            type: 'text/plain',
                            digest: await defaultHashSha256(dataStringBase64)
                        }
                    }
                };

                previous = await writeSingle<TestDocType>(
                    storageInstance,
                    {
                        previous,
                        document: Object.assign({}, writeData, {
                            _meta: {
                                lwt: now()
                            }
                        })
                    },
                    testContext
                );

                if (!previous) {
                    throw new Error('previous missing');
                }

                writeData._attachments = flatClone(previous._attachments) as any;

                const data2 = createBlob(randomString(20), 'text/plain');
                const dataString2 = await blobToBase64String(data2);
                writeData._attachments.bar = {
                    data: dataString2,
                    length: getBlobSize(data2),
                    type: 'text/plain',
                    digest: await defaultHashSha256(dataString2)
                };
                writeData._rev = EXAMPLE_REVISION_2;

                previous = await writeSingle<TestDocType>(
                    storageInstance,
                    {
                        previous,
                        document: Object.assign({}, writeData, {
                            _meta: {
                                lwt: now()
                            }
                        })
                    },
                    testContext
                );
                if (!previous) {
                    throw new Error('previous missing');
                }

                assert.strictEqual(Object.keys(previous._attachments).length, 2);
                storageInstance.remove();
            });
            it('_deleted documents must loose all attachments', async () => {
                const storageInstance = await config.storage.getStorage().createStorageInstance<TestDocType>({
                    databaseInstanceToken: randomToken(10),
                    databaseName: randomToken(12),
                    collectionName: randomToken(12),
                    schema: Object.assign(
                        getPseudoSchemaForVersion<TestDocType>(0, 'key'),
                        {
                            attachments: {}
                        }
                    ),
                    options: {},
                    multiInstance: false,
                    devMode: true
                });

                const data = createBlob(randomString(20), 'text/plain');
                const dataString = await blobToBase64String(data);
                const writeData: RxDocumentWriteData<TestDocType> = {
                    key: 'foobar',
                    value: 'one',
                    _rev: EXAMPLE_REVISION_1,
                    _deleted: false,
                    _meta: {
                        lwt: now()
                    },
                    _attachments: {
                        foo: {
                            length: getBlobSize(data),
                            data: dataString,
                            type: 'text/plain',
                            digest: await defaultHashSha256(dataString)
                        }
                    }
                };
                const writeRows = [{ document: writeData }];
                const writeResult = await storageInstance.bulkWrite(writeRows, testContext);
                const success = getWrittenDocumentsFromBulkWriteResponse(
                    'key',
                    writeRows,
                    writeResult
                );
                await storageInstance.getAttachmentData(
                    'foobar',
                    'foo',
                    success[0]._attachments.foo.digest
                );

                const deleteData = clone(success[0]);
                deleteData._meta.lwt = now();
                deleteData._deleted = true;
                deleteData._attachments = {};
                deleteData._rev = EXAMPLE_REVISION_2;

                await storageInstance.bulkWrite(
                    [{
                        previous: await stripAttachmentsDataFromDocument(success[0]),
                        document: deleteData
                    }],
                    testContext
                );

                let hasThrown = false;
                try {
                    await storageInstance.getAttachmentData(
                        'foobar', 'foo',
                        success[0]._attachments.foo.digest
                    );
                } catch (err) {
                    hasThrown = true;
                }
                assert.ok(hasThrown);

                storageInstance.remove();
            });
            it('must be able to load multiple attachments data in parallel', async () => {
                const collectionsAmount = 3;
                const docsAmount = 3;
                const attachmentsPerDoc = 3;
                const databaseName = 'db' + randomToken(10);
                const databaseInstanceToken = randomToken(10);

                const storage = config.storage.getStorage();
                const storageInstances = await Promise.all(
                    new Array(collectionsAmount)
                        .fill(0)
                        .map(async (_v, idx) => {
                            const storageInstance = await storage.createStorageInstance<TestDocType>({
                                databaseInstanceToken,
                                databaseName,
                                collectionName: 'collection' + idx,
                                schema: Object.assign(
                                    getPseudoSchemaForVersion<TestDocType>(0, 'key'),
                                    {
                                        attachments: {}
                                    }
                                ),
                                options: {},
                                multiInstance: false,
                                devMode: true
                            });
                            return storageInstance;
                        })
                );

                // insert documents
                const loadMe: Map<RxStorageInstance<TestDocType, any, any>, { docId: string; attachmentId: string; digest: string; }[]> = new Map();
                for (const storageInstance of storageInstances) {
                    await Promise.all(
                        new Array(docsAmount)
                            .fill(0)
                            .map(async (_v, docId) => {
                                const writeData: RxDocumentWriteData<TestDocType> = {
                                    key: docId + '',
                                    value: 'foobar',
                                    _rev: EXAMPLE_REVISION_1,
                                    _deleted: false,
                                    _meta: {
                                        lwt: now()
                                    },
                                    _attachments: {}
                                };

                                await Promise.all(
                                    new Array(attachmentsPerDoc)
                                        .fill(0)
                                        .map(async (_vv, idx) => {
                                            const data = createBlob(randomString(200), 'text/plain');
                                            const dataString = await blobToBase64String(data);
                                            const attachmentsId = idx + '';
                                            writeData._attachments[attachmentsId] = {
                                                length: getBlobSize(data),
                                                data: dataString,
                                                type: 'text/plain',
                                                digest: await defaultHashSha256(dataString)
                                            };
                                        })
                                );
                                const writeRows = [{ document: writeData }];
                                const result = await storageInstance.bulkWrite(writeRows, testContext);
                                const loadAr = getFromMapOrCreate(
                                    loadMe,
                                    storageInstance,
                                    () => []
                                );
                                const success = getWrittenDocumentsFromBulkWriteResponse(
                                    'key',
                                    writeRows,
                                    result
                                );
                                const doc = ensureNotFalsy(success.find(d => d.key === docId + ''));
                                Object.entries(doc._attachments).forEach(([attachmentId, val]) => {
                                    loadAr.push({
                                        attachmentId,
                                        digest: val.digest,
                                        docId: docId + ''
                                    });
                                });
                                await storageInstance.findDocumentsById(['foobar'], true);
                            })
                    );
                }
                await Promise.all(
                    Array.from(loadMe.entries()).map(async ([storageInstance, load]) => {
                        await Promise.all(
                            load.map(async (v) => {
                                const attachmentData = await storageInstance.getAttachmentData(v.docId, v.attachmentId, v.digest);
                                assert.ok(attachmentData.length > 20);
                            })
                        );
                    })
                );
                await Promise.all(
                    storageInstances.map(i => i.remove())
                );
            });
        });
        describe('.cleanup', () => {
            it('should have cleaned up the deleted document', async () => {
                const storageInstance = await config.storage.getStorage().createStorageInstance<TestDocType>({
                    databaseInstanceToken: randomToken(10),
                    databaseName: randomToken(12),
                    collectionName: randomToken(12),
                    schema: getPseudoSchemaForVersion<TestDocType>(0, 'key'),
                    options: {},
                    multiInstance: false,
                    devMode: true
                });

                const id = 'foobar';
                const nonDeletedId = 'nonDeletedId';

                /**
                 * Insert one that does not get deleted
                 * and should still be there after the cleanup
                 */
                await storageInstance.bulkWrite([{
                    document: {
                        key: nonDeletedId,
                        value: 'barfoo',
                        _rev: EXAMPLE_REVISION_1,
                        _deleted: false,
                        _meta: {
                            lwt: now()
                        },
                        _attachments: {}
                    }
                }], testContext);


                /**
                 * Insert
                 */
                const doc1 = {
                    key: id,
                    value: 'barfoo',
                    _attachments: {},
                    _rev: EXAMPLE_REVISION_1,
                    _meta: {
                        lwt: now()
                    },
                    _deleted: false
                };
                await storageInstance.bulkWrite([{
                    document: doc1
                }], testContext);
                const previous = doc1;

                /**
                 * Delete
                 */
                const deleteResult = await storageInstance.bulkWrite([{
                    previous,
                    document: {
                        key: id,
                        value: 'barfoo',
                        _rev: EXAMPLE_REVISION_2,
                        _deleted: true,
                        _meta: {
                            lwt: now()
                        },
                        _attachments: {}
                    }
                }], testContext);
                assert.deepStrictEqual(deleteResult.error, [], 'must not have errors');

                /**
                 * Running .cleanup() with a height minimumDeletedTime
                 * should not remove the deleted document.
                 */
                while (!await storageInstance.cleanup(1000 * 60 * 6)) { }

                const mustBeThereButDeleted = await storageInstance.findDocumentsById(
                    [id],
                    true
                );
                const doc = mustBeThereButDeleted[0];
                assert.ok(doc._deleted);

                // clean up the deleted document
                while (!await storageInstance.cleanup(0)) { }

                const mustNotBeThere = await storageInstance.findDocumentsById(
                    [id],
                    true
                );
                assert.deepStrictEqual(mustNotBeThere, [], 'must have no documents found because they are cleaned up');

                /**
                 * Other docs must still be there
                 */
                const nonDeletedDoc = await storageInstance.findDocumentsById(
                    [nonDeletedId],
                    true
                );
                assert.ok(nonDeletedDoc[0]);

                await storageInstance.remove();
            });
            it('should at some time return true (when all docs are cleaned up)', async () => {
                const storageInstance = await config.storage.getStorage().createStorageInstance<TestDocType>({
                    databaseInstanceToken: randomToken(10),
                    databaseName: randomToken(12),
                    collectionName: randomToken(12),
                    schema: getPseudoSchemaForVersion<TestDocType>(0, 'key'),
                    options: {},
                    multiInstance: false,
                    devMode: true
                });

                while (!await storageInstance.cleanup(0)) { }

                const id = 'foobar';
                /**
                 * Insert
                 */
                const doc1 = {
                    key: id,
                    value: 'barfoo',
                    _attachments: {},
                    _rev: EXAMPLE_REVISION_1,
                    _meta: {
                        lwt: now()
                    },
                    _deleted: false
                };
                await storageInstance.bulkWrite([{
                    document: doc1
                }], testContext);
                const previous = doc1;

                /**
                 * Delete
                 */
                const deleteResult = await storageInstance.bulkWrite([{
                    previous,
                    document: {
                        key: id,
                        value: 'barfoo',
                        _rev: EXAMPLE_REVISION_2,
                        _deleted: true,
                        _meta: {
                            lwt: now()
                        },
                        _attachments: {}
                    }
                }], testContext);
                assert.deepStrictEqual(deleteResult.error, []);

                while (!await storageInstance.cleanup(0)) { }

                await storageInstance.remove();
            });
        });
        describe('.close()', () => {
            /**
             * There are cases where closing happens multiple times,
             * like when we call collection.close() and replicationState.cancel()
             * at the same time.
             * By making it possible to call close() multiple times,
             * many randomly failing tests are fixed.
             */
            it('closing multiple times should not error', async () => {
                const collectionName = randomToken(12);
                const databaseName = randomToken(12);
                const storageInstance = await config.storage.getStorage().createStorageInstance<TestDocType>({
                    databaseInstanceToken: randomToken(10),
                    databaseName,
                    collectionName,
                    schema: getPseudoSchemaForVersion<TestDocType>(0, 'key'),
                    options: {},
                    multiInstance: false,
                    devMode: true
                });

                await Promise.all([
                    storageInstance.close(),
                    storageInstance.close()
                ]);
            });
        });
        describe('.remove()', () => {
            it('should have deleted all data', async () => {
                const databaseName = randomToken(12);
                const collectionName = randomToken(12);

                const storageInstance = await config.storage.getStorage().createStorageInstance<TestDocType>({
                    databaseInstanceToken: randomToken(10),
                    databaseName,
                    collectionName,
                    schema: getPseudoSchemaForVersion<TestDocType>(0, 'key'),
                    options: {},
                    multiInstance: false,
                    devMode: true
                });
                await storageInstance.bulkWrite([
                    {
                        document: {
                            key: 'foobar',
                            value: 'barfoo',
                            _deleted: false,
                            _rev: EXAMPLE_REVISION_1,
                            _meta: {
                                lwt: now()
                            },
                            _attachments: {}
                        }
                    }
                ], testContext);
                await storageInstance.remove();
                const storageInstance2 = await config.storage.getStorage().createStorageInstance<TestDocType>({
                    databaseInstanceToken: randomToken(10),
                    databaseName,
                    collectionName,
                    schema: getPseudoSchemaForVersion<TestDocType>(0, 'key'),
                    options: {},
                    multiInstance: false,
                    devMode: true
                });

                const docs = await storageInstance2.findDocumentsById(['foobar'], false);
                assert.strictEqual(Object.keys(docs).length, 0);

                storageInstance2.remove();
            });
            it('should throw on call to .remove() after .close()', async () => {
                const storageInstance = await config.storage.getStorage().createStorageInstance<TestDocType>({
                    databaseInstanceToken: randomToken(10),
                    databaseName: randomToken(12),
                    collectionName: randomToken(12),
                    schema: getPseudoSchemaForVersion<TestDocType>(0, 'key'),
                    options: {},
                    multiInstance: false,
                    devMode: true
                });
                await storageInstance.close();

                await assertThrows(
                    () => storageInstance.remove(),
                    undefined
                );
            });
            it('should NOT throw on call to .close() after .remove()', async () => {
                const storageInstance = await config.storage.getStorage().createStorageInstance<TestDocType>({
                    databaseInstanceToken: randomToken(10),
                    databaseName: randomToken(12),
                    collectionName: randomToken(12),
                    schema: getPseudoSchemaForVersion<TestDocType>(0, 'key'),
                    options: {},
                    multiInstance: false,
                    devMode: true
                });
                await storageInstance.remove();
                await storageInstance.close();
            });
        });
    });
    describe('multiInstance', () => {
        if (!config.storage.hasMultiInstance) {
            return;
        }
        async function getMultiInstanceRxStorageInstance(): Promise<{
            a: RxStorageInstance<TestDocType, any, any>;
            b: RxStorageInstance<TestDocType, any, any>;
        }> {
            const databaseName = randomToken(12);
            const collectionName = randomToken(12);
            const a = await config.storage.getStorage().createStorageInstance<TestDocType>({
                databaseInstanceToken: randomToken(10),
                databaseName,
                collectionName,
                schema: getPseudoSchemaForVersion<TestDocType>(0, 'key'),
                options: {},
                multiInstance: true,
                devMode: true
            });
            // ensure A is always leader
            if (a.internals.leaderElector) {
                await a.internals.leaderElector.awaitLeadership();
            } else {
                await wait(200);
            }

            const b = await config.storage.getStorage().createStorageInstance<TestDocType>({
                databaseInstanceToken: randomToken(10),
                databaseName,
                collectionName,
                schema: getPseudoSchemaForVersion<TestDocType>(0, 'key'),
                options: {},
                multiInstance: true,
                devMode: true
            });

            // run a fetch on both instances to ensure the setup has finished
            await a.findDocumentsById(['foobar'], true);
            await b.findDocumentsById(['foobar'], true);

            return {
                a,
                b
            };
        }
        async function closeMultiInstanceRxStorageInstance(instances: MultiInstanceInstances) {
            await instances.a.close();
            await instances.b.close();
        }
        it('should update the state on the other instance', async () => {
            const instances = await getMultiInstanceRxStorageInstance();

            await instances.a.bulkWrite([{
                document: getWriteData({ key: 'a' })
            }], testContext);
            await instances.b.bulkWrite([{
                document: getWriteData({ key: 'b' })
            }], testContext);
            const allIds = ['a', 'b'];

            // there might be a delay until both instances know about the events.
            await waitUntil(async () => {
                const res = await instances.a.findDocumentsById(allIds, true);
                return Object.keys(res).length === 2;
            });
            await waitUntil(async () => {
                const res = await instances.b.findDocumentsById(allIds, true);
                return Object.keys(res).length === 2;
            });

            const resultA = await instances.a.findDocumentsById(allIds, true);
            assert.ok(resultA[0]);
            assert.ok(resultA[1]);

            const resultB = await instances.b.findDocumentsById(allIds, true);
            assert.ok(resultB[0]);
            assert.ok(resultB[1]);

            await instances.a.close();
            await instances.b.close();
        });
        it('should be able to write and read documents', async () => {
            const instances = await getMultiInstanceRxStorageInstance();

            const emittedB: EventBulk<RxStorageChangeEvent<TestDocType>, any>[] = [];
            instances.b.changeStream().subscribe(ev => emittedB.push(ev));
            const emittedA: EventBulk<RxStorageChangeEvent<TestDocType>, any>[] = [];
            instances.a.changeStream().subscribe(ev => emittedA.push(ev));

            // insert a document on A
            const writeData = getWriteData();
            await instances.a.bulkWrite([{ document: writeData }], testContext);

            // find the document on B
            await waitUntil(async () => {
                try {
                    const foundAgain = await instances.a.findDocumentsById([writeData.key], false);
                    const foundDoc = foundAgain[0];
                    assert.strictEqual(foundDoc.key, writeData.key);
                    return true;
                } catch (err) {
                    return false;
                }
            }, 10 * 1000, 100);

            // find via query
            const preparedQuery: PreparedQuery<TestDocType> = prepareQuery<TestDocType>(
                instances.b.schema,
                {
                    selector: {},
                    limit: 1,
                    sort: [{ key: 'asc' }],
                    skip: 0
                }
            );
            const foundViaQuery = await instances.b.query(preparedQuery);
            assert.strictEqual(foundViaQuery.documents.length, 1);
            const foundViaQueryDoc = ensureNotFalsy(foundViaQuery.documents.find(doc => doc.key === writeData.key));

            // update on B
            const newDoc: typeof foundViaQueryDoc = flatCloneDocWithMeta(foundViaQueryDoc);
            newDoc.value = 'updatedB';
            newDoc._rev = createRevision(randomToken(10), foundViaQueryDoc);
            const updateBResult = await instances.b.bulkWrite([{
                previous: foundViaQueryDoc,
                document: newDoc
            }], testContext);
            assert.deepStrictEqual(updateBResult.error, []);

            // check update on A
            await waitUntil(async () => {
                const foundAgainOnA = await instances.a.query(preparedQuery);
                const foundViaQueryDocA = ensureNotFalsy(foundAgainOnA.documents.find(doc => doc.key === writeData.key));
                return foundViaQueryDocA.value === 'updatedB';
            });

            // ensure we got the correct events on both sides
            await waitUntil(() => emittedA.length === 2);
            await waitUntil(() => emittedB.length === 2);
            [emittedA, emittedB].forEach(emitted => {
                assert.strictEqual(emitted.length, 2);
                assert.strictEqual(emitted[0].events[0].operation, 'INSERT');
                assert.strictEqual(emitted[1].events[0].operation, 'UPDATE');
            });

            // close both
            await closeMultiInstanceRxStorageInstance(instances);
        });
        /**
         * RxStorage implementations that need some kind of cross-JavaScript-process handling,
         * like via BroadcastChannel etc, have shown problem when one instance is closed while
         * the other is running a query on the remote instance.
         * This case must be properly handled by having or timeout or detecting that the current leader died etc.
         */
        it('should be able to finish a query even when the leading instance gets closed', async () => {
            const instances = await getMultiInstanceRxStorageInstance();

            // insert a document on A
            await instances.a.bulkWrite([{ document: getWriteData() }], testContext);

            const preparedQuery: PreparedQuery<TestDocType> = prepareQuery<TestDocType>(
                instances.b.schema,
                {
                    selector: {},
                    limit: 1,
                    sort: [{ key: 'asc' }],
                    skip: 0
                }
            );

            const queryResultBefore = await instances.b.query(preparedQuery);
            assert.ok(queryResultBefore);

            // close A while starting a query on B
            const queryResultPromise = instances.b.query(preparedQuery);
            instances.a.close();

            // the query should still resolve.
            await queryResultPromise;

            await instances.b.remove();
        });
        it('should not mix up documents stored with different schema versions', async () => {
            const databaseName = randomToken(10);
            const collectionName = randomToken(10);
            const storageInstanceV0 = await config.storage.getStorage().createStorageInstance<TestDocType>({
                databaseInstanceToken: randomToken(10),
                databaseName,
                collectionName,
                schema: getPseudoSchemaForVersion<TestDocType>(0, 'key'),
                options: {},
                multiInstance: false,
                devMode: true
            });
            const storageInstanceV1 = await config.storage.getStorage().createStorageInstance<TestDocType>({
                databaseInstanceToken: randomToken(10),
                databaseName,
                collectionName,
                schema: getPseudoSchemaForVersion<TestDocType>(1, 'key'),
                options: {},
                multiInstance: false,
                devMode: true
            });

            const writeResponseV0 = await storageInstanceV0.bulkWrite(
                [{
                    document: {
                        key: 'foobar0',
                        value: '0',
                        _deleted: false,
                        _meta: {
                            lwt: now()
                        },
                        _rev: EXAMPLE_REVISION_1,
                        _attachments: {}
                    }
                }],
                testContext
            );
            const writeResponseV1 = await storageInstanceV1.bulkWrite(
                [{
                    document: {
                        key: 'foobar1',
                        value: '1',
                        _deleted: false,
                        _meta: {
                            lwt: now()
                        },
                        _rev: EXAMPLE_REVISION_1,
                        _attachments: {}
                    }
                }],
                testContext
            );
            assert.deepStrictEqual(writeResponseV0.error, []);
            assert.deepStrictEqual(writeResponseV1.error, []);


            const plainQuery = {
                selector: {},
                sort: [{ key: 'asc' }]
            };
            const preparedQueryV0 = prepareQuery(
                getPseudoSchemaForVersion<TestDocType>(0, 'key'),
                clone(plainQuery)
            );
            const resultV0 = await storageInstanceV0.query(preparedQueryV0);
            assert.strictEqual(resultV0.documents.length, 1);
            assert.strictEqual(resultV0.documents[0].value, '0');


            const preparedQueryV1 = prepareQuery(
                getPseudoSchemaForVersion<TestDocType>(1, 'key'),
                clone(plainQuery)
            );
            const resultV1 = await storageInstanceV1.query(preparedQueryV1);
            assert.strictEqual(resultV1.documents.length, 1);
            assert.strictEqual(resultV1.documents[0].value, '1');


            storageInstanceV0.close();
            storageInstanceV1.close();
        });
        it('should not mix up documents stored in a different database name', async () => {
            const collectionName = 'aaaaa';
            const schema = getPseudoSchemaForVersion<TestDocType>(0, 'key');
            const storageInstance1 = await config.storage.getStorage().createStorageInstance<TestDocType>({
                databaseInstanceToken: randomToken(10),
                databaseName: randomToken(12),
                collectionName,
                schema,
                options: {},
                multiInstance: false,
                devMode: true
            });

            const writeResponse = await storageInstance1.bulkWrite(
                [{
                    document: {
                        key: 'foobar0',
                        value: '0',
                        _deleted: false,
                        _meta: {
                            lwt: now()
                        },
                        _rev: EXAMPLE_REVISION_1,
                        _attachments: {}
                    }
                }],
                testContext
            );
            assert.deepStrictEqual(writeResponse.error, []);
            await storageInstance1.close();


            const storageInstance2 = await config.storage.getStorage().createStorageInstance<TestDocType>({
                databaseInstanceToken: randomToken(10),
                databaseName: randomToken(12),
                collectionName,
                schema,
                options: {},
                multiInstance: false,
                devMode: true
            });

            const allDocsQuery = prepareQuery(
                schema,
                {
                    selector: {},
                    skip: 0,
                    sort: [{ key: 'asc' }]
                }
            );
            const allDocs = await storageInstance2.query(allDocsQuery);
            assert.deepStrictEqual(allDocs.documents, []);

            storageInstance2.close();
        });
        it('should emit events from one instance to the other', async () => {
            const instances = await getMultiInstanceRxStorageInstance();

            const emittedB: any[] = [];
            const sub = instances.b.changeStream().subscribe(ev => emittedB.push(ev));

            const writeData = getWriteData();
            await instances.a.bulkWrite([{
                document: writeData
            }], testContext);


            await waitUntil(() => emittedB.length > 0);
            assert.strictEqual(emittedB[0].events[0].documentId, writeData.key);

            sub.unsubscribe();
            await closeMultiInstanceRxStorageInstance(instances);
        });
    });
    describe('migration', () => {
        it('documents that are stored on different schema versions, should not interfere', async () => {
            const storage = config.storage.getStorage();
            const databaseName = randomToken(12);
            const collectionName = randomToken(12);
            const storageInstanceZero = await storage.createStorageInstance<TestDocType>({
                databaseInstanceToken: randomToken(10),
                databaseName,
                collectionName,
                schema: getPseudoSchemaForVersion<TestDocType>(0, 'key'),
                options: {},
                multiInstance: false,
                devMode: true
            });
            const storageInstanceOne = await storage.createStorageInstance<TestDocType>({
                databaseInstanceToken: randomToken(10),
                databaseName,
                collectionName,
                schema: getPseudoSchemaForVersion<TestDocType>(1, 'key'),
                options: {},
                multiInstance: false,
                devMode: true
            });

            const writeResultZero = await storageInstanceZero.bulkWrite(
                [{ document: getWriteData({ value: 'zero' }) }],
                testContext
            );
            assert.deepStrictEqual(writeResultZero.error, []);

            const writeResultOne = await storageInstanceOne.bulkWrite(
                [{ document: getWriteData({ value: 'one' }) }],
                testContext
            );
            assert.deepStrictEqual(writeResultOne.error, []);

            const docsZero = await storageInstanceZero.query(
                prepareQuery(
                    storageInstanceZero.schema,
                    {
                        selector: {},
                        sort: [
                            { key: 'asc' }
                        ],
                        skip: 0
                    }
                )
            );
            assert.strictEqual(docsZero.documents.length, 1);
            assert.strictEqual(docsZero.documents[0].value, 'zero');

            const docsOne = await storageInstanceOne.query(
                prepareQuery(
                    storageInstanceOne.schema,
                    {
                        selector: {},
                        sort: [
                            { key: 'asc' }
                        ],
                        skip: 0
                    }
                )
            );
            assert.strictEqual(docsOne.documents.length, 1);
            assert.strictEqual(docsOne.documents[0].value, 'one');

            storageInstanceZero.remove();
            storageInstanceOne.remove();
        });
    });
});
