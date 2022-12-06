/**
 * This file contains everything
 * that is supposed to run inside of the electron main process
 */
import type {
    RxStorage
} from '../../types';
import { Subject } from 'rxjs';
import {
    IPC_RENDERER_KEY_PREFIX
} from './electron-helper';
import {
    exposeRxStorageMessageChannel,
    RxMessageChannelExposeSettings,
    RxStorageMessageToRemote
} from '../../rx-storage-message-channel';
export function exposeIpcMainRxStorage<T, D>(
    args: {
        key: string;
        storage: RxStorage<T, D>;
        ipcMain: any;
    }
) {
    const channelId = [
        IPC_RENDERER_KEY_PREFIX,
        args.key,
    ].join('|');
    const messages$ = new Subject<RxStorageMessageToRemote>();
    const openRenderers: Set<any> = new Set();
    args.ipcMain.on(
        channelId,
        (event: any, message: any) => {
            openRenderers.add(event.sender);
            if (message) {
                messages$.next(message);
            }
        }
    );
    const send: RxMessageChannelExposeSettings['send'] = (msg) => {
        /**
         * TODO we could improve performance
         * by only sending the message to the 'correct' sender
         * and removing senders whose browser window is closed.
         */
        openRenderers.forEach(sender => {
            sender.send(channelId, msg);
        });
    };
    exposeRxStorageMessageChannel({
        storage: args.storage,
        messages$,
        send
    });
}
