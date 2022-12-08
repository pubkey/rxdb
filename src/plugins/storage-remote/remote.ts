import { filter, Subscription } from 'rxjs';
import type {
    RxStorageInstance,
    RxStorageInstanceCreationParams
} from '../../types';
import {
    ensureNotFalsy,
    randomCouchString
} from '../../util';
import type {
    MessageFromRemote,
    MessageToRemote,
    RxStorageRemoteExposeSettings,
    RxStorageRemoteExposeType
} from './storage-remote-types';


/**
 * Run this on the 'remote' part,
 * so that RxStorageMessageChannel can connect to it.
 */
export function exposeRxStorageRemote(settings: RxStorageRemoteExposeSettings): RxStorageRemoteExposeType {
    type InstanceState = {
        storageInstance: RxStorageInstance<any, any, any>;
        connectionIds: Set<string>;
        params: RxStorageInstanceCreationParams<any, any>;
    };
    const instanceByFullName: Map<string, InstanceState> = new Map();
    const stateByPort: Map<MessagePort, {
        subs: Subscription[];
        state: InstanceState;
    }> = new Map();



    settings.messages$.pipe(
        filter(msg => msg.method === 'create')
    ).subscribe(async (msg) => {
        const connectionId = randomCouchString(10);

        /**
         * Do an isArray check here
         * for runtime check types to ensure we have
         * instance creation params and not method input params.
         */
        if (Array.isArray(msg.params)) {
            return;
        }
        const params = msg.params;
        /**
         * We de-duplicate the storage instances.
         * This makes sense in many environments like
         * electron where on main process contains the storage
         * for multiple renderer processes. Same goes for SharedWorkers etc.
         */
        const fullName = [
            params.databaseName,
            params.collectionName,
            params.schema.version
        ].join('|');
        let state = instanceByFullName.get(fullName);
        if (!state) {
            try {
                const newRxStorageInstance = await settings.storage.createStorageInstance(params);
                state = {
                    storageInstance: newRxStorageInstance,
                    connectionIds: new Set(),
                    params
                };
                instanceByFullName.set(fullName, state);
            } catch (err: any) {
                settings.send({
                    answerTo: msg.requestId,
                    connectionId,
                    method: 'create',
                    error: err.toString()
                });
                return;
            }
        }
        state.connectionIds.add(connectionId);
        const subs: Subscription[] = [];
        /**
         * Automatically subscribe to the streams$
         * because we always need them.
         */
        subs.push(
            state.storageInstance.changeStream().subscribe(changes => {
                const message: MessageFromRemote = {
                    connectionId,
                    answerTo: 'changestream',
                    method: 'changeStream',
                    return: changes
                };

                settings.send(message);
            })
        );
        subs.push(
            state.storageInstance.conflictResultionTasks().subscribe(conflicts => {
                const message: MessageFromRemote = {
                    connectionId,
                    answerTo: 'conflictResultionTasks',
                    method: 'conflictResultionTasks',
                    return: conflicts
                };
                settings.send(message);
            })
        );
        subs.push(
            settings.messages$.pipe(
                filter(subMsg => (subMsg as MessageToRemote).connectionId === connectionId)
            ).subscribe(async (plainMessage) => {
                const message: MessageToRemote = plainMessage as any;
                if (message.method === 'create') {
                    return;
                }
                if (!Array.isArray(message.params)) {
                    return;
                }
                let result;
                try {
                    /**
                     * On calls to 'close()',
                     * we only close the main instance if there are no other
                     * ports connected.
                     */
                    if (
                        message.method === 'close' &&
                        ensureNotFalsy(state).connectionIds.size > 1
                    ) {
                        const closeBreakResponse: MessageFromRemote = {
                            connectionId,
                            answerTo: message.requestId,
                            method: message.method,
                            return: null
                        };
                        settings.send(closeBreakResponse);
                        ensureNotFalsy(state).connectionIds.delete(connectionId);
                        subs.forEach(sub => sub.unsubscribe());
                        return;
                    }

                    result = await (ensureNotFalsy(state).storageInstance as any)[message.method](...message.params);
                    if (
                        message.method === 'close' ||
                        message.method === 'remove'
                    ) {
                        subs.forEach(sub => sub.unsubscribe());
                        ensureNotFalsy(state).connectionIds.delete(connectionId);
                        instanceByFullName.delete(fullName);
                        /**
                         * TODO how to notify the other ports on remove() ?
                         */
                    }
                    const response: MessageFromRemote = {
                        connectionId,
                        answerTo: message.requestId,
                        method: message.method,
                        return: result
                    };
                    settings.send(response);
                } catch (err) {
                    const errorResponse: MessageFromRemote = {
                        connectionId,
                        answerTo: message.requestId,
                        method: message.method,
                        error: (err as any).toString()
                    };
                    settings.send(errorResponse);
                }
            })
        );

        settings.send({
            answerTo: msg.requestId,
            connectionId,
            method: 'create'
        });
    });

    return {
        instanceByFullName,
        stateByPort
    };
}
