import type { Observable } from 'rxjs';
import type {
    MaybePromise,
    PlainJsonError,
    RxDatabase,
    RxStorage,
    RxStorageInstance,
    RxStorageInstanceCreationParams
} from '../../types/index.d.ts';



export type MessageFromRemote = {
    connectionId: string;
    answerTo: string; // id of the request
    method: keyof RxStorageInstance<any, any, any> | 'create' | 'custom';
    error?: PlainJsonError;
    return?: any | string;
};

export type MessageToRemote = {
    connectionId: string;
    /**
     * Unique ID of the request
     */
    requestId: string;
    method: keyof RxStorageInstance<any, any, any> | 'create' | 'custom';
    /**
     * We send the RxDB version to the remote
     * to ensure we are communicating with an RxDB instance
     * of the same version. This is to prevent bugs
     * when people forget to rebuild their workers.
     */
    version: string;
    params:
    RxStorageInstanceCreationParams<any, any> | // used in the create call
    any[] | // used to call RxStorageInstance methods
    any; // used in custom requests
};


/**
 * A message channel represents a single
 * channel that is able to communicate with the remote.
 * For example a single websocket connection or WebWorker instance.
 * The storage must be able to open and close MessageChannels
 * according to the modes settings.
 */
export type RemoteMessageChannel = {
    send(msg: MessageToRemote): void;
    messages$: Observable<MessageFromRemote>;
    close(): Promise<void>;
};

export type RxStorageRemoteSettings = {
    identifier: string;
    /**
     * There are different modes
     * that determine how many message channels are used.
     * These modes can have different performance patterns.
     *
     * [default='storage']
     */
    mode?:
    // create exactly one RemoteMessageChannel and reuse that everywhere.
    | 'one'
    // storage: create one RemoteMessageChannel per call to getRxStorage...()
    | 'storage'
    // database: create one RemoteMessageChannel for each database
    | 'database'
    // collection: create one RemoteMessageChannel for each collection
    | 'collection';
    messageChannelCreator: () => Promise<RemoteMessageChannel>;
};

export type RxStorageRemoteInternals = {
    params: RxStorageInstanceCreationParams<any, any>;
    connectionId: string;
    messageChannel: RemoteMessageChannel;
};

export type RxStorageRemoteExposeSettingsBase = {
    send(msg: MessageFromRemote): void;
    messages$: Observable<MessageToRemote>;
    customRequestHandler?: CustomRequestHandler<any, any>;
    /**
     * Used in tests to simulate what happens if the remote
     * was build on a different RxDB version.
     */
    fakeVersion?: string;
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
