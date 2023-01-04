import type {
    WebsocketServerState
} from '../replication-websocket';
import type { ServerOptions, ClientOptions } from 'ws';
import type { RxStorage, RxStorageStatics } from '../../types';
import type { RxStorageRemoteExposeType } from '../storage-remote/storage-remote-types';

export type RxStorageRemoteWebsocketServerOptions = ServerOptions & {
    storage: RxStorage<any, any>;
};

export type RxStorageRemoteWebsocketServerState = {
    serverState: WebsocketServerState;
    exposeState: RxStorageRemoteExposeType;
};

export type RxStorageRemoteWebsocketClientOptions = ClientOptions & {
    statics: RxStorageStatics;
    url: string;
};
