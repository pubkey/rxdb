import assert from 'assert';
import config, {
} from './config.ts';

import {
    clone,
    randomCouchString
} from '../../plugins/core/index.mjs';
import {
    startRxServer
} from '../../plugins/server/index.mjs';
import {
    replicateWithWebsocketServer
} from '../../plugins/replication-websocket/index.mjs';
import * as humansCollection from './../helper/humans-collection.ts';
import { nextPort } from '../helper/port-manager.ts';
import { ensureReplicationHasNoErrors } from '../helper/test-util.ts';
import * as schemas from '../helper/schemas.ts';
import { wait, waitUntil } from 'async-test-util';

config.parallel('server.test.ts', () => {
    if (
        !config.platform.isNode() &&
        !config.isBun
    ) {
        return;
    }

    const authenticationHandler = () => ({ validUntil: Date.now() + 100000, data: {} });
    const headers = {
        Authorization: 'S0VLU0UhIExFQ0tFUiEK'
    };

    describe('basics', () => {
        it('should start end stop the server', async () => {
            const port = await nextPort();
            const col = await humansCollection.create(0);
            const server = await startRxServer({
                database: col.database,
                authenticationHandler,
                port,
                hostname: 'localhost'
            });
            await server.addReplicationEndpoint({
                collection: col
            });
            await col.database.destroy();
        });
    });
    describe('replication endoint', () => {
        it('should replicate all data in both directions', async () => {
            const col = await humansCollection.create(5);
            const port = await nextPort();
            const server = await startRxServer({
                database: col.database,
                authenticationHandler,
                port,
                hostname: 'localhost'
            });
            const endpoint = await server.addReplicationEndpoint({
                collection: col
            });
            const clientCol = await humansCollection.create(5);
            const replicationState = await replicateWithWebsocketServer({
                collection: clientCol,
                replicationIdentifier: randomCouchString(10),
                url: 'ws://localhost:' + port + '/' + endpoint.urlPath,
                headers
            });
            console.log('--- 1.2');
            ensureReplicationHasNoErrors(replicationState);

            await replicationState.awaitInSync();
            const docsB = await clientCol.find().exec();
            assert.strictEqual(docsB.length, 10);

            const ids = docsB.map(d => d.primary);
            console.dir(ids);

            const docsA = await col.find().exec();
            assert.strictEqual(docsA.length, 10);

            await col.database.destroy();
            await clientCol.database.destroy();
        });
        it('should give a 426 error on outdated versions', async () => {
            const newestSchema = clone(schemas.human);
            newestSchema.version = 1;
            const col = await humansCollection.createBySchema(newestSchema, undefined, undefined, { 1: d => d });
            const port = await nextPort();
            const server = await startRxServer({
                database: col.database,
                authenticationHandler,
                port,
                hostname: 'localhost'
            });
            await server.addReplicationEndpoint({
                collection: col
            });

            console.log('XX 1');
            const clientCol = await humansCollection.createBySchema(schemas.human);
            console.log('XX 2');
            const replicationState = await replicateWithWebsocketServer({
                collection: clientCol,
                replicationIdentifier: randomCouchString(10),
                url: 'ws://localhost:' + port + '/replication/human/0',
                headers
            });
            console.log('XX 3');

            const errors: any[] = [];
            replicationState.error$.subscribe(err => errors.push(err));

            await wait(1000);
            console.dir(errors);

            await waitUntil(() => errors.length > 0);



            process.exit();


            col.database.destroy();
            clientCol.database.destroy();
        });
    });

});
