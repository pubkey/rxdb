import assert from 'assert';
import { Subject } from 'rxjs';
import {
    DocumentCache,
    mapDocumentsDataToCacheDocs
} from '../../dist/esm/doc-cache.js';
import type {
    RxDocumentData,
    RxStorageChangeEvent
} from '../../plugins/core/index.mjs';
import {
    EXAMPLE_REVISION_1,
    EXAMPLE_REVISION_2,
    EXAMPLE_REVISION_3
} from '../../plugins/test-utils/index.mjs';
import { describeParallel } from './config.ts';

type TestDocType = {
    id: string;
    name: string;
    age: number;
};

function createFakeDocData(
    id: string,
    rev: string,
    lwt: number = 1,
    name: string = 'Alice',
    age: number = 30
): RxDocumentData<TestDocType> {
    return {
        id,
        name,
        age,
        _rev: rev,
        _deleted: false,
        _attachments: {},
        _meta: {
            lwt
        }
    } as any;
}

/**
 * Minimal mock RxDocument for testing.
 * Only includes the properties used by the doc-cache internals.
 */
function createMockDocument(docData: RxDocumentData<TestDocType>) {
    return {
        _data: docData,
        get primary() {
            return docData.id;
        },
        get revision() {
            return docData._rev;
        }
    };
}

function createDocumentCache(
    changes$?: Subject<RxStorageChangeEvent<TestDocType>[]>
) {
    if (!changes$) {
        changes$ = new Subject();
    }
    const cache = new DocumentCache<TestDocType, {}>(
        'id',
        changes$.asObservable(),
        (docData) => createMockDocument(docData) as any
    );
    return { cache, changes$ };
}

