/**
 * This file contains everything
 * that is supposed to run inside of the electron main process
 */
import type {
    RxStorage,
    RxStorageInstance,
    RxStorageInstanceCreationParams
} from '../../types';
import { ensureNotFalsy, getFromMapOrThrow } from '../../util';
import { Subscription } from 'rxjs';
import {
    IpcMessageFromMain,
    IpcMessageFromRenderer,
    IPC_RENDERER_KEY_PREFIX,
    IPC_RENDERER_TO_MAIN
} from './electron-helper';

export function exposeIpcMainRxStorage<T, D>(
    args: {
        key: string;
        storage: RxStorage<T, D>;
        ipcMain: any;
    }
) {
    type InstanceState = {
        storageInstance: RxStorageInstance<any, any, any>;
        ports: MessagePort[];
        params: RxStorageInstanceCreationParams<any, any>;
    };
    const instanceById: Map<string, InstanceState> = new Map();
    const portStateByChannelId = new Map<string, {
        port: MessagePort;
        state: InstanceState;
        subs: Subscription[];
    }>();

    args.ipcMain.on(
        [
            IPC_RENDERER_KEY_PREFIX,
            'postMessage',
            args.key,
            'createStorageInstance'
        ].join('|'),
        async (event: any, params: RxStorageInstanceCreationParams<any, any>) => {
            const [port] = event.ports;
            const instanceId = [
                params.databaseName,
                params.collectionName,
                params.schema.version
            ].join('|');

            const channelId: string = (params as any).channelId;

            let state = instanceById.get(instanceId);
            let storageInstance: RxStorageInstance<any, any, any>;
            if (!state) {
                try {
                    storageInstance = await args.storage.createStorageInstance(params);
                } catch (err) {
                    port.postMessage({
                        key: 'error',
                        error: 'could not call createStorageInstance'
                    });
                    return;
                }
                state = {
                    storageInstance,
                    ports: [port],
                    params
                };
                instanceById.set(instanceId, state);
            }

            const subs: Subscription[] = [];
            portStateByChannelId.set(channelId, { port, state, subs });

            subs.push(
                state.storageInstance.changeStream().subscribe(changes => {
                    const message: IpcMessageFromMain = {
                        answerTo: 'changestream',
                        method: 'changeStream',
                        return: changes
                    };
                    port.postMessage(message);
                })
            );
            subs.push(
                state.storageInstance.conflictResultionTasks().subscribe(conflicts => {
                    const message: IpcMessageFromMain = {
                        answerTo: 'conflictResultionTasks',
                        method: 'conflictResultionTasks',
                        return: conflicts
                    };
                    port.postMessage(message);
                })
            );
            port.postMessage({
                key: 'instanceId',
                instanceId
            });
        });


    args.ipcMain.on(IPC_RENDERER_TO_MAIN, async (_event: any, message: IpcMessageFromRenderer) => {
        const { port, state, subs } = getFromMapOrThrow(portStateByChannelId, message.channelId);
        let result;
        try {
            /**
             * On calls to 'close()',
             * we only close the main instance if there are no other
             * ports connected.
             */
            if (
                message.method === 'close' &&
                ensureNotFalsy(state).ports.length > 1
            ) {
                const closeBreakResponse: IpcMessageFromMain = {
                    answerTo: message.requestId,
                    method: message.method,
                    return: null
                };
                port.postMessage(closeBreakResponse);
                return;
            }

            result = await (ensureNotFalsy(state).storageInstance as any)[message.method](...message.params);
            if (
                message.method === 'close' ||
                message.method === 'remove'
            ) {
                subs.forEach(sub => sub.unsubscribe());
                ensureNotFalsy(state).ports = ensureNotFalsy(state).ports.filter(p => p !== port);
                portStateByChannelId.delete(message.channelId);
                /**
                 * TODO how to notify the other ports on remove() ?
                 */
            }
            const response: IpcMessageFromMain = {
                answerTo: message.requestId,
                method: message.method,
                return: result
            };
            port.postMessage(response);
        } catch (err) {
            const errorResponse: IpcMessageFromMain = {
                answerTo: message.requestId,
                method: message.method,
                error: (err as any).toString()
            };
            port.postMessage(errorResponse);
        }

    });
}
