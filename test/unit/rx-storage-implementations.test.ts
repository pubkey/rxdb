import assert from 'assert';

import config from './config';
import * as schemaObjects from '../helper/schema-objects';
import {
    addRxPlugin,
    randomCouchString,
    getPseudoSchemaForVersion,
    getFromMapOrThrow,
    lastOfArray,
    writeSingle,
    blobBufferUtil,
    flatClone,
    MangoQuery,
    RxJsonSchema,
    parseRevision
} from '../../plugins/core';

import {
    getRxStoragePouch
} from '../../plugins/pouchdb';

import { RxDBKeyCompressionPlugin } from '../../plugins/key-compression';
import { BroadcastChannel, LeaderElector } from 'broadcast-channel';
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
    PreparedQuery,
    RxDocumentData,
    RxDocumentWriteData,
    RxLocalDocumentData,
    RxStorage,
    RxStorageBulkWriteResponse,
    RxStorageChangeEvent,
    RxStorageInstance,
    RxStorageKeyObjectInstance
} from '../../src/types';
import { getRxStorageLoki } from '../../plugins/lokijs';
import { getLeaderElectorByBroadcastChannel } from '../../plugins/leader-election';

addRxPlugin(RxDBQueryBuilderPlugin);

declare type TestDocType = { key: string; value: string; };
declare type MultiInstanceInstances = {
    broadcastChannelA: BroadcastChannel;
    broadcastChannelB: BroadcastChannel;
    leaderElectorA: LeaderElector;
    leaderElectorB: LeaderElector;
    a: RxStorageInstance<TestDocType, any, any>;
    b: RxStorageInstance<TestDocType, any, any>;
};
declare type MultiInstanceKeyObjectInstances = {
    broadcastChannelA: BroadcastChannel;
    broadcastChannelB: BroadcastChannel;
    leaderElectorA: LeaderElector;
    leaderElectorB: LeaderElector;
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

declare type RandomDoc = {
    id: string;
    equal: string;
    random: string;
    increment: number;
};

const rxStorageImplementations: {
    name: string;
    getStorage: () => RxStorage<any, any>;
    // true if the storage supports attachments
    hasAttachments: boolean;
}[] = [
        {
            name: 'pouchdb',
            getStorage: () => getRxStoragePouch('memory'),
            hasAttachments: true
        },
        {
            name: 'lokijs',
            getStorage: () => getRxStorageLoki(),
            hasAttachments: false
        }
    ];

rxStorageImplementations.forEach(rxStorageImplementation => {

    config.parallel('rx-storage-implementations.test.js (implementation: ' + rxStorageImplementation.name + ')', () => {
        describe('RxStorageInstance', () => {
            describe('.bulkWrite()', () => {
                it('should write the document', async () => {
                    const storageInstance = await rxStorageImplementation.getStorage().createStorageInstance<TestDocType>({
                        databaseName: randomCouchString(12),
                        collectionName: randomCouchString(12),
                        schema: getPseudoSchemaForVersion(0, 'key'),
                        options: {}
                    });

                    const docData = {
                        key: 'foobar',
                        value: 'barfoo1',
                        _attachments: {}
                    };
                    const writeResponse = await storageInstance.bulkWrite(
                        [{
                            document: clone(docData)
                        }]
                    );

                    assert.strictEqual(writeResponse.error.size, 0);
                    const first = getFromMapOrThrow(writeResponse.success, 'foobar');

                    assert.ok(first._rev);
                    (docData as any)._rev = first._rev;
                    delete first._deleted;

                    assert.deepStrictEqual(docData, first);
                    storageInstance.close();
                });
                it('should error on conflict', async () => {
                    const storageInstance = await rxStorageImplementation.getStorage().createStorageInstance<TestDocType>({
                        databaseName: randomCouchString(12),
                        collectionName: randomCouchString(12),
                        schema: getPseudoSchemaForVersion(0, 'key'),
                        options: {}
                    });

                    const writeData: RxDocumentWriteData<TestDocType> = {
                        key: 'foobar',
                        value: 'barfoo',
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

                    assert.strictEqual(writeResponse.success.size, 0);
                    const first = getFromMapOrThrow(writeResponse.error, 'foobar');
                    assert.strictEqual(first.status, 409);
                    assert.strictEqual(first.documentId, 'foobar');
                    assert.ok(first.writeRow);

                    storageInstance.close();
                });
                it('should be able to overwrite a deleted the document', async () => {
                    const storageInstance = await rxStorageImplementation.getStorage().createStorageInstance<TestDocType>({
                        databaseName: randomCouchString(12),
                        collectionName: randomCouchString(12),
                        schema: getPseudoSchemaForVersion(0, 'key'),
                        options: {}
                    });

                    const writeResponse = await storageInstance.bulkWrite(
                        [{
                            document: {
                                key: 'foobar',
                                value: 'barfoo1',
                                _attachments: {}
                            }
                        }]
                    );
                    assert.strictEqual(writeResponse.error.size, 0);
                    const first = getFromMapOrThrow(writeResponse.success, 'foobar');


                    const writeResponse2 = await storageInstance.bulkWrite(
                        [{
                            previous: first,
                            document: Object.assign({}, first, { _deleted: true })
                        }]
                    );
                    assert.strictEqual(writeResponse2.error.size, 0);
                    const second = getFromMapOrThrow(writeResponse2.success, 'foobar');


                    const writeResponse3 = await storageInstance.bulkWrite(
                        [{
                            // No previous doc data is send here. Because we 'undelete' the document
                            // which can be done via .insert()
                            document: Object.assign({}, second, { _deleted: false, value: 'aaa' })
                        }]
                    );
                    assert.strictEqual(writeResponse3.error.size, 0);
                    const third = getFromMapOrThrow(writeResponse3.success, 'foobar');
                    assert.strictEqual(third.value, 'aaa');

                    storageInstance.close();
                });
            });
            describe('.bulkAddRevisions()', () => {
                it('should add the revisions for new documents', async () => {
                    const storageInstance = await rxStorageImplementation.getStorage().createStorageInstance<TestDocType>({
                        databaseName: randomCouchString(12),
                        collectionName: randomCouchString(12),
                        schema: getPseudoSchemaForVersion(0, 'key'),
                        options: {}
                    });

                    const writeData: RxDocumentData<TestDocType> = {
                        key: 'foobar',
                        value: 'barfoo',
                        _attachments: {},
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
                    const doc = getFromMapOrThrow(found, originalWriteData.key);
                    assert.ok(doc);
                    assert.strictEqual(doc.value, originalWriteData.value);
                    // because overwrite=true, the _rev from the input data must be used.
                    assert.strictEqual(doc._rev, originalWriteData._rev);

                    storageInstance.close();
                });
            });
            describe('.getSortComparator()', () => {
                it('should sort in the correct order', async () => {
                    const storageInstance = await rxStorageImplementation.getStorage().createStorageInstance<TestDocType>({
                        databaseName: randomCouchString(12),
                        collectionName: randomCouchString(12),
                        schema: getPseudoSchemaForVersion(0, '_id' as any),
                        options: {}
                    });

                    const query: MangoQuery = {
                        selector: {},
                        limit: 1000,
                        sort: [
                            { age: 'asc' }
                        ]
                    };

                    const comparator = storageInstance.getSortComparator(
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
            });
            describe('.getQueryMatcher()', () => {
                it('should match the right docs', async () => {
                    const storageInstance = await rxStorageImplementation.getStorage().createStorageInstance<TestDocType>({
                        databaseName: randomCouchString(12),
                        collectionName: randomCouchString(12),
                        schema: getPseudoSchemaForVersion(0, '_id' as any),
                        options: {}
                    });

                    const query: MangoQuery = {
                        selector: {
                            age: {
                                $gt: 10,
                                $ne: 50
                            }
                        }
                    };


                    const queryMatcher = storageInstance.getQueryMatcher(
                        query
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
            });
            describe('.query()', () => {
                it('should find all documents', async () => {
                    const storageInstance = await rxStorageImplementation
                        .getStorage()
                        .createStorageInstance<{ key: string; value: string; }>({
                            databaseName: randomCouchString(12),
                            collectionName: randomCouchString(12),
                            schema: getPseudoSchemaForVersion(0, 'key'),
                            options: {}
                        });

                    const writeData = {
                        key: 'foobar',
                        value: 'barfoo',
                        _attachments: {}
                    };

                    await storageInstance.bulkWrite(
                        [{
                            document: writeData
                        }]
                    );


                    const preparedQuery = storageInstance.prepareQuery({
                        selector: {}
                    });
                    const allDocs = await storageInstance.query(preparedQuery);
                    const first = allDocs.documents[0];
                    assert.ok(first);
                    assert.strictEqual(first.value, 'barfoo');

                    storageInstance.close();
                });
                it('should not find deleted documents', async () => {
                    const storageInstance = await rxStorageImplementation
                        .getStorage()
                        .createStorageInstance<{ key: string; value: string; }>({
                            databaseName: randomCouchString(12),
                            collectionName: randomCouchString(12),
                            schema: getPseudoSchemaForVersion(0, 'key'),
                            options: {}
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

                    const preparedQuery = storageInstance.prepareQuery({
                        selector: {
                            value: {
                                $eq: value
                            }
                        }
                    });

                    const allDocs = await storageInstance.query(preparedQuery);
                    assert.strictEqual(allDocs.documents.length, 2);

                    storageInstance.close();
                });
                it('should sort in the correct order', async () => {
                    const storageInstance = await rxStorageImplementation
                        .getStorage()
                        .createStorageInstance<{ key: string; value: string; }>({
                            databaseName: randomCouchString(12),
                            collectionName: randomCouchString(12),
                            schema: getTestDataSchema(),
                            options: {}
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

                    const preparedQuery = storageInstance.prepareQuery({
                        selector: {},
                        sort: [
                            { value: 'desc' }
                        ]
                    });
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
                            'id',
                            'equal',
                            'increment',
                            'random',
                            [
                                'equal',
                                'increment'
                            ]
                        ],
                        required: [
                            'id',
                            'equal',
                            'increment',
                            'random'
                        ]
                    }
                    const storageInstance = await rxStorageImplementation
                        .getStorage()
                        .createStorageInstance<RandomDoc>({
                            databaseName: randomCouchString(12),
                            collectionName: randomCouchString(12),
                            schema,
                            options: {}
                        });

                    const docData: RxDocumentWriteData<RandomDoc>[] = new Array(10)
                        .fill(0)
                        .map((_x, idx) => ({
                            id: randomString(10),
                            equal: 'foobar',
                            random: randomString(10),
                            increment: idx + 1,
                            _attachments: {}
                        }));
                    const writeResponse: RxStorageBulkWriteResponse<RandomDoc> = await storageInstance.bulkWrite(
                        docData.map(d => ({ document: d }))
                    );
                    if (writeResponse.error.size > 0) {
                        throw new Error('could not save');
                    }
                    const docs = Array.from(writeResponse.success.values());

                    async function testQuery(query: MangoQuery<RandomDoc>): Promise<void> {
                        const preparedQuery = storageInstance.prepareQuery(query);
                        const docsViaQuery = (await storageInstance.query(preparedQuery)).documents;
                        const sortComparator = storageInstance.getSortComparator(preparedQuery);
                        const docsViaSort = docs.sort(sortComparator);
                        assert.deepStrictEqual(docsViaQuery, docsViaSort);
                    }
                    const queries: MangoQuery<RandomDoc>[] = [
                        {
                            selector: {},
                            sort: [
                                { id: 'asc' }
                            ]
                        },
                        {
                            selector: {},
                            sort: [
                                { equal: 'asc' }
                            ]
                        },
                        {
                            selector: {},
                            sort: [
                                { increment: 'desc' }
                            ]
                        },
                        {
                            selector: {},
                            sort: [
                                { equal: 'asc' },
                                { increment: 'desc' }
                            ]
                        }
                    ];
                    for (const query of queries) {
                        await testQuery(query);
                    }

                    storageInstance.close();
                });
            });
            describe('.findDocumentsById()', () => {
                it('should find the documents', async () => {
                    const storageInstance = await rxStorageImplementation.getStorage().createStorageInstance<TestDocType>({
                        databaseName: randomCouchString(12),
                        collectionName: randomCouchString(12),
                        schema: getPseudoSchemaForVersion(0, 'key'),
                        options: {}
                    });

                    const docData = {
                        key: 'foobar',
                        value: 'barfoo',
                        _attachments: {}
                    };
                    await storageInstance.bulkWrite(
                        [{
                            document: docData
                        }]
                    );

                    const found = await storageInstance.findDocumentsById(['foobar'], false);
                    const foundDoc = getFromMapOrThrow(found, 'foobar');
                    delete (foundDoc as any)._rev;
                    delete (foundDoc as any)._deleted;
                    assert.deepStrictEqual(foundDoc, docData);

                    storageInstance.close();
                });
                it('should find deleted documents', async () => {
                    const storageInstance = await rxStorageImplementation.getStorage().createStorageInstance<TestDocType>({
                        databaseName: randomCouchString(12),
                        collectionName: randomCouchString(12),
                        schema: getPseudoSchemaForVersion(0, 'key'),
                        options: {}
                    });

                    const insertResult = await storageInstance.bulkWrite(
                        [{
                            document: {
                                key: 'foobar',
                                value: 'barfoo',
                                _attachments: {}
                            }
                        }]
                    );
                    const previous = getFromMapOrThrow(insertResult.success, 'foobar');

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
                    const foundDeleted = getFromMapOrThrow(found, 'foobar');

                    // even on deleted documents, we must get the other properties.
                    assert.strictEqual(foundDeleted.value, 'barfoo2');
                    assert.strictEqual(foundDeleted._deleted, true);

                    storageInstance.close();
                });
            });
            describe('.getChangedDocuments()', () => {
                it('should get the latest sequence', async () => {
                    const storageInstance = await rxStorageImplementation.getStorage().createStorageInstance<{ key: string }>({
                        databaseName: randomCouchString(12),
                        collectionName: randomCouchString(12),
                        schema: getPseudoSchemaForVersion(0, 'key'),
                        options: {
                            auto_compaction: false
                        }
                    });
                    async function getSequenceAfter(since: number): Promise<number> {
                        const changesResult = await storageInstance.getChangedDocuments({
                            direction: 'after',
                            limit: 1,
                            sinceSequence: since
                        });
                        return changesResult.lastSequence;
                    }
                    const latestBefore = await getSequenceAfter(0);
                    await storageInstance.bulkWrite([
                        {
                            document: {
                                key: 'foobar',
                                _attachments: {}
                            }
                        }
                    ]);
                    const latestMiddle = await getSequenceAfter(0);

                    await storageInstance.bulkWrite([
                        {
                            document: {
                                key: 'foobar2',
                                _attachments: {}
                            }
                        }
                    ]);
                    const latestAfter = await getSequenceAfter(1);


                    const docsInDbResult = await storageInstance.findDocumentsById(['foobar'], true);
                    const docInDb = getFromMapOrThrow(docsInDbResult, 'foobar');

                    const oldRev = parseRevision(docInDb._rev);
                    const nextRevHeight = oldRev.height + 1;

                    // write one via bulkAddRevisions
                    await storageInstance.bulkAddRevisions([
                        {
                            key: 'foobar2',
                            _attachments: {},
                            _rev: nextRevHeight + '-' + oldRev.hash
                        }
                    ]);
                    const latestAfterBulkAddRevision = await getSequenceAfter(2);

                    assert.strictEqual(latestBefore, 0);
                    assert.strictEqual(latestMiddle, 1);
                    assert.strictEqual(latestAfter, 2);
                    assert.strictEqual(latestAfterBulkAddRevision, 3);

                    storageInstance.close();
                });
                it('should get the correct changes', async () => {
                    const storageInstance = await rxStorageImplementation.getStorage().createStorageInstance<TestDocType>({
                        databaseName: randomCouchString(12),
                        collectionName: randomCouchString(12),
                        schema: getPseudoSchemaForVersion(0, 'key'),
                        options: {
                            auto_compaction: false
                        }
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
                    previous = getFromMapOrThrow(firstWriteResult.success, writeData.key);

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
                    previous = getFromMapOrThrow(updateResult.success, writeData.key);
                    const changesAfterUpdate = await storageInstance.getChangedDocuments({
                        direction: 'after',
                        sinceSequence: 0
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
                        sinceSequence: 0
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
                it('should emit the correct change when bulkAddRevisions is used and then deleted', async () => {
                    const storageInstance = await rxStorageImplementation.getStorage().createStorageInstance<TestDocType>({
                        databaseName: randomCouchString(12),
                        collectionName: randomCouchString(12),
                        schema: getPseudoSchemaForVersion(0, 'key'),
                        options: {}
                    });

                    const key = 'foobar';
                    const insertResult = await storageInstance.bulkWrite([{
                        document: {
                            key,
                            _attachments: {},
                            value: 'myValue'
                        }
                    }]);
                    const previous = getFromMapOrThrow(insertResult.success, key);

                    // overwrite via set revisision
                    const customRev = '2-5373c7dc85e8705456beaf68ae041110';
                    await storageInstance.bulkAddRevisions([
                        {
                            key,
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
            });
            describe('.changeStream()', () => {
                it('should emit exactly one event on write', async () => {
                    const storageInstance = await rxStorageImplementation.getStorage().createStorageInstance<TestDocType>({
                        databaseName: randomCouchString(12),
                        collectionName: randomCouchString(12),
                        schema: getPseudoSchemaForVersion(0, 'key'),
                        options: {
                            auto_compaction: false
                        }
                    });

                    const emitted: RxStorageChangeEvent<TestDocType>[] = [];
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

                    sub.unsubscribe();
                    storageInstance.close();
                });
                it('should emit all events', async () => {
                    const storageInstance = await rxStorageImplementation.getStorage().createStorageInstance<TestDocType>({
                        databaseName: randomCouchString(12),
                        collectionName: randomCouchString(12),
                        schema: getPseudoSchemaForVersion(0, 'key'),
                        options: {
                            auto_compaction: false
                        }
                    });

                    const emitted: RxStorageChangeEvent<TestDocType>[] = [];
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
                    previous = getFromMapOrThrow(firstWriteResult.success, writeData.key);

                    // update
                    const updateResult = await storageInstance.bulkWrite([{
                        previous,
                        document: writeData
                    }]);
                    previous = getFromMapOrThrow(updateResult.success, writeData.key);

                    // delete
                    writeData._deleted = true;
                    await storageInstance.bulkWrite([{
                        previous,
                        document: writeData
                    }]);

                    await waitUntil(() => emitted.length === 3);

                    const last = lastOfArray(emitted);
                    if (!last) {
                        throw new Error('missing last event');
                    }

                    assert.strictEqual(last.change.operation, 'DELETE');
                    assert.ok(last.change.previous);

                    sub.unsubscribe();
                    storageInstance.close();
                });
                it('should emit changes when bulkAddRevisions() is used to set the newest revision', async () => {
                    const storageInstance = await rxStorageImplementation.getStorage().createStorageInstance<TestDocType>({
                        databaseName: randomCouchString(12),
                        collectionName: randomCouchString(12),
                        schema: getPseudoSchemaForVersion(0, 'key'),
                        options: {
                            auto_compaction: false
                        }
                    });

                    const emitted: RxStorageChangeEvent<TestDocType>[] = [];
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

                    await waitUntil(() => emitted.length === 2);
                    const lastEvent = emitted.pop();
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
                    const storageInstance = await rxStorageImplementation.getStorage().createStorageInstance<TestDocType>({
                        databaseName: randomCouchString(12),
                        collectionName: randomCouchString(12),
                        schema: getPseudoSchemaForVersion(0, 'key'),
                        options: {}
                    });

                    const id = 'foobar';
                    const emitted: RxStorageChangeEvent<RxDocumentData<TestDocType>>[] = [];
                    const sub = storageInstance.changeStream().subscribe(cE => emitted.push(cE));

                    const preparedQuery = storageInstance.prepareQuery({
                        selector: {}
                    });

                    // insert
                    await storageInstance.bulkWrite([{
                        document: {
                            key: id,
                            value: 'one',
                            _attachments: {}
                        }
                    }]);
                    // insert again via bulkAddRevisions()
                    const bulkInsertAgain = {
                        key: id,
                        value: 'one',
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

                    await waitUntil(() => emitted.length === 3);

                    assert.ok(emitted[0].change.operation === 'INSERT');
                    assert.ok(emitted[1].change.operation === 'UPDATE');
                    assert.ok(emitted[2].change.operation === 'DELETE');

                    sub.unsubscribe();
                    storageInstance.close();
                });
            });
            describe('attachments', () => {
                if (!rxStorageImplementation.hasAttachments) {
                    return;
                }
                it('should return the correct attachment object on all document fetch methods', async () => {
                    const storageInstance = await rxStorageImplementation.getStorage().createStorageInstance<TestDocType>({
                        databaseName: randomCouchString(12),
                        collectionName: randomCouchString(12),
                        schema: getPseudoSchemaForVersion(0, 'key'),
                        options: {
                            auto_compaction: false
                        }
                    });

                    const emitted: RxStorageChangeEvent<any>[] = [];
                    const sub = storageInstance.changeStream().subscribe(x => {
                        emitted.push(x);
                    });

                    const attachmentData = randomString(20);
                    const dataBlobBuffer = blobBufferUtil.createBlobBuffer(
                        attachmentData,
                        'text/plain'
                    );
                    const attachmentHash = await rxStorageImplementation.getStorage().hash(dataBlobBuffer);

                    const writeData: RxDocumentWriteData<TestDocType> = {
                        key: 'foobar',
                        value: 'one',
                        _rev: undefined as any,
                        _deleted: false,
                        _attachments: {
                            foo: {
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

                    await waitUntil(() => emitted.length === 1);

                    assert.strictEqual(writeResult._attachments.foo.type, 'text/plain');
                    assert.strictEqual(writeResult._attachments.foo.digest, attachmentHash);

                    const queryResult = await storageInstance.query(
                        storageInstance.prepareQuery({
                            selector: {}
                        })
                    );
                    assert.strictEqual(queryResult.documents[0]._attachments.foo.type, 'text/plain');
                    assert.strictEqual(queryResult.documents[0]._attachments.foo.length, attachmentData.length);


                    const byId = await storageInstance.findDocumentsById([writeData.key], false);
                    const byIdDoc = getFromMapOrThrow(byId, writeData.key);
                    assert.strictEqual(byIdDoc._attachments.foo.type, 'text/plain');
                    assert.strictEqual(byIdDoc._attachments.foo.length, attachmentData.length);

                    // test emitted
                    assert.strictEqual(emitted[0].change.doc._attachments.foo.type, 'text/plain');
                    assert.strictEqual(emitted[0].change.doc._attachments.foo.length, attachmentData.length);


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
                    const storageInstance = await rxStorageImplementation.getStorage().createStorageInstance<TestDocType>({
                        databaseName: randomCouchString(12),
                        collectionName: randomCouchString(12),
                        schema: getPseudoSchemaForVersion(0, 'key'),
                        options: {
                            auto_compaction: false
                        }
                    });

                    let previous: RxDocumentData<TestDocType> | undefined;
                    const writeData: RxDocumentWriteData<TestDocType> = {
                        key: 'foobar',
                        value: 'one',
                        _rev: undefined as any,
                        _deleted: false,
                        _attachments: {
                            foo: {
                                data: blobBufferUtil.createBlobBuffer(randomString(20), 'text/plain'),
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

                    writeData._attachments = flatClone(previous._attachments) as any;
                    writeData._attachments.bar = {
                        data: blobBufferUtil.createBlobBuffer(randomString(20), 'text/plain'),
                        type: 'text/plain'
                    };

                    previous = await writeSingle(
                        storageInstance,
                        {
                            previous,
                            document: writeData
                        }
                    );

                    assert.strictEqual(Object.keys(previous._attachments).length, 2);
                    storageInstance.close();
                });
            });
            describe('.remove()', () => {
                it('should have deleted all data', async () => {
                    const databaseName = randomCouchString(12);
                    const collectionName = randomCouchString(12);
                    const storageInstance = await rxStorageImplementation.getStorage().createStorageInstance<TestDocType>({
                        databaseName,
                        collectionName,
                        schema: getPseudoSchemaForVersion(0, 'key'),
                        options: {}
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

                    const storageInstance2 = await rxStorageImplementation.getStorage().createStorageInstance<TestDocType>({
                        databaseName,
                        collectionName,
                        schema: getPseudoSchemaForVersion(0, 'key'),
                        options: {}
                    });
                    const docs = await storageInstance2.findDocumentsById(['foobar'], false);
                    assert.strictEqual(docs.size, 0);

                    storageInstance.close();
                    storageInstance2.close();
                });
            });
        });
        describe('RxStorageKeyObjectInstance', () => {
            describe('.bulkWrite()', () => {
                it('should write the documents', async () => {
                    const storageInstance = await rxStorageImplementation
                        .getStorage()
                        .createKeyObjectStorageInstance({
                            databaseName: randomCouchString(12),
                            collectionName: randomCouchString(12),
                            options: {}
                        });

                    const writeData = {
                        _id: 'foobar',
                        value: 'barfoo',
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

                    assert.strictEqual(writeResponse.error.size, 0);
                    const first = getFromMapOrThrow(writeResponse.success, 'foobar');
                    delete (first as any)._rev;
                    delete (first as any)._deleted;

                    assert.deepStrictEqual(writeData, first);

                    storageInstance.close();
                });
                it('should update the document', async () => {
                    const storageInstance = await rxStorageImplementation
                        .getStorage()
                        .createKeyObjectStorageInstance({
                            databaseName: randomCouchString(12),
                            collectionName: randomCouchString(12),
                            options: {}
                        });

                    const writeResponse = await storageInstance.bulkWrite(
                        [{
                            document: {
                                _id: 'foobar',
                                value: 'barfoo',
                                _attachments: {}
                            }
                        }]
                    );
                    const first = getFromMapOrThrow(writeResponse.success, 'foobar');
                    await storageInstance.bulkWrite([
                        {
                            previous: first,
                            document: {
                                _id: 'foobar',
                                value: 'barfoo2',
                                _attachments: {}
                            }
                        }
                    ]);

                    const afterUpdate = await storageInstance.findLocalDocumentsById(['foobar']);
                    assert.ok(afterUpdate.get('foobar'));
                    assert.strictEqual(afterUpdate.get('foobar').value, 'barfoo2');

                    storageInstance.close();
                });
                it('should error on conflict', async () => {
                    const storageInstance = await rxStorageImplementation
                        .getStorage()
                        .createKeyObjectStorageInstance({
                            databaseName: randomCouchString(12),
                            collectionName: randomCouchString(12),
                            options: {}
                        });

                    const writeData = [{
                        document: {
                            _id: 'foobar',
                            value: 'barfoo',
                            _attachments: {}
                        }
                    }];

                    await storageInstance.bulkWrite(
                        writeData
                    );
                    const writeResponse = await storageInstance.bulkWrite(
                        writeData
                    );

                    assert.strictEqual(writeResponse.success.size, 0);
                    const first = getFromMapOrThrow(writeResponse.error, 'foobar');
                    assert.strictEqual(first.status, 409);
                    assert.strictEqual(first.documentId, 'foobar');
                    assert.ok(first.writeRow.document);

                    storageInstance.close();
                });
                it('should be able to delete', async () => {
                    const storageInstance = await rxStorageImplementation
                        .getStorage()
                        .createKeyObjectStorageInstance({
                            databaseName: randomCouchString(12),
                            collectionName: randomCouchString(12),
                            options: {}
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
                    const writeDocResult = getFromMapOrThrow(firstWriteResult.success, writeDoc._id);
                    writeDoc._rev = writeDocResult._rev;
                    writeDoc.value = writeDoc.value + '2';
                    writeDoc._deleted = true;

                    const updateResponse = await storageInstance.bulkWrite(
                        [{
                            previous: writeDocResult,
                            document: writeDoc
                        }]
                    );
                    if (updateResponse.error.size !== 0) {
                        throw new Error('could not update');
                    }

                    // should not find the document
                    const res = await storageInstance.findLocalDocumentsById([writeDoc._id]);
                    assert.strictEqual(res.has(writeDoc._id), false);

                    storageInstance.close();
                });
            });
            describe('.findLocalDocumentsById()', () => {
                it('should find the documents', async () => {
                    const storageInstance = await rxStorageImplementation
                        .getStorage()
                        .createKeyObjectStorageInstance({
                            databaseName: randomCouchString(12),
                            collectionName: randomCouchString(12),
                            options: {}
                        });

                    const writeData = {
                        _id: 'foobar',
                        value: 'barfoo',
                        _attachments: {}
                    };

                    await storageInstance.bulkWrite(
                        [{
                            document: writeData
                        }]
                    );

                    const found = await storageInstance.findLocalDocumentsById([writeData._id]);
                    const doc = getFromMapOrThrow(found, writeData._id);
                    assert.strictEqual(
                        doc.value,
                        writeData.value
                    );

                    storageInstance.close();
                });
            });
            describe('.changeStream()', () => {
                it('should emit exactly one event on write', async () => {
                    const storageInstance = await rxStorageImplementation
                        .getStorage()
                        .createKeyObjectStorageInstance({
                            databaseName: randomCouchString(12),
                            collectionName: randomCouchString(12),
                            options: {}
                        });

                    const emitted: RxStorageChangeEvent<RxLocalDocumentData>[] = [];
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
                    const storageInstance = await rxStorageImplementation
                        .getStorage()
                        .createKeyObjectStorageInstance({
                            databaseName: randomCouchString(12),
                            collectionName: randomCouchString(12),
                            options: {}
                        });

                    const emitted: RxStorageChangeEvent<RxLocalDocumentData>[] = [];
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
                    previous = getFromMapOrThrow(firstWriteResult.success, writeData._id);

                    // update
                    const updateResult = await storageInstance.bulkWrite([{
                        previous,
                        document: writeData
                    }]);
                    previous = getFromMapOrThrow(updateResult.success, writeData._id);

                    // delete
                    writeData._deleted = true;
                    await storageInstance.bulkWrite([{
                        previous,
                        document: writeData
                    }]);

                    await waitUntil(() => emitted.length === 3);

                    const last = lastOfArray(emitted);
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
                    const storageInstance = await rxStorageImplementation
                        .getStorage()
                        .createKeyObjectStorageInstance({
                            databaseName,
                            collectionName,
                            options: {}
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

                    const storageInstance2 = await rxStorageImplementation.getStorage().createKeyObjectStorageInstance({
                        databaseName,
                        collectionName,
                        options: {}
                    });
                    const docs = await storageInstance2.findLocalDocumentsById(['foobar']);
                    assert.strictEqual(docs.size, 0);

                    storageInstance.close();
                    storageInstance2.close();
                });
            });
        });
        describe('multiInstance', () => {
            async function getMultiInstaneRxStorageInstance(): Promise<MultiInstanceInstances> {
                const databaseName = randomCouchString(12);
                const collectionName = randomCouchString(12);
                const channelName = randomCouchString(12);
                const broadcastChannelA = new BroadcastChannel(channelName);
                const broadcastChannelB = new BroadcastChannel(channelName);
                const leaderElectorA = getLeaderElectorByBroadcastChannel(broadcastChannelA);

                // ensure A is always leader
                await leaderElectorA.awaitLeadership();

                const leaderElectorB = getLeaderElectorByBroadcastChannel(broadcastChannelB);
                const a = await rxStorageImplementation.getStorage().createStorageInstance<TestDocType>({
                    databaseName,
                    collectionName,
                    schema: getPseudoSchemaForVersion(0, 'key'),
                    options: {},
                    broadcastChannel: broadcastChannelA
                });
                const b = await rxStorageImplementation.getStorage().createStorageInstance<TestDocType>({
                    databaseName,
                    collectionName,
                    schema: getPseudoSchemaForVersion(0, 'key'),
                    options: {},
                    broadcastChannel: broadcastChannelB
                });
                return {
                    broadcastChannelA,
                    broadcastChannelB,
                    leaderElectorA,
                    leaderElectorB,
                    a,
                    b
                };
            }
            async function closeMultiInstaneRxStorageInstance(instances: MultiInstanceInstances) {
                await instances.broadcastChannelA.close();
                await instances.broadcastChannelB.close();
                await instances.a.close();
                await instances.b.close();
            }
            async function getMultiInstaneRxKeyObjectInstance(): Promise<MultiInstanceKeyObjectInstances> {
                const databaseName = randomCouchString(12);
                const collectionName = randomCouchString(12);
                const channelName = randomCouchString(12);
                const broadcastChannelA = new BroadcastChannel(channelName);
                const broadcastChannelB = new BroadcastChannel(channelName);
                const leaderElectorA = getLeaderElectorByBroadcastChannel(broadcastChannelA);

                // ensure A is always leader
                await leaderElectorA.awaitLeadership();

                const leaderElectorB = getLeaderElectorByBroadcastChannel(broadcastChannelB);
                const a = await rxStorageImplementation.getStorage().createKeyObjectStorageInstance({
                    databaseName,
                    collectionName,
                    options: {},
                    broadcastChannel: broadcastChannelA
                });
                const b = await rxStorageImplementation.getStorage().createKeyObjectStorageInstance({
                    databaseName,
                    collectionName,
                    options: {},
                    broadcastChannel: broadcastChannelB
                });
                return {
                    broadcastChannelA,
                    broadcastChannelB,
                    leaderElectorA,
                    leaderElectorB,
                    a,
                    b
                };
            }
            async function closeMultiInstaneRxKeyObjectInstance(instances: MultiInstanceKeyObjectInstances) {
                await instances.broadcastChannelA.close();
                await instances.broadcastChannelB.close();
                await instances.a.close();
                await instances.b.close();
            }
            describe('RxStorageInstance', () => {
                it('should be able to write and read documents', async () => {
                    const instances = await getMultiInstaneRxStorageInstance();

                    const emittedB: RxStorageChangeEvent<RxDocumentData<TestDocType>>[] = [];
                    instances.b.changeStream().subscribe(ev => emittedB.push(ev));
                    const emittedA: RxStorageChangeEvent<RxDocumentData<TestDocType>>[] = [];
                    instances.a.changeStream().subscribe(ev => emittedA.push(ev));

                    // insert a document on A
                    const writeData = getWriteData();
                    await instances.a.bulkWrite([{ document: writeData }]);

                    // find the document on B
                    await waitUntil(async () => {
                        try {
                            const foundAgain = await instances.b.findDocumentsById([writeData.key], false);
                            const foundDoc = getFromMapOrThrow(foundAgain, writeData.key);
                            assert.strictEqual(foundDoc.key, writeData.key);
                            return true;
                        } catch (err) {
                            return false;
                        }
                    });

                    // find via query
                    const preparedQuery: PreparedQuery<TestDocType> = instances.b.prepareQuery({
                        selector: {},
                        limit: 1
                    });
                    const foundViaQuery = await instances.b.query(preparedQuery);
                    assert.strictEqual(foundViaQuery.documents.length, 1);
                    const foundViaQueryDoc = foundViaQuery.documents.find(doc => doc.key === writeData.key);
                    assert.ok(foundViaQueryDoc);

                    // add a document via bulkAddRevisions()
                    const writeDataViaRevision: RxDocumentData<TestDocType> = {
                        key: 'foobar',
                        value: 'barfoo',
                        _attachments: {},
                        _rev: '1-a723631364fbfa906c5ffb8203ac9725'
                    };
                    await instances.b.bulkAddRevisions([writeDataViaRevision]);

                    // should return an error on conflict write
                    const brokenDoc = clone(writeData);
                    const brokenResponse = await instances.b.bulkWrite([{
                        document: brokenDoc
                    }]);
                    assert.strictEqual(brokenResponse.error.size, 1);
                    assert.strictEqual(brokenResponse.success.size, 0);

                    // find by id
                    const foundAgainViaRev = await instances.b.findDocumentsById([writeDataViaRevision.key], false);
                    const foundDocViaRev = getFromMapOrThrow(foundAgainViaRev, writeDataViaRevision.key);
                    assert.strictEqual(foundDocViaRev.key, writeDataViaRevision.key);

                    // close both
                    await closeMultiInstaneRxStorageInstance(instances);
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
                            const foundAgain = await instances.b.findLocalDocumentsById([writeData._id]);
                            const foundDoc = getFromMapOrThrow(foundAgain, writeData._id);
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
});
