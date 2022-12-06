import { Subject } from 'rxjs';
import {
    getRxStorageMessageChannel,
    RxStorageMessageChannel,
    RxStorageMessageChannelSettings,
    RxStorageMessageFromRemote
} from '../../rx-storage-message-channel';
import type {
    RxStorageStatics
} from '../../types';
import {
    IPC_RENDERER_KEY_PREFIX
} from './electron-helper';

export type RxStorageIpcRendererSettings = {
    /**
     * Set the same key on both sides
     * to ensure that messages do not get mixed
     * up when you use more then one storage.
     */
    key: string;
    statics: RxStorageStatics;
    ipcRenderer: any;
};

export type RxStorageIpcRenderer = RxStorageMessageChannel;
export function getRxStorageIpcRenderer(
    settings: RxStorageIpcRendererSettings
): RxStorageIpcRenderer {
    const channelId = [
        IPC_RENDERER_KEY_PREFIX,
        settings.key
    ].join('|');

    const messages$ = new Subject<RxStorageMessageFromRemote>();
    settings.ipcRenderer.on(channelId, (_event: any, message: any) => {
        messages$.next(message);
    });


    settings.ipcRenderer.postMessage(
        channelId,
        false
    );

    const send: RxStorageMessageChannelSettings['send'] = (msg) => {
        settings.ipcRenderer.postMessage(
            channelId,
            msg
        );
    };
    const storage = getRxStorageMessageChannel({
        name: 'ipc-renderer',
        statics: settings.statics,
        messages$,
        send
    });
    return storage;
}
