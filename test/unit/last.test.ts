import assert from 'assert';
import { waitUntil } from 'async-test-util';
import {
    dbCount,
    BROADCAST_CHANNEL_BY_TOKEN
} from '../../';
import config from './config';

import {
    GRAPHQL_WEBSOCKET_BY_URL
} from '../../plugins/replication-graphql';


describe('last.test.ts (' + config.storage.name + ')', () => {
    it('ensure every db is cleaned up', () => {
        assert.strictEqual(dbCount(), 0);
    });
    it('ensure all BroadcastChannels are closed', async () => {
        if (config.storage.name === 'lokijs') {
            // TODO random fails on lokijs
            return;
        }
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
