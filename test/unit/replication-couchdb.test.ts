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
import { firstValueFrom } from 'rxjs';

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
        it('should abort the long polling on pause() and run one new loop after start()', async () => {
            const collection = await humansCollection.create(0);
            const server = createChangesFeedServer();
            let longpollRequests = 0;
            let openLongpollRequests = 0;
            let maxOpenLongpollRequests = 0;
            const customFetch: FetchMethodType = async (input, init) => {
                const requestUrl = getRequestUrl(input);
                if (!requestUrl.includes('feed=longpoll')) {
                    return server.handleRequest(requestUrl);
                }
                longpollRequests = longpollRequests + 1;
                openLongpollRequests = openLongpollRequests + 1;
                maxOpenLongpollRequests = Math.max(maxOpenLongpollRequests, openLongpollRequests);
                try {
                    return await new Promise<Response>((res, rej) => {
                        const signal = init && init.signal;
                        if (signal) {
                            signal.addEventListener('abort', () => rej(new Error('aborted')));
                        }
                        server.handleRequest(requestUrl).then(res);
                    });
                } finally {
                    openLongpollRequests = openLongpollRequests - 1;
                }
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
            const errors: any[] = [];
            replicationState.error$.subscribe(err => errors.push(err));
            await replicationState.awaitInitialReplication();
            await waitUntil(() => openLongpollRequests === 1);

            await replicationState.pause();
            assert.strictEqual(openLongpollRequests, 0);
            const requestsAtPause = longpollRequests;
            server.write('during-pause');
            await wait(250);
            assert.strictEqual(longpollRequests, requestsAtPause);
            assert.strictEqual(await collection.findOne('during-pause').exec(), null);

            await replicationState.start();
            await waitUntil(async () => !!(await collection.findOne('during-pause').exec()), 2000);
            await waitUntil(() => openLongpollRequests === 1);
            server.write('after-resume');
            await waitUntil(async () => !!(await collection.findOne('after-resume').exec()), 2000);
            await replicationState.start();
            await wait(250);
            assert.strictEqual(maxOpenLongpollRequests, 1);

            await replicationState.cancel();
            assert.strictEqual(openLongpollRequests, 0);
            const requestsAtCancel = longpollRequests;
            await wait(250);
            assert.strictEqual(longpollRequests, requestsAtCancel);
            assert.deepStrictEqual(errors, []);

            await collection.database.close();
        });
    });
});

describe('replication-couchdb.test.ts (custom fetch, tombstones)', () => {
    if (!config.storage.hasReplication) {
        return;
    }

    type CouchChange = {
        id: string;
        seq: number;
        changes: { rev: string; }[];
        deleted?: boolean;
        doc: Record<string, unknown>;
    };

    /**
     * Returns a fetch method that serves the given rows
     * on the _changes endpoint like CouchDB does.
     */
    function getChangesFetch(getChanges: () => CouchChange[]): typeof fetch {
        return (input) => {
            const url = new URL(typeof input === 'string' ? input : input instanceof URL ? input.href : input.url);
            const sinceParam = url.searchParams.get('since');
            const since = sinceParam === 'now' ? Infinity : Number(sinceParam);
            const limit = Number(url.searchParams.get('limit'));
            const results = getChanges()
                .filter(change => change.seq > since)
                .slice(0, limit);
            const lastSeq = results.length > 0 ? results[results.length - 1].seq : (since === Infinity ? 0 : since);
            return Promise.resolve(new Response(
                JSON.stringify({ results, last_seq: lastSeq, pending: 0 }),
                { status: 200, headers: { 'content-type': 'application/json' } }
            ));
        };
    }

    describe('pull', () => {
        it('should delete the local document when CouchDB sends a tombstone without the document body', async () => {
            const collection = await humansCollection.create(0);
            const human = schemaObjects.humanData('tombstone-doc');
            const neverPulledId = 'never-pulled-doc';
            let changes: CouchChange[] = [{
                id: human.passportId,
                seq: 1,
                changes: [{ rev: '1-a' }],
                doc: {
                    _id: human.passportId,
                    _rev: '1-a',
                    firstName: human.firstName,
                    lastName: human.lastName,
                    age: human.age
                }
            }];
            const url = 'http://localhost/' + randomToken(10) + '/';
            const replicationIdentifier = randomToken(10);
            async function syncOnce() {
                const replicationState = replicateCouchDB({
                    replicationIdentifier,
                    collection,
                    url,
                    fetch: getChangesFetch(() => changes),
                    live: false,
                    pull: {}
                });
                const error = await Promise.race([
                    replicationState.awaitInitialReplication().then(() => undefined),
                    firstValueFrom(replicationState.error$, { defaultValue: undefined })
                ]);
                await replicationState.cancel();
                if (error) {
                    throw error;
                }
            }

            await syncOnce();
            const docAfterFirstSync = await collection.findOne(human.passportId).exec(true);
            assert.strictEqual(docAfterFirstSync.firstName, human.firstName);

            /**
             * A document that is deleted with a DELETE request
             * is returned by the _changes endpoint with only
             * the _id, _rev and _deleted fields.
             * @link https://docs.couchdb.org/en/stable/api/document/common.html#delete--db-docid
             */
            changes = [
                {
                    id: human.passportId,
                    seq: 2,
                    changes: [{ rev: '2-b' }],
                    deleted: true,
                    doc: {
                        _id: human.passportId,
                        _rev: '2-b',
                        _deleted: true
                    }
                },
                {
                    id: neverPulledId,
                    seq: 3,
                    changes: [{ rev: '2-c' }],
                    deleted: true,
                    doc: {
                        _id: neverPulledId,
                        _rev: '2-c',
                        _deleted: true
                    }
                }
            ];
            await syncOnce();

            const docsAfterDelete = await collection.find().exec();
            assert.deepStrictEqual(docsAfterDelete.map(doc => doc.primary), []);

            await collection.database.close();
        });
    });
});
