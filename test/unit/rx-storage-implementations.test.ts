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
    MangoQuery,
    RxJsonSchema,
    parseRevision,
    ensureNotFalsy,
    getFromObjectOrThrow,
    shuffleArray
} from '../../';

import { RxDBKeyCompressionPlugin } from '../../plugins/key-compression';
addRxPlugin(RxDBKeyCompressionPlugin);
import { RxDBValidatePlugin } from '../../plugins/validate';
addRxPlugin(RxDBValidatePlugin);

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
    RxLocalDocumentData,
    RxStorageBulkWriteResponse,
    RxStorageChangeEvent,
    RxStorageInstance,
    RxStorageKeyObjectInstance
} from '../../src/types';
import { filter, map } from 'rxjs/operators';

addRxPlugin(RxDBQueryBuilderPlugin);

declare type TestDocType = { key: string; value: string; };
declare type OptionalValueTestDoc = TestDocType & { value?: string };
declare type MultiInstanceInstances = {
    a: RxStorageInstance<TestDocType, any, any>;
    b: RxStorageInstance<TestDocType, any, any>;
};
declare type MultiInstanceKeyObjectInstances = {
    a: RxStorageKeyObjectInstance<any, any>;
    b: RxStorageKeyObjectInstance<any, any>;
};


function getWriteData(
    ownParams: Partial<RxDocumentWriteData<TestDocType>> = {}
): RxDocumentWriteData<TestDocType> {
    return Object.assign(
        {
            key: randomString(10),
            value: 'barfoo',
            _deleted: false,
            _attachments: {}
        },
        ownParams
    );
}

function getTestDataSchema(): RxJsonSchema<TestDocType> {
    return {
        version: 0,
        type: 'object',
        primaryKey: 'key',
        properties: {
            key: {
                type: 'string'
            },
            value: {
                type: 'string'
            }
        },
        required: [
            'key',
            'value'
        ],
        indexes: [
            'value'
        ]
    };
}

function getLocalWriteData(
    ownParams: Partial<RxLocalDocumentData<{ value: string }>> = {}
): RxLocalDocumentData<{ value: string }> {
    return Object.assign(
        {
            _id: randomString(10),
            value: 'barfoo',
            _deleted: false,
            _attachments: {}
        },
        ownParams
    );
}

