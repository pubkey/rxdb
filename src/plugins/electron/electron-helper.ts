import type { RxStorageInstance } from '../../types';

export const IPC_RENDERER_KEY_PREFIX = 'rxdb-ipc-renderer-storage';

export type IpcMessageFromRenderer = {
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
