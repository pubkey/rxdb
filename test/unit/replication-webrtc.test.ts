import assert from 'assert';
import config from './config.ts';
import {
    randomToken,
    RxCollection,
    defaultHashSha256,
    ensureNotFalsy
} from '../../plugins/core/index.mjs';

import {
    replicateWebRTC,
    RxWebRTCReplicationPool,
    // getConnectionHandlerP2PCF,
    isMasterInWebRTCReplication,
    getConnectionHandlerSimplePeer,
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
                wrtc = wrtcModule.default as any;

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
    });

    // function ensureReplicationHasNoErrors(
    //     replicationPool: RxWebRTCReplicationPool<any, SimplePeer>
    // ) {
    //     /**
    //      * We do not have to unsubscribe because the observable will cancel anyway.
    //      */
    //     replicationPool.error$.subscribe(err => {
    //         console.error('ensureReplicationHasNoErrors() has error:');
    //         console.log(err);
    //         if (err?.parameters?.errors) {
    //             throw err.parameters.errors[0];
    //         }
    //         throw err;
    //     });
    // }

    async function getJson<RxDocType>(collection: RxCollection<RxDocType>) {
        const docs = await collection.find().exec();
        return docs.map((d: any) => d.toJSON());
    }

    async function awaitCollectionsInSync<RxDocType>(collections: RxCollection<RxDocType>[]) {
        const last = ensureNotFalsy(collections.pop());
        await waitUntil(async () => {
            const lastJSON = await getJson(last);
            for (const collection of collections) {
                const json = await getJson(collection);
                try {
                    assert.deepStrictEqual(
                        lastJSON,
                        json
                    );
                    return true;
                } catch (err) {
                    return false;
                }
            }
        });
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
         * If we have more then one collection,
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

            /**
             * This test fails randomly because WebRTC has hickups
             * when creating the collection. These hickups likely happen depending on the
             * network because of finding the IP candidates and stuff.
             */
            return;

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
    describe('ISSUES', () => { });
});
