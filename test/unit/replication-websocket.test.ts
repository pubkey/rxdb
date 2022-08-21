import assert from 'assert';
import AsyncTestUtil, {
    clone,
    wait,
    waitUntil
} from 'async-test-util';
import config from './config';
import * as schemaObjects from '../helper/schema-objects';
import * as schemas from '../helper/schemas';
import * as humansCollection from '../helper/humans-collection';
import {
    startWebsocketServer,
    replicateWithWebsocketServer
} from '../../plugins/replication-websocket';
import {
    randomCouchString,
    RxCollection
} from '../../';
import { getPort } from '../helper/graphql-server';

describe('replication-websocket.test.ts', () => {

    type TestDocType = schemaObjects.HumanWithTimestampDocumentType;
    async function getTestCollections(docsAmount: { local: number, remote: number }): Promise<{
        localCollection: RxCollection<TestDocType, {}, {}, {}>,
        remoteCollection: RxCollection<TestDocType, {}, {}, {}>
    }> {

        const collectionName = 'col' + randomCouchString(10);
        const [localCollection, remoteCollection] = await Promise.all([
            humansCollection.createHumanWithTimestamp(docsAmount.local, collectionName, false),
            humansCollection.createHumanWithTimestamp(docsAmount.remote, collectionName, false)
        ]);
        return {
            localCollection,
            remoteCollection
        };
    }

    function getPortAndUrl(path?: string) {
        const port = getPort();
        let url = 'ws://localhost:' + port;
        if (path) {
            url += '/' + path;
        }
        return {
            port,
            url
        };
    }

    config.parallel('live:false pull only', () => {
        it('should start a server+client and replicate one document from server to the client', async () => {
            const { localCollection, remoteCollection } = await getTestCollections({
                local: 1,
                remote: 1
            });

            const portAndUrl = getPortAndUrl();

            const serverState = await startWebsocketServer({
                database: remoteCollection.database,
                port: portAndUrl.port
            });

            const replicationState = await replicateWithWebsocketServer({
                collection: localCollection,
                url: portAndUrl.url
            });
            replicationState.error$.subscribe(err => {
                console.log('got error :');
                console.log(JSON.stringify(err, null, 4));
                throw err;
            });


            await replicationState.awaitInSync();

            const serverDocs = await remoteCollection.find().exec();
            assert.strictEqual(serverDocs.length, 2);
            const clientDocs = await localCollection.find().exec();
            assert.strictEqual(clientDocs.length, 2);

            localCollection.database.destroy();
            remoteCollection.database.destroy();
        });
    });
});
