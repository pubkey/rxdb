import {
    replicateRxCollection,
    RxReplicationState
} from '../replication/index.ts';
import {
    WebsocketClientOptions,
    WebsocketMessageResponseType,
    WebsocketMessageType
} from './websocket-types.ts';

import { ReconnectingWebSocket } from './reconnecting-websocket.ts';

import { WebSocket } from 'ws';
import {
    errorToPlainJson,
    randomToken,
    toArray
} from '../../plugins/utils/index.ts';
import {
    filter,
    map,
    Subject,
    Subscription,
    BehaviorSubject
} from 'rxjs';
import type {
    RxError,
    RxReplicationWriteToMasterRow
} from '../../types/index.d.ts';
import { newRxError } from '../../rx-error.ts';

export type WebsocketClient = {
    url: string;
    socket: any;
    connected$: BehaviorSubject<boolean>;
    message$: Subject<any>;
    error$: Subject<RxError>;
};


export async function createWebSocketClient<RxDocType>(options: WebsocketClientOptions<RxDocType>): Promise<WebsocketClient> {
    const wsClient = new ReconnectingWebSocket(
        options.url,
        [],
        { WebSocket }
    );
    const connected$ = new BehaviorSubject<boolean>(false);
    const message$ = new Subject<any>();
    const error$ = new Subject<any>();
    wsClient.onerror = (err: any) => {
        const emitError = newRxError('RC_STREAM', {
            errors: toArray(err).map((er: any) => errorToPlainJson(er)),
            direction: 'pull'
        });
        error$.next(emitError);
    };
    await new Promise<void>(res => {
        wsClient.onopen = () => {

            if (options.headers) {
                const authMessage: WebsocketMessageType = {
                    collection: options.collection.name,
                    id: randomToken(10),
                    params: [options.headers],
                    method: 'auth'
                };
                wsClient.send(JSON.stringify(authMessage));
            }

            connected$.next(true);
            res();
        };
    });
    wsClient.onclose = () => {
        connected$.next(false);
    };

    wsClient.onmessage = (messageObj: any) => {
        const message = JSON.parse(messageObj.data);
        message$.next(message);
    };

    return {
        url: options.url,
        socket: wsClient,
        connected$,
        message$,
        error$
    };

}

export async function replicateWithWebsocketServer<RxDocType, CheckpointType>(
    options: WebsocketClientOptions<RxDocType>
): Promise<RxReplicationState<RxDocType, CheckpointType>> {
    const websocketClient = await createWebSocketClient(options);
    const wsClient = websocketClient.socket;
    const messages$ = websocketClient.message$;

    let requestCounter = 0;
    const requestFlag = randomToken(10);
    function getRequestId() {
        const count = requestCounter++;
        return options.collection.database.token + '|' + requestFlag + '|' + count;
    }

    /**
     * Sends the request to the server and awaits the answer.
     * When the client is not connected, the request is sent
     * as soon as the connection is open again.
     * @throws with an RxError if the connection is lost
     * after the request was sent, because the answer
     * of the server can then never arrive.
     */
    function sendRequestAndAwaitAnswer(
        method: WebsocketMessageType['method'],
        params: any[]
    ): Promise<any> {
        const requestId = getRequestId();
        const request: WebsocketMessageType = {
            id: requestId,
            collection: options.collection.name,
            method,
            params
        };
        return new Promise<any>((res, rej) => {
            let sent = false;
            const subs: Subscription[] = [];
            function finish(fn: () => void) {
                subs.forEach(sub => sub.unsubscribe());
                fn();
            }
            subs.push(
                messages$.pipe(
                    filter((msg: WebsocketMessageResponseType) => msg.id === requestId)
                ).subscribe((msg: WebsocketMessageResponseType) => finish(() => res(msg.result)))
            );
            subs.push(
                websocketClient.connected$.subscribe((isConnected: boolean) => {
                    /**
                     * The socket can already be closing while connected$
                     * still emits true. Then the request is not sent now
                     * but after the next reconnect.
                     */
                    if (isConnected && !sent && wsClient.readyState === 1) {
                        sent = true;
                        wsClient.send(JSON.stringify(request));
                    } else if (!isConnected && sent) {
                        finish(() => rej(newRxError('RC_WEBSOCKET_DISCONNECTED', {
                            url: options.url,
                            collection: options.collection.name,
                            args: {
                                method,
                                id: requestId
                            }
                        })));
                    }
                })
            );
        });
    }

    const replicationState = replicateRxCollection<RxDocType, CheckpointType>({
        collection: options.collection,
        replicationIdentifier: options.replicationIdentifier,
        live: options.live,
        pull: {
            batchSize: options.batchSize,
            stream$: messages$.pipe(
                filter((msg: WebsocketMessageResponseType) => msg.id === 'stream' && msg.collection === options.collection.name),
                map((msg: WebsocketMessageResponseType) => msg.result)
            ),
            handler(lastPulledCheckpoint: CheckpointType | undefined, batchSize: number) {
                return sendRequestAndAwaitAnswer('masterChangesSince', [lastPulledCheckpoint, batchSize]);
            }
        },
        push: {
            batchSize: options.batchSize,
            handler(docs: RxReplicationWriteToMasterRow<RxDocType>[]) {
                return sendRequestAndAwaitAnswer('masterWrite', [docs]);
            }
        }
    });

    websocketClient.error$.subscribe((err: RxError) => replicationState.subjects.error.next(err));

    websocketClient.connected$.subscribe((isConnected: boolean) => {
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

    replicationState.onCancel.push(() => websocketClient.socket.close());
    options.collection.onClose.push(() => websocketClient.socket.close());
    return replicationState;
}
