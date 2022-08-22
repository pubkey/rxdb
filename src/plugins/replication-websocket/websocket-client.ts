import { replicateRxCollection } from '../replication';
import {
    WebsocketClientOptions,
    WebsocketMessageResponseType,
    WebsocketMessageType
} from './websocket-types';


import {
    WebSocket as IsomorphicWebSocket
} from 'isomorphic-ws';
import {
    getFromMapOrThrow,
    randomCouchString
} from '../../util';
import {
    filter,
    map,
    Subject,
    firstValueFrom
} from 'rxjs';
import { RxReplicationWriteToMasterRow } from '../../types';

export type WebsocketWithRefCount = {
    url: string;
    socket: IsomorphicWebSocket;
    refCount: number;
    openPromise: Promise<void>;
};

/**
 * Reuse the same socket even when multiple
 * collection replicate with the same server at once.
 */
export const WEBSOCKET_BY_URL: Map<string, WebsocketWithRefCount> = new Map();
export async function getWebSocket(
    url: string
): Promise<IsomorphicWebSocket> {
    let has = WEBSOCKET_BY_URL.get(url);
    if (!has) {
        const wsClient = new IsomorphicWebSocket(
            url,
            {

            },
        );

        const openPromise = new Promise<void>(res => {
            wsClient.on('open', function open() {
                res();
            });
        });

        has = {
            url,
            socket: wsClient,
            openPromise,
            refCount: 1
        };
        WEBSOCKET_BY_URL.set(url, has);
    } else {
        has.refCount = has.refCount + 1;
    }


    await has.openPromise;
    return has.socket;
}

export function removeWebSocketRef(
    url: string
) {
    const obj = getFromMapOrThrow(WEBSOCKET_BY_URL, url);
    obj.refCount = obj.refCount - 1;
    if (obj.refCount === 0) {
        WEBSOCKET_BY_URL.delete(url);
        obj.socket.close();
    }
}



export async function replicateWithWebsocketServer<RxDocType, CheckpointType>(
    options: WebsocketClientOptions<RxDocType>
) {
    const wsClient = await getWebSocket(options.url);
    const messages$ = new Subject<WebsocketMessageResponseType>();
    wsClient.on('message', (messageBuffer) => {
        const message: WebsocketMessageResponseType = JSON.parse(messageBuffer.toString());

        console.log('ccc got message:');
        console.log(JSON.stringify(message, null, 4));

        messages$.next(message);
    });

    let requestCounter = 0;
    const requestFlag = randomCouchString(10);
    function getRequestId() {
        const count = requestCounter++;
        return options.collection.database.token + '|' + requestFlag + '|' + count;
    }

    const streamRequest: WebsocketMessageType = {
        id: 'stream',
        collection: options.collection.name,
        method: 'masterChangeStream$',
        params: []
    }
    wsClient.send(JSON.stringify(streamRequest));

    const replicationState = replicateRxCollection<RxDocType, CheckpointType>({
        collection: options.collection,
        replicationIdentifier: 'websocket-' + options.url,
        pull: {
            batchSize: options.batchSize,
            stream$: messages$.pipe(
                filter(msg => msg.id === 'stream' && msg.collection === options.collection.name),
                map(msg => {
                    console.log('ccc use message for stream$');
                    console.log(JSON.stringify(msg.result, null, 4));
                    return msg.result;
                })
            ),
            async handler(lastPulledCheckpoint: CheckpointType, batchSize: number) {
                const requestId = getRequestId();
                const request: WebsocketMessageType = {
                    id: requestId,
                    collection: options.collection.name,
                    method: 'masterChangesSince',
                    params: [lastPulledCheckpoint, batchSize]
                }
                wsClient.send(JSON.stringify(request));
                const result = await firstValueFrom(
                    messages$.pipe(
                        filter(msg => msg.id === requestId),
                        map(msg => msg.result)
                    )
                );
                return result;
            }
        },
        push: {
            batchSize: options.batchSize,
            handler(docs: RxReplicationWriteToMasterRow<RxDocType>[]) {
                console.log('## call push handler()');
                const requestId = getRequestId();
                const request: WebsocketMessageType = {
                    id: requestId,
                    collection: options.collection.name,
                    method: 'masterWrite',
                    params: [docs]
                }

                console.log('send push request');
                try {
                    wsClient.send(JSON.stringify(request));
                } catch (err) {
                    console.log('send push request err');
                    console.dir(err);
                }
                console.log('send push request DONE');
                return firstValueFrom(
                    messages$.pipe(
                        filter(msg => msg.id === requestId),
                        map(msg => msg.result)
                    )
                );
            }
        }
    });

    return replicationState;
}
