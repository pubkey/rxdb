import { RxStorageRemote, RxStorageRemoteSettings } from '../storage-remote/index.ts';
import type { RxStorageStatics } from '../../types/index.d.ts';
export type RxStorageIpcRendererSettings = {
    /**
     * Set the same key on both sides
     * to ensure that messages do not get mixed
     * up when you use more then one storage.
     */
    key: string;
    statics: RxStorageStatics;
    ipcRenderer: any;
    mode: RxStorageRemoteSettings['mode'];
};
export type RxStorageIpcRenderer = RxStorageRemote;
export declare function getRxStorageIpcRenderer(settings: RxStorageIpcRendererSettings): RxStorageIpcRenderer;
