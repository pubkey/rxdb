/**
 * This file contains everything
 * that is supposed to run inside of the electron main process
 */
import type {
    RxStorage
} from '../../types/index.d.ts';
import { Subject } from 'rxjs';
import {
    IPC_RENDERER_KEY_PREFIX
} from './electron-helper.ts';
import {
    exposeRxStorageRemote,
    RxStorageRemoteExposeSettings,
    MessageToRemote
} from '../storage-remote/index.ts';
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
    const messages$ = new Subject<MessageToRemote>();
    const openRenderers: Set<any> = new Set();
    args.ipcMain.on(
        channelId,
        (event: any, message: any) => {
            addOpenRenderer(event.sender);
            if (message) {
                messages$.next(message);
            }
        }
    );
    const addOpenRenderer = (renderer: any) => {
        if (openRenderers.has(renderer)) return;
        openRenderers.add(renderer);
        renderer.on('destroyed', () => openRenderers.delete(renderer));
    };
    const send: RxStorageRemoteExposeSettings['send'] = (msg) => {
        /**
         * TODO we could improve performance
         * by only sending the message to the 'correct' sender.
         */
        openRenderers.forEach(sender => {
            sender.send(channelId, msg);
        });
    };
    exposeRxStorageRemote({
        storage: args.storage,
        messages$,
        send
    });
}
