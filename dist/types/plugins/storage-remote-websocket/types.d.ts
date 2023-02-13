import type { WebsocketServerState } from '../replication-websocket';
import type { ServerOptions, ClientOptions } from 'ws';
import type { RxDatabase, RxStorage, RxStorageStatics } from '../../types';
import type { CustomRequestHandler, RxStorageRemoteExposeType } from '../storage-remote/storage-remote-types';
import { RxStorageRemote } from '../storage-remote';
export type RxStorageRemoteWebsocketServerOptions = ServerOptions & {
    storage?: RxStorage<any, any>;
    database?: RxDatabase<any, any, any>;
    customRequestHandler?: CustomRequestHandler<any, any>;
};
export type RxStorageRemoteWebsocketServerState = {
    serverState: WebsocketServerState;
    exposeState: RxStorageRemoteExposeType;
};
export type RxStorageRemoteWebsocketClientOptions = ClientOptions & {
    statics: RxStorageStatics;
    url: string;
    /**
     * By default, sockets are cached and reused by url.
     * You can disable this behavior by setting reuseSocketConnection=false
     * This can be useful in tests to simpulate multiple clients.
     */
    disableCache?: boolean;
};
export type RxStorageRemoteWebsocketClient = RxStorageRemote;
