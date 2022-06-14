import assert from 'assert';

import config from './config';
import * as schemaObjects from '../helper/schema-objects';
import {
    addRxPlugin,
    randomCouchString,
    getPseudoSchemaForVersion,
    lastOfArray,
    writeSingle,
    blobBufferUtil,
    flattenEvents,
    flatClone,
    RxJsonSchema,
    ensureNotFalsy,
    getFromObjectOrThrow,
    shuffleArray,
    now,
    getSingleDocument,
    hashAttachmentData,
    parseRevision,
    getAttachmentSize,
    fillWithDefaultSettings,
    createRevision
} from '../../';

import {
    getCompressionStateByRxJsonSchema,
    RxDBKeyCompressionPlugin
} from '../../plugins/key-compression';
addRxPlugin(RxDBKeyCompressionPlugin);
import { RxDBValidatePlugin } from '../../plugins/validate';
addRxPlugin(RxDBValidatePlugin);
import * as schemas from '../helper/schemas';

import { RxDBQueryBuilderPlugin } from '../../plugins/query-builder';
import {
    clone,
    randomString,
    wait,
    waitUntil
} from 'async-test-util';
import {
    EventBulk,
    FilledMangoQuery,
    PreparedQuery,
    RxDocumentData,
    RxDocumentWriteData,
    RxStorageBulkWriteResponse,
    RxStorageChangeEvent,
    RxStorageInstance
} from '../../src/types';
import { filter, map } from 'rxjs/operators';
import {
    EXAMPLE_REVISION_1,
    EXAMPLE_REVISION_2,
    EXAMPLE_REVISION_3,
    EXAMPLE_REVISION_4
} from '../helper/revisions';
import { compressObject } from 'jsonschema-key-compression';

addRxPlugin(RxDBQueryBuilderPlugin);

declare type TestDocType = { key: string; value: string; };
declare type OptionalValueTestDoc = { key: string; value?: string };
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
    }
};

