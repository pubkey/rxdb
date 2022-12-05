import {
    getRxStorageMessageChannel,
    RxStorageMessageChannel,
    RxStorageMessageToRemote
} from '../../rx-storage-message-channel';
import type {
    RxStorageStatics
} from '../../types';
import { getFromMapOrThrow } from '../../util';
import {
    IPC_RENDERER_KEY_PREFIX,
    IPC_RENDERER_TO_MAIN
} from './electron-helper';

export type RxStorageIpcRendererSettings = {
    key: string;
    statics: RxStorageStatics;
    ipcRenderer: any;
};

export type RxStorageIpcRenderer = RxStorageMessageChannel;
export function getRxStorageIpcRenderer(
    settings: RxStorageIpcRendererSettings
): RxStorageIpcRenderer {

    const storage = getRxStorageMessageChannel({
        name: 'ipc-renderer',
        statics: settings.statics,
        createRemoteStorage: (
            port,
            params
        ) => {

            /**
             * Electron does not allow to send messages
             * via ports from ipcRenderer->ipcMain.
             * Therefore we have to overwrite the port1.postMessage()
             * so that it works over args.ipcMain.on() messages.
             */
            const messageChannel = getFromMapOrThrow(storage.messageChannelByPort, port);
            const otherPort = messageChannel.port1;
            otherPort.postMessage = function (message: RxStorageMessageToRemote) {
                settings.ipcRenderer.send(IPC_RENDERER_TO_MAIN, message);
            };

            settings.ipcRenderer.postMessage(
                [
                    IPC_RENDERER_KEY_PREFIX,
                    'postMessage',
                    settings.key,
                    'createStorageInstance'
                ].join('|'),
                params,
                [port]
            );
        }
    });
    return storage;
}
