import { RxStorageMessageChannel } from '../../rx-storage-message-channel';
import type { RxStorageStatics } from '../../types';
export declare type RxStorageIpcRendererSettings = {
    key: string;
    statics: RxStorageStatics;
    ipcRenderer: any;
};
export declare type RxStorageIpcRenderer = RxStorageMessageChannel;
export declare function getRxStorageIpcRenderer(settings: RxStorageIpcRendererSettings): RxStorageIpcRenderer;
