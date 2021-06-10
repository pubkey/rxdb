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
    writeSingle,
    blobBufferUtil,
    flatClone
} from '../../plugins/core';

import { RxDBKeyCompressionPlugin } from '../../plugins/key-compression';
addRxPlugin(RxDBKeyCompressionPlugin);
import { RxDBValidatePlugin } from '../../plugins/validate';
addRxPlugin(RxDBValidatePlugin);

import { RxDBQueryBuilderPlugin } from '../../plugins/query-builder';
import { randomString, wait, waitUntil } from 'async-test-util';
import {
    RxDocumentData,
    RxDocumentWriteData,
    RxLocalDocumentData,
    RxStorageChangeEvent
} from '../../src/types';
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
                    [{
                        document: {
                            key: 'foobar',
                            value: 'barfoo',
                            _attachments: {}
                        }
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
        });
        describe('.bulkAddRevisions()', () => {
            it('should add the revisions for new documents', async () => {
                const storageInstance = await storage.createStorageInstance<TestDocType>({
                    databaseName: randomCouchString(12),
                    collectionName: randomCouchString(12),
                    schema: getPseudoSchemaForVersion(0, 'key'),
                    options: {}
                });

                const writeData: RxDocumentData<TestDocType> = {
                    key: 'foobar',
                    value: 'barfoo',
                    _attachments: {},
                    _rev: '1-a723631364fbfa906c5ffa8203ac9725'
                };

                await storageInstance.bulkAddRevisions(
                    [
                        writeData
                    ]
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
        });
        describe('.getChanges()', () => {
            it('should get the correct changes', async () => {

                const storageInstance = await storage.createStorageInstance<TestDocType>({
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
                writeData.value = 'two';
                const updateResult = await storageInstance.bulkWrite([{
                    previous,
                    document: writeData
                }]);
                previous = getFromMapOrThrow(updateResult.success, writeData.key);
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
                writeData._deleted = true;
                await storageInstance.bulkWrite([{
                    previous,
                    document: writeData
                }]);
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
            it('should emit exactly one event on write', async () => {
                const storageInstance = await storage.createStorageInstance<TestDocType>({
                    databaseName: randomCouchString(12),
                    collectionName: randomCouchString(12),
                    schema: getPseudoSchemaForVersion(0, 'key'),
                    options: {
                        auto_compaction: false
                    }
                });

                const emitted: RxStorageChangeEvent<TestDocType>[] = [];
                const sub = storageInstance.changeStream().subscribe(x => {
                    console.log('emit event:');
                    console.dir(x);
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
                const storageInstance = await storage.createStorageInstance<TestDocType>({
                    databaseName: randomCouchString(12),
                    collectionName: randomCouchString(12),
                    schema: getPseudoSchemaForVersion(0, 'key'),
                    options: {
                        auto_compaction: false
                    }
                });

                const emitted: RxStorageChangeEvent<TestDocType>[] = [];
                const sub = storageInstance.changeStream().subscribe(x => {
                    console.log('emit event:');
                    console.dir(x);
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

                console.dir(emitted);

                assert.strictEqual(last.change.operation, 'DELETE');
                assert.ok(last.change.previous);

                sub.unsubscribe();
                storageInstance.close();
            });
            it('should emit changes accross different instances of the same name', async () => {
                const sameName = randomCouchString(12);
                const storageInstance1 = await storage.createStorageInstance<TestDocType>({
                    databaseName: sameName,
                    collectionName: sameName,
                    schema: getPseudoSchemaForVersion(0, 'key'),
                    options: {}
                });
                const storageInstance2 = await storage.createStorageInstance<TestDocType>({
                    databaseName: sameName,
                    collectionName: sameName,
                    schema: getPseudoSchemaForVersion(0, 'key'),
                    options: {}
                });

                // listen to instance 1
                const emitted: RxStorageChangeEvent<TestDocType>[] = [];
                const sub = storageInstance1.changeStream().subscribe(x => emitted.push(x));

                // make writes to instance 2
                const writeData: RxDocumentWriteData<TestDocType> = {
                    key: 'foobar',
                    value: 'one',
                    _deleted: false,
                    _attachments: {}
                };

                // overwrite = false
                await writeSingle(
                    storageInstance2,
                    {
                        document: writeData
                    }
                );
                await waitUntil(() => emitted.length === 1);
                assert.strictEqual(emitted[0].change.id, writeData.key);

                // overwrite = true
                writeData.key = 'barfoo';
                writeData._rev = '1-a723631364fbfa906c5ffa8203ac9725';
                await storageInstance2.bulkAddRevisions(
                    [writeData as any]
                );
                await waitUntil(() => emitted.length === 2);
                assert.strictEqual(emitted[1].change.id, writeData.key);

                sub.unsubscribe();
                storageInstance1.close();
                storageInstance2.close();
            });
            it('should emit changes when bulkAddRevisions() is used to set the newest revision', async () => {
                const storageInstance = await storage.createStorageInstance<TestDocType>({
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
                const writeResult = await writeSingle(
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

                console.log(JSON.stringify(emitted, null, 4));


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
        });
        describe('attachments', () => {
            it('should return the correct attachment object on all document fetch methods', async () => {
                const storageInstance = await storage.createStorageInstance<TestDocType>({
                    databaseName: randomCouchString(12),
                    collectionName: randomCouchString(12),
                    schema: getPseudoSchemaForVersion(0, 'key'),
                    options: {
                        auto_compaction: false
                    }
                });

                const emitted: RxStorageChangeEvent<any>[] = [];
                const sub = storageInstance.changeStream().subscribe(x => {
                    console.log('emitted event:');
                    console.dir(x);
                    emitted.push(x);
                });

                const attachmentData = randomString(20);
                const dataBlobBuffer = blobBufferUtil.createBlobBuffer(
                    attachmentData,
                    'text/plain'
                );
                const attachmentHash = await storage.hash(dataBlobBuffer);

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


                const byId = await storageInstance.findDocumentsById([writeData.key]);
                const byIdDoc = getFromMapOrThrow(byId, writeData.key);
                assert.strictEqual(byIdDoc._attachments.foo.type, 'text/plain');
                assert.strictEqual(byIdDoc._attachments.foo.length, attachmentData.length);



                // test emitted
                assert.strictEqual(emitted[0].change.doc._attachments.foo.type, 'text/plain');
                assert.strictEqual(emitted[0].change.doc._attachments.foo.length, attachmentData.length);


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
                    [{
                        document: {
                            _id: 'foobar',
                            value: 'barfoo',
                            _attachments: {}
                        }
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
                    [{
                        document: writeDoc
                    }]
                );
                const writeDocResult = getFromMapOrThrow(firstWriteResult.success, writeDoc._id);
                writeDoc._rev = writeDocResult._rev;
                writeDoc._deleted = true;
                await storageInstance.bulkWrite(
                    [{
                        document: writeDoc
                    }]
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
                const storageInstance = await storage.createKeyObjectStorageInstance(
                    randomCouchString(12),
                    randomCouchString(12),
                    {}
                );

                const emitted: RxStorageChangeEvent<RxLocalDocumentData>[] = [];
                const sub = storageInstance.changeStream().subscribe(x => {
                    console.log('emit event:');
                    console.dir(x);
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
                const storageInstance = await storage.createKeyObjectStorageInstance(
                    randomCouchString(12),
                    randomCouchString(12),
                    {}
                );

                const emitted: RxStorageChangeEvent<RxLocalDocumentData>[] = [];
                const sub = storageInstance.changeStream().subscribe(x => {
                    console.log('emit event:');
                    console.dir(x);
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

                console.dir(emitted);

                assert.strictEqual(last.change.operation, 'DELETE');
                assert.ok(last.change.previous);

                sub.unsubscribe();
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
                await storageInstance.bulkWrite([
                    {
                        document: {
                            key: 'foobar',
                            _attachments: {}
                        }
                    },
                    {
                        document: {
                            key: 'foobar2',
                            _attachments: {}
                        }
                    }
                ]);
                const latestAfter = await getNewestSequence(storageInstance);
                assert.ok(latestAfter > latestBefore);

                storageInstance.close();
            });
        });
    });
});
