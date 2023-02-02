import type { Observable } from 'rxjs';
import type {
    MaybePromise,
    PlainJsonError,
    RxDatabase,
    RxStorage,
    RxStorageInstance,
    RxStorageInstanceCreationParams,
    RxStorageStatics
} from '../../types';



export type MessageFromRemote = {
    connectionId: string;
    answerTo: string; // id of the request
    method: keyof RxStorageInstance<any, any, any> | 'create' | 'custom';
    error?: PlainJsonError;
    return?: any;
};

export type MessageToRemote = {
    connectionId: string;
    /**
     * Unique ID of the request
     */
    requestId: string;
    method: keyof RxStorageInstance<any, any, any> | 'create' | 'custom';
    params:
    RxStorageInstanceCreationParams<any, any> | // used in the create call
    any[] | // used to call RxStorageInstance methods
    any; // used in custom requests
};


export type RxStorageRemoteSettings = {
    identifier: string;
    statics: RxStorageStatics;
    send(msg: MessageToRemote): void;
    messages$: Observable<MessageFromRemote>;
};

export type RxStorageRemoteInternals = {
    params: RxStorageInstanceCreationParams<any, any>;
    connectionId: string;
};

export type RxStorageRemoteExposeSettingsBase = {
    send(msg: MessageFromRemote): void;
    messages$: Observable<MessageToRemote>;
    customRequestHandler?: CustomRequestHandler<any, any>;
};

export type RxStorageRemoteExposeSettingsRxDatabase = RxStorageRemoteExposeSettingsBase & {
    /**
     * The database which must be mapped to the remote storage server.
     */
    database: RxDatabase;
};

export type RxStorageRemoteExposeSettingsRxStorage = RxStorageRemoteExposeSettingsBase & {
    /**
     * The original storage
     * which actually stores the data.
     */
    storage: RxStorage<any, any>;
};

export type RxStorageRemoteExposeSettings = RxStorageRemoteExposeSettingsRxDatabase | RxStorageRemoteExposeSettingsRxStorage;

export type RxStorageRemoteExposeType = {
    instanceByFullName: Map<string, any>;
};

/**
 * If set, the clients can send RxDB-unrelated custom messages
 * to the remote storage and it will  answer them.
 */
export type CustomRequestHandler<In, Out> = (data: In) => MaybePromise<Out>;
