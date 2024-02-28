import {
    startRxStorageRemoteWebsocketServer
} from '../../plugins/storage-remote-websocket/index.mjs';
import { getRxStorageMemory } from '../../plugins/storage-memory/index.mjs';
import { randomDelayStorage } from '../../plugins/core/index.mjs';

export async function startRemoteStorageServer(port: number) {
    const delayFn = () => 0;
    const server = await startRxStorageRemoteWebsocketServer({
        port,
        /**
         * We use a random delay on all operations for testing
         * because otherwise some wrong behavior slippled through
         * only because the memory storage itself is such fast.
         */
        storage: randomDelayStorage({
            storage: getRxStorageMemory(),
            delayTimeBefore: delayFn,
            delayTimeAfter: delayFn
        })
    });
    return server;
}
