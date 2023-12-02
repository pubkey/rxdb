import assert from 'assert';
import config from './config.ts';

import * as schemaObjects from '../helper/schema-objects.ts';
import * as humansCollection from '../helper/humans-collection.ts';

import {
    randomCouchString,
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
    SimplePeerWrtc
} from '../../plugins/replication-webrtc/index.mjs';

import { randomString, wait, waitUntil } from 'async-test-util';

describe('replication-webrtc.test.ts', () => {
    if (
        !config.storage.hasReplication ||
        !config.storage.hasPersistence
    ) {
        return;
    }

    if (config.isDeno) {
        /**
         * We do not have WebRTC in Deno
         */
        return;
    }

    let wrtc: SimplePeerWrtc;
    let webSocketConstructor: WebSocket;

    const signalingServerUrl: string = 'ws://localhost:18006';
    // const signalingServerUrl: string = 'wss://signaling.rxdb.info/';

    describe('init', () => {
        it('import WebRTC polyfills on Node.js', async () => {
            if (config.platform.isNode()) {
                const wrtcModule = await import('node-datachannel/polyfill');
                wrtc = wrtcModule.default as any;

                const wsModule = await import('ws');
                webSocketConstructor = wsModule.WebSocket as any;
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

    function ensureReplicationHasNoErrors(replicationPool: RxWebRTCReplicationPool<any>) {
        /**
         * We do not have to unsubscribe because the observable will cancel anyway.
         */
        replicationPool.error$.subscribe(err => {
            console.error('ensureReplicationHasNoErrors() has error:');
            console.log(err);
            if (err?.parameters?.errors) {
                throw err.parameters.errors[0];
            }
            throw err;
        });
    }

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
    ): Promise<RxWebRTCReplicationPool<RxDocType>[]> {
        const ret = await Promise.all(
            collections.map(async (collection) => {
                const replicationPool = await replicateWebRTC<RxDocType>({
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
                ensureReplicationHasNoErrors(replicationPool);
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
        if (config.isFastMode()) {
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
            const topic = randomCouchString(10);
            const secret = randomCouchString(10);
            await syncCollections(topic, secret, [c1, c2]);

            console.log('--------- 0.5');

            await awaitCollectionsInSync([c1, c2]);
            await wait(100);

            console.log('--------- 1');

            // insert
            await c1.insert(schemaObjects.human('inserted-after-first-sync'));
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

            // add another collection to sync
            const c3 = await humansCollection.create(1, 'ccc');
            await syncCollections(topic, secret, [c3]);
            await awaitCollectionsInSync([c1, c2, c3]);

            console.log('--------- 5');

            // we have to wait here for the other replication
            // otherwise we have strange console errors
            await wait(200);


            // remove one peer
            await c2.database.destroy();

            c1.database.destroy();
            c3.database.destroy();
        });
    });
    describe('ISSUES', () => { });
});
