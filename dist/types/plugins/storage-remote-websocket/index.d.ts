import type { RxStorageRemoteWebsocketClient, RxStorageRemoteWebsocketClientOptions, RxStorageRemoteWebsocketServerOptions, RxStorageRemoteWebsocketServerState } from './types';
export declare function startRxStorageRemoteWebsocketServer(options: RxStorageRemoteWebsocketServerOptions): RxStorageRemoteWebsocketServerState;
export declare function getRxStorageRemoteWebsocket(options: RxStorageRemoteWebsocketClientOptions): RxStorageRemoteWebsocketClient;
export * from './types';
