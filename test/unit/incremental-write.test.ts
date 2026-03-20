import assert from 'assert';
import {
    now,
    randomToken,
    fillWithDefaultSettings,
    getPrimaryFieldOfPrimaryKey
} from '../../plugins/core/index.mjs';
import {
    schemas,
    schemaObjects,
    EXAMPLE_REVISION_1,
    HumanDocumentType
} from '../../plugins/test-utils/index.mjs';
import config, { describeParallel } from './config.ts';
import {
    IncrementalWriteQueue,
    findNewestOfDocumentStates,
    modifierFromPublicToInternal
} from '../../src/incremental-write.ts';
import type {
    RxDocumentData
} from '../../plugins/core/index.mjs';

type TestDocType = {
    id: string;
    name: string;
    age: number;
};


function getTestDocData(partial?: Partial<TestDocType & { _rev: string; }>): RxDocumentData<TestDocType> {
    return {
        id: partial?.id || randomToken(10),
        name: partial?.name || 'Alice',
        age: partial?.age || 30,
        _deleted: false,
        _rev: partial?._rev || EXAMPLE_REVISION_1,
        _attachments: {},
        _meta: {
            lwt: now()
        }
    };
}

describeParallel('incremental-write.test.ts', () => {
    describe('findNewestOfDocumentStates()', () => {
        it('should return the single document when array has one element', () => {
            const doc = getTestDocData({ _rev: '1-abc' });
            const result = findNewestOfDocumentStates([doc]);
            assert.strictEqual(result, doc);
        });

        it('should return the document with the highest revision', () => {
            const doc1 = getTestDocData({ _rev: '1-aaa' });
            const doc2 = getTestDocData({ _rev: '3-ccc' });
            const doc3 = getTestDocData({ _rev: '2-bbb' });
            const result = findNewestOfDocumentStates([doc1, doc2, doc3]);
            assert.strictEqual(result, doc2);
        });

        it('should return the first document when all revisions are equal', () => {
            const doc1 = getTestDocData({ _rev: '1-aaa' });
            const doc2 = getTestDocData({ _rev: '1-bbb' });
            const result = findNewestOfDocumentStates([doc1, doc2]);
            assert.strictEqual(result, doc1);
        });

        it('should handle high revision numbers', () => {
            const doc1 = getTestDocData({ _rev: '100-aaa' });
            const doc2 = getTestDocData({ _rev: '999-bbb' });
            const doc3 = getTestDocData({ _rev: '500-ccc' });
            const result = findNewestOfDocumentStates([doc1, doc2, doc3]);
            assert.strictEqual(result, doc2);
        });
    });

    describe('modifierFromPublicToInternal()', () => {
        it('should strip meta data before passing to public modifier and reattach it', async () => {
            const docData: RxDocumentData<TestDocType> = {
                id: 'test1',
                name: 'Alice',
                age: 30,
                _deleted: false,
                _rev: '1-abc',
                _attachments: {},
                _meta: { lwt: 1000 }
            };

            const publicModifier = (doc: any) => {
                // Public modifier should not see _rev or _meta
                assert.strictEqual(doc._rev, undefined);
                assert.strictEqual(doc._meta, undefined);
                // _deleted should be present
                assert.strictEqual(doc._deleted, false);
                doc.name = 'Bob';
                return doc;
            };

            const internalModifier = modifierFromPublicToInternal(publicModifier);
            const result = await internalModifier(docData);

            assert.strictEqual(result.name, 'Bob');
            // Meta data should be reattached
            assert.strictEqual(result._rev, '1-abc');
            assert.deepStrictEqual(result._meta, { lwt: 1000 });
            assert.deepStrictEqual(result._attachments, {});
            assert.strictEqual(result._deleted, false);
        });

        it('should preserve _deleted from the modifier result if set', async () => {
            const docData: RxDocumentData<TestDocType> = {
                id: 'test1',
                name: 'Alice',
                age: 30,
                _deleted: false,
                _rev: '1-abc',
                _attachments: {},
                _meta: { lwt: 1000 }
            };

            const publicModifier = (doc: any) => {
                doc._deleted = true;
                return doc;
            };

            const internalModifier = modifierFromPublicToInternal(publicModifier);
            const result = await internalModifier(docData);
            assert.strictEqual(result._deleted, true);
        });

        it('should default _deleted to false if undefined in modifier result', async () => {
            const docData: RxDocumentData<TestDocType> = {
                id: 'test1',
                name: 'Alice',
                age: 30,
                _deleted: false,
                _rev: '1-abc',
                _attachments: {},
                _meta: { lwt: 1000 }
            };

            const publicModifier = (doc: any) => {
                delete doc._deleted;
                return doc;
            };

            const internalModifier = modifierFromPublicToInternal(publicModifier);
            const result = await internalModifier(docData);
            assert.strictEqual(result._deleted, false);
        });

        it('should work with async modifiers', async () => {
            const docData: RxDocumentData<TestDocType> = {
                id: 'test1',
                name: 'Alice',
                age: 30,
                _deleted: false,
                _rev: '1-abc',
                _attachments: {},
                _meta: { lwt: 1000 }
            };

            const publicModifier = (doc: any) => {
                return Promise.resolve(doc).then(d => {
                    d.age = 31;
                    return d;
                });
            };

            const internalModifier = modifierFromPublicToInternal(publicModifier);
            const result = await internalModifier(docData);
            assert.strictEqual(result.age, 31);
            assert.strictEqual(result._rev, '1-abc');
        });
    });

    describe('IncrementalWriteQueue', () => {
        it('should process a single write', async () => {
            const storageInstance = await config.storage.getStorage().createStorageInstance<HumanDocumentType>({
                databaseInstanceToken: randomToken(10),
                databaseName: randomToken(10),
                collectionName: randomToken(10),
                schema: fillWithDefaultSettings(schemas.human),
                options: {},
                multiInstance: false,
                devMode: true
            });

            const primaryPath = getPrimaryFieldOfPrimaryKey(schemas.human.primaryKey);
            const preWrite = () => Promise.resolve();
            const postWrite = () => { };

            const queue = new IncrementalWriteQueue(
                storageInstance,
                primaryPath,
                preWrite,
                postWrite
            );

            // First insert the document directly
            const docData = Object.assign(
                schemaObjects.humanData(),
                {
                    _deleted: false,
                    _rev: EXAMPLE_REVISION_1,
                    _attachments: {},
                    _meta: { lwt: now() }
                }
            );

            const insertResult = await storageInstance.bulkWrite(
                [{ document: docData }],
                'test-insert'
            );
            assert.strictEqual(insertResult.error.length, 0);

            // Read back the actual stored doc so _rev matches
            const findResult = await storageInstance.findDocumentsById(
                [docData[primaryPath as keyof typeof docData] as string],
                false
            );
            const storedDoc = findResult[0] as RxDocumentData<HumanDocumentType>;

            const result = await queue.addWrite(
                storedDoc,
                (doc: RxDocumentData<HumanDocumentType>) => {
                    doc.age = 99;
                    return doc;
                }
            );

            assert.strictEqual(result.age, 99);
            await storageInstance.remove();
        });

        it('should apply multiple sequential writes to the same document', async () => {
            const storageInstance = await config.storage.getStorage().createStorageInstance<HumanDocumentType>({
                databaseInstanceToken: randomToken(10),
                databaseName: randomToken(10),
                collectionName: randomToken(10),
                schema: fillWithDefaultSettings(schemas.human),
                options: {},
                multiInstance: false,
                devMode: true
            });

            const primaryPath = getPrimaryFieldOfPrimaryKey(schemas.human.primaryKey);
            const preWrite = () => Promise.resolve();
            const postWrite = () => { };

            const queue = new IncrementalWriteQueue(
                storageInstance,
                primaryPath,
                preWrite,
                postWrite
            );

            // Insert a document
            const docData = Object.assign(
                schemaObjects.humanData(),
                {
                    _deleted: false,
                    _rev: EXAMPLE_REVISION_1,
                    _attachments: {},
                    _meta: { lwt: now() }
                }
            );
            await storageInstance.bulkWrite(
                [{ document: docData }],
                'test-insert'
            );

            const findResult = await storageInstance.findDocumentsById(
                [docData[primaryPath as keyof typeof docData] as string],
                false
            );
            const storedDoc = findResult[0] as RxDocumentData<HumanDocumentType>;

            // First write
            const result1 = await queue.addWrite(storedDoc, (doc: RxDocumentData<HumanDocumentType>) => {
                doc.age = 10;
                return doc;
            });
            assert.strictEqual(result1.age, 10);

            // Second write using the result of the first
            const result2 = await queue.addWrite(result1, (doc: RxDocumentData<HumanDocumentType>) => {
                doc.age = doc.age + 5;
                return doc;
            });
            assert.strictEqual(result2.age, 15);

            await storageInstance.remove();
        });

        it('should batch writes to the same document when queued before triggerRun processes', async () => {
            const storageInstance = await config.storage.getStorage().createStorageInstance<HumanDocumentType>({
                databaseInstanceToken: randomToken(10),
                databaseName: randomToken(10),
                collectionName: randomToken(10),
                schema: fillWithDefaultSettings(schemas.human),
                options: {},
                multiInstance: false,
                devMode: true
            });

            const primaryPath = getPrimaryFieldOfPrimaryKey(schemas.human.primaryKey);
            const preWrite = () => Promise.resolve();
            const postWrite = () => { };

            const queue = new IncrementalWriteQueue(
                storageInstance,
                primaryPath,
                preWrite,
                postWrite
            );

            // Insert a document
            const docData = Object.assign(
                schemaObjects.humanData(),
                {
                    _deleted: false,
                    _rev: EXAMPLE_REVISION_1,
                    _attachments: {},
                    _meta: { lwt: now() }
                }
            );
            await storageInstance.bulkWrite(
                [{ document: docData }],
                'test-insert'
            );

            const findResult = await storageInstance.findDocumentsById(
                [docData[primaryPath as keyof typeof docData] as string],
                false
            );
            const storedDoc = findResult[0] as RxDocumentData<HumanDocumentType>;

            // Prevent triggerRun from running by setting isRunning=true
            queue.isRunning = true;

            // Queue two writes while triggerRun is "blocked"
            const p1 = queue.addWrite(storedDoc, (doc: RxDocumentData<HumanDocumentType>) => {
                doc.age = 10;
                return doc;
            });
            const p2 = queue.addWrite(storedDoc, (doc: RxDocumentData<HumanDocumentType>) => {
                doc.age = doc.age + 5;
                return doc;
            });

            // Both items should be queued
            const docId = storedDoc[primaryPath as keyof typeof storedDoc] as string;
            const queuedItems = queue.queueByDocId.get(docId);
            assert.ok(queuedItems);
            assert.strictEqual(queuedItems.length, 2);

            // Now allow the queue to process
            queue.isRunning = false;
            queue.triggerRun();

            const [result1, result2] = await Promise.all([p1, p2]);

            // Both writes resolve with the same final document state
            assert.strictEqual(result1.age, result2.age);
            // Modifiers applied in order: set to 10, then add 5 = 15
            assert.strictEqual(result2.age, 15);

            await storageInstance.remove();
        });

        it('should call postWrite after a successful write', async () => {
            const storageInstance = await config.storage.getStorage().createStorageInstance<HumanDocumentType>({
                databaseInstanceToken: randomToken(10),
                databaseName: randomToken(10),
                collectionName: randomToken(10),
                schema: fillWithDefaultSettings(schemas.human),
                options: {},
                multiInstance: false,
                devMode: true
            });

            const primaryPath = getPrimaryFieldOfPrimaryKey(schemas.human.primaryKey);
            const postWrittenDocs: RxDocumentData<HumanDocumentType>[] = [];
            const preWrite = () => Promise.resolve();
            const postWrite = (doc: RxDocumentData<HumanDocumentType>) => {
                postWrittenDocs.push(doc);
            };

            const queue = new IncrementalWriteQueue(
                storageInstance,
                primaryPath,
                preWrite,
                postWrite
            );

            const docData = Object.assign(
                schemaObjects.humanData(),
                {
                    _deleted: false,
                    _rev: EXAMPLE_REVISION_1,
                    _attachments: {},
                    _meta: { lwt: now() }
                }
            );
            await storageInstance.bulkWrite(
                [{ document: docData }],
                'test-insert'
            );

            const findResult = await storageInstance.findDocumentsById(
                [docData[primaryPath as keyof typeof docData] as string],
                false
            );
            const storedDoc = findResult[0] as RxDocumentData<HumanDocumentType>;

            await queue.addWrite(storedDoc, (doc: RxDocumentData<HumanDocumentType>) => {
                doc.age = 50;
                return doc;
            });

            assert.strictEqual(postWrittenDocs.length, 1);
            assert.strictEqual(postWrittenDocs[0].age, 50);

            await storageInstance.remove();
        });

        it('should reject all items when preWrite hook throws', async () => {
            const storageInstance = await config.storage.getStorage().createStorageInstance<HumanDocumentType>({
                databaseInstanceToken: randomToken(10),
                databaseName: randomToken(10),
                collectionName: randomToken(10),
                schema: fillWithDefaultSettings(schemas.human),
                options: {},
                multiInstance: false,
                devMode: true
            });

            const primaryPath = getPrimaryFieldOfPrimaryKey(schemas.human.primaryKey);
            const preWrite = () => {
                return Promise.reject(new Error('preWrite-hook-error'));
            };
            const postWrite = () => { };

            const queue = new IncrementalWriteQueue(
                storageInstance,
                primaryPath,
                preWrite,
                postWrite
            );

            const docData = Object.assign(
                schemaObjects.humanData(),
                {
                    _deleted: false,
                    _rev: EXAMPLE_REVISION_1,
                    _attachments: {},
                    _meta: { lwt: now() }
                }
            );
            await storageInstance.bulkWrite(
                [{ document: docData }],
                'test-insert'
            );

            const findResult = await storageInstance.findDocumentsById(
                [docData[primaryPath as keyof typeof docData] as string],
                false
            );
            const storedDoc = findResult[0] as RxDocumentData<HumanDocumentType>;

            let error: any;
            try {
                await queue.addWrite(storedDoc, (doc: RxDocumentData<HumanDocumentType>) => {
                    doc.age = 50;
                    return doc;
                });
            } catch (err) {
                error = err;
            }

            assert.ok(error);
            assert.strictEqual(error.message, 'preWrite-hook-error');

            await storageInstance.remove();
        });

        it('should handle modifier that throws and continue with other items', async () => {
            const storageInstance = await config.storage.getStorage().createStorageInstance<HumanDocumentType>({
                databaseInstanceToken: randomToken(10),
                databaseName: randomToken(10),
                collectionName: randomToken(10),
                schema: fillWithDefaultSettings(schemas.human),
                options: {},
                multiInstance: false,
                devMode: true
            });

            const primaryPath = getPrimaryFieldOfPrimaryKey(schemas.human.primaryKey);
            const preWrite = () => Promise.resolve();
            const postWrite = () => { };

            const queue = new IncrementalWriteQueue(
                storageInstance,
                primaryPath,
                preWrite,
                postWrite
            );

            // Insert two documents
            const docData1 = Object.assign(
                schemaObjects.humanData(),
                {
                    _deleted: false,
                    _rev: EXAMPLE_REVISION_1,
                    _attachments: {},
                    _meta: { lwt: now() }
                }
            );
            const docData2 = Object.assign(
                schemaObjects.humanData(),
                {
                    _deleted: false,
                    _rev: EXAMPLE_REVISION_1,
                    _attachments: {},
                    _meta: { lwt: now() }
                }
            );

            await storageInstance.bulkWrite(
                [{ document: docData1 }, { document: docData2 }],
                'test-insert'
            );

            const findResult1 = await storageInstance.findDocumentsById(
                [docData1[primaryPath as keyof typeof docData1] as string],
                false
            );
            const storedDoc1 = findResult1[0] as RxDocumentData<HumanDocumentType>;

            const findResult2 = await storageInstance.findDocumentsById(
                [docData2[primaryPath as keyof typeof docData2] as string],
                false
            );
            const storedDoc2 = findResult2[0] as RxDocumentData<HumanDocumentType>;

            // First doc's modifier throws, second succeeds
            const p1 = queue.addWrite(storedDoc1, () => {
                throw new Error('modifier-error');
            });
            const p2 = queue.addWrite(storedDoc2, (doc: RxDocumentData<HumanDocumentType>) => {
                doc.age = 42;
                return doc;
            });

            let error1: any;
            try {
                await p1;
            } catch (err) {
                error1 = err;
            }
            assert.ok(error1);
            assert.strictEqual(error1.message, 'modifier-error');

            const result2 = await p2;
            assert.strictEqual(result2.age, 42);

            await storageInstance.remove();
        });

        it('should process writes to multiple documents in one batch', async () => {
            const storageInstance = await config.storage.getStorage().createStorageInstance<HumanDocumentType>({
                databaseInstanceToken: randomToken(10),
                databaseName: randomToken(10),
                collectionName: randomToken(10),
                schema: fillWithDefaultSettings(schemas.human),
                options: {},
                multiInstance: false,
                devMode: true
            });

            const primaryPath = getPrimaryFieldOfPrimaryKey(schemas.human.primaryKey);
            let bulkWriteCalls = 0;
            const originalBulkWrite = storageInstance.bulkWrite.bind(storageInstance);
            storageInstance.bulkWrite = (rows: any, context: any) => {
                bulkWriteCalls++;
                return originalBulkWrite(rows, context);
            };

            const preWrite = () => Promise.resolve();
            const postWrite = () => { };

            const queue = new IncrementalWriteQueue(
                storageInstance,
                primaryPath,
                preWrite,
                postWrite
            );

            // Insert two documents
            const docData1 = Object.assign(
                schemaObjects.humanData(),
                {
                    _deleted: false,
                    _rev: EXAMPLE_REVISION_1,
                    _attachments: {},
                    _meta: { lwt: now() }
                }
            );
            const docData2 = Object.assign(
                schemaObjects.humanData(),
                {
                    _deleted: false,
                    _rev: EXAMPLE_REVISION_1,
                    _attachments: {},
                    _meta: { lwt: now() }
                }
            );

            await originalBulkWrite(
                [{ document: docData1 }, { document: docData2 }],
                'test-insert'
            );

            const findResult1 = await storageInstance.findDocumentsById(
                [docData1[primaryPath as keyof typeof docData1] as string],
                false
            );
            const storedDoc1 = findResult1[0] as RxDocumentData<HumanDocumentType>;

            const findResult2 = await storageInstance.findDocumentsById(
                [docData2[primaryPath as keyof typeof docData2] as string],
                false
            );
            const storedDoc2 = findResult2[0] as RxDocumentData<HumanDocumentType>;

            // Prevent triggerRun from running to ensure batching
            queue.isRunning = true;
            bulkWriteCalls = 0;
            const p1 = queue.addWrite(storedDoc1, (doc: RxDocumentData<HumanDocumentType>) => {
                doc.age = 11;
                return doc;
            });
            const p2 = queue.addWrite(storedDoc2, (doc: RxDocumentData<HumanDocumentType>) => {
                doc.age = 22;
                return doc;
            });

            // Both should be queued
            assert.strictEqual(queue.queueByDocId.size, 2);

            // Now allow the queue to process
            queue.isRunning = false;
            queue.triggerRun();

            const [result1, result2] = await Promise.all([p1, p2]);
            assert.strictEqual(result1.age, 11);
            assert.strictEqual(result2.age, 22);

            // Should have called bulkWrite only once for both docs
            assert.strictEqual(bulkWriteCalls, 1);

            await storageInstance.remove();
        });

        it('should handle an empty queue without calling bulkWrite', async () => {
            const storageInstance = await config.storage.getStorage().createStorageInstance<HumanDocumentType>({
                databaseInstanceToken: randomToken(10),
                databaseName: randomToken(10),
                collectionName: randomToken(10),
                schema: fillWithDefaultSettings(schemas.human),
                options: {},
                multiInstance: false,
                devMode: true
            });

            const primaryPath = getPrimaryFieldOfPrimaryKey(schemas.human.primaryKey);
            const preWrite = () => Promise.resolve();
            const postWrite = () => { };

            const queue = new IncrementalWriteQueue(
                storageInstance,
                primaryPath,
                preWrite,
                postWrite
            );

            // triggerRun on an empty queue should do nothing
            await queue.triggerRun();
            assert.strictEqual(queue.isRunning, false);
            assert.strictEqual(queue.queueByDocId.size, 0);

            await storageInstance.remove();
        });
    });
});
