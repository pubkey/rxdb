import {
    startRxStorageRemoteWebsocketServer
} from '../../plugins/storage-remote-websocket/index.ts';
import { getRxStorageMemory } from '../../plugins/storage-memory/index.ts';

export async function startRemoteStorageServer(port: number) {
    const server = await startRxStorageRemoteWebsocketServer({
        port,
        storage: getRxStorageMemory()
    });
    return server;
}
