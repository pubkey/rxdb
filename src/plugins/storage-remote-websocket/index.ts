import { Subject } from 'rxjs';
import type {
    WebSocket
} from 'ws';
import {
    PROMISE_RESOLVE_VOID,
    getFromMapOrThrow
} from '../../plugins/utils/index.ts';
import {
    createWebSocketClient,
    startSocketServer
} from '../replication-websocket/index.ts';
import { exposeRxStorageRemote } from '../storage-remote/remote.ts';
import { getRxStorageRemote } from '../storage-remote/rx-storage-remote.ts';
import { createErrorAnswer } from '../storage-remote/storage-remote-helpers.ts';
import type {
    MessageFromRemote,
    MessageToRemote,
    RxStorageRemoteExposeSettings
} from '../storage-remote/storage-remote-types.ts';
import type {
    RxStorageRemoteWebsocketClient,
    RxStorageRemoteWebsocketClientOptions,
    RxStorageRemoteWebsocketServerOptions,
    RxStorageRemoteWebsocketServerState
} from './types.ts';
export function startRxStorageRemoteWebsocketServer(
    options: RxStorageRemoteWebsocketServerOptions
): RxStorageRemoteWebsocketServerState {

    (options as any).perMessageDeflate = true;
    const serverState = startSocketServer(options as any);

    const websocketByConnectionId = new Map<string, WebSocket>();
    const messages$ = new Subject<MessageToRemote>();
    const exposeSettings: RxStorageRemoteExposeSettings = {
        messages$: messages$.asObservable(),
        storage: options.storage as any,
        database: options.database as any,
        customRequestHandler: options.customRequestHandler,
        send(msg) {
            const ws = getFromMapOrThrow(websocketByConnectionId, msg.connectionId);
            ws.send(JSON.stringify(msg));
        },
        fakeVersion: options.fakeVersion
    };
    const exposeState = exposeRxStorageRemote(exposeSettings);

    serverState.onConnection$.subscribe(ws => {
        const onCloseHandlers: Function[] = [];
        ws.onclose = () => {
            onCloseHandlers.map(fn => fn());
        };
        ws.on('message', (messageString: string) => {
            const message: MessageToRemote = JSON.parse(messageString);
            const connectionId = message.connectionId;
            if (!websocketByConnectionId.has(connectionId)) {
                /**
                 * If first message is not 'create',
                 * it is an error.
                 */
                if (
                    message.method !== 'create' &&
                    message.method !== 'custom'
                ) {
                    ws.send(
                        JSON.stringify(
                            createErrorAnswer(message, new Error('First call must be a create call but is: ' + JSON.stringify(message)))
                        )
                    );
                    return;
                }
                websocketByConnectionId.set(connectionId, ws);
            }
            messages$.next(message);
        });
    });

    return {
        serverState,
        exposeState
    };
}

export function getRxStorageRemoteWebsocket(
    options: RxStorageRemoteWebsocketClientOptions
): RxStorageRemoteWebsocketClient {
    const identifier = [
        options.url,
        'rx-remote-storage-websocket'
    ].join('');
    const storage = getRxStorageRemote({
        identifier,
        mode: options.mode,
        async messageChannelCreator() {
            const messages$ = new Subject<MessageFromRemote>();
            const websocketClient = await createWebSocketClient(options as any);
            websocketClient.message$.subscribe(msg => messages$.next(msg));
            return {
                messages$,
                send(msg) {
                    return websocketClient.socket.send(JSON.stringify(msg));
                },
                close() {
                    websocketClient.socket.close();
                    return PROMISE_RESOLVE_VOID;
                }
            };

        }
    });
    return storage;
}


export * from './types.ts';

