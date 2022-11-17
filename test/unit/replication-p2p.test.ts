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
    defaultHashFunction
} from '../../';

import {
    RxDBReplicationP2PPlugin,
    RxP2PReplicationPool,
    getConnectionHandlerP2PT,
    isMasterInP2PReplication
} from '../../plugins/replication-p2p';

import { filter, firstValueFrom } from 'rxjs';
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

    async function syncOnce(collection: RxCollection, server: any) {
        const replicationState = collection.syncP2P({

            live: false,
            pull: {},
            push: {}
        });
        ensureReplicationHasNoErrors(replicationState);
        await replicationState.awaitInitialReplication();
    }
    async function syncAll<RxDocType>(
        c1: RxCollection<RxDocType>,
        c2: RxCollection<RxDocType>,
        server: any
    ) {
        await syncOnce(c1, server);
        await syncOnce(c2, server);
        await syncOnce(c1, server);
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
        const last = collections.pop();
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
                    connectionHandlerCreator: getConnectionHandlerP2PT([webtorrentTrackerUrl]),
                    pull: {},
                    push: {}
                });
                ensureReplicationHasNoErrors(replicationPool);
                return replicationPool;
            })
        );

        console.log('syncCollections() 0.1');

        /**
         * If we have more then one collection,
         * ensure that at least one peer exists each.
         */
        if (collections.length > 1) {
            await Promise.all(
                ret.map(pool => pool.awaitFirstPeer())
            );
        }

        console.log('syncCollections() 0.2');
        return ret;
    }

    describe('live:true', () => {

        it('should stream changes over the replication to a query', async function () {
            this.timeout(100 * 1000);

            console.log('#############################');
            console.log('#############################');
            console.log('#############################');
            console.log('#############################');

            const c1 = await humansCollection.create(1, 'aaa');
            const c2 = await humansCollection.create(0, 'bbb');


            console.log('1');
            await syncCollections(randomCouchString(10), randomCouchString(10), [c1, c2]);
            console.log('2');

            await awaitCollectionsInSync([c1, c2]);
            console.log('3');


            await wait(100000);



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
        });
    });
    describe('ISSUES', () => { });
});
