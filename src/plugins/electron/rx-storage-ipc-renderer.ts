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

    const messageChannel = new MessageChannel();

    const messages$ = new Subject<RxStorageMessageFromRemote>();
    messageChannel.port1.onmessage = event => {
        messages$.next(event.data);
    };
    settings.ipcRenderer.postMessage(
        channelId,
        {},
        [messageChannel.port2]
    );

    const send: RxStorageMessageChannelSettings['send'] = (msg) => {
        messageChannel.port1.postMessage(msg);
    };
    const storage = getRxStorageMessageChannel({
        name: 'ipc-renderer',
        statics: settings.statics,
        messages$,
        send
    });
    return storage;
}