describeParallel('doc-cache.test.ts', () => {
    describe('DocumentCache', () => {
        describe('.getCachedRxDocuments()', () => {
            it('should create a new document if not cached', () => {
                const { cache } = createDocumentCache();
                const docData = createFakeDocData('doc1', EXAMPLE_REVISION_1);
                const results = cache.getCachedRxDocuments([docData]);
                assert.strictEqual(results.length, 1);
                assert.strictEqual((results[0] as any).primary, 'doc1');
            });
            it('should return the same instance for the same revision', () => {
                const { cache } = createDocumentCache();
                const docData = createFakeDocData('doc1', EXAMPLE_REVISION_1);
                const results1 = cache.getCachedRxDocuments([docData]);
                const results2 = cache.getCachedRxDocuments([docData]);
                assert.strictEqual(results1[0], results2[0]);
            });
            it('should return different instances for different revisions', () => {
                const { cache } = createDocumentCache();
                const docData1 = createFakeDocData('doc1', EXAMPLE_REVISION_1);
                const docData2 = createFakeDocData('doc1', EXAMPLE_REVISION_2);
                const results1 = cache.getCachedRxDocuments([docData1]);
                const results2 = cache.getCachedRxDocuments([docData2]);
                assert.notStrictEqual(results1[0], results2[0]);
            });
            it('should handle multiple documents at once', () => {
                const { cache } = createDocumentCache();
                const docs = [
                    createFakeDocData('doc1', EXAMPLE_REVISION_1),
                    createFakeDocData('doc2', EXAMPLE_REVISION_1),
                    createFakeDocData('doc3', EXAMPLE_REVISION_1)
                ];
                const results = cache.getCachedRxDocuments(docs);
                assert.strictEqual(results.length, 3);
                assert.strictEqual((results[0] as any).primary, 'doc1');
                assert.strictEqual((results[1] as any).primary, 'doc2');
                assert.strictEqual((results[2] as any).primary, 'doc3');
            });
            it('should handle empty array', () => {
                const { cache } = createDocumentCache();
                const results = cache.getCachedRxDocuments([]);
                assert.strictEqual(results.length, 0);
            });
            it('should differentiate by lwt even with the same revision height', () => {
                const { cache } = createDocumentCache();
                const docData1 = createFakeDocData('doc1', EXAMPLE_REVISION_1, 100);
                const docData2 = createFakeDocData('doc1', EXAMPLE_REVISION_1, 200);
                const results1 = cache.getCachedRxDocuments([docData1]);
                const results2 = cache.getCachedRxDocuments([docData2]);
                assert.notStrictEqual(results1[0], results2[0]);
            });
        });

        describe('.getCachedRxDocument()', () => {
            it('should return a single cached document', () => {
                const { cache } = createDocumentCache();
                const docData = createFakeDocData('doc1', EXAMPLE_REVISION_1);
                const result = cache.getCachedRxDocument(docData);
                assert.strictEqual((result as any).primary, 'doc1');
            });
            it('should return the same instance on repeated calls', () => {
                const { cache } = createDocumentCache();
                const docData = createFakeDocData('doc1', EXAMPLE_REVISION_1);
                const result1 = cache.getCachedRxDocument(docData);
                const result2 = cache.getCachedRxDocument(docData);
                assert.strictEqual(result1, result2);
            });
        });

        describe('.getLatestDocumentData()', () => {
            it('should return the latest document data after caching', () => {
                const { cache } = createDocumentCache();
                const docData = createFakeDocData('doc1', EXAMPLE_REVISION_1);
                cache.getCachedRxDocuments([docData]);
                const latest = cache.getLatestDocumentData('doc1');
                assert.strictEqual(latest.id, 'doc1');
                assert.strictEqual(latest._rev, EXAMPLE_REVISION_1);
            });
            it('should throw if document is not in cache', () => {
                const { cache } = createDocumentCache();
                assert.throws(() => {
                    cache.getLatestDocumentData('nonexistent');
                });
            });
        });

        describe('.getLatestDocumentDataIfExists()', () => {
            it('should return undefined if not in cache', () => {
                const { cache } = createDocumentCache();
                const result = cache.getLatestDocumentDataIfExists('nonexistent');
                assert.strictEqual(result, undefined);
            });
            it('should return document data if in cache', () => {
                const { cache } = createDocumentCache();
                const docData = createFakeDocData('doc1', EXAMPLE_REVISION_1);
                cache.getCachedRxDocuments([docData]);
                const result = cache.getLatestDocumentDataIfExists('doc1');
                assert.ok(result);
                assert.strictEqual((result as RxDocumentData<TestDocType>).id, 'doc1');
            });
        });

        describe('change stream updates', () => {
            it('should update latestDoc when change event is emitted', () => {
                const { cache, changes$ } = createDocumentCache();
                const docData1 = createFakeDocData('doc1', EXAMPLE_REVISION_1, 1, 'Alice', 30);
                cache.getCachedRxDocuments([docData1]);

                const docData2 = createFakeDocData('doc1', EXAMPLE_REVISION_2, 2, 'Bob', 31);
                changes$.next([{
                    documentId: 'doc1',
                    documentData: docData2,
                    previousDocumentData: docData1,
                    operation: 'UPDATE',
                    isLocal: false
                } as any]);

                cache.processTasks();
                const latest = cache.getLatestDocumentData('doc1');
                assert.strictEqual(latest.name, 'Bob');
                assert.strictEqual(latest.age, 31);
                assert.strictEqual(latest._rev, EXAMPLE_REVISION_2);
            });
            it('should fall back to previousDocumentData if documentData is missing', () => {
                const { cache, changes$ } = createDocumentCache();
                const docData1 = createFakeDocData('doc1', EXAMPLE_REVISION_1, 1, 'Alice', 30);
                cache.getCachedRxDocuments([docData1]);

                changes$.next([{
                    documentId: 'doc1',
                    documentData: undefined as any,
                    previousDocumentData: createFakeDocData('doc1', EXAMPLE_REVISION_1, 1, 'FallbackName', 99),
                    operation: 'DELETE',
                    isLocal: false
                } as any]);

                cache.processTasks();
                const latest = cache.getLatestDocumentData('doc1');
                assert.strictEqual(latest.name, 'FallbackName');
            });
            it('should ignore change events for documents not in cache', () => {
                const { cache, changes$ } = createDocumentCache();
                const docData = createFakeDocData('unknown', EXAMPLE_REVISION_1);
                changes$.next([{
                    documentId: 'unknown',
                    documentData: docData,
                    previousDocumentData: undefined,
                    operation: 'INSERT',
                    isLocal: false
                } as any]);

                cache.processTasks();
                const result = cache.getLatestDocumentDataIfExists('unknown');
                assert.strictEqual(result, undefined);
            });
        });

        describe('.processTasks()', () => {
            it('should do nothing when no tasks exist', () => {
                const { cache } = createDocumentCache();
                assert.strictEqual(cache.tasks.size, 0);
                cache.processTasks();
                assert.strictEqual(cache.tasks.size, 0);
            });
            it('should clear tasks after processing', () => {
                const { cache, changes$ } = createDocumentCache();
                const docData = createFakeDocData('doc1', EXAMPLE_REVISION_1);
                cache.getCachedRxDocuments([docData]);

                changes$.next([{
                    documentId: 'doc1',
                    documentData: createFakeDocData('doc1', EXAMPLE_REVISION_2, 2),
                    previousDocumentData: docData,
                    operation: 'UPDATE',
                    isLocal: false
                } as any]);

                assert.ok(cache.tasks.size > 0);
                cache.processTasks();
                assert.strictEqual(cache.tasks.size, 0);
            });
        });

        describe('cacheItemByDocId', () => {
            it('should create a cache entry when a document is first cached', () => {
                const { cache } = createDocumentCache();
                assert.strictEqual(cache.cacheItemByDocId.size, 0);
                const docData = createFakeDocData('doc1', EXAMPLE_REVISION_1);
                cache.getCachedRxDocuments([docData]);
                assert.strictEqual(cache.cacheItemByDocId.size, 1);
                assert.ok(cache.cacheItemByDocId.has('doc1'));
            });
            it('should store multiple revisions for the same document', () => {
                const { cache } = createDocumentCache();
                const docData1 = createFakeDocData('doc1', EXAMPLE_REVISION_1);
                const docData2 = createFakeDocData('doc1', EXAMPLE_REVISION_2);
                const docData3 = createFakeDocData('doc1', EXAMPLE_REVISION_3);
                cache.getCachedRxDocuments([docData1]);
                cache.getCachedRxDocuments([docData2]);
                cache.getCachedRxDocuments([docData3]);
                const cacheItem = cache.cacheItemByDocId.get('doc1');
                assert.ok(cacheItem);
                const byRevMap = (cacheItem as any)[0] as Map<string, any>;
                assert.strictEqual(byRevMap.size, 3);
            });
            it('should store latestDoc data in the cache item', () => {
                const { cache } = createDocumentCache();
                const docData = createFakeDocData('doc1', EXAMPLE_REVISION_1, 1, 'TestName', 42);
                cache.getCachedRxDocuments([docData]);
                const cacheItem = cache.cacheItemByDocId.get('doc1');
                assert.ok(cacheItem);
                const latestData = (cacheItem as any)[1] as RxDocumentData<TestDocType>;
                assert.strictEqual(latestData.name, 'TestName');
                assert.strictEqual(latestData.age, 42);
            });
        });
    });

    describe('mapDocumentsDataToCacheDocs()', () => {
        it('should map document data array through the cache', () => {
            const { cache } = createDocumentCache();
            const docs = [
                createFakeDocData('doc1', EXAMPLE_REVISION_1),
                createFakeDocData('doc2', EXAMPLE_REVISION_1)
            ];
            const results = mapDocumentsDataToCacheDocs(cache, docs);
            assert.strictEqual(results.length, 2);
            assert.strictEqual((results[0] as any).primary, 'doc1');
            assert.strictEqual((results[1] as any).primary, 'doc2');
        });
        it('should return the same cached instances as getCachedRxDocuments', () => {
            const { cache } = createDocumentCache();
            const docData = createFakeDocData('doc1', EXAMPLE_REVISION_1);
            const fromDirect = cache.getCachedRxDocuments([docData]);
            const fromHelper = mapDocumentsDataToCacheDocs(cache, [docData]);
            assert.strictEqual(fromDirect[0], fromHelper[0]);
        });
    });
});
