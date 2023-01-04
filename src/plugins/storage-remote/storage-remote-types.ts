import type { Observable } from 'rxjs';
import type {
    PlainJsonError,
    RxStorage,
    RxStorageInstance,
    RxStorageInstanceCreationParams,
    RxStorageStatics
} from '../../types';



export type MessageFromRemote = {
    connectionId: string;
    answerTo: string; // id of the request
    method: keyof RxStorageInstance<any, any, any> | 'create';
    error?: PlainJsonError;
    return?: any;
};

export type MessageToRemote = {
    connectionId: string;
    /**
     * Unique ID of the request
     */
    requestId: string;
    method: keyof RxStorageInstance<any, any, any> | 'create';
    params: RxStorageInstanceCreationParams<any, any> | any[];
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

export type RxStorageRemoteExposeSettings = {
    send(msg: MessageFromRemote): void;
    messages$: Observable<MessageToRemote>;
    /**
     * The original storage
     * which actually stores the data.
     */
    storage: RxStorage<any, any>;
};

export type RxStorageRemoteExposeType = {
    instanceByFullName: Map<string, any>;
};
