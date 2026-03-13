import { Subject } from 'rxjs';
import type {
    WebSocket
} from 'ws';
import {
    PROMISE_RESOLVE_VOID,
    blobToBase64String,
    clone,
    createBlobFromBase64
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

/**
 * WebSocket transport needs Blob<->base64 conversion at the JSON boundary.
 * These helpers handle the two message types that carry Blob data:
 * - bulkWrite request: document._attachments[id].data (Blob)
 * - getAttachmentData response: msg.return (Blob)
 */
async function serializeBlobsForWs(msg: any): Promise<string> {
    const msgForJson: any = clone(msg);

    if (msgForJson.method === 'bulkWrite' && Array.isArray(msgForJson.params)) {
        const documentWrites = msgForJson.params[0];
        if (Array.isArray(documentWrites)) {
            const toConvert: { attachment: any; blob: Blob }[] = [];
            for (const row of documentWrites) {
                if (row.document?._attachments) {
                    for (const attachment of Object.values(row.document._attachments)) {
                        if ((attachment as any).data instanceof Blob) {
                            toConvert.push({
                                attachment,
                                blob: (attachment as any).data as Blob,
                            });
                        }
                    }
                }
            }
            if (toConvert.length > 0) {
                const base64Results = await Promise.all(
                    toConvert.map((entry) => blobToBase64String(entry.blob)),
                );
                for (let i = 0; i < toConvert.length; i++) {
                    toConvert[i].attachment.data = base64Results[i];
                }
            }
        }
    } else if (msgForJson.method === 'getAttachmentData' && msgForJson.return instanceof Blob) {
        msgForJson.return = await blobToBase64String(msgForJson.return);
    }

    return JSON.stringify(msgForJson);
}

async function deserializeBlobsFromWs(msg: any): Promise<any> {
    if (msg.method === 'bulkWrite' && Array.isArray(msg.params)) {
        const documentWrites = msg.params[0];
        if (Array.isArray(documentWrites)) {
            for (const row of documentWrites) {
                if (row.document?._attachments) {
                    for (const attachment of Object.values(row.document._attachments)) {
                        if (typeof (attachment as any).data === 'string') {
                            (attachment as any).data = await createBlobFromBase64(
                                (attachment as any).data,
                                (attachment as any).type || ''
                            );
                        }
                    }
                }
            }
        }
    } else if (msg.method === 'getAttachmentData' && typeof msg.return === 'string') {
        msg.return = await createBlobFromBase64(msg.return, '');
    }
    return msg;
}
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
            const ws = websocketByConnectionId.get(msg.connectionId);
            if (!ws) {
                // client disconnected, silently drop the message
                return;
            }
            serializeBlobsForWs(msg)
                .then(serialized => {
                    try {
                        ws.send(serialized);
                    } catch (err) {
                        // WebSocket might have transitioned to CLOSING or CLOSED state
                    }
                })
                .catch(() => {
                    // serialization error, silently drop
                });
        },
        fakeVersion: options.fakeVersion
    };
    const exposeState = exposeRxStorageRemote(exposeSettings);

    serverState.onConnection$.subscribe((ws: WebSocket) => {
        const onCloseHandlers: Function[] = [];
        const connectionIds = new Set<string>();
        ws.onclose = () => {
            onCloseHandlers.map(fn => fn());
            connectionIds.forEach(id => websocketByConnectionId.delete(id));
        };
        ws.on('message', (messageString: string) => {
            void (async () => {
                let message: MessageToRemote;
                try {
                    message = JSON.parse(messageString);
                    await deserializeBlobsFromWs(message);
                } catch (err) {
                    console.error('RxDB WebSocket server: failed to parse or deserialize message', err);
                    return;
                }
                const connectionId = message.connectionId;
                if (!websocketByConnectionId.has(connectionId)) {
                    if (
                        message.method !== 'create' &&
                        message.method !== 'custom'
                    ) {
                        try {
                            ws.send(
                                JSON.stringify(
                                    createErrorAnswer(message, new Error('First call must be a create call but is: ' + JSON.stringify(message)))
                                )
                            );
                        } catch (err) {
                            // WebSocket might be in CLOSING or CLOSED state
                        }
                        return;
                    }
                    websocketByConnectionId.set(connectionId, ws);
                    connectionIds.add(connectionId);
                }
                messages$.next(message);
            })();
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
            websocketClient.message$.subscribe((msg: any) => {
                void deserializeBlobsFromWs(msg)
                    .then(deserialized => {
                        messages$.next(deserialized);
                    })
                    .catch(err => {
                        console.error('RxDB WebSocket client: failed to deserialize incoming message', err);
                    });
            });
            return {
                messages$,
                async send(msg) {
                    const serialized = await serializeBlobsForWs(msg);
                    websocketClient.socket.send(serialized);
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

