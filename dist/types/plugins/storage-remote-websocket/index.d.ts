import type { RxStorage } from '../../types';
import type { RxStorageRemoteWebsocketClientOptions, RxStorageRemoteWebsocketServerOptions, RxStorageRemoteWebsocketServerState } from './types';
export declare function startRxStorageRemoteWebsocketServer(options: RxStorageRemoteWebsocketServerOptions): RxStorageRemoteWebsocketServerState;
export declare function getRxStorageRemoteWebsocket(options: RxStorageRemoteWebsocketClientOptions): RxStorage<any, any>;
export * from './types';
