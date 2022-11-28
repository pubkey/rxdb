import type { RxStorageInstance } from '../../types';
export declare const IPC_RENDERER_KEY_PREFIX = "rxdb-ipc-renderer-storage";
export declare const IPC_RENDERER_TO_MAIN = "rxdb-renderer-to-main";
export declare type IpcMessageFromRenderer = {
    channelId: string;
    requestId: string;
    method: keyof RxStorageInstance<any, any, any>;
    params: any[];
};
export declare type IpcMessageFromMain = {
    answerTo: string;
    method: keyof RxStorageInstance<any, any, any>;
    error?: any;
    return?: any;
};
