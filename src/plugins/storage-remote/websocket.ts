import { Subject } from 'rxjs';
import type {
    WebSocket
} from 'ws';
import type {
    RxStorage
} from '../../types';
import {
    getFromMapOrThrow,
    randomCouchString
} from '../../util';
import {
    getWebSocket,
    startSocketServer
} from '../replication-websocket';
import { exposeRxStorageRemote } from './remote';
import { getRxStorageRemote } from './rx-storage-remote';
import { createErrorAnswer } from './storage-remote-helpers';
import type {
    MessageFromRemote,
    MessageToRemote,
    RxStorageRemoteExposeSettings,
    RxStorageRemoteWebsocketClientOptions,
    RxStorageRemoteWebsocketServerOptions,
    RxStorageRemoteWebsocketServerState
} from './storage-remote-types';
export function startRxStorageRemoteWebsocketServer(
    options: RxStorageRemoteWebsocketServerOptions
): RxStorageRemoteWebsocketServerState {
    const serverState = startSocketServer(options);


    const websocketByConnectionId = new Map<string, WebSocket>();
    const messages$ = new Subject<MessageToRemote>();
    const exposeSettings: RxStorageRemoteExposeSettings = {
        messages$: messages$.asObservable(),
        storage: options.storage,
        send(msg) {
            const ws = getFromMapOrThrow(websocketByConnectionId, msg.connectionId);
            ws.send(JSON.stringify(msg));
        }
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
                if (message.method !== 'create') {
                    ws.send(JSON.stringify(createErrorAnswer(message, 'First call must be a create call')));
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


export function getRxStorageRemoteWebsocket(options: RxStorageRemoteWebsocketClientOptions): RxStorage<any, any> {
    const identifier = randomCouchString(10);
    const messages$ = new Subject<MessageFromRemote>();
    const websocketClientPromise = getWebSocket(options.url, identifier);
    const storage = getRxStorageRemote({
        identifier,
        statics: options.statics,
        messages$,
        send(msg) {
            return websocketClientPromise
                .then(websocketClient => websocketClient.socket.send(JSON.stringify(msg)));
        }
    });
    websocketClientPromise.then((websocketClient) => {
        websocketClient.message$.subscribe(msg => messages$.next(msg));
    });
    return storage;
}
