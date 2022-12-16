import {
    startRxStorageRemoteWebsocketServer
} from '../../plugins/storage-remote';
import { getRxStorageMemory } from '../../plugins/memory';

export async function startRemoteStorageServer(port: number) {
    const server = await startRxStorageRemoteWebsocketServer({
        port,
        storage: getRxStorageMemory()
    });
    return server;
}
