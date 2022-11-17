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
    RxCollection
} from '../../';

import {
    RxDBReplicationP2PPlugin,
    RxP2PReplicationPool,
    getConnectionHandlerP2PT
} from '../../plugins/replication-p2p';

import { filter, firstValueFrom } from 'rxjs';
import { wait, waitUntil } from 'async-test-util';

describe('replication-p2p.test.ts', () => {
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

    async function ensureCollectionsHaveEqualState<RxDocType>(
        c1: RxCollection<RxDocType>,
        c2: RxCollection<RxDocType>
    ) {
        const getJson = async (collection: RxCollection<RxDocType>) => {
            const docs = await collection.find().exec();
            return docs.map(d => d.toJSON());
        }
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
    describe('live:true', () => {
        async function syncLive<RxDocType>(
            topic: string,
            secret: string,
            collections: RxCollection<RxDocType>[]
        ): Promise<RxP2PReplicationPool<RxDocType>[]> {
            return collections.map(collection => {
                const replicationPool = collection.syncP2P({
                    topic,
                    secret,
                    connectionHandlerCreator: getConnectionHandlerP2PT(),
                    pull: {},
                    push: {}
                });
                ensureReplicationHasNoErrors(replicationPool);
                return replicationPool;
            });
        }

        it('should stream changes over the replication to a query', async () => {
            const c1 = await humansCollection.create(0);
            const c2 = await humansCollection.create(0);

            await syncLive(randomCouchString(10), randomCouchString(10), [c1, c2]);

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
