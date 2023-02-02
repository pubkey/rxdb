
import assert from 'assert';

import config from './config';
import {
    RxStorageDefaultStatics
} from '../../';
import { nextPort } from '../helper/port-manager';
import * as humansCollections from '../helper/humans-collection';
import * as schemaObjects from '../helper/schema-objects';
import {
    getRxStorageRemoteWebsocket,
    startRxStorageRemoteWebsocketServer
} from '../../plugins/storage-remote-websocket';
import { getRxStorageMemory, } from '../../plugins/storage-memory';

config.parallel('rx-storage-remote.test.ts', () => {
    /**
     * Notice: Most use cases for the remote storage
     * are tests by having a full unit-test run where all
     * tests are run with the remote websocket storage.
     * This is defined in the unit/config.ts
     *
     * In this while we only add additional tests
     * that are specific to the remote storage plugin.
     */
    if (
        !config.platform.isNode() ||
        config.storage.name !== 'remote'
    ) {
        return;
    }
    describe('remote RxDatabase', () => {
        it('should have the same data on both sides', async () => {
            const port = await nextPort();
            const colServer = await humansCollections.create(0, undefined, false, false, getRxStorageMemory());
            const server = await startRxStorageRemoteWebsocketServer({
                port,
                database: colServer.database
            });
            assert.ok(server);

            const colClient = await humansCollections.create(
                0, undefined, false, false,
                getRxStorageRemoteWebsocket({
                    statics: RxStorageDefaultStatics,
                    url: 'ws://localhost:' + port
                })
            );
            const cols = [colServer, colClient];

            await colServer.insert(schemaObjects.human());
            await colClient.insert(schemaObjects.human());

            await Promise.all(
                cols.map(async (col) => {
                    const docs = await col.find().exec();
                    assert.strictEqual(docs.length, 2);
                })
            );

            await colClient.database.destroy();
            await colServer.database.destroy();
        });
    });
    describe('custom requests', () => {
        it('should send the message and get the answer', async () => {
            const port = await nextPort();
            const server = await startRxStorageRemoteWebsocketServer({
                port,
                storage: getRxStorageMemory(),
                customRequestHandler: (input: any) => {
                    if (input === 'foobar') {
                        return 'barfoo';
                    } else {
                        throw new Error('input not matching');
                    }
                }
            });
            assert.ok(server);
            const clientStorage = getRxStorageRemoteWebsocket({
                statics: RxStorageDefaultStatics,
                url: 'ws://localhost:' + port
            });

            const result = await clientStorage.customRequest('foobar');
            assert.strictEqual(result, 'barfoo');
        });
    });
});
