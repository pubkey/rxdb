import {
    startRxStorageRemoteWebsocketServer
} from '../../plugins/storage-remote';
import {
    getRxStorageLoki
} from '../../plugins/lokijs';


/**
 * Use the lokijs storage because the memory storage
 * has set hasPersistence:false
 */
const storage = getRxStorageLoki({
});

export async function startRemoteStorageServer(port: number) {
    const server = await startRxStorageRemoteWebsocketServer({
        port,
        storage
    });
    return server;
}
