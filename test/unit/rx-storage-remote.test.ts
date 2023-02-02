
import assert from 'assert';

import config from './config';
import {
    RxJsonSchema,
    randomCouchString,
    MangoQuery,
    fillWithDefaultSettings,
    normalizeMangoQuery,
    now,
    getPrimaryFieldOfPrimaryKey,
    clone,
    getQueryPlan,
    deepFreeze,
    RxStorageDefaultStatics
} from '../../';
import {
    areSelectorsSatisfiedByIndex
} from '../../plugins/dev-mode';
import { EXAMPLE_REVISION_1 } from '../helper/revisions';
import * as schemas from '../helper/schemas';
import {
    HeroArrayDocumentType,
    human,
    nestedHuman,
    NestedHumanDocumentType
} from '../helper/schema-objects';
import { nextPort } from '../helper/port-manager';
import * as humansCollections from '../helper/humans-collection';
import {
    getRxStorageRemoteWebsocket,
    startRxStorageRemoteWebsocketServer
} from '../../plugins/storage-remote-websocket';
import { getRxStorageMemory, } from '../../plugins/storage-memory';

const TEST_CONTEXT = 'rx-storage-remote.test.ts';
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

            const colClient = await humansCollections.create(
                0, undefined, false, false,
                getRxStorageRemoteWebsocket({
                    statics: RxStorageDefaultStatics,
                    url: 'ws://localhost:' + port
                })
            );


            console.log('.-----------------');
            process.exit();

            colServer.database.destroy();
            colClient.database.destroy();
        });
    });
    describe('custom requests', () => {
        it('should send the message and get the answer', async () => {
            const port = await nextPort();
            const server = await startRxStorageRemoteWebsocketServer({
                port,
                storage: getRxStorageMemory()
            });
        });
    });
});
