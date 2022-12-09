import { RxStorageRemote } from '../storage-remote';
import type { RxStorageStatics } from '../../types';
export declare type RxStorageIpcRendererSettings = {
    /**
     * Set the same key on both sides
     * to ensure that messages do not get mixed
     * up when you use more then one storage.
     */
    key: string;
    statics: RxStorageStatics;
    ipcRenderer: any;
};
export declare type RxStorageIpcRenderer = RxStorageRemote;
export declare function getRxStorageIpcRenderer(settings: RxStorageIpcRendererSettings): RxStorageIpcRenderer;
