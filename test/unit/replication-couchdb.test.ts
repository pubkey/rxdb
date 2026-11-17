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

describe('replication-couchdb.test.ts (custom fetch, changes feed sequence)', () => {
    if (!config.storage.hasReplication) {
        return;
    }
    const SERVER_URL = 'http://localhost/couchdb-custom-fetch-sequence/';

    type ServerDoc = {
        _id: string;
        _rev: string;
        firstName: string;
        lastName: string;
        age: number;
    };
    type ChangesResponseBody = {
        results: {
            id: string;
            seq: number;
            changes: { rev: string; }[];
            doc: ServerDoc;
        }[];
        last_seq: number;
    };

    /**
     * Answers requests to the _changes endpoint like a CouchDB server
     * with an update sequence that increases by one on each write.
     */
    function createChangesFeedServer() {
        const rows: ChangesResponseBody['results'] = [];
        let waitingLongpollRequests = 0;
        function changesSince(since: number, limit: number): ChangesResponseBody {
            const results = rows.filter(row => row.seq > since).slice(0, limit);
            return {
                results,
                last_seq: results.length > 0 ? results[results.length - 1].seq : rows.length
            };
        }
        return {
            write(id: string) {
                const human = schemaObjects.humanData(id);
                rows.push({
                    id,
                    seq: rows.length + 1,
                    changes: [{ rev: '1-abc' }],
                    doc: {
                        _id: id,
                        _rev: '1-abc',
                        firstName: human.firstName,
                        lastName: human.lastName,
                        age: 30
                    }
                });
            },
            getWaitingLongpollRequests() {
                return waitingLongpollRequests;
            },
            async handleRequest(requestUrl: string): Promise<Response> {
                const params = new URL(requestUrl).searchParams;
                const sinceParam = params.get('since');
                const since = sinceParam === 'now' ? rows.length : Number(sinceParam);
                const limit = Number(params.get('limit'));
                if (params.get('feed') === 'longpoll') {
                    /**
                     * Keep the request open until a change
                     * happens or the timeout is reached.
                     */
                    waitingLongpollRequests = waitingLongpollRequests + 1;
                    let waited = 0;
                    while (rows.length <= since && waited < 100) {
                        await wait(5);
                        waited = waited + 5;
                    }
                    waitingLongpollRequests = waitingLongpollRequests - 1;
                }
                return new Response(JSON.stringify(changesSince(since, limit)), {
                    status: 200,
                    headers: {
                        'content-type': 'application/json'
                    }
                });
            }
        };
    }
    function getRequestUrl(input: Parameters<FetchMethodType>[0]): string {
        if (typeof input === 'string') {
            return input;
        } else if (input instanceof URL) {
            return input.href;
        } else {
            return input.url;
        }
    }

    describe('live pull stream', () => {
        it('should not skip a change that happens before the long polling request reaches the server', async () => {
            const collection = await humansCollection.create(0);
            const server = createChangesFeedServer();

            /**
             * The long polling request needs time to reach the server.
             */
            let longpollRequestArrives = false;
            const customFetch: FetchMethodType = async (input) => {
                const requestUrl = getRequestUrl(input);
                if (requestUrl.includes('feed=longpoll')) {
                    await waitUntil(() => longpollRequestArrives);
                }
                return server.handleRequest(requestUrl);
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

            server.write('doc-before-longpoll');
            longpollRequestArrives = true;
            await waitUntil(() => server.getWaitingLongpollRequests() === 1);
            server.write('doc-during-longpoll');

            await waitUntil(async () => {
                const doc = await collection.findOne('doc-during-longpoll').exec();
                return !!doc;
            }, 2000);
            await replicationState.awaitInSync();

            const docs = await collection.find().exec();
            assert.deepStrictEqual(
                docs.map(doc => doc.primary).sort(),
                ['doc-before-longpoll', 'doc-during-longpoll']
            );

            await replicationState.cancel();
            await collection.database.close();
        });
    });
});
