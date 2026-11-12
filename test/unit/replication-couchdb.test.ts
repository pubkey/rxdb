import assert from 'assert';
import { waitUntil } from 'async-test-util';
import config from './config.ts';
import {
    schemaObjects,
    humansCollection
} from '../../plugins/test-utils/index.mjs';
import { replicateCouchDB } from '../../plugins/replication-couchdb/index.mjs';

/**
 * These tests run without a CouchDB server.
 * They use the custom fetch option with a method
 * that answers like the CouchDB HTTP API.
 */
describe('replication-couchdb.test.ts', () => {
    if (!config.storage.hasReplication) {
        return;
    }

    describe('push with a document that is deleted on the server', () => {
        type ServerDoc = {
            rev: string;
            deleted: boolean;
            body: Record<string, unknown>;
        };
        const DATABASE_URL = 'http://couchdb.example.com/mydb/';

        /**
         * Answers the requests of the push handler like a CouchDB server:
         * - _all_docs returns { key, error: 'not_found' } for unknown documents
         *   and { id, key, value: { rev, deleted: true }, doc: null } for deleted ones.
         * - _bulk_docs returns { id, error: 'conflict' } when the _rev
         *   of a non-deleted document does not match.
         * - GET /db/docid?rev=... returns the body of that revision, also for tombstones.
         * @link https://docs.couchdb.org/en/stable/api/database/bulk-api.html
         */
        function createCouchDBFetch() {
            const docs = new Map<string, ServerDoc>();
            const bulkDocsRequests: Record<string, unknown>[][] = [];
            const beforeBulkDocs: (() => void)[] = [];
            let revCounter = 0;

            function jsonResponse(data: unknown): Response {
                return new Response(JSON.stringify(data), {
                    status: 200,
                    headers: { 'content-type': 'application/json' }
                });
            }
            function nextRev(previous?: ServerDoc): string {
                const height = previous ? parseInt(previous.rev.split('-')[0], 10) + 1 : 1;
                revCounter = revCounter + 1;
                return height + '-' + revCounter;
            }
            function allDocsRow(id: string) {
                const doc = docs.get(id);
                if (!doc) {
                    return { key: id, error: 'not_found' };
                }
                if (doc.deleted) {
                    return { id, key: id, value: { rev: doc.rev, deleted: true }, doc: null };
                }
                return {
                    id,
                    key: id,
                    value: { rev: doc.rev },
                    doc: Object.assign({}, doc.body, { _id: id, _rev: doc.rev })
                };
            }
            function deleteOnServer(id: string) {
                const previous = docs.get(id);
                docs.set(id, {
                    rev: nextRev(previous),
                    deleted: true,
                    body: {}
                });
            }

            const fetchMethod: typeof fetch = (input, init) => {
                const url = new URL(typeof input === 'string' ? input : input instanceof URL ? input.href : input.url);
                const path = url.pathname.replace('/mydb/', '');
                const requestBody = init && typeof init.body === 'string' ? JSON.parse(init.body) : undefined;

                if (path === '_all_docs') {
                    const keys: string[] = requestBody ? requestBody.keys : JSON.parse(url.searchParams.get('keys') as string);
                    return Promise.resolve(jsonResponse({
                        offset: 0,
                        total_rows: docs.size,
                        rows: keys.map(key => allDocsRow(key))
                    }));
                }
                if (path === '_bulk_docs') {
                    const run = beforeBulkDocs.shift();
                    if (run) {
                        run();
                    }
                    const sentDocs: Record<string, unknown>[] = requestBody.docs;
                    bulkDocsRequests.push(sentDocs);
                    return Promise.resolve(jsonResponse(sentDocs.map(sentDoc => {
                        const id = sentDoc._id as string;
                        const previous = docs.get(id);
                        const revMatches = previous ? sentDoc._rev === previous.rev : !sentDoc._rev;
                        const recreatesDeleted = !!previous && previous.deleted && !sentDoc._rev;
                        if (!revMatches && !recreatesDeleted) {
                            return { id, error: 'conflict', reason: 'Document update conflict.' };
                        }
                        const body = Object.assign({}, sentDoc);
                        delete body._id;
                        delete body._rev;
                        const rev = nextRev(previous);
                        docs.set(id, { rev, deleted: !!sentDoc._deleted, body });
                        return { ok: true, id, rev };
                    })));
                }

                const requestedId = decodeURIComponent(path);
                const doc = docs.get(requestedId);
                if (!doc || doc.rev !== url.searchParams.get('rev')) {
                    return Promise.resolve(new Response(
                        JSON.stringify({ error: 'not_found', reason: 'missing' }),
                        { status: 404, headers: { 'content-type': 'application/json' } }
                    ));
                }
                const ret: Record<string, unknown> = Object.assign({}, doc.body, { _id: requestedId, _rev: doc.rev });
                if (doc.deleted) {
                    ret._deleted = true;
                }
                return Promise.resolve(jsonResponse(ret));
            };

            return {
                fetchMethod,
                docs,
                bulkDocsRequests,
                beforeBulkDocs,
                deleteOnServer
            };
        }

        it('should handle the deletion on the server as conflict instead of creating the document again', async () => {
            const collection = await humansCollection.createHumanWithTimestamp(0, undefined, false);
            const server = createCouchDBFetch();
            const replicationState = replicateCouchDB({
                replicationIdentifier: 'couchdb-push-deleted-master',
                collection,
                url: DATABASE_URL,
                fetch: server.fetchMethod,
                live: true,
                waitForLeadership: false,
                push: {}
            });
            const errors: unknown[] = [];
            const errorSub = replicationState.error$.subscribe(err => errors.push(err));

            const docData = schemaObjects.humanWithTimestampData({ id: 'alice' });
            const doc = await collection.insert(docData);
            await replicationState.awaitInSync();
            const onServer = server.docs.get('alice');
            assert.ok(onServer);
            assert.strictEqual(onServer.deleted, false);

            // another client deletes the document on the server
            server.deleteOnServer('alice');

            await doc.incrementalPatch({ name: 'local-change' });
            await replicationState.awaitInSync();

            const onServerAfter = server.docs.get('alice');
            assert.ok(onServerAfter);
            assert.strictEqual(
                onServerAfter.deleted,
                true,
                'must not overwrite the deletion, sent: ' + JSON.stringify(server.bulkDocsRequests)
            );

            // the default conflict handler uses the master state, so the document is deleted locally
            await waitUntil(async () => {
                const found = await collection.findOne('alice').exec();
                return !found;
            }, 2000);
            assert.deepStrictEqual(errors, []);

            errorSub.unsubscribe();
            await replicationState.cancel();
            await collection.database.close();
        });
        it('should resolve the conflict when the document gets deleted on the server during the push', async () => {
            const collection = await humansCollection.createHumanWithTimestamp(0, undefined, false);
            const server = createCouchDBFetch();
            const replicationState = replicateCouchDB({
                replicationIdentifier: 'couchdb-push-deleted-master-during-push',
                collection,
                url: DATABASE_URL,
                fetch: server.fetchMethod,
                live: true,
                waitForLeadership: false,
                push: {}
            });
            const errors: unknown[] = [];
            const errorSub = replicationState.error$.subscribe(err => errors.push(err));

            const doc = await collection.insert(schemaObjects.humanWithTimestampData({ id: 'alice' }));
            await replicationState.awaitInSync();

            /**
             * Another client deletes the document after the push handler
             * has fetched the master state and before it sends its write.
             */
            server.beforeBulkDocs.push(() => server.deleteOnServer('alice'));

            await doc.incrementalPatch({ name: 'local-change' });
            await replicationState.awaitInSync();

            const onServerAfter = server.docs.get('alice');
            assert.ok(onServerAfter);
            assert.strictEqual(onServerAfter.deleted, true);
            await waitUntil(async () => {
                const found = await collection.findOne('alice').exec();
                return !found;
            }, 2000);
            assert.deepStrictEqual(errors, []);

            errorSub.unsubscribe();
            await replicationState.cancel();
            await collection.database.close();
        });
    });
});
