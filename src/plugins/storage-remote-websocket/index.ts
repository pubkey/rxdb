import { Subject } from 'rxjs';
import type {
    WebSocket
} from 'ws';
import type {
    RxStorage
} from '../../types';
import {
    getFromMapOrThrow
} from '../../plugins/utils';
import {
    getWebSocket,
    startSocketServer,
    WebsocketWithRefCount
} from '../replication-websocket';
import { exposeRxStorageRemote } from '../storage-remote/remote';
import { getRxStorageRemote } from '../storage-remote/rx-storage-remote';
import { createErrorAnswer } from '../storage-remote/storage-remote-helpers';
import type {
    MessageFromRemote,
    MessageToRemote,
    RxStorageRemoteExposeSettings
} from '../storage-remote/storage-remote-types';
import type {
    RxStorageRemoteWebsocketClientOptions,
    RxStorageRemoteWebsocketServerOptions,
    RxStorageRemoteWebsocketServerState
} from './types';
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
                    ws.send(JSON.stringify(createErrorAnswer(message, new Error('First call must be a create call but is: ' + JSON.stringify(message)))));
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



/**
 * Reuse connections to the same url.
 * This makes testing easier because we do not run into a connection limit.
 * It might be better to instead track the amount of open storage instances
 * and open/close the websocket client depending on the counter.
 */
const WebsocketClientByUrl = new Map<string, Promise<WebsocketWithRefCount>>();

export function getRxStorageRemoteWebsocket(options: RxStorageRemoteWebsocketClientOptions): RxStorage<any, any> {
    const identifier = options.url + 'rx-remote-storage-websocket';
    const messages$ = new Subject<MessageFromRemote>();
    const websocketClientPromise = WebsocketClientByUrl.has(options.url) ?
        getFromMapOrThrow(WebsocketClientByUrl, options.url) :
        getWebSocket(options.url, identifier);
    WebsocketClientByUrl.set(options.url, websocketClientPromise);
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


export * from './types';