config.parallel('rx-storage-implementations.test.js (implementation: ' + config.storage.name + ')', () => {
    describe('statics', () => {
        it('.hashKey', () => {
            const statics = config.storage.getStorage().statics;
            assert.strictEqual(typeof statics.hashKey, 'string');
            assert.ok(statics.hashKey.length > 0);
        });
    });
    describe('RxStorageInstance', () => {
        describe('creation', () => {
            it('open and close', async () => {
                const storageInstance = await config.storage.getStorage().createStorageInstance<TestDocType>({
                    databaseName: randomCouchString(12),
                    collectionName: randomCouchString(12),
                    schema: getPseudoSchemaForVersion<TestDocType>(0, 'key'),
                    options: {},
                    multiInstance: false
                });
                await storageInstance.close();
            });
            it('open many instances on the same database name', async () => {
                const databaseName = randomCouchString(12);
                const amount = 20;
                const storage = config.storage.getStorage();
                const instances = await Promise.all(
                    new Array(amount).fill(0).map(() => storage.createStorageInstance<TestDocType>({
                        databaseName,
                        collectionName: randomCouchString(12),
                        schema: getPseudoSchemaForVersion<TestDocType>(0, 'key'),
                        options: {},
                        multiInstance: false
                    }))
                );
                await Promise.all(instances.map(instance => instance.close()));
            });
        });
        describe('.bulkWrite()', () => {
            it('should write the document', async () => {
                const storageInstance = await config.storage.getStorage().createStorageInstance<TestDocType>({
                    databaseName: randomCouchString(12),
                    collectionName: randomCouchString(12),
                    schema: getPseudoSchemaForVersion<TestDocType>(0, 'key'),
                    options: {},
                    multiInstance: false
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
                const writeResponse = await storageInstance.bulkWrite(
                    [{
                        document: clone(docData)
                    }]
                );

                assert.deepStrictEqual(writeResponse.error, {});
                const first = getFromObjectOrThrow(writeResponse.success, 'foobar');
                assert.deepStrictEqual(docData, first);
                storageInstance.close();
            });
            it('should error on conflict', async () => {
                const storageInstance = await config.storage.getStorage().createStorageInstance<TestDocType>({
                    databaseName: randomCouchString(12),
                    collectionName: randomCouchString(12),
                    schema: getPseudoSchemaForVersion<TestDocType>(0, 'key'),
                    options: {},
                    multiInstance: false
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
                    }]
                );
                const writeResponse = await storageInstance.bulkWrite(
                    [{
                        document: writeData
                    }]
                );

                assert.deepStrictEqual(writeResponse.success, {});
                const first = getFromObjectOrThrow(writeResponse.error, 'foobar');
                assert.strictEqual(first.status, 409);
                assert.strictEqual(first.documentId, 'foobar');

                /**
                 * The conflict error state must contain the
                 * document state in the database.
                 * This ensures that we can continue resolving the conflict
                 * without having to pull the document out of the db first.
                 */
                assert.ok(ensureNotFalsy(first.documentInDb).value, writeData.value);

                assert.ok(first.writeRow);

                storageInstance.close();
            });
            it('when inserting the same document at the same time, the first call must succeed while the seconds has a conflict', async () => {
                const storageInstance = await config.storage.getStorage().createStorageInstance<TestDocType>({
                    databaseName: randomCouchString(12),
                    collectionName: randomCouchString(12),
                    schema: getPseudoSchemaForVersion<TestDocType>(0, 'key'),
                    options: {},
                    multiInstance: false
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
                        }]
                    ),
                    storageInstance.bulkWrite(
                        [{
                            document: Object.assign({}, writeData, {
                                value: 'second'
                            })
                        }]
                    )
                ]);

                assert.deepStrictEqual(first.error, {});
                assert.strictEqual(getFromObjectOrThrow(first.success, 'foobar').value, 'first');
                assert.strictEqual(getFromObjectOrThrow(second.error, 'foobar').status, 409);

                storageInstance.close();
            });
            it('should not find the deleted document', async () => {
                const storageInstance = await config.storage.getStorage().createStorageInstance<TestDocType>({
                    databaseName: randomCouchString(12),
                    collectionName: randomCouchString(12),
                    schema: getPseudoSchemaForVersion<TestDocType>(0, 'key'),
                    options: {},
                    multiInstance: false
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
                    }]
                );
                assert.deepStrictEqual(insertResponse.error, {});
                const first = getFromObjectOrThrow(insertResponse.success, 'foobar');


                // make an update
                const updateData = Object.assign({}, insertData, {
                    value: 'barfoo2',
                    _rev: EXAMPLE_REVISION_2,
                    _meta: {
                        lwt: now()
                    }
                });
                const updateResponse = await storageInstance.bulkWrite(
                    [{
                        previous: insertData,
                        document: updateData
                    }]
                );
                assert.deepStrictEqual(updateResponse.error, {});

                // make the delete
                const deleteResponse = await storageInstance.bulkWrite(
                    [{
                        previous: updateData,
                        document: Object.assign({}, first, {
                            _deleted: true,
                            _rev: EXAMPLE_REVISION_3,
                            _meta: {
                                lwt: now()
                            }
                        })
                    }]
                );
                assert.deepStrictEqual(deleteResponse.error, {});

                const foundDoc = await storageInstance.findDocumentsById(['foobar'], false);
                assert.deepStrictEqual(foundDoc, {});

                storageInstance.close();
            });
            it('should be able to overwrite a deleted the document', async () => {
                const storageInstance = await config.storage.getStorage().createStorageInstance<TestDocType>({
                    databaseName: randomCouchString(12),
                    collectionName: randomCouchString(12),
                    schema: getPseudoSchemaForVersion<TestDocType>(0, 'key'),
                    options: {},
                    multiInstance: false
                });

                const docId = 'undeleteMe';
                const insertResponse = await storageInstance.bulkWrite(
                    [{
                        document: {
                            key: docId,
                            value: 'barfoo1',
                            _deleted: false,
                            _attachments: {},
                            _rev: EXAMPLE_REVISION_1,
                            _meta: {
                                lwt: now()
                            }
                        }
                    }]
                );
                assert.strictEqual(Object.keys(insertResponse.error).length, 0);
                let previous = getFromObjectOrThrow(insertResponse.success, docId);

                const updateResponse = await storageInstance.bulkWrite(
                    [{
                        previous: previous,
                        document: Object.assign({}, previous, {
                            value: 'barfoo2',
                            _rev: EXAMPLE_REVISION_2,
                            _meta: {
                                lwt: now()
                            }
                        })
                    }]
                );
                assert.deepStrictEqual(updateResponse.error, {});
                previous = getFromObjectOrThrow(updateResponse.success, docId);


                const deleteResponse = await storageInstance.bulkWrite(
                    [{
                        previous: previous,
                        document: Object.assign({}, previous, {
                            _deleted: true,
                            _rev: EXAMPLE_REVISION_3,
                            _meta: {
                                lwt: now()
                            }
                        })
                    }]
                );
                assert.deepStrictEqual(deleteResponse.error, {});
                const second = getFromObjectOrThrow(deleteResponse.success, docId);


                const undeleteResponse = await storageInstance.bulkWrite(
                    [{
                        // No previous doc data is send here. Because we 'undelete' the document
                        // which can be done via .insert()
                        document: Object.assign({}, second, {
                            _deleted: false,
                            value: 'aaa',
                            _rev: EXAMPLE_REVISION_4,
                            _meta: {
                                lwt: now()
                            }
                        })
                    }]
                );

                assert.deepStrictEqual(undeleteResponse.error, {});
                const third = getFromObjectOrThrow(undeleteResponse.success, docId);
                assert.strictEqual(third.value, 'aaa');


                const foundDoc = await storageInstance.findDocumentsById([docId], false);
                assert.ok(foundDoc[docId]);
                assert.deepStrictEqual(foundDoc[docId].value, 'aaa');

                storageInstance.close();
            });
            /**
             * Updating a deleted document can happen
             * when a deleted document is replicated from the client to the server
             * and the server modifies a different field and sends the updated document back to the client.
             * @link https://github.com/pubkey/rxdb/pull/3734
             */
            it('should be able to update the state of a deleted document', async () => {
                const storageInstance = await config.storage.getStorage().createStorageInstance<TestDocType>({
                    databaseName: randomCouchString(12),
                    collectionName: randomCouchString(12),
                    schema: getPseudoSchemaForVersion<TestDocType>(0, 'key'),
                    options: {},
                    multiInstance: false
                });
                const docId = 'foobar';

                // insert
                const docData: RxDocumentData<TestDocType> = {
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
                    document: docData
                }]);
                assert.deepStrictEqual(insertResponse.error, {});
                let previous = insertResponse.success[docId];

                // delete
                const deleteResponse = await storageInstance.bulkWrite([{
                    previous,
                    document: Object.assign({}, docData, {
                        _deleted: true,
                        _rev: EXAMPLE_REVISION_2,
                        _meta: { lwt: now() }
                    })
                }]);
                assert.deepStrictEqual(deleteResponse.error, {});
                previous = deleteResponse.success[docId];

                // modify deleted
                const modifyResponse = await storageInstance.bulkWrite([{
                    previous,
                    document: Object.assign({}, docData, {
                        value: 'barfoo2',
                        _deleted: true,
                        _rev: EXAMPLE_REVISION_3,
                        _meta: { lwt: now() }
                    })
                }]);
                assert.deepStrictEqual(modifyResponse.error, {});
                previous = modifyResponse.success[docId];
                assert.strictEqual(previous.value, 'barfoo2');

                // check modified
                const docs = await storageInstance.findDocumentsById([docId], true);
                const doc = docs[docId];
                assert.ok(doc);
                assert.strictEqual(doc.value, 'barfoo2');

                storageInstance.close();
            });
            it('should be able to unset a property', async () => {
                const schema = getTestDataSchema();
                schema.required = ['key'];

                const storageInstance = await config.storage.getStorage().createStorageInstance<OptionalValueTestDoc>({
                    databaseName: randomCouchString(12),
                    collectionName: randomCouchString(12),
                    schema: schema as any,
                    options: {},
                    multiInstance: false
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
                const writeResponse = await storageInstance.bulkWrite(
                    [{
                        document: insertData
                    }]
                );
                const insertResponse = getFromObjectOrThrow(writeResponse.success, docId);
                const insertDataAfterWrite: RxDocumentData<OptionalValueTestDoc> = Object.assign(
                    {},
                    insertResponse,
                    {
                        _rev: insertResponse._rev
                    }
                );

                const updateResponse = await storageInstance.bulkWrite(
                    [{
                        previous: insertDataAfterWrite,
                        document: {
                            key: docId,
                            _attachments: {},
                            _deleted: false,
                            _rev: EXAMPLE_REVISION_2,
                            _meta: {
                                lwt: now()
                            }
                        }
                    }]
                );
                const updateResponseDoc = getFromObjectOrThrow(updateResponse.success, docId);
                delete (updateResponseDoc as any)._deleted;
                delete (updateResponseDoc as any)._rev;
                delete (updateResponseDoc as any)._meta;

                assert.deepStrictEqual(
                    updateResponseDoc,
                    {
                        key: docId,
                        _attachments: {}
                    }
                )

                storageInstance.close();
            });
            it('should be able to store a complex document with key compression', async () => {
                const databaseName = randomCouchString(12);
                const schema = fillWithDefaultSettings(schemas.averageSchema());
                const compressionState = getCompressionStateByRxJsonSchema(schema);
                const storageInstance = await config.storage.getStorage().createStorageInstance<any>({
                    databaseName,
                    collectionName: randomCouchString(12),
                    schema: compressionState.schema,
                    options: {},
                    multiInstance: false
                });

                const docData = Object.assign(
                    schemaObjects.averageSchema(),
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
                ]);
                assert.deepStrictEqual(writeResponse.error, {});

                const getDocFromDb = await storageInstance.findDocumentsById([docData.id], false);
                assert.deepStrictEqual(
                    getDocFromDb[docData.id],
                    compressedDocData
                );

                storageInstance.close();
            });
            it('should be able to do a write where only _meta fields are changed', async () => {
                const storageInstance = await config.storage.getStorage().createStorageInstance<TestDocType>({
                    databaseName: randomCouchString(12),
                    collectionName: randomCouchString(12),
                    schema: getPseudoSchemaForVersion<TestDocType>(0, 'key'),
                    options: {},
                    multiInstance: false
                });

                const key = 'foobar';
                let docData: RxDocumentWriteData<TestDocType> = {
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
                docData._rev = createRevision(docData);

                const res1 = await storageInstance.bulkWrite(
                    [{
                        document: clone(docData)
                    }]
                );
                assert.deepStrictEqual(res1.error, {});

                // change once
                let newDocData: RxDocumentWriteData<TestDocType> = clone(docData);
                newDocData._meta.foobar = 1;
                newDocData._meta.lwt = now();
                newDocData._rev = createRevision(newDocData, docData);

                const res2 = await storageInstance.bulkWrite(
                    [{
                        previous: docData,
                        document: clone(newDocData)
                    }]
                );
                assert.deepStrictEqual(res2.error, {});
                docData = newDocData;

                // change again
                newDocData = clone(docData);
                newDocData._meta.foobar = 2;
                newDocData._meta.lwt = now();
                newDocData._rev = createRevision(newDocData, docData);
                assert.strictEqual(parseRevision(newDocData._rev).height, 3);

                const res3 = await storageInstance.bulkWrite(
                    [{
                        previous: docData,
                        document: clone(newDocData)
                    }]
                );
                assert.deepStrictEqual(res3.error, {});
                docData = newDocData;


                const viaStorage = await storageInstance.findDocumentsById([key], true);
                const viaStorageDoc = ensureNotFalsy(viaStorage[key]);
                assert.strictEqual(parseRevision(viaStorageDoc._rev).height, 3);

                storageInstance.close();
            });
            it('should be able to create another instance after a write', async () => {
                const databaseName = randomCouchString(12);
                const storageInstance = await config.storage.getStorage().createStorageInstance<TestDocType>({
                    databaseName,
                    collectionName: randomCouchString(12),
                    schema: getPseudoSchemaForVersion<TestDocType>(0, 'key'),
                    options: {},
                    multiInstance: false
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
                    }]
                );
                const storageInstance2 = await config.storage.getStorage().createStorageInstance<TestDocType>({
                    databaseName,
                    collectionName: randomCouchString(12),
                    schema: getPseudoSchemaForVersion<TestDocType>(0, 'key'),
                    options: {},
                    multiInstance: false
                });
                await storageInstance2.bulkWrite(
                    [{
                        document: Object.assign(
                            clone(docData),
                            {
                                _rev: EXAMPLE_REVISION_2,
                            }
                        )
                    }]
                );
                await Promise.all([
                    storageInstance.close(),
                    storageInstance2.close()
                ]);
            });
        });
        describe('.getSortComparator()', () => {
            it('should sort in the correct order', async () => {
                const storageInstance = await config.storage.getStorage().createStorageInstance<{
                    _id: string;
                    age: number;
                }>({
                    databaseName: randomCouchString(12),
                    collectionName: randomCouchString(12),
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
                    multiInstance: false
                });

                const query: FilledMangoQuery<any> = {
                    selector: {},
                    limit: 1000,
                    sort: [
                        { age: 'asc' }
                    ],
                    skip: 0
                };
                const preparedQuery = config.storage.getStorage().statics.prepareQuery(
                    storageInstance.schema,
                    query
                );

                const comparator = config.storage.getStorage().statics.getSortComparator(
                    storageInstance.schema,
                    preparedQuery
                );

                const doc1: any = schemaObjects.human();
                doc1._id = 'aa';
                doc1.age = 1;
                const doc2: any = schemaObjects.human();
                doc2._id = 'bb';
                doc2.age = 100;

                // should sort in the correct order
                assert.deepStrictEqual(
                    [doc1, doc2],
                    [doc1, doc2].sort(comparator)
                );

                storageInstance.close();
            });
            it('should still sort in correct order when docs do not match the selector', async () => {
                const storageInstance = await config.storage.getStorage().createStorageInstance<TestDocType>({
                    databaseName: randomCouchString(12),
                    collectionName: randomCouchString(12),
                    schema: getTestDataSchema(),
                    options: {},
                    multiInstance: false
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
                const preparedQuery = config.storage.getStorage().statics.prepareQuery(
                    storageInstance.schema,
                    query
                );

                const comparator = config.storage.getStorage().statics.getSortComparator(
                    storageInstance.schema,
                    preparedQuery
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

                storageInstance.close();
            });
            it('should work with a more complex query', async () => {
                const storageInstance = await config.storage.getStorage().createStorageInstance<TestDocType>({
                    databaseName: randomCouchString(12),
                    collectionName: randomCouchString(12),
                    schema: getTestDataSchema(),
                    options: {},
                    multiInstance: false
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

                const preparedQuery = config.storage.getStorage().statics.prepareQuery(
                    storageInstance.schema,
                    query
                );

                const comparator = config.storage.getStorage().statics.getSortComparator(
                    storageInstance.schema,
                    preparedQuery
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

                storageInstance.close();
            });
        });
        describe('.getQueryMatcher()', () => {
            it('should match the right docs', async () => {
                const storageInstance = await config.storage.getStorage().createStorageInstance<TestDocType>({
                    databaseName: randomCouchString(12),
                    collectionName: randomCouchString(12),
                    schema: getPseudoSchemaForVersion(0, '_id' as any),
                    options: {},
                    multiInstance: false
                });

                const query: FilledMangoQuery<TestDocType> = {
                    selector: {
                        age: {
                            $gt: 10,
                            $ne: 50
                        }
                    },
                    sort: [
                        {
                            _id: 'asc'
                        }
                    ],
                    skip: 0
                };

                const queryMatcher = config.storage.getStorage().statics.getQueryMatcher(
                    storageInstance.schema,
                    config.storage.getStorage().statics.prepareQuery(
                        storageInstance.schema,
                        query
                    )
                );

                const doc1: any = schemaObjects.human();
                doc1._id = 'aa';
                doc1.age = 1;
                const doc2: any = schemaObjects.human();
                doc2._id = 'bb';
                doc2.age = 100;

                assert.strictEqual(queryMatcher(doc1), false);
                assert.strictEqual(queryMatcher(doc2), true);

                storageInstance.close();
            });
            it('should not match deleted documents', async () => {
                const storageInstance = await config.storage.getStorage().createStorageInstance<{ _id: string }>({
                    databaseName: randomCouchString(12),
                    collectionName: randomCouchString(12),
                    schema: getPseudoSchemaForVersion<{ _id: string }>(0, '_id' as any),
                    options: {},
                    multiInstance: false
                });

                const query: FilledMangoQuery<{ _id: string }> = {
                    selector: {},
                    sort: [
                        { _id: 'asc' }
                    ],
                    skip: 0
                };

                const queryMatcher = config.storage.getStorage().statics.getQueryMatcher(
                    storageInstance.schema,
                    config.storage.getStorage().statics.prepareQuery(
                        storageInstance.schema,
                        query
                    )
                );

                const doc1: any = schemaObjects.human();
                doc1._deleted = true;
                assert.strictEqual(
                    queryMatcher(doc1),
                    false
                );

                storageInstance.close();
            });
            it('should match the nested document', async () => {
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

                const queryMatcher = config.storage.getStorage().statics.getQueryMatcher(
                    schema,
                    config.storage.getStorage().statics.prepareQuery(
                        schema,
                        query
                    )
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
                        databaseName: randomCouchString(12),
                        collectionName: randomCouchString(12),
                        schema: getPseudoSchemaForVersion<{ key: string; value: string; }>(0, 'key'),
                        options: {},
                        multiInstance: false
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
                    }]
                );

                const preparedQuery = config.storage.getStorage().statics.prepareQuery(
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

                storageInstance.close();
            });
            it('should sort in the correct order', async () => {
                const storageInstance = await config.storage
                    .getStorage()
                    .createStorageInstance<{ key: string; value: string; }>({
                        databaseName: randomCouchString(12),
                        collectionName: randomCouchString(12),
                        schema: getTestDataSchema(),
                        options: {},
                        multiInstance: false
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
                ]);

                const preparedQuery = config.storage.getStorage().statics.prepareQuery(
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

                assert.strictEqual(allDocs.documents[0].value, 'c');
                assert.strictEqual(allDocs.documents[1].value, 'b');
                assert.strictEqual(allDocs.documents[2].value, 'a');

                storageInstance.close();
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
                         * RxDB wil always append the primaryKey to an index
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
                        databaseName: randomCouchString(12),
                        collectionName: randomCouchString(12),
                        schema,
                        options: {},
                        multiInstance: false
                    });

                const docData: RxDocumentWriteData<RandomDoc>[] = new Array(6)
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
                const writeResponse: RxStorageBulkWriteResponse<RandomDoc> = await storageInstance.bulkWrite(
                    docData.map(d => ({ document: d }))
                );
                if (Object.keys(writeResponse.error).length > 0) {
                    throw new Error('could not save');
                }
                const docs = Object.values(writeResponse.success);

                async function testQuery(query: FilledMangoQuery<RandomDoc>): Promise<void> {
                    const preparedQuery = config.storage.getStorage().statics.prepareQuery(
                        storageInstance.schema,
                        query
                    );
                    const docsViaQuery = (await storageInstance.query(preparedQuery)).documents;
                    const sortComparator = config.storage.getStorage().statics.getSortComparator(
                        storageInstance.schema,
                        preparedQuery
                    );
                    const docsViaSort = shuffleArray(docs).sort(sortComparator);
                    assert.deepStrictEqual(docsViaQuery, docsViaSort);
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

                storageInstance.close();
            });
            it('should be able to search over a nested object', async () => {
                const schema = getNestedDocSchema();
                const storageInstance = await config.storage
                    .getStorage()
                    .createStorageInstance<NestedDoc>({
                        databaseName: randomCouchString(12),
                        collectionName: randomCouchString(12),
                        schema,
                        options: {},
                        multiInstance: false
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
                ]);
                assert.deepStrictEqual(insertResult.error, {});

                const preparedQuery = config.storage.getStorage().statics.prepareQuery<NestedDoc>(
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

                storageInstance.close();
            });
        });
        describe('.findDocumentsById()', () => {
            it('should find the documents', async () => {
                const storageInstance = await config.storage.getStorage().createStorageInstance<TestDocType>({
                    databaseName: randomCouchString(12),
                    collectionName: randomCouchString(12),
                    schema: getPseudoSchemaForVersion<TestDocType>(0, 'key'),
                    options: {},
                    multiInstance: false
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
                    }]
                );

                const found = await storageInstance.findDocumentsById(['foobar'], false);
                const foundDoc = getFromObjectOrThrow(found, 'foobar');
                assert.deepStrictEqual(foundDoc, docData);

                storageInstance.close();
            });
            it('should find deleted documents', async () => {
                const storageInstance = await config.storage.getStorage().createStorageInstance<TestDocType>({
                    databaseName: randomCouchString(12),
                    collectionName: randomCouchString(12),
                    schema: getPseudoSchemaForVersion<TestDocType>(0, 'key'),
                    options: {},
                    multiInstance: false
                });

                const insertResult = await storageInstance.bulkWrite(
                    [{
                        document: {
                            key: 'foobar',
                            value: 'barfoo',
                            _deleted: false,
                            _attachments: {},
                            _rev: EXAMPLE_REVISION_1,
                            _meta: {
                                lwt: now()
                            }
                        }
                    }]
                );
                const previous = getFromObjectOrThrow(insertResult.success, 'foobar');

                await storageInstance.bulkWrite(
                    [{
                        previous,
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
                    }]
                );

                const found = await storageInstance.findDocumentsById(['foobar'], true);
                const foundDeleted = getFromObjectOrThrow(found, 'foobar');

                // even on deleted documents, we must get the other properties.
                assert.strictEqual(foundDeleted.value, 'barfoo2');
                assert.strictEqual(foundDeleted._deleted, true);

                storageInstance.close();
            });
            it('if withDeleted=true then even the non-deleted document must be found', async () => {
                const storageInstance = await config.storage.getStorage().createStorageInstance<TestDocType>({
                    databaseName: randomCouchString(12),
                    collectionName: randomCouchString(12),
                    schema: getPseudoSchemaForVersion<TestDocType>(0, 'key'),
                    options: {},
                    multiInstance: false
                });

                const insertResult = await storageInstance.bulkWrite(
                    [
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
                    ]
                );
                const previous = getFromObjectOrThrow(insertResult.success, 'del');
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
                    }]
                );
                assert.deepStrictEqual(deleteWriteResult.error, {});

                const found = await storageInstance.findDocumentsById([
                    'del',
                    'non-del'
                ], true);

                assert.strictEqual(
                    Object.keys(found).length,
                    2
                );

                storageInstance.close();
            });
        });
        describe('.getChangedDocumentsSince()', () => {
            it('should get the latests change', async () => {
                const storageInstance = await config.storage.getStorage().createStorageInstance<{ key: string }>({
                    databaseName: randomCouchString(12),
                    collectionName: randomCouchString(12),
                    schema: getPseudoSchemaForVersion(0, 'key'),
                    options: {},
                    multiInstance: false
                });
                let checkpoint: any;
                async function getChanges(): Promise<RxDocumentData<{ key: string }>[]> {
                    const res = await storageInstance.getChangedDocumentsSince(10, checkpoint);
                    if (res.length > 0) {
                        checkpoint = lastOfArray(res).checkpoint;
                    }
                    return res.map(r => r.document);
                }

                // should not return anything if nothing has happened
                const docsEmpty = await getChanges();
                assert.strictEqual(docsEmpty.length, 0);

                // insert one
                const insertResult = await storageInstance.bulkWrite([
                    {
                        document: {
                            key: 'foobar',
                            _deleted: false,
                            _attachments: {},
                            _rev: EXAMPLE_REVISION_1,
                            _meta: {
                                lwt: now()
                            }
                        }
                    }
                ]);
                const docsAfterInsert = await getChanges();
                assert.strictEqual(docsAfterInsert.length, 1);
                assert.strictEqual(docsAfterInsert[0].key, 'foobar');

                // delete one
                await storageInstance.bulkWrite([
                    {
                        previous: getFromObjectOrThrow(insertResult.success, 'foobar'),
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
                ]);
                const docsAfterDelete = await getChanges();
                assert.strictEqual(docsAfterDelete.length, 1);
                assert.strictEqual(docsAfterDelete[0].key, 'foobar');
                assert.strictEqual(docsAfterDelete[0]._deleted, true);

                // get only the last change when requesting with empty checkpoint
                const resTotal = await storageInstance.getChangedDocumentsSince(100);
                assert.strictEqual(resTotal.length, 1);
                assert.strictEqual(resTotal[0].document.key, 'foobar');
                assert.strictEqual(resTotal[0].document._deleted, true);

                storageInstance.close();
            });
            it('should return the correct amount of documents', async () => {
                const storageInstance = await config.storage.getStorage().createStorageInstance<TestDocType>({
                    databaseName: randomCouchString(12),
                    collectionName: randomCouchString(12),
                    schema: getTestDataSchema(),
                    options: {},
                    multiInstance: false
                });

                let previous: any;
                const insertResult = await storageInstance.bulkWrite([
                    {
                        document: getWriteData({ key: 'foobar', value: '0' })
                    },
                    // also add another random document
                    {
                        document: getWriteData()
                    }
                ]);
                assert.deepStrictEqual(insertResult.error, {});
                previous = getFromObjectOrThrow(insertResult.success, 'foobar');

                // update the document many times
                let t = 0;
                while (t < 10) {
                    t++;
                    const newDoc = clone(previous);
                    newDoc.value = t + '';
                    const newRev = createRevision(newDoc, previous);
                    newDoc._rev = newRev;
                    newDoc._meta.lwt = now();
                    const updateResult = await storageInstance.bulkWrite([
                        {
                            previous,
                            document: newDoc
                        }
                    ]);
                    assert.deepStrictEqual(updateResult.error, {});
                    previous = getFromObjectOrThrow(updateResult.success, 'foobar');
                }

                // should return both documents when called without checkpoint
                const resultWithoutCheckpoint = await storageInstance.getChangedDocumentsSince(10);
                assert.strictEqual(resultWithoutCheckpoint.length, 2);
                // the foobar-doc must have the latest value
                const foobarRow = resultWithoutCheckpoint.find(row => row.document.key === 'foobar');
                assert.strictEqual(ensureNotFalsy(foobarRow).document.value, '10');

                // insert many more documents
                const insertManyResult = await storageInstance.bulkWrite(
                    new Array(10)
                        .fill(0)
                        .map(() => ({ document: getWriteData() }))
                );
                assert.deepStrictEqual(insertManyResult.error, {});

                // should return both documents when called without checkpoint
                const resultManyWithoutCheckpoint = await storageInstance.getChangedDocumentsSince(100);
                assert.strictEqual(resultManyWithoutCheckpoint.length, 12);


                // first get 5 and then another 5 and then again.
                const resultFirstFive = await storageInstance.getChangedDocumentsSince(5);
                const resultSecondFive = await storageInstance.getChangedDocumentsSince(5, lastOfArray(resultFirstFive).checkpoint);
                const resultThirdFive = await storageInstance.getChangedDocumentsSince(5, lastOfArray(resultSecondFive).checkpoint);
                assert.strictEqual(resultFirstFive.length + resultSecondFive.length + resultThirdFive.length, 12);
                const resultFourthFive = await storageInstance.getChangedDocumentsSince(5, lastOfArray(resultThirdFive).checkpoint);
                assert.strictEqual(resultFourthFive.length, 0);


                // delete the document
                const newDoc = clone(previous);
                newDoc.value = t + '';
                newDoc._deleted = true;
                newDoc._meta.lwt = now();
                const newRev = createRevision(newDoc, previous);
                newDoc._rev = newRev;
                const deleteResult = await storageInstance.bulkWrite([
                    {
                        previous,
                        document: newDoc
                    }
                ]);
                assert.deepStrictEqual(deleteResult.error, {});

                const resultAfterDelete = await storageInstance.getChangedDocumentsSince(5, lastOfArray(resultThirdFive).checkpoint);
                assert.strictEqual(resultAfterDelete.length, 1);
                assert.strictEqual(resultAfterDelete[0].document._deleted, true);

                storageInstance.close();
            });
        });
        describe('.changeStream()', () => {
            it('should emit exactly one event on write', async () => {
                const storageInstance = await config.storage.getStorage().createStorageInstance<TestDocType>({
                    databaseName: randomCouchString(12),
                    collectionName: randomCouchString(12),
                    schema: getPseudoSchemaForVersion<TestDocType>(0, 'key'),
                    options: {},
                    multiInstance: false
                });

                const emitted: EventBulk<RxStorageChangeEvent<TestDocType>>[] = [];
                const sub = storageInstance.changeStream().subscribe(x => {
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

                // insert
                await storageInstance.bulkWrite([{
                    document: writeData
                }]);

                await wait(100);
                assert.strictEqual(emitted.length, 1);
                assert.strictEqual(emitted[0].events.length, 1);

                // should contain the _meta data
                assert.ok((emitted as any)[0].events[0].change.doc._meta.lwt);

                sub.unsubscribe();
                storageInstance.close();
            });
            it('should be compatible with rxjs operators', async () => {
                const storageInstance = await config.storage.getStorage().createStorageInstance<TestDocType>({
                    databaseName: randomCouchString(12),
                    collectionName: randomCouchString(12),
                    schema: getPseudoSchemaForVersion<TestDocType>(0, 'key'),
                    options: {},
                    multiInstance: false
                });

                const emitted: EventBulk<RxStorageChangeEvent<TestDocType>>[] = [];
                const sub = storageInstance.changeStream()
                    .pipe(
                        map(x => x),
                        filter(() => true)
                    )
                    .subscribe(x => {
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
                await storageInstance.bulkWrite([{
                    document: writeData
                }]);

                await wait(100);
                assert.strictEqual(emitted.length, 1);

                sub.unsubscribe();
                storageInstance.close();
            });
            it('should emit all events', async () => {
                const storageInstance = await config.storage.getStorage().createStorageInstance<TestDocType>({
                    databaseName: randomCouchString(12),
                    collectionName: randomCouchString(12),
                    schema: getPseudoSchemaForVersion<TestDocType>(0, 'key'),
                    options: {},
                    multiInstance: false
                });

                const emitted: EventBulk<RxStorageChangeEvent<RxDocumentData<TestDocType>>>[] = [];
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
                const firstWriteResult = await storageInstance.bulkWrite([{
                    previous,
                    document: writeData
                }]);
                previous = getFromObjectOrThrow(firstWriteResult.success, writeData.key);

                // update
                const originalBeforeUpdate = clone(writeData);
                const updateResult = await storageInstance.bulkWrite([{
                    previous,
                    document: Object.assign({}, writeData, {
                        _rev: EXAMPLE_REVISION_2,
                        _meta: {
                            lwt: now()
                        }
                    })
                }]);
                previous = getFromObjectOrThrow(updateResult.success, writeData.key);

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
                }]);
                assert.deepStrictEqual(deleteBulkWriteResponse.error, {});

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
                const lastRevision = parseRevision((lastEvent as any).change.previous._rev);
                assert.strictEqual(lastRevision.height, 2);

                assert.strictEqual(lastEvent.change.operation, 'DELETE');
                assert.ok(lastEvent.change.previous);

                sub.unsubscribe();
                storageInstance.close();
            });
            it('it should not emit an empty eventBulk when the write had only errors', async () => {
                const storageInstance = await config.storage.getStorage().createStorageInstance<TestDocType>({
                    databaseName: randomCouchString(12),
                    collectionName: randomCouchString(12),
                    schema: getPseudoSchemaForVersion<TestDocType>(0, 'key'),
                    options: {},
                    multiInstance: false
                });

                const emitted: EventBulk<RxStorageChangeEvent<RxDocumentData<TestDocType>>>[] = [];
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
                }]);
                assert.deepStrictEqual(firstWriteResult.error, {});

                // insert again to cause conflict error
                const secondWriteResult = await storageInstance.bulkWrite([{
                    document: writeData
                }]);
                assert.deepStrictEqual(secondWriteResult.success, {});

                assert.strictEqual(emitted.length, 1);
                assert.strictEqual(emitted[0].events.length, 1);

                sub.unsubscribe();
                storageInstance.close();
            });
        });
        describe('attachments', () => {
            if (!config.storage.hasAttachments) {
                return;
            }
            it('should be able to store and retrieve an attachment', async () => {
                const storageInstance = await config.storage.getStorage().createStorageInstance<TestDocType>({
                    databaseName: randomCouchString(12),
                    collectionName: randomCouchString(12),
                    schema: Object.assign(
                        getPseudoSchemaForVersion<TestDocType>(0, 'key'),
                        {
                            attachments: {}
                        }
                    ),
                    options: {},
                    multiInstance: false
                });
                const statics = config.storage.getStorage().statics;


                const attachmentData = new Array(20).fill('a').join('');
                const dataBlobBuffer = blobBufferUtil.createBlobBuffer(
                    attachmentData,
                    'text/plain'
                );

                const dataStringBase64 = await blobBufferUtil.toBase64String(dataBlobBuffer);
                const attachmentHash = await hashAttachmentData(
                    dataStringBase64,
                    statics
                );
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
                            digest: statics.hashKey + '-' + attachmentHash,
                            length: dataLength,
                            data: dataStringBase64,
                            type: 'text/plain'
                        }
                    }
                };
                await writeSingle<TestDocType>(
                    storageInstance,
                    {
                        document: writeData
                    }
                );

                const attachmentDataAfter = await storageInstance.getAttachmentData('foobar', 'foo');
                assert.strictEqual(attachmentDataAfter, dataStringBase64);


                storageInstance.close();
            });
            it('should return the correct attachment object on all document fetch methods', async () => {
                const storageInstance = await config.storage.getStorage().createStorageInstance<TestDocType>({
                    databaseName: randomCouchString(12),
                    collectionName: randomCouchString(12),
                    schema: Object.assign(
                        getPseudoSchemaForVersion<TestDocType>(0, 'key'),
                        {
                            attachments: {}
                        }
                    ),
                    options: {},
                    multiInstance: false
                });
                const statics = config.storage.getStorage().statics;

                const emitted: EventBulk<RxStorageChangeEvent<any>>[] = [];
                const sub = storageInstance.changeStream().subscribe(x => {
                    emitted.push(x);
                });

                const attachmentData = new Array(20).fill('a').join('');
                const dataBlobBuffer = blobBufferUtil.createBlobBuffer(
                    attachmentData,
                    'text/plain'
                );

                const dataStringBase64 = await blobBufferUtil.toBase64String(dataBlobBuffer);
                const attachmentHash = await hashAttachmentData(
                    dataStringBase64,
                    statics
                );
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
                            digest: statics.hashKey + '-' + attachmentHash,
                            length: dataLength,
                            data: dataStringBase64,
                            type: 'text/plain'
                        }
                    }
                };


                const writeResult = await writeSingle<TestDocType>(
                    storageInstance,
                    {
                        document: writeData
                    }
                );
                await waitUntil(() => flattenEvents(emitted).length === 1);

                assert.strictEqual(writeResult._attachments.foo.type, 'text/plain');
                assert.strictEqual(writeResult._attachments.foo.digest, statics.hashKey + '-' + attachmentHash);

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
                    config.storage.getStorage().statics.prepareQuery(
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
                const byIdDoc = getFromObjectOrThrow(byId, writeData.key);
                assert.strictEqual(byIdDoc._attachments.foo.type, 'text/plain');
                assert.strictEqual(byIdDoc._attachments.foo.length, dataLength);
                assert.ok(!(byIdDoc._attachments.foo as any).data);

                // test the emitted event
                const firstEventAttachment = flattenEvents(emitted)[0].change.doc._attachments.foo;
                assert.strictEqual(firstEventAttachment.type, 'text/plain');
                assert.strictEqual(firstEventAttachment.length, dataLength);
                assert.ok(!(firstEventAttachment as any).data);

                const changesResult = await storageInstance.getChangedDocumentsSince(1000);
                const firstChange = changesResult[0].document;
                if (!firstChange) {
                    throw new Error('first change missing');
                }
                assert.strictEqual(firstChange.key, 'foobar');

                sub.unsubscribe();
                storageInstance.close();
            });
            it('should be able to add multiple attachments, one each write', async () => {
                const storageInstance = await config.storage.getStorage().createStorageInstance<TestDocType>({
                    databaseName: randomCouchString(12),
                    collectionName: randomCouchString(12),
                    schema: Object.assign(
                        getPseudoSchemaForVersion<TestDocType>(0, 'key'),
                        {
                            attachments: {}
                        }
                    ),
                    options: {},
                    multiInstance: false
                });

                let previous: RxDocumentData<TestDocType> | undefined;

                const data = blobBufferUtil.createBlobBuffer(randomString(20), 'text/plain');
                const attachmentHash = await config.storage.getStorage().statics.hash(data);
                const dataString = await blobBufferUtil.toBase64String(data);
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
                            digest: config.storage.getStorage().statics.hashKey + '-' + attachmentHash,
                            length: blobBufferUtil.size(data),
                            data: dataString,
                            type: 'text/plain'
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
                    }
                );

                if (!previous) {
                    throw new Error('previous missing');
                }

                writeData._attachments = flatClone(previous._attachments) as any;

                const data2 = blobBufferUtil.createBlobBuffer(randomString(20), 'text/plain');
                const attachmentHash2 = await config.storage.getStorage().statics.hash(data2);
                const dataString2 = await blobBufferUtil.toBase64String(data2);
                writeData._attachments.bar = {
                    data: dataString2,
                    digest: config.storage.getStorage().statics.hashKey + '-' + attachmentHash2,
                    length: blobBufferUtil.size(data2),
                    type: 'text/plain'
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
                    }
                );
                if (!previous) {
                    throw new Error('previous missing');
                }

                assert.strictEqual(Object.keys(previous._attachments).length, 2);
                storageInstance.close();
            });
            it('_deleted documents must loose all attachments', async () => {
                const storageInstance = await config.storage.getStorage().createStorageInstance<TestDocType>({
                    databaseName: randomCouchString(12),
                    collectionName: randomCouchString(12),
                    schema: Object.assign(
                        getPseudoSchemaForVersion<TestDocType>(0, 'key'),
                        {
                            attachments: {}
                        }
                    ),
                    options: {},
                    multiInstance: false
                });

                const data = blobBufferUtil.createBlobBuffer(randomString(20), 'text/plain');
                const attachmentHash = await config.storage.getStorage().statics.hash(data);
                const dataString = await blobBufferUtil.toBase64String(data);
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
                            digest: config.storage.getStorage().statics.hashKey + '-' + attachmentHash,
                            length: blobBufferUtil.size(data),
                            data: dataString,
                            type: 'text/plain'
                        }
                    }
                };
                await storageInstance.bulkWrite([{ document: writeData }]);
                await storageInstance.getAttachmentData('foobar', 'foo');

                const deleteData = clone(writeData);
                deleteData._meta.lwt = now();
                deleteData._deleted = true;
                deleteData._attachments = {};
                deleteData._rev = EXAMPLE_REVISION_2;

                await storageInstance.bulkWrite([{ previous: writeData, document: deleteData }]);


                let hasThrown = false;
                try {
                    await storageInstance.getAttachmentData('foobar', 'foo');
                } catch (err) {
                    hasThrown = true;
                }
                assert.ok(hasThrown);

                storageInstance.close();
            });
        });
        describe('.cleanup', () => {
            it('should have cleaned up the deleted document', async () => {
                const storageInstance = await config.storage.getStorage().createStorageInstance<TestDocType>({
                    databaseName: randomCouchString(12),
                    collectionName: randomCouchString(12),
                    schema: getPseudoSchemaForVersion<TestDocType>(0, 'key'),
                    options: {},
                    multiInstance: false
                });

                const id = 'foobar';
                const nonDeletedId = 'foobar2';

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
                }]);


                /**
                 * Insert
                 */
                const insertResult = await storageInstance.bulkWrite([{
                    document: {
                        key: id,
                        value: 'barfoo',
                        _attachments: {},
                        _rev: EXAMPLE_REVISION_1,
                        _meta: {
                            lwt: now()
                        },
                        _deleted: false
                    }
                }]);
                const previous = getFromObjectOrThrow(insertResult.success, id);

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
                }]);
                getFromObjectOrThrow(deleteResult.success, id);

                /**
                 * Running .cleanup() with a height minimumDeletedTime
                 * should not remove the deleted document.
                 */
                await storageInstance.cleanup(1000 * 60 * 60);

                const mustBeThereButDeleted = await storageInstance.findDocumentsById(
                    [id],
                    true
                );
                const doc = mustBeThereButDeleted[id];
                assert.ok(doc._deleted);

                // clean up the deleted document
                await storageInstance.cleanup(0);

                if (config.storage.name === 'pouchdb') {
                    /**
                     * PouchDB is not able to fully purge a document
                     * so it makes no sense to check if the deleted document
                     * was removed on cleanup.
                     */
                    await storageInstance.close();
                    return;
                }

                const mustNotBeThere = await storageInstance.findDocumentsById(
                    [id],
                    true
                );
                assert.deepStrictEqual(mustNotBeThere, {});

                /**
                 * Other docs must still be there
                 */
                const nonDeletedDoc = await storageInstance.findDocumentsById(
                    [nonDeletedId],
                    true
                );
                assert.ok(nonDeletedDoc[nonDeletedId]);

                await storageInstance.close();
            });
            it('should at some time return true (when all docs are cleaned up)', async () => {
                const storageInstance = await config.storage.getStorage().createStorageInstance<TestDocType>({
                    databaseName: randomCouchString(12),
                    collectionName: randomCouchString(12),
                    schema: getPseudoSchemaForVersion<TestDocType>(0, 'key'),
                    options: {},
                    multiInstance: false
                });


                let done = false;
                while (!done) {
                    done = await storageInstance.cleanup(0);
                }

                const id = 'foobar';
                /**
                 * Insert
                 */
                const insertResult = await storageInstance.bulkWrite([{
                    document: {
                        key: id,
                        value: 'barfoo',
                        _attachments: {},
                        _rev: EXAMPLE_REVISION_1,
                        _meta: {
                            lwt: now()
                        },
                        _deleted: false
                    }
                }]);
                const previous = getFromObjectOrThrow(insertResult.success, id);

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
                }]);
                getFromObjectOrThrow(deleteResult.success, id);

                done = false;
                while (!done) {
                    done = await storageInstance.cleanup(0);
                }

                await storageInstance.close();
            });
        });
        describe('.remove()', () => {
            it('should have deleted all data', async () => {
                const databaseName = randomCouchString(12);
                const collectionName = randomCouchString(12);
                const storageInstance = await config.storage.getStorage().createStorageInstance<TestDocType>({
                    databaseName,
                    collectionName,
                    schema: getPseudoSchemaForVersion<TestDocType>(0, 'key'),
                    options: {},
                    multiInstance: false
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
                ]);
                await storageInstance.remove();
                const storageInstance2 = await config.storage.getStorage().createStorageInstance<TestDocType>({
                    databaseName,
                    collectionName,
                    schema: getPseudoSchemaForVersion<TestDocType>(0, 'key'),
                    options: {},
                    multiInstance: false
                });
                const docs = await storageInstance2.findDocumentsById(['foobar'], false);
                assert.strictEqual(Object.keys(docs).length, 0);

                storageInstance2.close();
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
            const databaseName = randomCouchString(12);
            const collectionName = randomCouchString(12);
            const a = await config.storage.getStorage().createStorageInstance<TestDocType>({
                databaseName,
                collectionName,
                schema: getPseudoSchemaForVersion<TestDocType>(0, 'key'),
                options: {},
                multiInstance: true
            });
            // ensure A is always leader
            if (a.internals.leaderElector) {
                await a.internals.leaderElector.awaitLeadership();
            } else {
                await wait(200);
            }

            const b = await config.storage.getStorage().createStorageInstance<TestDocType>({
                databaseName,
                collectionName,
                schema: getPseudoSchemaForVersion<TestDocType>(0, 'key'),
                options: {},
                multiInstance: true
            });
            return {
                a,
                b
            };
        }
        async function closeMultiInstanceRxStorageInstance(instances: MultiInstanceInstances) {
            await instances.a.close();
            await instances.b.close();
        }
        describe('RxStorageInstance', () => {
            it('should be able to write and read documents', async () => {
                const instances = await getMultiInstanceRxStorageInstance();

                const emittedB: EventBulk<RxStorageChangeEvent<RxDocumentData<TestDocType>>>[] = [];
                instances.b.changeStream().subscribe(ev => emittedB.push(ev));
                const emittedA: EventBulk<RxStorageChangeEvent<RxDocumentData<TestDocType>>>[] = [];
                instances.a.changeStream().subscribe(ev => emittedA.push(ev));

                // insert a document on A
                const writeData = getWriteData();
                await instances.a.bulkWrite([{ document: writeData }]);

                // find the document on B
                await waitUntil(async () => {
                    try {
                        const foundAgain = await instances.b.findDocumentsById([writeData.key], false);
                        const foundDoc = getFromObjectOrThrow(foundAgain, writeData.key);
                        assert.strictEqual(foundDoc.key, writeData.key);
                        return true;
                    } catch (err) {
                        return false;
                    }
                }, 10 * 1000, 100);

                // find via query
                const preparedQuery: PreparedQuery<TestDocType> = config.storage.getStorage().statics.prepareQuery<TestDocType>(
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
                const foundViaQueryDoc = foundViaQuery.documents.find(doc => doc.key === writeData.key);
                assert.ok(foundViaQueryDoc);

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
                await instances.a.bulkWrite([{ document: getWriteData() }]);

                const preparedQuery: PreparedQuery<TestDocType> = config.storage.getStorage().statics.prepareQuery<TestDocType>(
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

                await instances.b.close();
            });
            it('should not mix up documents stored with different schema versions', async () => {
                const storageInstanceV0 = await config.storage.getStorage().createStorageInstance<TestDocType>({
                    databaseName: randomCouchString(12),
                    collectionName: randomCouchString(12),
                    schema: getPseudoSchemaForVersion<TestDocType>(0, 'key'),
                    options: {},
                    multiInstance: false
                });
                const storageInstanceV1 = await config.storage.getStorage().createStorageInstance<TestDocType>({
                    databaseName: randomCouchString(12),
                    collectionName: randomCouchString(12),
                    schema: getPseudoSchemaForVersion<TestDocType>(1, 'key'),
                    options: {},
                    multiInstance: false
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
                    }]
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
                    }]
                );
                assert.deepStrictEqual(writeResponseV0.error, {});
                assert.deepStrictEqual(writeResponseV1.error, {});


                const plainQuery = {
                    selector: {},
                    sort: [{ key: 'asc' }]
                };
                const preparedQueryV0 = config.storage.getStorage().statics.prepareQuery(
                    getPseudoSchemaForVersion<TestDocType>(0, 'key'),
                    clone(plainQuery)
                );
                const resultV0 = await storageInstanceV0.query(preparedQueryV0);
                assert.strictEqual(resultV0.documents.length, 1);
                assert.strictEqual(resultV0.documents[0].value, '0');


                const preparedQueryV1 = config.storage.getStorage().statics.prepareQuery(
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
                    databaseName: randomCouchString(12),
                    collectionName,
                    schema,
                    options: {},
                    multiInstance: false
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
                    }]
                );
                assert.deepStrictEqual(writeResponse.error, {});
                await storageInstance1.close();


                const storageInstance2 = await config.storage.getStorage().createStorageInstance<TestDocType>({
                    databaseName: randomCouchString(12),
                    collectionName,
                    schema,
                    options: {},
                    multiInstance: false
                });

                const allDocsQuery = config.storage.getStorage().statics.prepareQuery(
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
        });
    });
    describe('migration', () => {
        it('documents that are stored on different schema versions, should not interfer', async () => {
            const storage = config.storage.getStorage();
            const databaseName = randomCouchString(12);
            const collectionName = randomCouchString(12);
            const storageInstanceZero = await storage.createStorageInstance<TestDocType>({
                databaseName,
                collectionName,
                schema: getPseudoSchemaForVersion<TestDocType>(0, 'key'),
                options: {},
                multiInstance: false
            });
            const storageInstanceOne = await storage.createStorageInstance<TestDocType>({
                databaseName,
                collectionName,
                schema: getPseudoSchemaForVersion<TestDocType>(1, 'key'),
                options: {},
                multiInstance: false
            });

            const writeResultZero = await storageInstanceZero.bulkWrite([{ document: getWriteData({ value: 'zero' }) }]);
            assert.deepStrictEqual(writeResultZero.error, {});

            const writeResultOne = await storageInstanceOne.bulkWrite([{ document: getWriteData({ value: 'one' }) }]);
            assert.deepStrictEqual(writeResultOne.error, {});

            const docsZero = await storageInstanceZero.query(
                storage.statics.prepareQuery(
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
                storage.statics.prepareQuery(
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

            storageInstanceZero.close();
            storageInstanceOne.close();
        });
    });
});
