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
            throw new Error('no all storage instances have been closed');
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
            console.log(Array.from(BROADCAST_CHANNEL_BY_TOKEN.keys()));
            throw new Error('not all broadcast channels have been closed');
        }
    });
});
