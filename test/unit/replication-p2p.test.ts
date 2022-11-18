/**
 * pouchdb allows to easily replicate database across devices.
 * This behaviour is tested here
 * @link https://pouchdb.com/guides/replication.html
 */

import assert from 'assert';
import config from './config';

import * as schemaObjects from '../helper/schema-objects';
import * as humansCollection from '../helper/humans-collection';

import {
    addRxPlugin,
    randomCouchString,
    RxCollection,
    defaultHashFunction,
    ensureNotFalsy
} from '../../';

import {
    RxDBReplicationP2PPlugin,
    RxP2PReplicationPool,
    getConnectionHandlerWebtorrent,
    isMasterInP2PReplication
} from '../../plugins/replication-p2p';

import { randomString, wait, waitUntil } from 'async-test-util';

describe('replication-p2p.test.ts', () => {
    if (!config.storage.hasPersistence) {
        return;
    }


    let webtorrentTrackerUrl: string;
    describe('init', () => {
        it('Start Webtorrent tracker server', async () => {
            if (!config.platform.isNode()) {
                return;
            }
            console.log('START TRACKER');
            const trackerModule = require('../helper/webtorrent-tracker');
            webtorrentTrackerUrl = await trackerModule.startWebtorrentTracker();
            console.log('START TRACKER DONE');
        });
    });
    describe('utils', () => {
        describe('.isMasterInP2PReplication()', () => {
            new Array(10).fill(0).forEach(() => {
                const id1 = randomString(7);
                const id2 = randomString(7);
                it('should have exactly one master ' + id1 + ' - ' + id2, () => {
                    const isMasterA = isMasterInP2PReplication(defaultHashFunction, id1, id2);
                    const isMasterB = isMasterInP2PReplication(defaultHashFunction, id2, id1);
                    assert.ok(isMasterA !== isMasterB);
                });
            });
        });
    });


    addRxPlugin(RxDBReplicationP2PPlugin);

    function ensureReplicationHasNoErrors(replicationPool: RxP2PReplicationPool<any>) {
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
        return docs.map(d => d.toJSON());
    }
    async function ensureCollectionsHaveEqualState<RxDocType>(
        c1: RxCollection<RxDocType>,
        c2: RxCollection<RxDocType>
    ) {
        const json1 = await getJson(c1);
        const json2 = await getJson(c2);
        try {
            assert.deepStrictEqual(
                json1,
                json2
            );
        } catch (err) {
            console.error('ensureCollectionsHaveEqualState() states not equal:');
            console.dir({
                [c1.name]: json1,
                [c2.name]: json2
            });
            throw err;
        }
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
        secret: string,
        collections: RxCollection<RxDocType>[]
    ): Promise<RxP2PReplicationPool<RxDocType>[]> {
        const ret = await Promise.all(
            collections.map(async (collection) => {
                const replicationPool = await collection.syncP2P({
                    topic,
                    secret,
                    connectionHandlerCreator: getConnectionHandlerWebtorrent([webtorrentTrackerUrl]),
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
        /**
         * Creating a WebRTC connection takes really long,
         * so we have to use a big test to test all functionality at once
         * without to re-create connections.
         */
        it('should stream changes over the replication to other collections', async function () {
            this.timeout(100 * 1000);

            console.log('#############################');
            console.log('#############################');
            console.log('#############################');
            console.log('#############################');

            const c1 = await humansCollection.create(1, 'aaa');
            const c2 = await humansCollection.create(1, 'bbb');


            // initial sync
            console.log('1');
            const topic = randomCouchString(10);
            const secret = randomCouchString(10);
            const replicationPools = await syncCollections(topic, secret, [c1, c2]);
            console.log('2');

            await awaitCollectionsInSync([c1, c2]);
            await wait(100);


            // insert
            console.log('2.2');
            await c1.insert(schemaObjects.human('inserted-after-first-sync'));
            console.log('2.3');
            await awaitCollectionsInSync([c1, c2]);
            console.log('2.4');
            await wait(100);



            console.log('3');


            // update
            const doc = await c1.findOne().exec(true);
            console.log('-------------------------------------');
            console.log('-------------------------------------');
            console.log('-------------------------------------');
            console.log('-------------------------------------');
            await doc.atomicPatch({ age: 100 });
            console.log('4');
            await awaitCollectionsInSync([c1, c2]);
            console.log('4.5');
            assert.strictEqual(doc.age, 100);
            console.log('5');
            await wait(100);

            // delete
            await doc.remove();
            await awaitCollectionsInSync([c1, c2]);
            await wait(100);
            console.log('6');


            console.log('.......................');
            console.log('.......................');
            console.log('.......................');
            console.log('.......................');


            replicationPools.forEach(pool => {
                const peerIds = Array.from(pool.peerStates$.getValue().keys())
                    .map(peer => peer.id);
                console.log('peers of colleciton: ' + pool.collection.name);
                console.dir(peerIds);
            });

            // add another collection to sync
            const c3 = await humansCollection.create(1, 'ccc');

            console.log('----------------- collection created!');

            await syncCollections(topic, secret, [c3]);
            console.log('----- collection synced');
            await awaitCollectionsInSync([c1, c2, c3]);


            console.log('-------------------------------');
            console.log('-------------------------------');
            console.log('-------------------------------');


            process.exit();


            // const foundPromise = firstValueFrom(
            //     c2.find().$.pipe(
            //         filter(results => results.length === 1)
            //     )
            // );

            // await c1.insert(schemaObjects.human('foobar'));

            // // wait until it is on the server
            // await waitUntil(async () => {
            //     const serverDocs = await getAllServerDocs(server.url);
            //     return serverDocs.length === 1;
            // });

            // const endResult = await foundPromise;
            // assert.strictEqual(endResult[0].passportId, 'foobar');

            c1.database.destroy();
            c2.database.destroy();
            c3.database.destroy();
        });
    });
    describe('ISSUES', () => { });
});
