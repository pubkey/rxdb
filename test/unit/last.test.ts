import assert from 'assert';
import { waitUntil } from 'async-test-util';
import {
    dbCount,
    BROADCAST_CHANNEL_BY_TOKEN
} from '../../';
import {
    OPEN_POUCHDB_STORAGE_INSTANCES,
    OPEN_POUCH_INSTANCES
} from '../../plugins/pouchdb';
import config from './config';

import {
    GRAPHQL_WEBSOCKET_BY_URL
} from '../../plugins/replication-graphql';


describe('last.test.ts (' + config.storage.name + ')', () => {
    it('ensure every db is cleaned up', () => {
        assert.strictEqual(dbCount(), 0);
    });
    it('ensure every PouchDB storage instance is cleaned up', async () => {
        try {
            // for performance, we do not await db closing, so it might take some time
            // until everything is closed.
            await waitUntil(() => {
                return OPEN_POUCHDB_STORAGE_INSTANCES.size === 0;
            }, 5 * 1000);
        } catch (err) {
            console.dir(OPEN_POUCHDB_STORAGE_INSTANCES);
            throw new Error('no all PouchDB storage instances have been closed (open: ' + OPEN_POUCHDB_STORAGE_INSTANCES.size + ')');
        }
    });
    it('ensure every PouchDB database is removed', async () => {
        try {
            // for performance, we do not await db closing, so it might take some time
            // until everything is closed.
            await waitUntil(() => {
                return OPEN_POUCH_INSTANCES.size === 0;
            }, 5 * 1000);
        } catch (err) {
            console.dir(OPEN_POUCH_INSTANCES);
            throw new Error('no all pouch instances have been closed');
        }
    });
    it('ensure all BroadcastChannels are closed', async () => {
        try {
            await waitUntil(() => {
                return BROADCAST_CHANNEL_BY_TOKEN.size === 0;
            }, 5 * 1000);
        } catch (err) {
            const openChannelKeys = Array.from(BROADCAST_CHANNEL_BY_TOKEN.keys());
            console.log('open broadcast channel tokens:');
            console.log(openChannelKeys.join(', '));
            throw new Error('not all broadcast channels have been closed (' + openChannelKeys.length + ')');
        }
    });
    it('ensure all websockets have been closed', async () => {
        try {
            await waitUntil(() => {
                return GRAPHQL_WEBSOCKET_BY_URL.size === 0;
            }, 5 * 1000);
        } catch (err) {
            const openSocketUrls = Array.from(GRAPHQL_WEBSOCKET_BY_URL.keys());
            console.log('open graphql websockets:');
            console.log(openSocketUrls.join(', '));
            throw new Error('not all graphql websockets have been closed (' + openSocketUrls.length + ')');
        }
    });
});
