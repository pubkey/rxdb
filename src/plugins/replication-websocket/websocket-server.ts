import type {
    RxReplicationHandler
} from '../../types';

import type {
    WebSocket,
    ServerOptions
} from 'isomorphic-ws';
import type {
    WebsocketMessageResponseType,
    WebsocketMessageType,
    WebsocketServerOptions,
    WebsocketServerState
} from './websocket-types';
import { rxStorageInstanceToReplicationHandler } from '../../replication-protocol';
import {
    PROMISE_RESOLVE_VOID
} from '../../plugins/utils';
import { Subject } from 'rxjs';


export function startSocketServer(options: ServerOptions): WebsocketServerState {
    const { WebSocketServer } = require('isomorphic-ws' + '');
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

export function startWebsocketServer(options: WebsocketServerOptions): WebsocketServerState {
    const { database, ...wsOptions } = options;
    const serverState = startSocketServer(wsOptions);

    // auto close when the database gets destroyed
    database.onDestroy.push(() => serverState.close());

    const replicationHandlerByCollection: Map<string, RxReplicationHandler<any, any>> = new Map();
    function getReplicationHandler(collectionName: string): RxReplicationHandler<any, any> {
        if (!database.collections[collectionName]) {
            throw new Error('collection ' + collectionName + ' does not exist');
        }
        let handler = replicationHandlerByCollection.get(collectionName);
        if (!handler) {
            const collection = database.collections[collectionName];
            handler = rxStorageInstanceToReplicationHandler(
                collection.storageInstance,
                collection.conflictHandler,
                database.token
            );
            replicationHandlerByCollection.set(collectionName, handler);
        }
        return handler;
    }

    serverState.onConnection$.subscribe(ws => {
        const onCloseHandlers: Function[] = [];
        ws.onclose = () => {
            onCloseHandlers.map(fn => fn());
        };
        ws.on('message', async (messageString: string) => {
            const message: WebsocketMessageType = JSON.parse(messageString);
            const handler = getReplicationHandler(message.collection);
            const method = handler[message.method];

            /**
             * If it is not a function,
             * it means that the client requested the masterChangeStream$
             */
            if (typeof method !== 'function') {
                const changeStreamSub = handler.masterChangeStream$.subscribe(ev => {
                    const streamResponse: WebsocketMessageResponseType = {
                        id: 'stream',
                        collection: message.collection,
                        result: ev
                    };
                    ws.send(JSON.stringify(streamResponse));
                });
                onCloseHandlers.push(() => changeStreamSub.unsubscribe());
                return;
            }
            const result = await (method as any)(...message.params);
            const response: WebsocketMessageResponseType = {
                id: message.id,
                collection: message.collection,
                result
            };
            ws.send(JSON.stringify(response));
        });
    });


    return serverState;
}
