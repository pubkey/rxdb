import assert from 'assert';
import { waitUntil } from 'async-test-util';
import {
    dbCount,
    BROADCAST_CHANNEL_BY_TOKEN,
    getFromMapOrThrow,
    OPEN_COLLECTIONS
} from '../../plugins/core/index.mjs';
import config from './config.ts';

import {
    GRAPHQL_WEBSOCKET_BY_URL
} from '../../plugins/replication-graphql/index.mjs';
import {
    OPEN_REMOTE_MESSAGE_CHANNELS,
    CACHE_ITEM_BY_MESSAGE_CHANNEL
} from '../../plugins/storage-remote/index.mjs';
import { OPEN_MEMORY_INSTANCES } from '../../plugins/storage-memory/index.mjs';
import {
    isBun,
    isDeno
} from '../../plugins/test-utils/index.mjs';
declare const Deno: any;

describe('last.test.ts (' + config.storage.name + ')', () => {
    it('ensure all Memory RxStorage instances are closed', async () => {
        try {
            await waitUntil(() => {
                return OPEN_MEMORY_INSTANCES.size === 0;
            }, 5 * 1000);
        } catch (err) {
            console.log('open memory instances:');
            const openInstances = Array.from(OPEN_MEMORY_INSTANCES.values());
            openInstances.forEach(instance => {
                console.dir({
                    databaseName: instance.databaseName,
                    collectionName: instance.collectionName,
                    version: instance.schema.version
                });
            });
            throw new Error('not all memory instances have been closed (' + OPEN_MEMORY_INSTANCES.size + ' still open)');
        }
    });
    it('ensure every db is cleaned up', () => {
        assert.strictEqual(dbCount(), 0);
    });
    it('ensure all collections are closed', async () => {
        try {
            await waitUntil(() => {
                return OPEN_COLLECTIONS.size === 0;
            }, 5 * 1000);
        } catch (err) {
            const openCollections = Array.from(OPEN_COLLECTIONS.values()).map(c => ({ c: c.name, db: c.database ? c.database.name : '' }));
            console.log('open collectios:');
            console.dir(openCollections);
            throw new Error('not all collections have been closed (' + openCollections.length + ')');
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
    it('ensure all RemoteMessageChannels have been closed', async () => {
        function getStillOpen() {
            return Array.from(OPEN_REMOTE_MESSAGE_CHANNELS)
                .map(messageChannel => getFromMapOrThrow(CACHE_ITEM_BY_MESSAGE_CHANNEL, messageChannel))
                .filter(cacheItem => !cacheItem.keepAlive);
        }
        try {
            await waitUntil(() => {
                const stillOpen = getStillOpen();
                return stillOpen.length === 0;
            }, 5 * 1000);
        } catch (err) {
            const stillOpen = getStillOpen();
            stillOpen.forEach(cacheItem => {
                console.log('open graphql webRemoteMessageChannelssockets:');
                console.dir(cacheItem);
            });
            console.log(stillOpen);
            throw new Error('not all RemoteMessageChannels have been closed (' + stillOpen.length + ')');
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

    /**
     * Some runtimes do not automatically exit for whatever reason.
     */
    it('exit the process', () => {
        if (isDeno) {
            Deno.exit(0);
        }
        if (isBun) {
            process.exit(0);
        }
    });
});

