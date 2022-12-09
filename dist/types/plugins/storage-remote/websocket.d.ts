import type { RxStorage } from '../../types';
import type { RxStorageRemoteWebsocketClientOptions, RxStorageRemoteWebsocketServerOptions, RxStorageRemoteWebsocketServerState } from './storage-remote-types';
export declare function startRxStorageRemoteWebsocketServer(options: RxStorageRemoteWebsocketServerOptions): RxStorageRemoteWebsocketServerState;
export declare function getRxStorageRemoteWebsocket(options: RxStorageRemoteWebsocketClientOptions): RxStorage<any, any>;
