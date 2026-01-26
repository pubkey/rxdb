import {
    replicateRxCollection,
    RxReplicationState
} from '../replication/index.ts';
import {
    WebsocketClientOptions,
    WebsocketMessageType
} from './websocket-types.ts';

import ReconnectingWebSocket from 'reconnecting-websocket';

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
    firstValueFrom,
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


/**
 * Copied and adapted from the 'reconnecting-websocket' npm module.
 */
export function ensureIsWebsocket(w: typeof WebSocket) {
    const is = typeof w !== 'undefined' && !!w && w.CLOSING === 2;
    if (!is) {
        console.dir(w);
        throw new Error('websocket not valid');
    }
}


export async function createWebSocketClient<RxDocType>(options: WebsocketClientOptions<RxDocType>): Promise<WebsocketClient> {
    ensureIsWebsocket(WebSocket);
    const wsClient = new ReconnectingWebSocket(
        options.url,
        [],
        { WebSocket }
    );
    const connected$ = new BehaviorSubject<boolean>(false);
    const message$ = new Subject<any>();
    const error$ = new Subject<any>();
    wsClient.onerror = (err) => {

        console.log('--- WAS CLIENT GOT ERROR:');
        console.log(err.error.message);

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

    wsClient.onmessage = (messageObj) => {
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
    const replicationState = replicateRxCollection<RxDocType, CheckpointType>({
        collection: options.collection,
        replicationIdentifier: options.replicationIdentifier,
        live: options.live,
        pull: {
            batchSize: options.batchSize,
            stream$: messages$.pipe(
                filter(msg => msg.id === 'stream' && msg.collection === options.collection.name),
                map(msg => msg.result)
            ),
            async handler(lastPulledCheckpoint: CheckpointType | undefined, batchSize: number) {
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

    websocketClient.error$.subscribe(err => replicationState.subjects.error.next(err));

    websocketClient.connected$.subscribe(isConnected => {
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

    options.collection.onClose.push(() => websocketClient.socket.close());
    return replicationState;
}
