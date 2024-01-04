import type {
    WebsocketServerState
} from '../replication-websocket/index.ts';
import type { ServerOptions, ClientOptions } from 'ws';
import type { RxDatabase, RxStorage } from '../../types/index.d.ts';
import type {
    CustomRequestHandler,
    RxStorageRemoteExposeType,
    RxStorageRemoteSettings
} from '../storage-remote/storage-remote-types.ts';
import { RxStorageRemote } from '../storage-remote/index.ts';

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
    url: string;
    mode: RxStorageRemoteSettings['mode'];
};

export type RxStorageRemoteWebsocketClient = RxStorageRemote;
