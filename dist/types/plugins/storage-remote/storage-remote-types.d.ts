import type { ServerOptions, ClientOptions } from 'ws';
import type { Observable } from 'rxjs';
import type { RxStorage, RxStorageInstance, RxStorageInstanceCreationParams, RxStorageStatics } from '../../types';
import type { WebsocketServerState } from '../replication-websocket';
export declare type MessageFromRemote = {
    connectionId: string;
    answerTo: string;
    method: keyof RxStorageInstance<any, any, any> | 'create';
    error?: any;
    return?: any;
};
export declare type MessageToRemote = {
    connectionId: string;
    /**
     * Unique ID of the request
     */
    requestId: string;
    method: keyof RxStorageInstance<any, any, any> | 'create';
    params: RxStorageInstanceCreationParams<any, any> | any[];
};
export declare type RxStorageRemoteSettings = {
    identifier: string;
    statics: RxStorageStatics;
    send(msg: MessageToRemote): void;
    messages$: Observable<MessageFromRemote>;
};
export declare type RxStorageMessageChannelInternals = {
    params: RxStorageInstanceCreationParams<any, any>;
    connectionId: string;
};
export declare type RxStorageRemoteExposeSettings = {
    send(msg: MessageFromRemote): void;
    messages$: Observable<MessageToRemote>;
    /**
     * The original storage
     * which actually stores the data.
     */
    storage: RxStorage<any, any>;
};
export declare type RxStorageRemoteExposeType = {
    instanceByFullName: Map<string, any>;
};
export declare type RxStorageRemoteWebsocketServerOptions = ServerOptions & {
    storage: RxStorage<any, any>;
};
export declare type RxStorageRemoteWebsocketServerState = {
    serverState: WebsocketServerState;
    exposeState: RxStorageRemoteExposeType;
};
export declare type RxStorageRemoteWebsocketClientOptions = ClientOptions & {
    statics: RxStorageStatics;
    url: string;
};
