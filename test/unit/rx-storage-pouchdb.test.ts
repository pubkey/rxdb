import assert from 'assert';

import config from './config';
import * as humansCollection from './../helper/humans-collection';
import * as schemaObjects from '../helper/schema-objects';
import {
    getRxStoragePouch,
    addRxPlugin,
    RxStoragePouch,
    randomCouchString,
    getPseudoSchemaForVersion,
    getFromMapOrThrow,
    getNewestSequence,
    lastOfArray,
    writeSingle
} from '../../plugins/core';

import { RxDBKeyCompressionPlugin } from '../../plugins/key-compression';
addRxPlugin(RxDBKeyCompressionPlugin);
import { RxDBValidatePlugin } from '../../plugins/validate';
addRxPlugin(RxDBValidatePlugin);

import { RxDBQueryBuilderPlugin } from '../../plugins/query-builder';
import { randomString, waitUntil } from 'async-test-util';
import { ChangeStreamEvent, RxDocumentData, RxDocumentWriteData } from '../../src/types';
addRxPlugin(RxDBQueryBuilderPlugin);

declare type TestDocType = { key: string; value: string; };

config.parallel('rx-storage-pouchdb.test.js', () => {
    const storage: RxStoragePouch = getRxStoragePouch('memory');


    describe('RxStorageInstance', () => {
        describe('.bulkWrite()', () => {
            it('should write the documents', async () => {
                const storageInstance = await storage.createStorageInstance<TestDocType>({
                    databaseName: randomCouchString(12),
                    collectionName: randomCouchString(12),
                    schema: getPseudoSchemaForVersion(0, 'key'),
                    options: {}
                });

                const writeResponse = await storageInstance.bulkWrite(
                    false,
                    [{
                        key: 'foobar',
                        value: 'barfoo',
                        _attachments: {}
                    }]
                );

                assert.strictEqual(writeResponse.error.size, 0);
                const first = getFromMapOrThrow(writeResponse.success, 'foobar');
                assert.strictEqual(first.key, 'foobar');
                assert.strictEqual(first.value, 'barfoo');
                assert.ok(first._rev);

                storageInstance.close();
            });
            it('should error on conflict', async () => {
                const storageInstance = await storage.createStorageInstance<TestDocType>({
                    databaseName: randomCouchString(12),
                    collectionName: randomCouchString(12),
                    schema: getPseudoSchemaForVersion(0, 'key'),
                    options: {}
                });

                const writeData = [{
                    key: 'foobar',
                    value: 'barfoo',
                    _attachments: {}
                }];

                await storageInstance.bulkWrite(
                    false,
                    writeData
                );
                const writeResponse = await storageInstance.bulkWrite(
                    false,
                    writeData
                );

                assert.strictEqual(writeResponse.success.size, 0);
                const first = getFromMapOrThrow(writeResponse.error, 'foobar');
                assert.strictEqual(first.status, 409);
                assert.strictEqual(first.documentId, 'foobar');
                assert.ok(first.document);

                storageInstance.close();
            });
            it('should work with overwrite=true', async () => {
                const storageInstance = await storage.createStorageInstance<TestDocType>({
                    databaseName: randomCouchString(12),
                    collectionName: randomCouchString(12),
                    schema: getPseudoSchemaForVersion(0, 'key'),
                    options: {}
                });

                const writeData: RxDocumentWriteData<TestDocType> = {
                    key: 'foobar',
                    value: 'barfoo',
                    _attachments: {},
                    _rev: '1-a723631364fbfa906c5ffa8203ac9725'
                };

                await writeSingle(
                    storageInstance,
                    true,
                    writeData
                );

                const found = await storageInstance.findDocumentsById([writeData.key]);
                const doc = getFromMapOrThrow(found, writeData.key);
                assert.ok(doc);
                assert.strictEqual(doc.value, writeData.value);
                // because overwrite=true, the _rev from the input data must be used.
                assert.strictEqual(doc._rev, writeData._rev);

                storageInstance.close();
            });
        });
        describe('.getSortComparator()', () => {
            it('should sort in the correct order', async () => {
                const col = await humansCollection.create(1);

                const query = col
                    .find()
                    .limit(1000)
                    .sort('age')
                    .toJSON();
                const comparator = col.storageInstance.getSortComparator(
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
                col.database.destroy();
            });
        });
        describe('.getQueryMatcher()', () => {
            it('should match the right docs', async () => {
                const col = await humansCollection.create(1);

                const queryMatcher = col.storageInstance.getQueryMatcher(
                    col.find({
                        selector: {
                            age: {
                                $gt: 10,
                                $ne: 50
                            }
                        }
                    }).toJSON()
                );

                const doc1: any = schemaObjects.human();
                doc1._id = 'aa';
                doc1.age = 1;
                const doc2: any = schemaObjects.human();
                doc2._id = 'bb';
                doc2.age = 100;

                assert.strictEqual(queryMatcher(doc1), false);
                assert.strictEqual(queryMatcher(doc2), true);

                col.database.destroy();
            });
        });
        describe('.query()', () => {
            it('should find all documents', async () => {
                const storageInstance = await storage.createStorageInstance<{ key: string; value: string; }>({
                    databaseName: randomCouchString(12),
                    collectionName: randomCouchString(12),
                    schema: getPseudoSchemaForVersion(0, 'key'),
                    options: {}
                });

                const writeData = [{
                    key: 'foobar',
                    value: 'barfoo',
                    _attachments: {}
                }];

                await storageInstance.bulkWrite(
                    false,
                    writeData
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
        });
        describe('.getChanges()', () => {
            it('should get the correct changes', async () => {

                const storageInstance = await storage.createStorageInstance<{ key: string; value: string; }>({
                    databaseName: randomCouchString(12),
                    collectionName: randomCouchString(12),
                    schema: getPseudoSchemaForVersion(0, 'key'),
                    options: {
                        auto_compaction: false
                    }
                });
                const writeData = {
                    key: 'foobar',
                    value: 'one',
                    _attachments: {},
                    _rev: undefined as any,
                    _deleted: false
                };

                // insert
                const firstWriteResult = await storageInstance.bulkWrite(false, [writeData]);
                const writeDocResult = getFromMapOrThrow(firstWriteResult.success, writeData.key);

                const changesAfterWrite = await storageInstance.getChanges({
                    order: 'asc',
                    startSequence: 0
                });
                const firstChangeAfterWrite = changesAfterWrite.changes[0];
                if (!firstChangeAfterWrite || !firstChangeAfterWrite.doc) {
                    throw new Error('missing change');
                }
                assert.ok(firstChangeAfterWrite.operation === 'INSERT');
                assert.strictEqual(firstChangeAfterWrite.sequence, 1);


                // update
                writeData._rev = writeDocResult._rev;
                const updateResult = await storageInstance.bulkWrite(false, [writeData]);
                const updateDocResult = getFromMapOrThrow(updateResult.success, writeData.key);
                const changesAfterUpdate = await storageInstance.getChanges({
                    order: 'asc',
                    startSequence: 0
                });
                const firstChangeAfterUpdate = changesAfterUpdate.changes[0];
                if (!firstChangeAfterUpdate || !firstChangeAfterUpdate.doc) {
                    throw new Error('missing change');
                }

                assert.ok(firstChangeAfterUpdate.operation === 'UPDATE');
                assert.strictEqual(firstChangeAfterUpdate.sequence, 2);

                // delete
                writeData._rev = updateDocResult._rev;
                writeData._deleted = true;
                await storageInstance.bulkWrite(false, [writeData]);
                const changesAfterDelete = await storageInstance.getChanges({
                    order: 'asc',
                    startSequence: 0
                });
                const firstChangeAfterDelete = changesAfterDelete.changes[0];
                if (!firstChangeAfterDelete || !firstChangeAfterDelete.previous) {
                    throw new Error('missing change');
                }
                assert.ok(firstChangeAfterDelete.operation === 'DELETE');
                assert.strictEqual(firstChangeAfterDelete.sequence, 3);

                assert.strictEqual(changesAfterDelete.lastSequence, 3);


                storageInstance.close();
            });
        });
        describe('.changeStream()', () => {
            it('should emit all events', async () => {
                const storageInstance = await storage.createStorageInstance<TestDocType>({
                    databaseName: randomCouchString(12),
                    collectionName: randomCouchString(12),
                    schema: getPseudoSchemaForVersion(0, 'key'),
                    options: {
                        auto_compaction: false
                    }
                });

                const emitted: ChangeStreamEvent<any>[] = [];
                const sub = storageInstance.changeStream({
                    startSequence: 0
                }).subscribe(x => emitted.push(x));

                const writeData = {
                    key: 'foobar',
                    value: 'one',
                    _rev: undefined as any,
                    _deleted: false,
                    _attachments: {}
                };

                // insert
                const firstWriteResult = await storageInstance.bulkWrite(false, [writeData]);
                const writeDocResult = getFromMapOrThrow(firstWriteResult.success, writeData.key);
                writeData._rev = writeDocResult._rev;


                // update
                writeData._rev = writeDocResult._rev;
                const updateResult = await storageInstance.bulkWrite(false, [writeData]);
                const updateDocResult = getFromMapOrThrow(updateResult.success, writeData.key);
                writeData._rev = updateDocResult._rev;

                // delete
                writeData._rev = updateDocResult._rev;
                writeData._deleted = true;
                await storageInstance.bulkWrite(false, [writeData]);

                await waitUntil(() => emitted.length === 3);

                const last = lastOfArray(emitted);
                if (!last) {
                    throw new Error('missing last event');
                }
                assert.strictEqual(last.operation, 'DELETE');
                assert.ok(last.previous);

                sub.unsubscribe();
                storageInstance.close();
            });
        });
        describe('attachments', () => {
            it('should returns the correct attachment object on all document fetch methods', async () => {
                const storageInstance = await storage.createStorageInstance<TestDocType>({
                    databaseName: randomCouchString(12),
                    collectionName: randomCouchString(12),
                    schema: getPseudoSchemaForVersion(0, 'key'),
                    options: {
                        auto_compaction: false
                    }
                });

                const emitted: ChangeStreamEvent<any>[] = [];
                const sub = storageInstance.changeStream({
                    startSequence: 0
                }).subscribe(x => emitted.push(x));

                const attachmentData = randomString(20);
                const attachmentHash = await storage.hash(Buffer.from(attachmentData));

                const writeData: RxDocumentWriteData<TestDocType> = {
                    key: 'foobar',
                    value: 'one',
                    _rev: undefined as any,
                    _deleted: false,
                    _attachments: {
                        foo: {
                            data: Buffer.from(attachmentData),
                            type: 'text/plain'
                        }

                    }
                };

                const writeResult = await writeSingle(
                    storageInstance,
                    false,
                    writeData
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


                const byId = await storageInstance.findDocumentsById([writeData.key]);
                const byIdDoc = getFromMapOrThrow(byId, writeData.key);
                assert.strictEqual(byIdDoc._attachments.foo.type, 'text/plain');
                assert.strictEqual(byIdDoc._attachments.foo.length, attachmentData.length);



                // test emitted
                assert.strictEqual(emitted[0].doc._attachments.foo.type, 'text/plain');
                assert.strictEqual(emitted[0].doc._attachments.foo.length, attachmentData.length);


                const changesResult = await storageInstance.getChanges({
                    startSequence: 0,
                    order: 'asc'
                });
                const firstChange = changesResult.changes[0].doc;
                if (!firstChange) {
                    throw new Error('first change missing');
                }
                assert.strictEqual(firstChange._attachments.foo.type, 'text/plain');
                assert.strictEqual(firstChange._attachments.foo.length, attachmentData.length);

                sub.unsubscribe();
                storageInstance.close();
            });
            it('should be able to add multiple attachments, one each write', async () => {
                const storageInstance = await storage.createStorageInstance<TestDocType>({
                    databaseName: randomCouchString(12),
                    collectionName: randomCouchString(12),
                    schema: getPseudoSchemaForVersion(0, 'key'),
                    options: {
                        auto_compaction: false
                    }
                });

                const writeData: RxDocumentWriteData<TestDocType> = {
                    key: 'foobar',
                    value: 'one',
                    _rev: undefined as any,
                    _deleted: false,
                    _attachments: {
                        foo: {
                            data: Buffer.from(randomString(20)),
                            type: 'text/plain'
                        }
                    }
                };
                let writeResult = await writeSingle(
                    storageInstance,
                    false,
                    writeData
                );

                writeData._rev = writeResult._rev;
                writeData._attachments = writeResult._attachments as any;
                writeData._attachments.bar = {
                    data: Buffer.from(randomString(20)),
                    type: 'text/plain'
                };
                writeResult = await writeSingle(
                    storageInstance,
                    false,
                    writeData
                );

                assert.strictEqual(Object.keys(writeResult._attachments).length, 2);

                storageInstance.close();
            });
        });
    });
    describe('RxStorageKeyObjectInstance', () => {
        describe('RxStorageKeyObjectInstance.bulkWrite()', () => {
            it('should write the documents', async () => {
                const storageInstance = await storage.createKeyObjectStorageInstance(
                    randomCouchString(12),
                    randomCouchString(12),
                    {}
                );

                const writeResponse = await storageInstance.bulkWrite(
                    false,
                    [{
                        _id: 'foobar',
                        value: 'barfoo',
                        _attachments: {}
                    }]
                );

                assert.strictEqual(writeResponse.error.size, 0);
                const first = getFromMapOrThrow(writeResponse.success, 'foobar');
                assert.strictEqual(first._id, 'foobar');
                assert.strictEqual(first.value, 'barfoo');

                storageInstance.close();
            });
            it('should error on conflict', async () => {
                const storageInstance = await storage.createKeyObjectStorageInstance(
                    randomCouchString(12),
                    randomCouchString(12),
                    {}
                );

                const writeData = [{
                    _id: 'foobar',
                    value: 'barfoo',
                    _attachments: {}
                }];

                await storageInstance.bulkWrite(
                    false,
                    writeData
                );
                const writeResponse = await storageInstance.bulkWrite(
                    false,
                    writeData
                );

                assert.strictEqual(writeResponse.success.size, 0);
                const first = getFromMapOrThrow(writeResponse.error, 'foobar');
                assert.strictEqual(first.status, 409);
                assert.strictEqual(first.documentId, 'foobar');
                assert.ok(first.document);

                storageInstance.close();
            });
            it('should be able to delete', async () => {
                const storageInstance = await storage.createKeyObjectStorageInstance(
                    randomCouchString(12),
                    randomCouchString(12),
                    {}
                );

                const writeDoc = {
                    _id: 'foobar',
                    value: 'barfoo',
                    _deleted: false,
                    _rev: undefined as any,
                    _attachments: {}
                };

                const firstWriteResult = await storageInstance.bulkWrite(
                    false,
                    [writeDoc]
                );
                const writeDocResult = getFromMapOrThrow(firstWriteResult.success, writeDoc._id);
                writeDoc._rev = writeDocResult._rev;
                writeDoc._deleted = true;
                await storageInstance.bulkWrite(
                    false,
                    [writeDoc]
                );

                // should not find the document
                const res = await storageInstance.findLocalDocumentsById([writeDoc._id]);
                assert.strictEqual(res.has(writeDoc._id), false);

                storageInstance.close();
            });
        });
        describe('.findLocalDocumentsById()', () => {
            it('should find the documents', async () => {
                const storageInstance = await storage.createKeyObjectStorageInstance(
                    randomCouchString(12),
                    randomCouchString(12),
                    {}
                );

                const writeData = {
                    _id: 'foobar',
                    value: 'barfoo',
                    _attachments: {}
                };

                await storageInstance.bulkWrite(
                    false,
                    [writeData]
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
    });
    describe('helper', () => {
        describe('.getNewestSequence()', () => {
            it('should get the latest sequence', async () => {
                const storageInstance = await storage.createStorageInstance<{ key: string }>({
                    databaseName: randomCouchString(12),
                    collectionName: randomCouchString(12),
                    schema: getPseudoSchemaForVersion(0, 'key'),
                    options: {
                        auto_compaction: false
                    }
                });

                const latestBefore = await getNewestSequence(storageInstance);
                await storageInstance.bulkWrite(false, [
                    {
                        key: 'foobar',
                        _attachments: {}
                    },
                    {
                        key: 'foobar2',
                        _attachments: {}
                    }
                ]);
                const latestAfter = await getNewestSequence(storageInstance);
                assert.ok(latestAfter > latestBefore);

                storageInstance.close();
            });
        });
    });
});