function getNestedDocSchema() {
    const schema: RxJsonSchema<NestedDoc> = {
        version: 0,
        primaryKey: 'id',
        type: 'object',
        properties: {
            id: {
                type: 'string'
            },
            nes: {
                type: 'object',
                properties: {
                    ted: {
                        type: 'String'
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
    };
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
            it('open two different instances on the same database name', async () => {
                const databaseName = randomCouchString(12);
                const storageInstance = await config.storage.getStorage().createStorageInstance<TestDocType>({
                    databaseName,
                    collectionName: randomCouchString(12),
                    schema: getPseudoSchemaForVersion<TestDocType>(0, 'key'),
                    options: {},
                    multiInstance: false
                });
                const storageInstance2 = await config.storage.getStorage().createStorageInstance<TestDocType>({
                    databaseName,
                    collectionName: randomCouchString(12),
                    schema: getPseudoSchemaForVersion<TestDocType>(0, 'key'),
                    options: {},
                    multiInstance: false
                });
                await Promise.all([
                    storageInstance.close(),
                    storageInstance2.close()
                ]);
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
                    _attachments: {}
                };
                const writeResponse = await storageInstance.bulkWrite(
                    [{
                        document: clone(docData)
                    }]
                );

                assert.strictEqual(Object.keys(writeResponse.error).length, 0);
                const first = getFromObjectOrThrow(writeResponse.success, 'foobar');

                assert.ok(first._rev);
                (docData as any)._rev = first._rev;

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
                    _attachments: {}
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

                assert.strictEqual(Object.keys(writeResponse.success).length, 0);
                const first = getFromObjectOrThrow(writeResponse.error, 'foobar');
                assert.strictEqual(first.status, 409);
                assert.strictEqual(first.documentId, 'foobar');
                assert.ok(first.writeRow);

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

                const insertResponse = await storageInstance.bulkWrite(
                    [{
                        document: {
                            key: 'foobar',
                            value: 'barfoo1',
                            _deleted: false,
                            _attachments: {}
                        }
                    }]
                );
                assert.strictEqual(Object.keys(insertResponse.error).length, 0);
                const first = getFromObjectOrThrow(insertResponse.success, 'foobar');


                const deleteResponse = await storageInstance.bulkWrite(
                    [{
                        previous: first,
                        document: Object.assign({}, first, { _deleted: true })
                    }]
                );
                assert.strictEqual(Object.keys(deleteResponse.error).length, 0);
                const second = getFromObjectOrThrow(deleteResponse.success, 'foobar');


                const undeleteResponse = await storageInstance.bulkWrite(
                    [{
                        // No previous doc data is send here. Because we 'undelete' the document
                        // which can be done via .insert()
                        document: Object.assign({}, second, { _deleted: false, value: 'aaa' })
                    }]
                );

                assert.strictEqual(Object.keys(undeleteResponse.error).length, 0);
                const third = getFromObjectOrThrow(undeleteResponse.success, 'foobar');
                assert.strictEqual(third.value, 'aaa');

                storageInstance.close();
            });
            it('should be able to unset a property', async () => {
                const schema = getTestDataSchema();
                schema.required = ['key'];

                const storageInstance = await config.storage.getStorage().createStorageInstance<OptionalValueTestDoc>({
                    databaseName: randomCouchString(12),
                    collectionName: randomCouchString(12),
                    schema,
                    options: {},
                    multiInstance: false
                });
                const docId = 'foobar';
                const insertData: RxDocumentData<OptionalValueTestDoc> = {
                    key: docId,
                    value: 'barfoo1',
                    _attachments: {}
                } as any;
                const writeResponse = await storageInstance.bulkWrite(
                    [{
                        document: insertData
                    }]
                );
                const insertResponse = getFromObjectOrThrow(writeResponse.success, docId);
                insertData._rev = insertResponse._rev;

                const updateResponse = await storageInstance.bulkWrite(
                    [{
                        previous: insertData,
                        document: {
                            key: docId,
                            _attachments: {}
                        } as any
                    }]
                );
                const updateResponseDoc = getFromObjectOrThrow(updateResponse.success, docId);
                delete (updateResponseDoc as any)._deleted;
                delete (updateResponseDoc as any)._rev;

                assert.deepStrictEqual(
                    updateResponseDoc,
                    {
                        key: docId,
                        _attachments: {}
                    }
                )

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
                const docData = {
                    key: 'foobar',
                    value: 'barfoo1',
                    _attachments: {}
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
                        document: clone(docData)
                    }]
                );
                await Promise.all([
                    storageInstance.close(),
                    storageInstance2.close()
                ]);
            });
        });
        describe('.bulkAddRevisions()', () => {
            it('should add the revisions for new documents', async () => {
                const storageInstance = await config.storage.getStorage().createStorageInstance<TestDocType>({
                    databaseName: randomCouchString(12),
                    collectionName: randomCouchString(12),
                    schema: getPseudoSchemaForVersion<TestDocType>(0, 'key'),
                    options: {},
                    multiInstance: false
                });

                const writeData: RxDocumentData<TestDocType> = {
                    key: 'foobar',
                    value: 'barfoo',
                    _attachments: {},
                    _deleted: false,
                    _rev: '1-a623631364fbfa906c5ffa8203ac9725'
                };
                const originalWriteData = clone(writeData);
                await storageInstance.bulkAddRevisions(
                    [
                        writeData
                    ]
                );

                // should not have mutated the input
                assert.deepStrictEqual(originalWriteData, writeData);

                const found = await storageInstance.findDocumentsById([originalWriteData.key], false);
                const doc = getFromObjectOrThrow(found, originalWriteData.key);
                assert.ok(doc);
                assert.strictEqual(doc.value, originalWriteData.value);
                // because overwrite=true, the _rev from the input data must be used.
                assert.strictEqual(doc._rev, originalWriteData._rev);

                storageInstance.close();
            });
        });
        describe('.getSortComparator()', () => {
            it('should sort in the correct order', async () => {
                const storageInstance = await config.storage.getStorage().createStorageInstance<TestDocType>({
                    databaseName: randomCouchString(12),
                    collectionName: randomCouchString(12),
                    schema: getPseudoSchemaForVersion(0, '_id' as any),
                    options: {},
                    multiInstance: false
                });

                const query: MangoQuery = {
                    selector: {},
                    limit: 1000,
                    sort: [
                        { age: 'asc' }
                    ]
                };

                const comparator = config.storage.getStorage().statics.getSortComparator(
                    storageInstance.schema,
                    query
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
                const query: MangoQuery<TestDocType> = {
                    selector: {
                        value: {
                            $eq: matchingValue
                        }
                    },
                    sort: [
                        { key: 'asc' }
                    ]
                };

                const comparator = config.storage.getStorage().statics.getSortComparator(
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
                const query: MangoQuery<TestDocType> = {
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
                    ]
                };

                const comparator = config.storage.getStorage().statics.getSortComparator(
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
                    ]
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
                    ]
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
                    ]
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
                    _attachments: {}
                };
                const matchingDoc = {
                    id: 'foobar',
                    nes: {
                        ted: 'barfoo'
                    },
                    _deleted: false,
                    _attachments: {}
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
                    _attachments: {}
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
                        sort: [{ key: 'asc' }]
                    }
                );
                const allDocs = await storageInstance.query(preparedQuery);
                const first = allDocs.documents[0];
                assert.ok(first);
                assert.strictEqual(first.value, 'barfoo');

                storageInstance.close();
            });
            it('should not find deleted documents', async () => {
                const storageInstance = await config.storage
                    .getStorage()
                    .createStorageInstance<{ key: string; value: string; }>({
                        databaseName: randomCouchString(12),
                        collectionName: randomCouchString(12),
                        schema: getPseudoSchemaForVersion<{ key: string; value: string; }>(0, 'key'),
                        options: {},
                        multiInstance: false
                    });

                const value = 'foobar';
                await storageInstance.bulkWrite([
                    {
                        document: getWriteData({ value })
                    },
                    {
                        document: getWriteData({ value })
                    },
                    {
                        document: getWriteData({ value, _deleted: true })
                    },
                ]);

                /**
                 * Also add deleted documents via bulkAddRevisions()
                 */
                await storageInstance.bulkAddRevisions(
                    new Array(5)
                        .fill(0)
                        .map(() => {
                            const docData: RxDocumentData<TestDocType> = getWriteData({
                                value,
                                _deleted: true
                            }) as any;
                            docData._rev = '2-5373c7dc85e8705456beaf68ae041110';
                            return docData;
                        })
                );
                /**
                 * Simulate deletion of existing document via bulkAddRevisions() 
                 */
                const oneDoc = getWriteData({ key: 'deleted-doc', value });
                await storageInstance.bulkWrite([
                    {
                        document: clone(oneDoc)
                    }
                ]);
                oneDoc._rev = '2-5373c7dc85e8705456beaf68ae041110';
                oneDoc._deleted = true;
                await storageInstance.bulkAddRevisions([oneDoc as any]);

                const preparedQuery = config.storage.getStorage().statics.prepareQuery(
                    storageInstance.schema,
                    {
                        selector: {
                            value: {
                                $eq: value
                            }
                        },
                        sort: [
                            { key: 'asc' }
                        ]
                    }
                );

                const allDocs = await storageInstance.query(preparedQuery);
                assert.strictEqual(allDocs.documents.length, 2);

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
                        ]
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
                const schema: RxJsonSchema<RandomDoc> = {
                    version: 0,
                    primaryKey: 'id',
                    type: 'object',
                    properties: {
                        id: {
                            type: 'string'
                        },
                        equal: {
                            type: 'string',
                            enum: ['foobar']
                        },
                        increment: {
                            type: 'number'
                        },
                        random: {
                            type: 'string'
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
                }
                const storageInstance = await config.storage
                    .getStorage()
                    .createStorageInstance<RandomDoc>({
                        databaseName: randomCouchString(12),
                        collectionName: randomCouchString(12),
                        schema,
                        options: {},
                        multiInstance: false
                    });

                const docData: RxDocumentWriteData<RandomDoc>[] = new Array(10)
                    .fill(0)
                    .map((_x, idx) => ({
                        id: randomString(10),
                        equal: 'foobar',
                        random: randomString(10),
                        increment: idx + 1,
                        _deleted: false,
                        _attachments: {}
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
                        ]
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
                        ]
                    },
                    {
                        selector: {},
                        sort: [
                            { increment: 'desc' },
                            { id: 'asc' }
                        ]
                    },
                    {
                        selector: {},
                        sort: [
                            { equal: 'asc' },
                            { increment: 'desc' },
                            { id: 'asc' }
                        ]
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
                await storageInstance.bulkWrite([
                    {
                        document: {
                            id: 'foobar',
                            nes: {
                                ted: 'barfoo'
                            },
                            _deleted: false,
                            _attachments: {}
                        }
                    }
                ]);

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
                        ]
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
                    _attachments: {}
                };
                await storageInstance.bulkWrite(
                    [{
                        document: docData
                    }]
                );

                const found = await storageInstance.findDocumentsById(['foobar'], false);
                const foundDoc = getFromObjectOrThrow(found, 'foobar');
                delete (foundDoc as any)._rev;
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
                            _attachments: {}
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
                            _attachments: {}
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
        });
        describe('.getChangedDocuments()', () => {
            it('should get the latest sequence', async () => {
                const storageInstance = await config.storage.getStorage().createStorageInstance<{ key: string }>({
                    databaseName: randomCouchString(12),
                    collectionName: randomCouchString(12),
                    schema: getPseudoSchemaForVersion(0, 'key'),
                    options: {},
                    multiInstance: false
                });
                assert.ok(storageInstance);
                async function getSequenceAfter(since: number): Promise<number> {
                    const changesResult = await storageInstance.getChangedDocuments({
                        direction: 'after',
                        limit: 1,
                        sinceSequence: since
                    });
                    return changesResult.lastSequence;
                }
                const latestBefore = await getSequenceAfter(0);
                assert.strictEqual(latestBefore, 0);

                await storageInstance.bulkWrite([
                    {
                        document: {
                            key: 'foobar',
                            _deleted: false,
                            _attachments: {}
                        }
                    }
                ]);
                const latestMiddle = await getSequenceAfter(0);
                assert.strictEqual(latestMiddle, 1);

                await storageInstance.bulkWrite([
                    {
                        document: {
                            key: 'foobar2',
                            _deleted: false,
                            _attachments: {}
                        }
                    }
                ]);
                const latestAfter = await getSequenceAfter(1);
                assert.strictEqual(latestAfter, 2);

                const docsInDbResult = await storageInstance.findDocumentsById(['foobar'], true);
                const docInDb = getFromObjectOrThrow(docsInDbResult, 'foobar');

                const oldRev = parseRevision(docInDb._rev);
                const nextRevHeight = oldRev.height + 1;

                // write one via bulkAddRevisions
                await storageInstance.bulkAddRevisions([
                    {
                        key: 'foobar2',
                        _deleted: false,
                        _attachments: {},
                        _rev: nextRevHeight + '-' + oldRev.hash
                    }
                ]);
                const latestAfterBulkAddRevision = await getSequenceAfter(2);
                assert.strictEqual(latestAfterBulkAddRevision, 3);

                storageInstance.close();
            });
            it('should get the correct changes', async () => {
                const storageInstance = await config.storage.getStorage().createStorageInstance<TestDocType>({
                    databaseName: randomCouchString(12),
                    collectionName: randomCouchString(12),
                    schema: getPseudoSchemaForVersion<TestDocType>(0, 'key'),
                    options: {},
                    multiInstance: false
                });

                let previous: RxDocumentData<TestDocType> | undefined;
                const writeData = {
                    key: 'foobar',
                    value: 'one',
                    _attachments: {},
                    _rev: undefined as any,
                    _deleted: false
                };

                // insert
                const firstWriteResult = await storageInstance.bulkWrite([{
                    previous,
                    document: writeData
                }]);
                previous = getFromObjectOrThrow(firstWriteResult.success, writeData.key);

                const changesAfterWrite = await storageInstance.getChangedDocuments({
                    direction: 'after',
                    sinceSequence: 0
                });
                const firstChangeAfterWrite = changesAfterWrite.changedDocuments[0];
                if (!firstChangeAfterWrite) {
                    throw new Error('missing change');
                }
                assert.ok(firstChangeAfterWrite.id === 'foobar');
                assert.strictEqual(firstChangeAfterWrite.sequence, 1);


                // update
                writeData.value = 'two';
                const updateResult = await storageInstance.bulkWrite([{
                    previous,
                    document: writeData
                }]);
                previous = getFromObjectOrThrow(updateResult.success, writeData.key);
                const changesAfterUpdate = await storageInstance.getChangedDocuments({
                    direction: 'after',
                    sinceSequence: 1
                });
                const firstChangeAfterUpdate = changesAfterUpdate.changedDocuments[0];
                if (!firstChangeAfterUpdate) {
                    throw new Error('missing change');
                }

                assert.ok(firstChangeAfterUpdate.id === 'foobar');
                assert.strictEqual(firstChangeAfterUpdate.sequence, 2);

                // delete
                writeData._deleted = true;
                await storageInstance.bulkWrite([{
                    previous,
                    document: writeData
                }]);
                const changesAfterDelete = await storageInstance.getChangedDocuments({
                    direction: 'after',
                    sinceSequence: 2
                });
                const firstChangeAfterDelete = changesAfterDelete.changedDocuments[0];
                if (!firstChangeAfterDelete) {
                    throw new Error('missing change');
                }
                assert.ok(firstChangeAfterDelete.id === 'foobar');

                assert.strictEqual(firstChangeAfterDelete.sequence, 3);
                assert.strictEqual(changesAfterDelete.lastSequence, 3);

                // itterate over the sequences
                let done = false;
                let lastSequence = 0;
                while (!done) {
                    const changesResults = await storageInstance.getChangedDocuments({
                        sinceSequence: lastSequence,
                        limit: 1,
                        direction: 'after'
                    });
                    if (changesResults.changedDocuments.length === 0) {
                        done = true;
                        continue;
                    }
                    lastSequence = changesResults.lastSequence;
                }
                assert.strictEqual(lastSequence, 3);

                storageInstance.close();
            });
            it('should sort correctly by sequence', async () => {
                const storageInstance = await config.storage.getStorage().createStorageInstance<TestDocType>({
                    databaseName: randomCouchString(12),
                    collectionName: randomCouchString(12),
                    schema: getTestDataSchema(),
                    options: {},
                    multiInstance: false
                });

                const insertDocs = new Array(10).fill(0).map(() => getWriteData());
                await storageInstance.bulkWrite(
                    insertDocs.map(d => ({ document: d }))
                );

                const first5Ids = insertDocs.slice(0, 5).map(d => d.key);

                const changesResults = await storageInstance.getChangedDocuments({
                    sinceSequence: 0,
                    limit: 5,
                    direction: 'after'
                });
                const resultIds = Array.from(changesResults.changedDocuments.values()).map(d => d.id);
                assert.deepStrictEqual(first5Ids[0], resultIds[0]);

                storageInstance.close();
            });
            it('should emit the correct change when bulkAddRevisions is used and then deleted', async () => {
                const storageInstance = await config.storage.getStorage().createStorageInstance<TestDocType>({
                    databaseName: randomCouchString(12),
                    collectionName: randomCouchString(12),
                    schema: getPseudoSchemaForVersion<TestDocType>(0, 'key'),
                    options: {},
                    multiInstance: false
                });

                const key = 'foobar';
                const insertResult = await storageInstance.bulkWrite([{
                    document: {
                        key,
                        _deleted: false,
                        _attachments: {},
                        value: 'myValue'
                    }
                }]);
                const previous = getFromObjectOrThrow(insertResult.success, key);

                // overwrite via set revisision
                const customRev = '2-5373c7dc85e8705456beaf68ae041110';
                await storageInstance.bulkAddRevisions([
                    {
                        key,
                        _deleted: false,
                        _attachments: {},
                        value: 'myValueRev',
                        _rev: customRev
                    }
                ]);

                previous._rev = customRev;
                await storageInstance.bulkWrite([{
                    previous,
                    document: {
                        key,
                        _attachments: {},
                        value: 'myValue',
                        _deleted: true
                    }
                }]);

                const changesAfterDelete = await storageInstance.getChangedDocuments({
                    direction: 'after',
                    sinceSequence: 1
                });
                const firstChangeAfterDelete = changesAfterDelete.changedDocuments[0];
                if (!firstChangeAfterDelete) {
                    throw new Error('missing change');
                }
                assert.strictEqual(firstChangeAfterDelete.id, key);

                storageInstance.close();
            });
            it('should get the full amount of change documents', async () => {

                /**
                 * PouchDB failed this test when we have indexes
                 * because it stores meta documents that contain info about the indexes.
                 * So we add more indexes here to ensure this is never broken.
                 */
                const useSchema = getTestDataSchema();
                ensureNotFalsy(useSchema.indexes as any).push(['key']);
                ensureNotFalsy(useSchema.indexes as any).push(['key', 'value']);

                const storageInstance = await config.storage.getStorage().createStorageInstance<TestDocType>({
                    databaseName: randomCouchString(12),
                    collectionName: randomCouchString(12),
                    schema: useSchema,
                    options: {},
                    multiInstance: false
                });

                // run many inserts
                const insertDocs = new Array(10).fill(0).map(() => getWriteData());
                await storageInstance.bulkWrite(
                    insertDocs.map(d => ({ document: d }))
                );

                const limit = 5;
                const result = await storageInstance.getChangedDocuments({
                    direction: 'after',
                    sinceSequence: 0,
                    limit
                });


                /**
                 * Because we did many writes, the result should be 'full'.
                 * This is important so that the caller of getChangedDocuments()
                 * can know if there might be more changes to be fetched.
                 */
                assert.strictEqual(result.changedDocuments.length, limit);

                storageInstance.close();
            });
        });
        describe('.changeStream()', () => {
            it('should emit exactly one event on write', async () => {
                const storageInstance = await config.storage.getStorage().createStorageInstance<TestDocType>({
                    databaseName: randomCouchString(12),
                    collectionName: randomCouchString(12),
                    schema: getPseudoSchemaForVersion<TestDocType>(0, 'key'),
                    options: {
                        auto_compaction: false
                    },
                    multiInstance: false
                });

                const emitted: EventBulk<RxStorageChangeEvent<TestDocType>>[] = [];
                const sub = storageInstance.changeStream().subscribe(x => {
                    emitted.push(x);
                });

                const writeData = {
                    key: 'foobar',
                    value: 'one',
                    _rev: undefined as any,
                    _deleted: false,
                    _attachments: {}
                };

                // insert
                await storageInstance.bulkWrite([{
                    document: writeData
                }]);

                await wait(100);
                assert.strictEqual(emitted.length, 1);
                assert.strictEqual(emitted[0].events.length, 1);

                sub.unsubscribe();
                storageInstance.close();
            });
            it('should be compatible with rxjs operators', async () => {
                const storageInstance = await config.storage.getStorage().createStorageInstance<TestDocType>({
                    databaseName: randomCouchString(12),
                    collectionName: randomCouchString(12),
                    schema: getPseudoSchemaForVersion<TestDocType>(0, 'key'),
                    options: {
                        auto_compaction: false
                    },
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
                    _rev: undefined as any,
                    _deleted: false,
                    _attachments: {}
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
                    options: {
                        auto_compaction: false
                    },
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
                    _rev: undefined as any,
                    _deleted: false,
                    _attachments: {}
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
                    document: writeData
                }]);
                previous = getFromObjectOrThrow(updateResult.success, writeData.key);

                // should not mutate the input or add additional properties to output
                originalBeforeUpdate._rev = (previous as any)._rev;
                assert.deepStrictEqual(originalBeforeUpdate, previous);

                // delete
                writeData._deleted = true;
                await storageInstance.bulkWrite([{
                    previous,
                    document: writeData
                }]);

                await waitUntil(() => emitted.length === 3);

                const lastEvent = lastOfArray(lastOfArray(emitted).events);
                if (!lastEvent) {
                    throw new Error('missing last event');
                }

                /**
                 * When a doc is deleted, the 'new' revision
                 * is in the .previous property.
                 * This is a hack because of pouchdb's strange behavior.
                 * We might want to change that.
                 */
                const lastRevision = parseRevision((lastEvent as any).change.previous._rev);
                assert.strictEqual(lastRevision.height, 3);

                assert.strictEqual(lastEvent.change.operation, 'DELETE');
                assert.ok(lastEvent.change.previous);

                sub.unsubscribe();
                storageInstance.close();
            });
            it('should emit changes when bulkAddRevisions() is used to set the newest revision', async () => {
                const storageInstance = await config.storage.getStorage().createStorageInstance<TestDocType>({
                    databaseName: randomCouchString(12),
                    collectionName: randomCouchString(12),
                    schema: getPseudoSchemaForVersion<TestDocType>(0, 'key'),
                    options: {
                        auto_compaction: false
                    },
                    multiInstance: false
                });

                const emitted: EventBulk<RxStorageChangeEvent<TestDocType>>[] = [];
                const sub = storageInstance.changeStream().subscribe(x => emitted.push(x));


                const writeData: RxDocumentWriteData<TestDocType> = {
                    key: 'foobar',
                    value: 'one',
                    _deleted: false,
                    _attachments: {}
                };


                // make normal insert
                await writeSingle(
                    storageInstance,
                    {
                        document: writeData
                    }
                );

                // insert via addRevision
                await storageInstance.bulkAddRevisions(
                    [{
                        key: 'foobar',
                        value: 'two',
                        /**
                         * TODO when _deleted:false,
                         * pouchdb will emit an event directly from the changes stream,
                         * but when deleted: true, it does not and we must emit and event by our own.
                         * This must be reported to the pouchdb repo.
                         */
                        _deleted: true,
                        _rev: '2-a723631364fbfa906c5ffa8203ac9725',
                        _attachments: {}
                    }]
                );

                await waitUntil(() => {
                    return flattenEvents(emitted).length === 2;
                });
                const lastEvent = flattenEvents(emitted).pop();
                if (!lastEvent) {
                    throw new Error('last event missing');
                }
                assert.strictEqual(
                    lastEvent.change.operation,
                    'DELETE'
                );


                sub.unsubscribe();
                storageInstance.close();
            });
            it('should emit the correct events when a deleted document is overwritten with another deleted via bulkAddRevisions()', async () => {
                const storageInstance = await config.storage.getStorage().createStorageInstance<TestDocType>({
                    databaseName: randomCouchString(12),
                    collectionName: randomCouchString(12),
                    schema: getPseudoSchemaForVersion<TestDocType>(0, 'key'),
                    options: {},
                    multiInstance: false
                });

                const id = 'foobar';
                const emitted: EventBulk<RxStorageChangeEvent<RxDocumentData<TestDocType>>>[] = [];
                const sub = storageInstance.changeStream().subscribe(cE => emitted.push(cE));

                const preparedQuery = config.storage.getStorage().statics.prepareQuery(
                    storageInstance.schema,
                    {
                        selector: {},
                        sort: [
                            {
                                key: 'asc'
                            }
                        ]
                    }
                );

                // insert
                await storageInstance.bulkWrite([{
                    document: {
                        key: id,
                        value: 'one',
                        _deleted: false,
                        _attachments: {}
                    }
                }]);
                // insert again via bulkAddRevisions()
                const bulkInsertAgain = {
                    key: id,
                    value: 'two',
                    _deleted: false,
                    _attachments: {},
                    _rev: '2-a6e639f1073f75farxdbreplicationgraphql'
                };
                await storageInstance.bulkAddRevisions([bulkInsertAgain]);

                // delete via bulkWrite()
                await storageInstance.bulkWrite([{
                    previous: bulkInsertAgain,
                    document: {
                        key: id,
                        value: 'one',
                        _attachments: {},
                        _deleted: true
                    }
                }]);

                const resultAfterBulkWriteDelete = await storageInstance.query(preparedQuery);
                assert.strictEqual(resultAfterBulkWriteDelete.documents.length, 0);

                // delete again via bulkAddRevisions()
                await storageInstance.bulkAddRevisions([{
                    key: id,
                    value: 'one',
                    _deleted: true,
                    _attachments: {},
                    _rev: '4-c4195e76073f75farxdbreplicationgraphql'
                }]);

                // insert should overwrite the deleted one
                const afterDelete = await storageInstance.findDocumentsById([id], true);
                const afterDeleteDoc = getFromObjectOrThrow(afterDelete, id);
                await storageInstance.bulkWrite([{
                    document: {
                        key: id,
                        value: 'three',
                        _deleted: false,
                        _attachments: {}
                    },
                    previous: afterDeleteDoc
                }]);



                await waitUntil(() => flattenEvents(emitted).length === 4);
                assert.ok(flattenEvents(emitted)[0].change.operation === 'INSERT');

                assert.ok(flattenEvents(emitted)[1].change.operation === 'UPDATE');
                const updatePrev = flatClone(ensureNotFalsy(flattenEvents(emitted)[1].change.previous));
                delete (updatePrev as any)._deleted;
                assert.deepStrictEqual(
                    updatePrev,
                    {
                        key: id,
                        value: 'one',
                        _rev: (updatePrev as any)._rev,
                        _attachments: {}
                    }
                );

                assert.ok(flattenEvents(emitted)[2].change.operation === 'DELETE');
                assert.ok(flattenEvents(emitted)[3].change.operation === 'INSERT');

                sub.unsubscribe();
                storageInstance.close();
            });
        });
        describe('attachments', () => {
            if (!config.storage.hasAttachments) {
                return;
            }
            it('should return the correct attachment object on all document fetch methods', async () => {
                const storageInstance = await config.storage.getStorage().createStorageInstance<TestDocType>({
                    databaseName: randomCouchString(12),
                    collectionName: randomCouchString(12),
                    schema: getPseudoSchemaForVersion<TestDocType>(0, 'key'),
                    options: {
                        auto_compaction: false
                    },
                    multiInstance: false
                });
                const statics = config.storage.getStorage().statics;

                const emitted: EventBulk<RxStorageChangeEvent<any>>[] = [];
                const sub = storageInstance.changeStream().subscribe(x => {
                    emitted.push(x);
                });

                const attachmentData = randomString(20);
                const dataBlobBuffer = blobBufferUtil.createBlobBuffer(
                    attachmentData,
                    'text/plain'
                );
                const attachmentHash = await statics.hash(dataBlobBuffer);

                const writeData: RxDocumentWriteData<TestDocType> = {
                    key: 'foobar',
                    value: 'one',
                    _rev: undefined as any,
                    _deleted: false,
                    _attachments: {
                        foo: {
                            digest: statics.hashKey + '-' + attachmentHash,
                            length: blobBufferUtil.size(dataBlobBuffer),
                            data: dataBlobBuffer,
                            type: 'text/plain'
                        }
                    }
                };

                const writeResult = await writeSingle(
                    storageInstance,
                    {
                        document: writeData
                    }
                );

                await waitUntil(() => flattenEvents(emitted).length === 1);

                assert.strictEqual(writeResult._attachments.foo.type, 'text/plain');
                assert.strictEqual(writeResult._attachments.foo.digest, statics.hashKey + '-' + attachmentHash);

                const queryResult = await storageInstance.query(
                    config.storage.getStorage().statics.prepareQuery(
                        storageInstance.schema,
                        {
                            selector: {},
                            sort: [
                                { key: 'asc' }
                            ]
                        }
                    )
                );
                assert.strictEqual(queryResult.documents[0]._attachments.foo.type, 'text/plain');
                assert.strictEqual(queryResult.documents[0]._attachments.foo.length, attachmentData.length);


                const byId = await storageInstance.findDocumentsById([writeData.key], false);
                const byIdDoc = getFromObjectOrThrow(byId, writeData.key);
                assert.strictEqual(byIdDoc._attachments.foo.type, 'text/plain');
                assert.strictEqual(byIdDoc._attachments.foo.length, attachmentData.length);
                assert.ok(!(byIdDoc._attachments.foo as any).data);

                // test emitted
                const firstEventAttachment = flattenEvents(emitted)[0].change.doc._attachments.foo;
                assert.strictEqual(firstEventAttachment.type, 'text/plain');
                assert.strictEqual(firstEventAttachment.length, attachmentData.length);
                assert.ok(!(firstEventAttachment as any).data);

                const changesResult = await storageInstance.getChangedDocuments({
                    sinceSequence: 0,
                    direction: 'after'
                });
                const firstChange = changesResult.changedDocuments[0];
                if (!firstChange) {
                    throw new Error('first change missing');
                }
                assert.strictEqual(firstChange.id, 'foobar');

                sub.unsubscribe();
                storageInstance.close();
            });
            it('should be able to add multiple attachments, one each write', async () => {
                const storageInstance = await config.storage.getStorage().createStorageInstance<TestDocType>({
                    databaseName: randomCouchString(12),
                    collectionName: randomCouchString(12),
                    schema: getPseudoSchemaForVersion<TestDocType>(0, 'key'),
                    options: {
                        auto_compaction: false
                    },
                    multiInstance: false
                });

                let previous: RxDocumentData<TestDocType> | undefined;

                const data = blobBufferUtil.createBlobBuffer(randomString(20), 'text/plain');
                const attachmentHash = await config.storage.getStorage().statics.hash(data);
                const writeData: RxDocumentWriteData<TestDocType> = {
                    key: 'foobar',
                    value: 'one',
                    _rev: undefined as any,
                    _deleted: false,
                    _attachments: {
                        foo: {
                            digest: attachmentHash,
                            length: blobBufferUtil.size(data),
                            data,
                            type: 'text/plain'
                        }
                    }
                };

                previous = await writeSingle(
                    storageInstance,
                    {
                        previous,
                        document: writeData
                    }
                );

                if (!previous) {
                    throw new Error('previous missing');
                }

                writeData._attachments = flatClone(previous._attachments) as any;

                const data2 = blobBufferUtil.createBlobBuffer(randomString(20), 'text/plain');
                const attachmentHash2 = await config.storage.getStorage().statics.hash(data2);
                writeData._attachments.bar = {
                    data: data2,
                    digest: attachmentHash2,
                    length: blobBufferUtil.size(data2),
                    type: 'text/plain'
                };

                previous = await writeSingle(
                    storageInstance,
                    {
                        previous,
                        document: writeData
                    }
                );
                if (!previous) {
                    throw new Error('previous missing');
                }

                assert.strictEqual(Object.keys(previous._attachments).length, 2);
                storageInstance.close();
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

                storageInstance.close();
                storageInstance2.close();
            });
        });
    });
    describe('RxStorageKeyObjectInstance', () => {
        describe('.bulkWrite()', () => {
            it('should write the documents', async () => {
                const storageInstance = await config.storage
                    .getStorage()
                    .createKeyObjectStorageInstance({
                        databaseName: randomCouchString(12),
                        collectionName: randomCouchString(12),
                        options: {},
                        multiInstance: false
                    });

                const writeData = {
                    _id: 'foobar',
                    value: 'barfoo',
                    _deleted: false,
                    _attachments: {}
                };
                const originalWriteData = clone(writeData);
                const writeResponse = await storageInstance.bulkWrite(
                    [{
                        document: writeData
                    }]
                );

                // should not have mutated the input
                assert.deepStrictEqual(originalWriteData, writeData);

                assert.strictEqual(Object.keys(writeResponse.error).length, 0);
                const first = getFromObjectOrThrow(writeResponse.success, 'foobar');
                delete (first as any)._rev;

                assert.deepStrictEqual(writeData, first);

                storageInstance.close();
            });
            it('should update the document', async () => {
                const storageInstance = await config.storage
                    .getStorage()
                    .createKeyObjectStorageInstance({
                        databaseName: randomCouchString(12),
                        collectionName: randomCouchString(12),
                        options: {},
                        multiInstance: false
                    });

                const writeResponse = await storageInstance.bulkWrite(
                    [{
                        document: {
                            _id: 'foobar',
                            value: 'barfoo',
                            _deleted: false,
                            _attachments: {}
                        }
                    }]
                );
                const first = getFromObjectOrThrow(writeResponse.success, 'foobar');
                await storageInstance.bulkWrite([
                    {
                        previous: first,
                        document: {
                            _id: 'foobar',
                            value: 'barfoo2',
                            _deleted: false,
                            _attachments: {}
                        }
                    }
                ]);

                const afterUpdate = await storageInstance.findLocalDocumentsById(['foobar'], false);
                assert.ok(afterUpdate['foobar']);
                assert.strictEqual(afterUpdate['foobar'].value, 'barfoo2');

                storageInstance.close();
            });
            it('should error on conflict', async () => {
                const storageInstance = await config.storage
                    .getStorage()
                    .createKeyObjectStorageInstance({
                        databaseName: randomCouchString(12),
                        collectionName: randomCouchString(12),
                        options: {},
                        multiInstance: false
                    });

                const getWriteData = () => [{
                    document: {
                        _id: 'foobar',
                        value: 'barfoo',
                        _deleted: false,
                        _attachments: {}
                    }
                }];

                await storageInstance.bulkWrite(
                    getWriteData()
                );
                const writeResponse = await storageInstance.bulkWrite(
                    getWriteData()
                );

                assert.strictEqual(Object.keys(writeResponse.success).length, 0);
                const first = getFromObjectOrThrow(writeResponse.error, 'foobar');
                assert.strictEqual(first.status, 409);
                assert.strictEqual(first.documentId, 'foobar');
                assert.ok(first.writeRow.document);

                storageInstance.close();
            });
            it('should be able to delete', async () => {
                const storageInstance = await config.storage
                    .getStorage()
                    .createKeyObjectStorageInstance({
                        databaseName: randomCouchString(12),
                        collectionName: randomCouchString(12),
                        options: {},
                        multiInstance: false
                    });

                const writeDoc = {
                    _id: 'foobar',
                    value: 'barfoo',
                    _deleted: false,
                    _rev: undefined as any,
                    _attachments: {}
                };

                const firstWriteResult = await storageInstance.bulkWrite(
                    [{
                        document: writeDoc
                    }]
                );
                const writeDocResult = getFromObjectOrThrow(firstWriteResult.success, writeDoc._id);
                writeDoc._rev = writeDocResult._rev;
                writeDoc.value = writeDoc.value + '2';
                writeDoc._deleted = true;

                const updateResponse = await storageInstance.bulkWrite(
                    [{
                        previous: writeDocResult,
                        document: writeDoc
                    }]
                );
                if (Object.keys(updateResponse.error).length !== 0) {
                    throw new Error('could not update');
                }

                // should not find the document
                const res = await storageInstance.findLocalDocumentsById([writeDoc._id], false);
                assert.strictEqual(!!res[writeDoc._id], false);

                storageInstance.close();
            });
        });
        describe('.findLocalDocumentsById()', () => {
            it('should find the documents', async () => {
                const storageInstance = await config.storage
                    .getStorage()
                    .createKeyObjectStorageInstance({
                        databaseName: randomCouchString(12),
                        collectionName: randomCouchString(12),
                        options: {},
                        multiInstance: false
                    });

                const writeData = {
                    _id: 'foobar',
                    value: 'barfoo',
                    _deleted: false,
                    _attachments: {}
                };

                await storageInstance.bulkWrite(
                    [{
                        document: writeData
                    }]
                );

                const found = await storageInstance.findLocalDocumentsById([writeData._id], false);
                const doc = getFromObjectOrThrow(found, writeData._id);
                assert.strictEqual(
                    doc.value,
                    writeData.value
                );

                storageInstance.close();
            });
            it('should find the deleted document if withDeleted: true', async () => {
                const storageInstance = await config.storage
                    .getStorage()
                    .createKeyObjectStorageInstance({
                        databaseName: randomCouchString(12),
                        collectionName: randomCouchString(12),
                        options: {},
                        multiInstance: false
                    });

                const id = 'foobar';
                const writeData = {
                    _id: id,
                    value: 'barfoo',
                    _deleted: false,
                    _attachments: {}
                };

                const insertResponse = await storageInstance.bulkWrite(
                    [{
                        document: writeData
                    }]
                );

                const previous = getFromObjectOrThrow(insertResponse.success, id);

                // delete the document
                writeData._deleted = true;
                const deleteResponse = await storageInstance.bulkWrite(
                    [{
                        previous,
                        document: writeData
                    }]
                );
                getFromObjectOrThrow(deleteResponse.success, id);

                // should not be returned if withDeleted: false
                const foundWithoutDeleted = await storageInstance.findLocalDocumentsById([writeData._id], false);
                assert.ok(!foundWithoutDeleted[id]);

                // should be returned if withDeleted: true
                const found = await storageInstance.findLocalDocumentsById([writeData._id], true);
                const doc = getFromObjectOrThrow(found, writeData._id);
                assert.strictEqual(doc._deleted, true);

                storageInstance.close();
            });
        });
        describe('.changeStream()', () => {
            it('should emit exactly one event on write', async () => {
                const storageInstance = await config.storage
                    .getStorage()
                    .createKeyObjectStorageInstance({
                        databaseName: randomCouchString(12),
                        collectionName: randomCouchString(12),
                        options: {},
                        multiInstance: false
                    });

                const emitted: EventBulk<RxStorageChangeEvent<RxLocalDocumentData>>[] = [];
                const sub = storageInstance.changeStream().subscribe(x => {
                    emitted.push(x);
                });

                const writeData = {
                    _id: 'foobar',
                    value: 'one',
                    _rev: undefined as any,
                    _deleted: false,
                    _attachments: {}
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
                const storageInstance = await config.storage
                    .getStorage()
                    .createKeyObjectStorageInstance({
                        databaseName: randomCouchString(12),
                        collectionName: randomCouchString(12),
                        options: {},
                        multiInstance: false
                    });

                const emitted: EventBulk<RxStorageChangeEvent<RxLocalDocumentData>>[] = [];
                const sub = storageInstance.changeStream().subscribe(x => {
                    emitted.push(x);
                });

                let previous: RxLocalDocumentData | undefined;
                const writeData = {
                    _id: 'foobar',
                    value: 'one',
                    _rev: undefined as any,
                    _deleted: false,
                    _attachments: {}
                };

                // insert
                const firstWriteResult = await storageInstance.bulkWrite([{
                    previous,
                    document: writeData
                }]);
                previous = getFromObjectOrThrow(firstWriteResult.success, writeData._id);

                // update
                const updateResult = await storageInstance.bulkWrite([{
                    previous,
                    document: writeData
                }]);
                previous = getFromObjectOrThrow(updateResult.success, writeData._id);

                // delete
                writeData._deleted = true;
                await storageInstance.bulkWrite([{
                    previous,
                    document: writeData
                }]);

                await waitUntil(() => emitted.length === 3);

                const last = lastOfArray(flattenEvents(emitted));
                if (!last) {
                    throw new Error('missing last event');
                }

                assert.strictEqual(last.change.operation, 'DELETE');
                assert.ok(last.change.previous);

                sub.unsubscribe();
                storageInstance.close();
            });
        });
        describe('.remove()', () => {
            it('should have deleted all data', async () => {
                const databaseName = randomCouchString(12);
                const collectionName = randomCouchString(12);
                const storageInstance = await config.storage
                    .getStorage()
                    .createKeyObjectStorageInstance({
                        databaseName,
                        collectionName,
                        options: {},
                        multiInstance: false
                    });
                await storageInstance.bulkWrite([
                    {
                        document: {
                            _id: 'foobar',
                            value: 'barfoo',
                            _deleted: false,
                            _attachments: {}

                        }
                    }
                ]);
                await storageInstance.remove();

                const storageInstance2 = await config.storage.getStorage().createKeyObjectStorageInstance({
                    databaseName,
                    collectionName,
                    options: {},
                    multiInstance: false
                });
                const docs = await storageInstance2.findLocalDocumentsById(['foobar'], false);
                assert.strictEqual(Object.keys(docs).length, 0);

                storageInstance.close();
                storageInstance2.close();
            });
        });
    });
    describe('multiInstance', () => {
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
        async function getMultiInstaneRxKeyObjectInstance(): Promise<MultiInstanceKeyObjectInstances> {
            const databaseName = randomCouchString(12);
            const collectionName = randomCouchString(12);

            const a = await config.storage.getStorage().createKeyObjectStorageInstance({
                databaseName,
                collectionName,
                options: {},
                multiInstance: true
            });
            // ensure A is always leader
            if (a.internals.leaderElector) {
                await a.internals.leaderElector.awaitLeadership();
            } else {
                await wait(200);
            }

            const b = await config.storage.getStorage().createKeyObjectStorageInstance({
                databaseName,
                collectionName,
                options: {},
                multiInstance: true
            });
            return {
                a,
                b
            };
        }
        async function closeMultiInstaneRxKeyObjectInstance(instances: MultiInstanceKeyObjectInstances) {
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
                const preparedQuery: PreparedQuery<TestDocType> = config.storage.getStorage().statics.prepareQuery(
                    instances.b.schema,
                    {
                        selector: {},
                        limit: 1,
                        sort: [{ key: 'asc' }]
                    }
                );

                const foundViaQuery = await instances.b.query(preparedQuery);
                assert.strictEqual(foundViaQuery.documents.length, 1);
                const foundViaQueryDoc = foundViaQuery.documents.find(doc => doc.key === writeData.key);
                assert.ok(foundViaQueryDoc);

                // add a document via bulkAddRevisions()
                const writeDataViaRevision: RxDocumentData<TestDocType> = {
                    key: 'foobar',
                    value: 'barfoo',
                    _deleted: false,
                    _attachments: {},
                    _rev: '1-a723631364fbfa906c5ffb8203ac9725'
                };
                await instances.b.bulkAddRevisions([writeDataViaRevision]);

                // should return an error on conflict write
                const brokenDoc = clone(writeData);
                const brokenResponse = await instances.b.bulkWrite([{
                    document: brokenDoc
                }]);
                assert.strictEqual(Object.keys(brokenResponse.error).length, 1);
                assert.strictEqual(Object.keys(brokenResponse.success).length, 0);

                // find by id
                const foundAgainViaRev = await instances.b.findDocumentsById([writeDataViaRevision.key], false);
                const foundDocViaRev = getFromObjectOrThrow(foundAgainViaRev, writeDataViaRevision.key);
                assert.strictEqual(foundDocViaRev.key, writeDataViaRevision.key);

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

                const preparedQuery: PreparedQuery<TestDocType> = config.storage.getStorage().statics.prepareQuery(
                    instances.b.schema,
                    {
                        selector: {},
                        limit: 1,
                        sort: [{ key: 'asc' }]
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
        });
        describe('RxStorageKeyObjectInstance', () => {
            it('should be able to write and read documents', async () => {
                const instances = await getMultiInstaneRxKeyObjectInstance();

                // insert a document on A
                const writeData = getLocalWriteData();
                await instances.a.bulkWrite([{ document: writeData }]);

                // find the document on B
                await waitUntil(async () => {
                    try {
                        const foundAgain = await instances.b.findLocalDocumentsById([writeData._id], false);
                        const foundDoc = getFromObjectOrThrow(foundAgain, writeData._id);
                        assert.strictEqual(foundDoc._id, writeData._id);
                        return true;
                    } catch (err) {
                        return false;
                    }
                });

                // close both
                await closeMultiInstaneRxKeyObjectInstance(instances);
            });
        });
    });
});
