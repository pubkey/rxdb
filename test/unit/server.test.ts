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
    replicateServer
} from '../../plugins/replication-server/index.mjs';
import * as humansCollection from './../helper/humans-collection.ts';
import { nextPort } from '../helper/port-manager.ts';
import { ensureReplicationHasNoErrors } from '../helper/test-util.ts';
import * as schemas from '../helper/schemas.ts';
import { wait, waitUntil } from 'async-test-util';
import * as schemaObjects from '../helper/schema-objects.ts';
import EventSource from 'eventsource';

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
        it('should be able to reach the endpoint', async function () {
            this.timeout(100000);
            const col = await humansCollection.create(1);
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
            const url = 'http://localhost:' + port + '/' + endpoint.urlPath + '/pull';
            const response = await fetch(url);
            const data = await response.json();
            assert.ok(data.documents[0]);
            assert.ok(data.checkpoint);
            await col.database.destroy();
        });
        it('should replicate all data in both directions', async function () {
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
            const url = 'http://localhost:' + port + '/' + endpoint.urlPath;
            console.log('client url: ' + url);
            const replicationState = await replicateServer({
                collection: clientCol,
                replicationIdentifier: randomCouchString(10),
                url,
                headers,
                push: {},
                pull: {},
                eventSource: EventSource
            });
            console.log('--- 1.2');
            ensureReplicationHasNoErrors(replicationState);

            await replicationState.awaitInSync();

            const docsB = await clientCol.find().exec();
            const ids = docsB.map(d => d.primary);
            console.dir(ids);
            assert.strictEqual(docsB.length, 10);


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

            // check with plain requests
            const responsePull = await fetch('http://localhost:' + port + '/replication/human/0/pull');
            assert.strictEqual(responsePull.status, 426);
            const responsePush = await fetch('http://localhost:' + port + '/replication/human/0/push', {
                method: 'POST'
            });
            assert.strictEqual(responsePush.status, 426);
            const responsePullStream = await fetch('http://localhost:' + port + '/replication/human/0/pullStream');
            assert.strictEqual(responsePullStream.status, 426);

            // check with replication
            console.log('XX 1');
            const clientCol = await humansCollection.createBySchema(schemas.human);
            console.log('XX 2');
            const replicationState = await replicateServer({
                collection: clientCol,
                replicationIdentifier: randomCouchString(10),
                url: 'http://localhost:' + port + '/replication/human/0',
                headers,
                push: {},
                pull: {},
                eventSource: EventSource
            });
            console.log('XX 3');

            const errors: any[] = [];
            replicationState.error$.subscribe(err => errors.push(err));

            let emittedOutdated = false;
            replicationState.outdatedClient$.subscribe(() => emittedOutdated = true);
            await waitUntil(() => emittedOutdated);


            await waitUntil(() => errors.length > 0);
            const firstError = errors[0];
            assert.strictEqual(firstError.code, 'RC_PULL');

            col.database.destroy();
            clientCol.database.destroy();
        });
        it('must replicate ongoing changes', async () => {
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
            const url = 'http://localhost:' + port + '/' + endpoint.urlPath;
            console.log('client url: ' + url);
            const replicationState = await replicateServer({
                collection: clientCol,
                replicationIdentifier: randomCouchString(10),
                url,
                headers,
                push: {},
                pull: {},
                eventSource: EventSource
            });
            console.log('--- 1.2');
            ensureReplicationHasNoErrors(replicationState);

            await replicationState.awaitInSync();

            console.log('-- in sync');

            // server to client
            await col.insert(schemaObjects.human());
            await waitUntil(async () => {
                const docs = await clientCol.find().exec();
                return docs.length === 12;
            });

            console.log('-- in sync2');
            // client to server
            await clientCol.insert(schemaObjects.human());
            await waitUntil(async () => {
                const docs = await col.find().exec();
                return docs.length === 12;
            });
            console.log('-- in sync3');

            await col.database.destroy();
            await clientCol.database.destroy();
        });
    });

});
