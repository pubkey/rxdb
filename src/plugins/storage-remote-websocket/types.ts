import type {
    WebsocketServerState
} from '../replication-websocket';
import type { ServerOptions, ClientOptions } from 'ws';
import type { RxDatabase, RxStorage, RxStorageStatics } from '../../types';
import type {
    CustomRequestHandler,
    RxStorageRemoteExposeType,
    RxStorageRemoteSettings
} from '../storage-remote/storage-remote-types';
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
    mode: RxStorageRemoteSettings['mode'];
};

export type RxStorageRemoteWebsocketClient = RxStorageRemote;
