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
    let ports: MessagePort[];
    args.ipcMain.on(
        channelId,
        (ev: any) => {
            const port: MessagePort = ev.ports[0];
            ports.push(port);
            port.onmessage = event => {
                const msg = event.data;
                messages$.next(msg);
            };
        }
    );
    const send: RxMessageChannelExposeSettings['send'] = (msg) => {
        ports.forEach(port => {
            port.postMessage(msg);
        });
    };
    exposeRxStorageMessageChannel({
        storage: args.storage,
        messages$,
        send
    });
}
