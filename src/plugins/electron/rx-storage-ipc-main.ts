/**
 * This file contains everything
 * that is supposed to run inside of the electron main process
 */
import type {
    RxStorage,
    RxStorageInstanceCreationParams
} from '../../types';
import {
    ensureNotFalsy,
    getFromMapOrThrow
} from '../../util';
import { Subject } from 'rxjs';
import {
    IPC_RENDERER_KEY_PREFIX,
    IPC_RENDERER_TO_MAIN
} from './electron-helper';
import {
    exposeRxStorageMessageChannel,
    RxStorageMessageToRemote
} from '../../rx-storage-message-channel';

export function exposeIpcMainRxStorage<T, D>(
    args: {
        key: string;
        storage: RxStorage<T, D>;
        ipcMain: any;
    }
) {

    const onCreateRemoteStorage$ = new Subject<{
        port: MessagePort;
        params: RxStorageInstanceCreationParams<any, any>;
    }>;
    const portByDatabaseInstanceToken = new Map<string, MessagePort>();
    args.ipcMain.on(
        [
            IPC_RENDERER_KEY_PREFIX,
            'postMessage',
            args.key,
            'createStorageInstance'
        ].join('|'),
        (event: any, params: RxStorageInstanceCreationParams<any, any>) => {
            const [port] = event.ports;
            portByDatabaseInstanceToken.set(params.databaseInstanceToken, port);
            onCreateRemoteStorage$.next({
                params,
                port
            });
        });

    exposeRxStorageMessageChannel({
        storage: args.storage,
        onCreateRemoteStorage$
    });


    args.ipcMain.on(IPC_RENDERER_TO_MAIN, (_event: any, message: RxStorageMessageToRemote) => {
        const port = getFromMapOrThrow(portByDatabaseInstanceToken, message.instanceId);
        ensureNotFalsy(port.onmessage as any)({
            data: message
        });
    });
}
