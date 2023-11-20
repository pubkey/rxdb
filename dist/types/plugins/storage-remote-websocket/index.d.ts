import type { RxStorageRemoteWebsocketClient, RxStorageRemoteWebsocketClientOptions, RxStorageRemoteWebsocketServerOptions, RxStorageRemoteWebsocketServerState } from './types.ts';
export declare function startRxStorageRemoteWebsocketServer(options: RxStorageRemoteWebsocketServerOptions): RxStorageRemoteWebsocketServerState;
export declare function getRxStorageRemoteWebsocket(options: RxStorageRemoteWebsocketClientOptions): RxStorageRemoteWebsocketClient;
export * from './types.ts';
