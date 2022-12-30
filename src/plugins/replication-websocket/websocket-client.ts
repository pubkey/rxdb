import { replicateRxCollection, RxReplicationState } from '../replication';
import {
    WebsocketClientOptions,
    WebsocketMessageType
} from './websocket-types';

import ReconnectingWebSocket from 'reconnecting-websocket';
import IsomorphicWebSocket from 'isomorphic-ws';
import {
    errorToPlainJson,
    getFromMapOrThrow,
    randomCouchString,
    toArray
} from '../../plugins/utils';
import {
    filter,
    map,
    Subject,
    firstValueFrom,
    BehaviorSubject
} from 'rxjs';
import {
    RxDatabase,
    RxError,
    RxReplicationWriteToMasterRow
} from '../../types';
import { newRxError } from '../../rx-error';

export type WebsocketWithRefCount = {
    url: string;
    socket: ReconnectingWebSocket;
    refCount: number;
    openPromise: Promise<void>;
    connected$: BehaviorSubject<boolean>;
    message$: Subject<any>;
    error$: Subject<RxError>;
};


/**
 * Copied and adapter from the 'reconnecting-websocket' npm module.
 * Some bundlers have problems with bundling the isomorphic-ws plugin
 * so we directly check the correctness in RxDB to ensure that we can
 * throw a helpful error.
 */
function ensureIsWebsocket(w: typeof IsomorphicWebSocket) {
    const is = typeof w !== 'undefined' && !!w && w.CLOSING === 2;
    if (!is) {
        console.dir(w);
        throw new Error('websocket not valid');
    }
}

/**
 * Reuse the same socket even when multiple
 * collection replicate with the same server at once.
 */
export const WEBSOCKET_BY_CACHE_KEY: Map<string, WebsocketWithRefCount> = new Map();
export async function getWebSocket(
    url: string,
    /**
     * The value of RxDatabase.token.
     */
    databaseToken: string
): Promise<WebsocketWithRefCount> {
    /**
     * Also use the database token as cache-key
     * to make it easier to test and debug
     * multi-instance setups.
     */
    const cacheKey = url + '|||' + databaseToken;

    let has = WEBSOCKET_BY_CACHE_KEY.get(cacheKey);
    if (!has) {
        ensureIsWebsocket(IsomorphicWebSocket);
        const wsClient = new ReconnectingWebSocket(
            url,
            [],
            {
                WebSocket: IsomorphicWebSocket
            }
        );

        const connected$ = new BehaviorSubject<boolean>(false);
        const openPromise = new Promise<void>(res => {
            wsClient.onopen = () => {
                connected$.next(true);
                res();
            };
        });
        wsClient.onclose = () => {
            connected$.next(false);
        };

        const message$ = new Subject<any>();
        wsClient.onmessage = (messageObj) => {
            const message = JSON.parse(messageObj.data);
            message$.next(message);
        };

        const error$ = new Subject<any>();
        wsClient.onerror = (err) => {
            const emitError = newRxError('RC_STREAM', {
                errors: toArray(err).map((er: any) => errorToPlainJson(er)),
                direction: 'pull'
            });
            error$.next(emitError);
        };


        has = {
            url,
            socket: wsClient,
            openPromise,
            refCount: 1,
            connected$,
            message$,
            error$
        };
        WEBSOCKET_BY_CACHE_KEY.set(cacheKey, has);
    } else {
        has.refCount = has.refCount + 1;
    }


    await has.openPromise;
    return has;
}

export function removeWebSocketRef(
    url: string,
    database: RxDatabase
) {
    const cacheKey = url + '|||' + database.token;
    const obj = getFromMapOrThrow(WEBSOCKET_BY_CACHE_KEY, cacheKey);
    obj.refCount = obj.refCount - 1;
    if (obj.refCount === 0) {
        WEBSOCKET_BY_CACHE_KEY.delete(cacheKey);
        obj.connected$.complete();
        obj.socket.close();
    }
}



export async function replicateWithWebsocketServer<RxDocType, CheckpointType>(
    options: WebsocketClientOptions<RxDocType>
): Promise<RxReplicationState<RxDocType, CheckpointType>> {
    const socketState = await getWebSocket(options.url, options.collection.database.token);
    const wsClient = socketState.socket;

    const messages$ = socketState.message$;

    let requestCounter = 0;
    const requestFlag = randomCouchString(10);
    function getRequestId() {
        const count = requestCounter++;
        return options.collection.database.token + '|' + requestFlag + '|' + count;
    }
    const replicationState = replicateRxCollection<RxDocType, CheckpointType>({
        collection: options.collection,
        replicationIdentifier: 'websocket-' + options.url,
        live: options.live,
        pull: {
            batchSize: options.batchSize,
            stream$: messages$.pipe(
                filter(msg => msg.id === 'stream' && msg.collection === options.collection.name),
                map(msg => msg.result)
            ),
            async handler(lastPulledCheckpoint: CheckpointType, batchSize: number) {
                const requestId = getRequestId();
                const request: WebsocketMessageType = {
                    id: requestId,
                    collection: options.collection.name,
                    method: 'masterChangesSince',
                    params: [lastPulledCheckpoint, batchSize]
                };
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
                const requestId = getRequestId();
                const request: WebsocketMessageType = {
                    id: requestId,
                    collection: options.collection.name,
                    method: 'masterWrite',
                    params: [docs]
                };
                wsClient.send(JSON.stringify(request));
                return firstValueFrom(
                    messages$.pipe(
                        filter(msg => msg.id === requestId),
                        map(msg => msg.result)
                    )
                );
            }
        }
    });

    socketState.error$.subscribe(err => replicationState.subjects.error.next(err));

    socketState.connected$.subscribe(isConnected => {
        if (isConnected) {
            /**
             * When the client goes offline and online again,
             * we have to send a 'RESYNC' signal because the client
             * might have missed out events while being offline.
             */
            replicationState.reSync();

            /**
             * Because reconnecting creates a new websocket-instance,
             * we have to start the changestream from the remote again
             * each time.
             */
            const streamRequest: WebsocketMessageType = {
                id: 'stream',
                collection: options.collection.name,
                method: 'masterChangeStream$',
                params: []
            };
            wsClient.send(JSON.stringify(streamRequest));
        }
    });

    options.collection.onDestroy.push(() => removeWebSocketRef(options.url, options.collection.database));
    return replicationState;
}
