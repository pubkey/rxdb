/**
 * These tests run the CouchDB replication against a custom fetch method
 * so that they do not require a CouchDB server.
 * The tests that require a CouchDB server are in test/replication-couchdb.test.ts
 */
import assert from 'assert';
import {
    wait,
    waitUntil
} from 'async-test-util';
import config from './config.ts';
import {
    schemaObjects,
    humansCollection
} from '../../plugins/test-utils/index.mjs';
import {
    replicateCouchDB,
    FetchMethodType
} from '../../plugins/replication-couchdb/index.mjs';
import {
    randomToken
} from '../../plugins/core/index.mjs';

describe('replication-couchdb.test.ts (custom fetch)', () => {
    if (!config.storage.hasReplication) {
        return;
    }
    const SERVER_URL = 'http://localhost/couchdb-custom-fetch/';

    /**
     * The JSON body that a CouchDB server
     * sends as response of a request to the _changes endpoint.
     */
    type ChangesResponseBody = {
        results: {
            id: string;
            seq: number;
            changes: { rev: string; }[];
            doc: Record<string, string | number>;
        }[];
        last_seq: number;
    };
    function jsonResponse(body: ChangesResponseBody): Response {
        return new Response(JSON.stringify(body), {
            status: 200,
            headers: {
                'content-type': 'application/json'
            }
        });
    }
    function getRequestUrl(input: Parameters<FetchMethodType>[0]): URL {
        if (typeof input === 'string') {
            return new URL(input);
        } else if (input instanceof URL) {
            return input;
        } else {
            return new URL(input.url);
        }
    }
    function isLongpollRequest(input: Parameters<FetchMethodType>[0]): boolean {
        return getRequestUrl(input).searchParams.get('feed') === 'longpoll';
    }

    /**
     * Answers the requests to the _changes endpoint like a CouchDB server:
     * The normal feed directly returns all changes after the given since.
     * The longpoll feed keeps the request open until a change
     * after the given since exists or until the timeout is reached.
     * A since of 'now' is resolved to the last sequence at the time the request arrives.
     */
    function createChangesFeedServer(longpollTimeout: number) {
        const rows: ChangesResponseBody['results'] = [];
        let longpollRequests = 0;
        const fetch: FetchMethodType = async (input) => {
            const url = getRequestUrl(input);
            const sinceParam = url.searchParams.get('since');
            const since = sinceParam === 'now' ? rows.length : Number(sinceParam);
            if (isLongpollRequest(input)) {
                longpollRequests = longpollRequests + 1;
                const startTime = Date.now();
                while (rows.length <= since && Date.now() - startTime < longpollTimeout) {
                    await wait(10);
                }
            }
            return jsonResponse({
                results: rows.filter(row => row.seq > since),
                last_seq: rows.length
            });
        };
        return {
            fetch,
            getLongpollRequests: () => longpollRequests,
            addDocument(id: string, rev: string, data: Record<string, string | number>) {
                rows.push({
                    id,
                    seq: rows.length + 1,
                    changes: [{ rev }],
                    doc: Object.assign({ _id: id, _rev: rev }, data)
                });
            }
        };
    }

    describe('live pull stream', () => {
        it('should run the long polling of the changes when the live option is not set', async () => {
            const collection = await humansCollection.create(0);
            const serverDoc = schemaObjects.humanData('doc-from-longpoll');
            const server = createChangesFeedServer(100);
            const replicationState = replicateCouchDB({
                replicationIdentifier: randomToken(10),
                collection,
                url: SERVER_URL,
                fetch: server.fetch,
                waitForLeadership: false,
                pull: {}
            });
            assert.strictEqual(replicationState.live, true);
            await replicationState.awaitInitialReplication();
            await waitUntil(() => server.getLongpollRequests() > 0, 2000);

            // a change that happens on the server after the initial replication
            server.addDocument(serverDoc.passportId, '1-abc', {
                firstName: serverDoc.firstName,
                lastName: serverDoc.lastName,
                age: 30
            });

            await waitUntil(async () => {
                const doc = await collection.findOne(serverDoc.passportId).exec();
                return !!doc;
            }, 2000);

            await replicationState.cancel();
            await collection.database.close();
        });
        it('should not run multiple long polling requests in parallel after pause() and start()', async () => {
            const collection = await humansCollection.create(0);
            let openLongpollRequests = 0;
            let maxOpenLongpollRequests = 0;
            let totalLongpollRequests = 0;
            const customFetch: FetchMethodType = async (input) => {
                if (!isLongpollRequest(input)) {
                    return jsonResponse({ results: [], last_seq: 0 });
                }
                totalLongpollRequests = totalLongpollRequests + 1;
                openLongpollRequests = openLongpollRequests + 1;
                maxOpenLongpollRequests = Math.max(maxOpenLongpollRequests, openLongpollRequests);
                await wait(50);
                openLongpollRequests = openLongpollRequests - 1;
                return jsonResponse({ results: [], last_seq: 0 });
            };
            const replicationState = replicateCouchDB({
                replicationIdentifier: randomToken(10),
                collection,
                url: SERVER_URL,
                fetch: customFetch,
                waitForLeadership: false,
                live: true,
                pull: {}
            });
            await replicationState.awaitInitialReplication();
            await waitUntil(() => totalLongpollRequests > 0);

            // no new long polling requests must be started while paused
            await replicationState.pause();
            await wait(150);
            const totalWhilePaused = totalLongpollRequests;
            await wait(200);
            assert.strictEqual(totalLongpollRequests, totalWhilePaused);
            assert.strictEqual(openLongpollRequests, 0);

            // the long polling must continue after start()
            await replicationState.start();
            await waitUntil(() => totalLongpollRequests > totalWhilePaused);

            await replicationState.pause();
            await replicationState.start();
            await replicationState.pause();
            await replicationState.start();
            await wait(200);
            assert.strictEqual(maxOpenLongpollRequests, 1);

            await replicationState.cancel();
            await collection.database.close();
        });
    });
});
