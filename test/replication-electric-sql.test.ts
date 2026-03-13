import assert from 'assert';

import {
    randomToken,
    addRxPlugin
} from '../plugins/core/index.mjs';

import {
    schemaObjects,
    humansCollection,
    ensureReplicationHasNoErrors,
    HumanWithTimestampDocumentType
} from '../plugins/test-utils/index.mjs';

import { RxDBDevModePlugin } from '../plugins/dev-mode/index.mjs';
import config from './unit/config.ts';
import { wait, waitUntil } from 'async-test-util';

import {
    replicateElectricSQL,
    RxElectricSQLReplicationState,
    buildElectricUrl,
    electricMessageToRxDBDocData,
    hasMustRefetch,
    type ElectricSQLMessage
} from '../plugins/replication-electric-sql/index.mjs';

/**
 * The tests for the Electric-SQL replication plugin
 * use a mock fetch function because Electric-SQL
 * communicates over plain HTTP, so no real backend is needed.
 */
describe('replication-electric-sql.test.ts', function () {
    this.timeout(1000 * 20);
    addRxPlugin(RxDBDevModePlugin);
    config.storage.init?.();

    type TestDocType = HumanWithTimestampDocumentType;

    /**
     * Use a low batchSize in all tests
     * to make it easier to test boundaries.
     */
    const batchSize = 5;

    function createMockResponse(
        messages: ElectricSQLMessage<TestDocType>[],
        offset: string = '0_0',
        handle: string = 'test-handle',
        status: number = 200
    ): Response {
        const headers = new Headers();
        headers.set('electric-offset', offset);
        headers.set('electric-handle', handle);
        return new Response(JSON.stringify(messages), {
            status,
            headers
        });
    }

    function makeInsertMessage(doc: TestDocType): ElectricSQLMessage<TestDocType> {
        return {
            offset: '0_0',
            key: doc.id,
            value: doc as any,
            headers: {
                operation: 'insert'
            }
        };
    }

    function makeDeleteMessage(doc: TestDocType): ElectricSQLMessage<TestDocType> {
        return {
            offset: '0_0',
            key: doc.id,
            value: doc as any,
            headers: {
                operation: 'delete'
            }
        };
    }

    function makeUpToDateMessage(): ElectricSQLMessage<TestDocType> {
        return {
            headers: {
                control: 'up-to-date'
            }
        };
    }

    function makeMustRefetchMessage(): ElectricSQLMessage<TestDocType> {
        return {
            headers: {
                control: 'must-refetch'
            }
        };
    }

    describe('helper functions', () => {
        describe('buildElectricUrl()', () => {
            it('should build a basic URL with table and offset', () => {
                const url = buildElectricUrl(
                    'http://localhost:3000/v1/shape',
                    { table: 'items' },
                    '-1'
                );
                assert.ok(url.includes('table=items'));
                assert.ok(url.includes('offset=-1'));
                assert.ok(!url.includes('handle='));
                assert.ok(!url.includes('live='));
            });
            it('should include handle when provided', () => {
                const url = buildElectricUrl(
                    'http://localhost:3000/v1/shape',
                    { table: 'items' },
                    '0_0',
                    'my-handle'
                );
                assert.ok(url.includes('handle=my-handle'));
            });
            it('should include live=true when live mode is enabled', () => {
                const url = buildElectricUrl(
                    'http://localhost:3000/v1/shape',
                    { table: 'items' },
                    '0_0',
                    'my-handle',
                    true
                );
                assert.ok(url.includes('live=true'));
            });
            it('should include where and columns params', () => {
                const url = buildElectricUrl(
                    'http://localhost:3000/v1/shape',
                    { table: 'items', where: 'status=active', columns: 'id,name' },
                    '-1'
                );
                assert.ok(url.includes('where='));
                assert.ok(url.includes('columns='));
            });
        });
        describe('electricMessageToRxDBDocData()', () => {
            it('should convert an insert message to a doc with _deleted=false', () => {
                const message: ElectricSQLMessage<TestDocType> = {
                    offset: '0_0',
                    key: 'doc1',
                    value: { id: 'doc1', name: 'Alice', age: 30, updatedAt: 1000 },
                    headers: { operation: 'insert' }
                };
                const doc = electricMessageToRxDBDocData<TestDocType>(message, 'id');
                assert.ok(doc);
                assert.strictEqual(doc._deleted, false);
                assert.strictEqual((doc as any).id, 'doc1');
                assert.strictEqual((doc as any).name, 'Alice');
            });
            it('should convert an update message to a doc with _deleted=false', () => {
                const message: ElectricSQLMessage<TestDocType> = {
                    offset: '0_1',
                    key: 'doc1',
                    value: { id: 'doc1', name: 'Alice Updated', age: 31, updatedAt: 2000 },
                    headers: { operation: 'update' }
                };
                const doc = electricMessageToRxDBDocData<TestDocType>(message, 'id');
                assert.ok(doc);
                assert.strictEqual(doc._deleted, false);
                assert.strictEqual((doc as any).name, 'Alice Updated');
            });
            it('should convert a delete message to a doc with _deleted=true', () => {
                const message: ElectricSQLMessage<TestDocType> = {
                    offset: '0_2',
                    key: 'doc1',
                    value: { id: 'doc1', name: 'Alice', age: 30, updatedAt: 3000 },
                    headers: { operation: 'delete' }
                };
                const doc = electricMessageToRxDBDocData<TestDocType>(message, 'id');
                assert.ok(doc);
                assert.strictEqual(doc._deleted, true);
            });
            it('should return null for control messages', () => {
                const message: ElectricSQLMessage<TestDocType> = {
                    headers: { control: 'up-to-date' }
                };
                const doc = electricMessageToRxDBDocData<TestDocType>(message, 'id');
                assert.strictEqual(doc, null);
            });
        });
        describe('hasMustRefetch()', () => {
            it('should return true when must-refetch is present', () => {
                const messages: ElectricSQLMessage<TestDocType>[] = [
                    makeMustRefetchMessage()
                ];
                assert.strictEqual(hasMustRefetch(messages), true);
            });
            it('should return false when no must-refetch is present', () => {
                const messages: ElectricSQLMessage<TestDocType>[] = [
                    makeUpToDateMessage()
                ];
                assert.strictEqual(hasMustRefetch(messages), false);
            });
            it('should return false for empty array', () => {
                assert.strictEqual(hasMustRefetch([]), false);
            });
        });
    });

    describe('replication', () => {
        describe('pull', () => {
            it('should pull documents from the mock server', async () => {
                const collection = await humansCollection.createHumanWithTimestamp(0, undefined, false);

                const testDocs = [
                    schemaObjects.humanWithTimestampData(),
                    schemaObjects.humanWithTimestampData()
                ];

                let fetchCallCount = 0;
                function mockFetch(): Promise<Response> {
                    fetchCallCount++;
                    if (fetchCallCount === 1) {
                        return Promise.resolve(createMockResponse(
                            [
                                ...testDocs.map(d => makeInsertMessage(d)),
                                makeUpToDateMessage()
                            ],
                            '0_2',
                            'handle-1'
                        ));
                    }
                    return Promise.resolve(createMockResponse(
                        [makeUpToDateMessage()],
                        '0_2',
                        'handle-1'
                    ));
                }

                const replicationState = replicateElectricSQL<TestDocType>({
                    replicationIdentifier: 'test-pull-' + randomToken(10),
                    collection,
                    url: 'http://localhost:3000/v1/shape',
                    params: { table: 'humans' },
                    live: false,
                    pull: { batchSize },
                    fetch: mockFetch as typeof fetch,
                    waitForLeadership: false
                });
                ensureReplicationHasNoErrors(replicationState);
                await replicationState.awaitInitialReplication();

                const docsInDb = await collection.find().exec();
                assert.strictEqual(docsInDb.length, 2);

                for (const testDoc of testDocs) {
                    const found = docsInDb.find(d => d.primary === testDoc.id);
                    assert.ok(found, 'Document ' + testDoc.id + ' should be in the collection');
                    assert.strictEqual(found.name, testDoc.name);
                    assert.strictEqual(found.age, testDoc.age);
                }

                await replicationState.cancel();
                await collection.database.close();
            });
            it('should track checkpoint across pulls', async () => {
                const collection = await humansCollection.createHumanWithTimestamp(0, undefined, false);

                const doc1 = schemaObjects.humanWithTimestampData();
                const doc2 = schemaObjects.humanWithTimestampData();

                let fetchCallCount = 0;
                const capturedUrls: string[] = [];
                function mockFetch(url: string | URL | Request): Promise<Response> {
                    capturedUrls.push(typeof url === 'string' ? url : url instanceof URL ? url.toString() : url.url);
                    fetchCallCount++;

                    if (fetchCallCount === 1) {
                        return Promise.resolve(createMockResponse(
                            [makeInsertMessage(doc1)],
                            '0_1',
                            'handle-1'
                        ));
                    }
                    if (fetchCallCount === 2) {
                        return Promise.resolve(createMockResponse(
                            [makeInsertMessage(doc2)],
                            '0_2',
                            'handle-1'
                        ));
                    }
                    return Promise.resolve(createMockResponse(
                        [makeUpToDateMessage()],
                        '0_2',
                        'handle-1'
                    ));
                }

                const replicationState = replicateElectricSQL<TestDocType>({
                    replicationIdentifier: 'test-checkpoint-' + randomToken(10),
                    collection,
                    url: 'http://localhost:3000/v1/shape',
                    params: { table: 'humans' },
                    live: false,
                    pull: { batchSize: 1 },
                    fetch: mockFetch as typeof fetch,
                    waitForLeadership: false
                });
                ensureReplicationHasNoErrors(replicationState);
                await replicationState.awaitInitialReplication();

                const docsInDb = await collection.find().exec();
                assert.strictEqual(docsInDb.length, 2);

                // second request should contain the offset from the first
                assert.ok(capturedUrls[1].includes('offset=0_1'), 'Second URL should use checkpoint offset');
                assert.ok(capturedUrls[1].includes('handle=handle-1'), 'Second URL should include handle');

                await replicationState.cancel();
                await collection.database.close();
            });
            it('should handle delete operations', async () => {
                const collection = await humansCollection.createHumanWithTimestamp(0, undefined, false);

                const doc1 = schemaObjects.humanWithTimestampData();
                const doc2 = schemaObjects.humanWithTimestampData();

                let fetchCallCount = 0;
                function mockFetch(): Promise<Response> {
                    fetchCallCount++;
                    if (fetchCallCount === 1) {
                        /**
                         * Return two inserts and one delete in a single batch.
                         * This matches how Electric-SQL delivers the initial shape:
                         * the full history is compacted, so a deleted row arrives
                         * as a single delete message.
                         */
                        return Promise.resolve(createMockResponse(
                            [
                                makeInsertMessage(doc1),
                                makeDeleteMessage(doc2),
                                makeUpToDateMessage()
                            ],
                            '0_2',
                            'handle-1'
                        ));
                    }
                    return Promise.resolve(createMockResponse(
                        [makeUpToDateMessage()],
                        '0_2',
                        'handle-1'
                    ));
                }

                const replicationState = replicateElectricSQL<TestDocType>({
                    replicationIdentifier: 'test-delete-' + randomToken(10),
                    collection,
                    url: 'http://localhost:3000/v1/shape',
                    params: { table: 'humans' },
                    live: false,
                    pull: { batchSize },
                    fetch: mockFetch as typeof fetch,
                    waitForLeadership: false
                });
                ensureReplicationHasNoErrors(replicationState);
                await replicationState.awaitInitialReplication();

                const docsInDb = await collection.find().exec();
                /**
                 * doc1 should be present (inserted), doc2 should not
                 * be visible (it was deleted).
                 */
                assert.strictEqual(docsInDb.length, 1, 'Only the non-deleted doc should be in results');
                assert.strictEqual(docsInDb[0].primary, doc1.id);

                await replicationState.cancel();
                await collection.database.close();
            });
            it('should handle must-refetch by re-fetching from scratch', async () => {
                const collection = await humansCollection.createHumanWithTimestamp(0, undefined, false);
                const doc1 = schemaObjects.humanWithTimestampData();

                let fetchCallCount = 0;
                const capturedUrls: string[] = [];
                function mockFetch(url: string | URL | Request): Promise<Response> {
                    fetchCallCount++;
                    capturedUrls.push(typeof url === 'string' ? url : url instanceof URL ? url.toString() : url.url);
                    if (fetchCallCount === 1) {
                        return Promise.resolve(createMockResponse(
                            [makeMustRefetchMessage()],
                            '0_0',
                            'handle-1'
                        ));
                    }
                    if (fetchCallCount === 2) {
                        return Promise.resolve(createMockResponse(
                            [makeInsertMessage(doc1), makeUpToDateMessage()],
                            '0_1',
                            'handle-2'
                        ));
                    }
                    return Promise.resolve(createMockResponse(
                        [makeUpToDateMessage()],
                        '0_1',
                        'handle-2'
                    ));
                }

                const replicationState = replicateElectricSQL<TestDocType>({
                    replicationIdentifier: 'test-refetch-' + randomToken(10),
                    collection,
                    url: 'http://localhost:3000/v1/shape',
                    params: { table: 'humans' },
                    live: false,
                    pull: { batchSize },
                    fetch: mockFetch as typeof fetch,
                    waitForLeadership: false
                });
                ensureReplicationHasNoErrors(replicationState);
                await replicationState.awaitInitialReplication();

                const docsInDb = await collection.find().exec();
                assert.strictEqual(docsInDb.length, 1);
                assert.strictEqual(docsInDb[0].primary, doc1.id);

                // The second URL (retry after must-refetch) should start from offset -1
                assert.ok(
                    capturedUrls[1].includes('offset=-1'),
                    'Retry URL should start from offset -1'
                );

                await replicationState.cancel();
                await collection.database.close();
            });
            it('should pass custom headers to fetch', async () => {
                const collection = await humansCollection.createHumanWithTimestamp(0, undefined, false);

                let capturedHeaders: HeadersInit | undefined;
                function mockFetch(_url: string | URL | Request, init?: RequestInit): Promise<Response> {
                    capturedHeaders = init?.headers;
                    return Promise.resolve(createMockResponse(
                        [makeUpToDateMessage()],
                        '0_0',
                        'handle-1'
                    ));
                }

                const replicationState = replicateElectricSQL<TestDocType>({
                    replicationIdentifier: 'test-headers-' + randomToken(10),
                    collection,
                    url: 'http://localhost:3000/v1/shape',
                    params: { table: 'humans' },
                    headers: { 'Authorization': 'Bearer test-token' },
                    live: false,
                    pull: { batchSize },
                    fetch: mockFetch as typeof fetch,
                    waitForLeadership: false
                });
                ensureReplicationHasNoErrors(replicationState);
                await replicationState.awaitInitialReplication();

                assert.ok(capturedHeaders);
                assert.strictEqual((capturedHeaders as any)['Authorization'], 'Bearer test-token');

                await replicationState.cancel();
                await collection.database.close();
            });
        });

        describe('push', () => {
            it('should call the push handler with document changes', async () => {
                const collection = await humansCollection.createHumanWithTimestamp(0, undefined, false);

                const pushRows: any[] = [];
                function mockFetch(): Promise<Response> {
                    return Promise.resolve(createMockResponse(
                        [makeUpToDateMessage()],
                        '0_0',
                        'handle-1'
                    ));
                }

                const replicationState = replicateElectricSQL<TestDocType>({
                    replicationIdentifier: 'test-push-' + randomToken(10),
                    collection,
                    url: 'http://localhost:3000/v1/shape',
                    params: { table: 'humans' },
                    live: false,
                    pull: { batchSize },
                    push: {
                        batchSize,
                        handler(rows) {
                            pushRows.push(...rows);
                            return Promise.resolve([]);
                        }
                    },
                    fetch: mockFetch as typeof fetch,
                    waitForLeadership: false
                });
                ensureReplicationHasNoErrors(replicationState);

                // insert a document
                const testDoc = schemaObjects.humanWithTimestampData();
                await collection.insert(testDoc);
                await replicationState.awaitInSync();

                assert.ok(pushRows.length > 0, 'Push handler should have been called');
                const pushedDoc = pushRows[0].newDocumentState;
                assert.strictEqual(pushedDoc.id, testDoc.id);
                assert.strictEqual(pushedDoc.name, testDoc.name);

                await replicationState.cancel();
                await collection.database.close();
            });
        });

        describe('live replication', () => {
            it('should receive live updates through polling', async () => {
                const collection = await humansCollection.createHumanWithTimestamp(0, undefined, false);

                const doc1 = schemaObjects.humanWithTimestampData();
                const doc2 = schemaObjects.humanWithTimestampData();

                let fetchCallCount = 0;
                async function mockFetch(url: string | URL | Request): Promise<Response> {
                    fetchCallCount++;
                    const urlStr = typeof url === 'string' ? url : url instanceof URL ? url.toString() : url.url;

                    if (!urlStr.includes('live=true')) {
                        if (fetchCallCount === 1) {
                            return createMockResponse(
                                [makeInsertMessage(doc1), makeUpToDateMessage()],
                                '0_1',
                                'handle-1'
                            );
                        }
                        return createMockResponse(
                            [makeUpToDateMessage()],
                            '0_1',
                            'handle-1'
                        );
                    } else {
                        if (fetchCallCount <= 4) {
                            return createMockResponse(
                                [makeInsertMessage(doc2), makeUpToDateMessage()],
                                '0_2',
                                'handle-1'
                            );
                        }
                        await wait(200);
                        return createMockResponse(
                            [makeUpToDateMessage()],
                            '0_2',
                            'handle-1'
                        );
                    }
                }

                const replicationState = replicateElectricSQL<TestDocType>({
                    replicationIdentifier: 'test-live-' + randomToken(10),
                    collection,
                    url: 'http://localhost:3000/v1/shape',
                    params: { table: 'humans' },
                    live: true,
                    pull: { batchSize },
                    fetch: mockFetch as typeof fetch,
                    waitForLeadership: false,
                    autoStart: true
                });
                ensureReplicationHasNoErrors(replicationState);
                await replicationState.awaitInitialReplication();

                let docsInDb = await collection.find().exec();
                assert.strictEqual(docsInDb.length, 1);
                assert.strictEqual(docsInDb[0].primary, doc1.id);

                await waitUntil(async () => {
                    const docs = await collection.find().exec();
                    return docs.length >= 2;
                }, 5000);

                docsInDb = await collection.find().exec();
                assert.strictEqual(docsInDb.length, 2);
                const doc2InDb = docsInDb.find(d => d.primary === doc2.id);
                assert.ok(doc2InDb, 'doc2 should arrive via live polling');

                await replicationState.cancel();
                await collection.database.close();
            });
        });

        describe('error handling', () => {
            it('should emit error on HTTP error during pull', async () => {
                const collection = await humansCollection.createHumanWithTimestamp(0, undefined, false);
                const errors: any[] = [];

                let fetchCallCount = 0;
                function mockFetch(): Promise<Response> {
                    fetchCallCount++;
                    if (fetchCallCount <= 2) {
                        return Promise.resolve(new Response('Server Error', { status: 500 }));
                    }
                    return Promise.resolve(createMockResponse(
                        [makeUpToDateMessage()],
                        '0_0',
                        'handle-1'
                    ));
                }

                const replicationState = replicateElectricSQL<TestDocType>({
                    replicationIdentifier: 'test-error-' + randomToken(10),
                    collection,
                    url: 'http://localhost:3000/v1/shape',
                    params: { table: 'humans' },
                    live: false,
                    pull: { batchSize },
                    fetch: mockFetch as typeof fetch,
                    waitForLeadership: false,
                    retryTime: 100
                });
                replicationState.error$.subscribe(err => errors.push(err));
                await replicationState.awaitInitialReplication();

                assert.ok(errors.length > 0, 'Should have received at least one error');

                await replicationState.cancel();
                await collection.database.close();
            });
        });

        describe('RxElectricSQLReplicationState', () => {
            it('should return an instance of RxElectricSQLReplicationState', async () => {
                const collection = await humansCollection.createHumanWithTimestamp(0, undefined, false);

                function mockFetch(): Promise<Response> {
                    return Promise.resolve(createMockResponse(
                        [makeUpToDateMessage()],
                        '0_0',
                        'handle-1'
                    ));
                }

                const replicationState = replicateElectricSQL<TestDocType>({
                    replicationIdentifier: 'test-instance-' + randomToken(10),
                    collection,
                    url: 'http://localhost:3000/v1/shape',
                    params: { table: 'humans' },
                    live: false,
                    pull: { batchSize },
                    fetch: mockFetch as typeof fetch,
                    waitForLeadership: false
                });
                assert.ok(replicationState instanceof RxElectricSQLReplicationState);

                await replicationState.cancel();
                await collection.database.close();
            });
        });
    });
});
