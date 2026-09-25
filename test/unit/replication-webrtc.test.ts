import assert from 'assert';
import config from './config.ts';
import {
    randomToken,
    RxCollection,
    defaultHashSha256,
    createRxDatabase,
    RxError
} from '../../plugins/core/index.mjs';

import {
    replicateWebRTC,
    RxWebRTCReplicationPool,
    // getConnectionHandlerP2PCF,
    isMasterInWebRTCReplication,
    sendMessageAndAwaitAnswer,
    getConnectionHandlerSimplePeer,
    WebRTCConnectionHandler,
    PeerWithMessage,
    PeerWithResponse,
    SIMPLE_PEER_MAX_MESSAGE_LENGTH,
    startSignalingServerSimplePeer,
    createSimplePeerWrtc,
    SimplePeer,
    SimplePeerWebSocketConstructor,
    SimplePeerWrtc
} from '../../plugins/replication-webrtc/index.mjs';
import {
    schemaObjects,
    humansCollection,
    isFastMode,
    isDeno,
    isNode
} from '../../plugins/test-utils/index.mjs';
import { randomString, wait, waitUntil } from 'async-test-util';
import { Subject } from 'rxjs';

describe('replication-webrtc.test.ts', function () {
    // can take very long in low-budget CI servers
    this.timeout(1000 * 40);

    if (
        !config.storage.hasReplication ||
        !config.storage.hasPersistence
    ) {
        return;
    }

    if (isDeno) {
        /**
         * We do not have WebRTC in Deno
         */
        return;
    }

    let wrtc: SimplePeerWrtc;
    let webSocketConstructor: SimplePeerWebSocketConstructor;

    const signalingServerUrl: string = 'ws://localhost:18006';
    // const signalingServerUrl: string = 'wss://signaling.rxdb.info/';

    describe('init', () => {
        it('import WebRTC polyfills on Node.js', async () => {
            if (isNode) {
                // @ts-ignore
                const wrtcModule = await import('node-datachannel/polyfill');
                wrtc = createSimplePeerWrtc(wrtcModule.default) as any;

                const wsModule = await import('ws');
                webSocketConstructor = wsModule.WebSocket as unknown as SimplePeerWebSocketConstructor;
            }
        });
    });
    describe('utils', () => {
        describe('.isMasterInWebRTCReplication()', () => {
            new Array(10).fill(0).forEach(() => {
                const id1 = randomString(7);
                const id2 = randomString(7);
                it('should have exactly one master ' + id1 + ' - ' + id2, async () => {
                    const isMasterA = await isMasterInWebRTCReplication(defaultHashSha256, id1, id2);
                    const isMasterB = await isMasterInWebRTCReplication(defaultHashSha256, id2, id1);
                    assert.ok(isMasterA !== isMasterB);
                });
            });
        });
        describe('.sendMessageAndAwaitAnswer()', () => {
            type FakePeer = { id: string; };
            function getFakeHandler() {
                const sent: any[] = [];
                const handler: WebRTCConnectionHandler<FakePeer> = {
                    connect$: new Subject<FakePeer>(),
                    disconnect$: new Subject<FakePeer>(),
                    message$: new Subject<PeerWithMessage<FakePeer>>(),
                    response$: new Subject<PeerWithResponse<FakePeer>>(),
                    error$: new Subject<any>(),
                    send(_peer, message) {
                        sent.push(message);
                        return Promise.resolve();
                    },
                    close() {
                        return Promise.resolve();
                    }
                };
                return { handler, sent };
            }
            it('should resolve with the answer of the correct peer', async () => {
                const { handler } = getFakeHandler();
                const peerA = { id: 'a' };
                const peerB = { id: 'b' };
                const promise = sendMessageAndAwaitAnswer(handler, peerA, { id: 'req1', method: 'token', params: [] });
                await wait(0);
                (handler.response$ as Subject<PeerWithResponse<FakePeer>>).next({ peer: peerB, response: { id: 'req1', result: 'wrong' } });
                (handler.response$ as Subject<PeerWithResponse<FakePeer>>).next({ peer: peerA, response: { id: 'req1', result: 'right' } });
                const response = await promise;
                assert.strictEqual(response.result, 'right');
            });
            it('should reject when the peer disconnects', async () => {
                const { handler } = getFakeHandler();
                const peer = { id: 'a' };
                const promise = sendMessageAndAwaitAnswer(handler, peer, { id: 'req1', method: 'token', params: [] });
                (handler.disconnect$ as Subject<FakePeer>).next(peer);
                await assert.rejects(promise, (err: RxError) => err.code === 'RC_WEBRTC_PEER');
            });
            it('should reject on timeout', async () => {
                const { handler } = getFakeHandler();
                const promise = sendMessageAndAwaitAnswer(handler, { id: 'a' }, { id: 'req1', method: 'token', params: [] }, 50);
                await assert.rejects(promise, (err: RxError) => err.code === 'RC_WEBRTC_PEER');
            });
            it('should reject when the remote peer responds with an error', async () => {
                const { handler } = getFakeHandler();
                const peer = { id: 'a' };
                const promise = sendMessageAndAwaitAnswer(handler, peer, { id: 'req1', method: 'masterWrite', params: [] });
                await wait(0);
                (handler.response$ as Subject<PeerWithResponse<FakePeer>>).next({
                    peer,
                    response: { id: 'req1', result: null, error: { name: 'Error', message: 'broken' } }
                });
                await assert.rejects(promise, (err: RxError) => err.code === 'RC_WEBRTC_PEER');
            });
            it('should reject when the send fails', async () => {
                const { handler } = getFakeHandler();
                handler.send = () => Promise.reject(new Error('channel closed'));
                const promise = sendMessageAndAwaitAnswer(handler, { id: 'a' }, { id: 'req1', method: 'token', params: [] });
                await assert.rejects(promise, (err: RxError) => err.code === 'RC_WEBRTC_PEER');
            });
        });
    });

    async function getJson<RxDocType>(collection: RxCollection<RxDocType>) {
        const docs = await collection.find().exec();
        return docs.map((d: any) => d.toJSON());
    }

    async function awaitCollectionsInSync<RxDocType>(collections: RxCollection<RxDocType>[]) {
        await waitUntil(async () => {
            const jsons = await Promise.all(collections.map(c => getJson(c)));
            const first = jsons[0];
            return jsons.every(json => {
                try {
                    assert.deepStrictEqual(first, json);
                    return true;
                } catch (err) {
                    return false;
                }
            });
        }, 1000 * 30);
    }

    async function syncCollections<RxDocType>(
        topic: string,
        collections: RxCollection<RxDocType>[]
    ): Promise<RxWebRTCReplicationPool<RxDocType, SimplePeer>[]> {
        const ret = await Promise.all(
            collections.map(async (collection) => {
                const replicationPool = await replicateWebRTC<RxDocType, SimplePeer>({
                    collection,
                    topic,
                    // connectionHandlerCreator: getConnectionHandlerWebtorrent([webtorrentTrackerUrl]),
                    // connectionHandlerCreator: getConnectionHandlerP2PCF(),
                    connectionHandlerCreator: getConnectionHandlerSimplePeer({
                        signalingServerUrl,
                        wrtc,
                        webSocketConstructor
                    }),
                    pull: {},
                    push: {}
                });
                // ensureReplicationHasNoErrors(replicationPool);
                return replicationPool;
            })
        );

        /**
         * If we have more than one collection,
         * ensure that at least one peer exists each.
         */
        await Promise.all(
            ret.map(pool => pool.awaitFirstPeer())
        );
        return ret;
    }

    describe('basic CRUD', () => {
        if (isFastMode()) {
            return;
        }
        /**
         * Creating a WebRTC connection takes really long,
         * so we have to use a big test to test all functionality at once
         * without to re-create connections.
         */
        it('should stream changes over the replication to other collections', async function () {

            const c1 = await humansCollection.create(1, 'aaa');
            const c2 = await humansCollection.create(1, 'bbb');

            console.log('--------- 0');

            // initial sync
            const topic = randomToken(10);
            const firstReplicationStates = await syncCollections(topic, [c1, c2]);

            console.log('--------- 0.5');

            await awaitCollectionsInSync([c1, c2]);
            await wait(100);

            console.log('--------- 1');

            // insert
            await c1.insert(schemaObjects.humanData('inserted-after-first-sync'));
            await awaitCollectionsInSync([c1, c2]);
            await wait(100);

            console.log('--------- 2');

            // update
            const doc = await c1.findOne().exec(true);
            await doc.getLatest().incrementalPatch({ age: 100 });
            await awaitCollectionsInSync([c1, c2]);
            assert.strictEqual(doc.getLatest().age, 100);
            await wait(100);

            console.log('--------- 3');

            // delete
            await doc.getLatest().remove();
            await awaitCollectionsInSync([c1, c2]);
            await wait(100);

            console.log('--------- 4');

            // should automatically reconnect when peer connection breaks
            const peerStates = firstReplicationStates[0].peerStates$.getValue();
            const onePeer = Array.from(peerStates.values())[0].peer;
            await onePeer.destroy(); // disconnect peer
            console.log('--------- 5.1');
            await wait(100);
            console.log('--------- 5.2');
            await c1.insert(schemaObjects.humanData('inserted-after-peer-connection-broke'));
            console.log('--------- 5.3');
            await awaitCollectionsInSync([c1, c2]);

            console.log('--------- 5');

            // add another collection to sync
            const c3 = await humansCollection.create(1, 'ccc');
            await syncCollections(topic, [c3]);
            await awaitCollectionsInSync([c1, c2, c3]);
            await wait(100);


            console.log('--------- 6');

            // we have to wait here for the other replication
            // otherwise we have strange console errors
            await wait(200);

            // remove one peer
            await c2.database.close();

            c1.database.close();
            c3.database.close();
        });
    });
    describe('reliability', () => {
        if (isFastMode()) {
            return;
        }
        it('should not spin or crash when the signaling server is not reachable', async () => {
            if (!isNode) {
                return;
            }
            let socketCount = 0;
            const WsConstructor = webSocketConstructor as any;
            class CountingWebSocket extends WsConstructor {
                constructor(url: string) {
                    super(url);
                    socketCount++;
                }
            }
            const collection = await humansCollection.create(1, 'unreachable');
            const pool = await replicateWebRTC<any, SimplePeer>({
                collection,
                topic: randomToken(10),
                connectionHandlerCreator: getConnectionHandlerSimplePeer({
                    signalingServerUrl: 'ws://localhost:18999',
                    wrtc,
                    webSocketConstructor: CountingWebSocket as any
                }),
                pull: {},
                push: {}
            });
            await wait(1500);
            /**
             * With an exponential backoff starting at 500ms
             * there must only be a few connection attempts.
             */
            assert.ok(socketCount >= 1, 'must have tried to connect');
            assert.ok(socketCount <= 4, 'too many connection attempts: ' + socketCount);

            await pool.cancel();
            const countAfterCancel = socketCount;
            await wait(1500);
            assert.strictEqual(socketCount, countAfterCancel, 'must not reconnect after cancel');
            await collection.database.close();
        });
        it('should reconnect when the signaling server restarts', async () => {
            if (!isNode) {
                return;
            }
            const port = 18998;
            let server = await startSignalingServerSimplePeer({ port });
            const topic = randomToken(10);
            function startSync(collection: RxCollection<any>) {
                return replicateWebRTC<any, SimplePeer>({
                    collection,
                    topic,
                    connectionHandlerCreator: getConnectionHandlerSimplePeer({
                        signalingServerUrl: server.localUrl,
                        wrtc,
                        webSocketConstructor
                    }),
                    pull: {},
                    push: {}
                });
            }
            const c1 = await humansCollection.create(1, 'restart1');
            const c2 = await humansCollection.create(1, 'restart2');
            const pool1 = await startSync(c1);
            const pool2 = await startSync(c2);
            await Promise.all([pool1.awaitFirstPeer(), pool2.awaitFirstPeer()]);
            await awaitCollectionsInSync([c1, c2]);

            // restart the signaling server
            server.server.clients.forEach(client => client.terminate());
            await new Promise<void>(res => server.server.close(() => res()));
            await wait(200);
            server = await startSignalingServerSimplePeer({ port });

            // the existing WebRTC connection must still work
            await c1.insert(schemaObjects.humanData('inserted-while-signaling-server-restarted'));
            await awaitCollectionsInSync([c1, c2]);

            // a new peer must find the existing ones over the restarted server
            const c3 = await humansCollection.create(1, 'restart3');
            const pool3 = await startSync(c3);
            await pool3.awaitFirstPeer();
            await awaitCollectionsInSync([c1, c2, c3]);

            await Promise.all([pool1, pool2, pool3].map(pool => pool.cancel()));
            server.server.clients.forEach(client => client.terminate());
            await new Promise<void>(res => server.server.close(() => res()));
            await Promise.all([c1, c2, c3].map(c => c.database.close()));
        });
        it('should sync three peers with big documents', async () => {
            async function createCollection() {
                const db = await createRxDatabase<any>({
                    name: randomToken(10),
                    storage: config.storage.getStorage()
                });
                await db.addCollections({
                    docs: {
                        schema: {
                            version: 0,
                            primaryKey: 'id',
                            type: 'object',
                            properties: {
                                id: {
                                    type: 'string',
                                    maxLength: 100
                                },
                                body: {
                                    type: 'string'
                                }
                            },
                            required: ['id', 'body']
                        }
                    }
                });
                return db.docs as RxCollection<{ id: string; body: string; }>;
            }
            const collections = await Promise.all([
                createCollection(),
                createCollection(),
                createCollection()
            ]);
            await collections[0].insert({ id: 'small-0', body: 'foobar' });
            await collections[1].insert({ id: 'small-1', body: 'foobar' });

            const topic = randomToken(10);
            const pools = await syncCollections(topic, collections);
            await waitUntil(() => pools.every(pool => pool.peerStates$.getValue().size === 2), 1000 * 30);
            await awaitCollectionsInSync(collections);

            /**
             * A single document must stay below 100KB because some storages
             * like FoundationDB have a value size limit.
             * Many medium sized documents make a replication batch
             * that is bigger than the data channel message size limit.
             */
            const bigBody = randomString(SIMPLE_PEER_MAX_MESSAGE_LENGTH * 5);
            await collections[2].insert({ id: 'big-2', body: bigBody });
            await collections[0].bulkInsert(
                new Array(30).fill(0).map((_, i) => ({ id: 'bulk-' + i, body: randomString(15000) }))
            );
            await awaitCollectionsInSync(collections);
            for (const collection of collections) {
                const doc = await collection.findOne('big-2').exec(true);
                assert.strictEqual(doc.body, bigBody);
                const count = await collection.count().exec();
                assert.strictEqual(count, 33);
            }

            await Promise.all(pools.map(pool => pool.cancel()));
            await Promise.all(collections.map(c => c.database.close()));
        });
    });
    describe('ISSUES', () => { });
});
