import type { RxStorageInstance } from '../../types';

export const IPC_RENDERER_KEY_PREFIX = 'rxdb-ipc-renderer-storage';
export const IPC_RENDERER_TO_MAIN = 'rxdb-renderer-to-main';

export type IpcMessageFromRenderer = {
    channelId: string;
    requestId: string;
    method: keyof RxStorageInstance<any, any, any>;
    params: any[];
};

export type IpcMessageFromMain = {
    answerTo: string; // id of the request
    method: keyof RxStorageInstance<any, any, any>;
    error?: any;
    return?: any;
};
