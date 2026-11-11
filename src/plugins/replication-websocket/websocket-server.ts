import type {
    RxCollection,
    RxDatabase,
    RxReplicationHandler
} from '../../types/index.d.ts';

import {
    type WebSocket,
    WebSocketServer,
    type ServerOptions,
} from 'ws';

import type {
    WebsocketMessageResponseType,
    WebsocketMessageType,
    WebsocketServerOptions,
    WebsocketServerState
} from './websocket-types.ts';
import { rxStorageInstanceToReplicationHandler } from '../../replication-protocol/index.ts';
import {
    PROMISE_RESOLVE_VOID, getFromMapOrCreate
} from '../../plugins/utils/index.ts';
import { Subject } from 'rxjs';
import { newRxError } from '../../rx-error.ts';

/**
 * Only these members of the replication handler
 * can be requested by a client.
 */
const REQUESTABLE_METHODS = ['masterChangesSince', 'masterWrite'] as const;
type RequestableMethod = typeof REQUESTABLE_METHODS[number];

export function startSocketServer(options: ServerOptions): WebsocketServerState {
    const wss = new WebSocketServer(options);
    let closed = false;
    function closeServer() {
        if (closed) {
            return PROMISE_RESOLVE_VOID;
        }
        closed = true;
        onConnection$.complete();
        return new Promise<void>((res, rej) => {
            /**
             * We have to close all client connections,
             * otherwise wss.close() will never call the callback.
             * @link https://github.com/websockets/ws/issues/1288#issuecomment-360594458
             */
            for (const ws of wss.clients) {
                ws.close();
            }
            wss.close((err: any) => {
                if (err) {
                    rej(err);
                } else {
                    res();
                }
            });
        });
    }

    const onConnection$ = new Subject<WebSocket>();
    wss.on('connection', (ws: any) => onConnection$.next(ws));

    return {
        server: wss,
        close: closeServer,
        onConnection$: onConnection$.asObservable()
    };
}

const REPLICATION_HANDLER_BY_COLLECTION: WeakMap<RxCollection, RxReplicationHandler<any, any>> = new Map();
export function getReplicationHandlerByCollection<RxDocType>(
    database: RxDatabase<any>,
    collectionName: string
): RxReplicationHandler<RxDocType, any> {
    if (!database.collections[collectionName]) {
        throw newRxError('RC_WEBSOCKET_COLLECTION', {
            collection: collectionName
        });
    }

    const collection = database.collections[collectionName];
    const handler = getFromMapOrCreate<RxCollection, RxReplicationHandler<RxDocType, any>>(
        REPLICATION_HANDLER_BY_COLLECTION,
        collection,
        () => {
            return rxStorageInstanceToReplicationHandler(
                collection.storageInstance,
                collection.conflictHandler,
                database.token
            );
        }
    );
    return handler;
}

export function startWebsocketServer(options: WebsocketServerOptions): WebsocketServerState {
    const { database, ...wsOptions } = options;
    const serverState = startSocketServer(wsOptions as any);

    // auto close when the database gets closed
    database.onClose.push(() => serverState.close());

    serverState.onConnection$.subscribe((ws: WebSocket) => {
        const onCloseHandlers: Function[] = [];
        ws.onclose = () => {
            onCloseHandlers.map(fn => fn());
        };
        ws.on('message', async (messageString: string) => {
            let message: WebsocketMessageType | undefined;
            try {
                message = JSON.parse(messageString) as WebsocketMessageType;
                const handler = getReplicationHandlerByCollection(database, message.collection);
                if (message.method === 'auth') {
                    return;
                }
                if (message.method === 'masterChangeStream$') {
                    const collectionName = message.collection;
                    const changeStreamSub = handler.masterChangeStream$.subscribe((ev: any) => {
                        const streamResponse: WebsocketMessageResponseType = {
                            id: 'stream',
                            collection: collectionName,
                            result: ev
                        };
                        ws.send(JSON.stringify(streamResponse));
                    });
                    onCloseHandlers.push(() => changeStreamSub.unsubscribe());
                    return;
                }
                if (
                    !REQUESTABLE_METHODS.includes(message.method as RequestableMethod) ||
                    !Array.isArray(message.params)
                ) {
                    throw newRxError('RC_WEBSOCKET_REQUEST', {
                        collection: message.collection,
                        method: message.method
                    });
                }
                const method = handler[message.method as RequestableMethod];
                const result = await (method as any)(...message.params);
                const response: WebsocketMessageResponseType = {
                    id: message.id,
                    collection: message.collection,
                    result
                };
                ws.send(JSON.stringify(response));
            } catch (err: any) {
                /**
                 * A failing request must never crash the server process.
                 * The error is sent back to the client when the request has an id,
                 * so that the client does not wait forever for the response.
                 * The stack is left out because it contains server-side file paths.
                 */
                if (
                    !message ||
                    typeof message.id !== 'string' ||
                    ws.readyState !== ws.OPEN
                ) {
                    return;
                }
                const errorResponse: WebsocketMessageResponseType = {
                    id: message.id,
                    collection: message.collection,
                    result: undefined,
                    error: {
                        name: err && err.name,
                        message: err && err.message,
                        code: err && err.code,
                        parameters: err && err.parameters
                    }
                };
                ws.send(JSON.stringify(errorResponse));
            }
        });
    });


    return serverState;
}
