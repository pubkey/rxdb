import type {
    RxReplicationHandler
} from '../../types';

import {
    WebSocketServer
} from 'isomorphic-ws';
import type {
    WebsocketMessageResponseType,
    WebsocketMessageType,
    WebsocketServerOptions,
    WebsocketServerState
} from './websocket-types';
import { rxStorageInstanceToReplicationHandler } from '../../replication-protocol';


export function startWebsocketServer(options: WebsocketServerOptions): WebsocketServerState {
    const wss = new WebSocketServer({
        port: options.port,
        path: options.path
    });
    function closeServer() {
        return new Promise<void>((res, rej) => {
            /**
             * We have to close all client connections,
             * otherwise wss.close() will never call the callback.
             * @link https://github.com/websockets/ws/issues/1288#issuecomment-360594458
             */
            for (const ws of wss.clients) {
                ws.close();
            }
            wss.close((err) => {
                console.log('--- close callback');
                if (err) {
                    rej(err);
                } else {
                    res();
                }
            });
        });
    }

    const database = options.database;

    // auto close when the database gets destroyed
    database.onDestroy.push(() => closeServer());

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
                database.hashFunction
            );
            replicationHandlerByCollection.set(collectionName, handler);
        }
        return handler;
    }


    const startedStreamCollections: Set<string> = new Set();

    wss.on('connection', function connection(ws) {
        ws.on('message', async (messageString: string) => {
            const message: WebsocketMessageType = JSON.parse(messageString);
            console.log('--- received: %s', JSON.stringify(message, null, 4));

            const handler = getReplicationHandler(message.collection);
            const method = handler[message.method];

            /**
             * If it is not a function,
             * it means that the client requested the masterChangeStream$
             */
            if (typeof method !== 'function') {
                if (!startedStreamCollections.has(message.collection)) {
                    startedStreamCollections.add(message.collection);
                    handler.masterChangeStream$.subscribe(ev => {

                        console.log('sss - masterChangeStream$ emitted');
                        console.log(JSON.stringify(ev, null, 4));

                        const streamResponse: WebsocketMessageResponseType = {
                            id: 'stream',
                            collection: message.collection,
                            result: ev
                        };
                        ws.send(JSON.stringify(streamResponse));
                    });
                }
                return;
            }
            const result = await (method as any)(...message.params);

            console.log('--- result(' + message.id + '): %s', JSON.stringify(result, null, 4));

            const response: WebsocketMessageResponseType = {
                id: message.id,
                collection: message.collection,
                result
            };
            ws.send(JSON.stringify(response));
        });
    });

    return {
        server: wss,
        close: closeServer
    };
}
