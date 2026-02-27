import { Subject } from 'rxjs';
import type {
    WebSocket
} from 'ws';
import {
    PROMISE_RESOLVE_VOID,
    blobToBase64String,
    createBlobFromBase64,
    getFromMapOrThrow
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
 * WebSocket transport needs Blob→base64 conversion at the JSON boundary.
 * These helpers handle the two message types that carry Blob data:
 * - bulkWrite request: document._attachments[id].data (Blob)
 * - getAttachmentData response: msg.return (Blob)
 *
 * We pre-compute Blob→base64 into a map, then use a JSON.stringify replacer
 * to swap them during serialization. This avoids mutating the caller's data
 * (the msg.params for bulkWrite shares references with the caller's write rows).
 */
async function serializeBlobsForWs(msg: any): Promise<string> {
    // Temporarily replace Blobs with base64 strings for JSON serialization,
    // then restore the originals so the caller's references aren't corrupted.
    const saved: { owner: any; key: string; blob: Blob }[] = [];

    try {
        if (msg.method === 'bulkWrite' && Array.isArray(msg.params)) {
            const documentWrites = msg.params[0];
            if (Array.isArray(documentWrites)) {
                for (const row of documentWrites) {
                    if (row.document?._attachments) {
                        for (const attachment of Object.values(row.document._attachments)) {
                            if ((attachment as any).data instanceof Blob) {
                                const blob = (attachment as any).data;
                                saved.push({ owner: attachment, key: 'data', blob });
                                (attachment as any).data = await blobToBase64String(blob);
                            }
                        }
                    }
                }
            }
        } else if (msg.method === 'getAttachmentData' && msg.return instanceof Blob) {
            saved.push({ owner: msg, key: 'return', blob: msg.return });
            msg.return = await blobToBase64String(msg.return);
        }

        const result = JSON.stringify(msg);
        return result;
    } finally {
        // Always restore original Blob references, even if serialization fails
        for (const s of saved) {
            s.owner[s.key] = s.blob;
        }
    }
}

/**
 * Builds a MessageFromRemote error response for any message-like object.
 * Works for both MessageToRemote (uses .requestId) and MessageFromRemote (uses .answerTo).
 */
function buildErrorResponse(msg: any, err: any): MessageFromRemote {
    return {
        connectionId: msg.connectionId,
        answerTo: msg.requestId ?? msg.answerTo,
        method: msg.method,
        error: {
            name: err instanceof Error ? err.name : 'Error',
            message: err instanceof Error ? err.message : String(err)
        }
    };
}

async function deserializeBlobsFromWs(msg: any): Promise<any> {
    try {
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
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        throw new Error('RxDB WebSocket: failed to deserialize Blob data from message ' + msg.id + ': ' + errorMessage);
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
            const ws = getFromMapOrThrow(websocketByConnectionId, msg.connectionId);
            serializeBlobsForWs(msg).then(serialized => ws.send(serialized)).catch(err => {
                console.error('RxDB WebSocket server: failed to serialize outgoing message', err);
                try {
                    ws.send(JSON.stringify(buildErrorResponse(msg, err)));
                } catch {
                    // Ignore secondary send failure.
                }
            });
        },
        fakeVersion: options.fakeVersion
    };
    const exposeState = exposeRxStorageRemote(exposeSettings);

    serverState.onConnection$.subscribe(ws => {
        const onCloseHandlers: Function[] = [];
        ws.onclose = () => {
            onCloseHandlers.map(fn => fn());
        };
        ws.on('message', (messageString: string) => {
            const parsed: MessageToRemote = JSON.parse(messageString);
            deserializeBlobsFromWs(parsed).then((message: MessageToRemote) => {
                const connectionId = message.connectionId;
                if (!websocketByConnectionId.has(connectionId)) {
                    if (
                        message.method !== 'create' &&
                        message.method !== 'custom'
                    ) {
                        ws.send(
                            JSON.stringify(
                                createErrorAnswer(message, new Error('First call must be a create call but is: ' + JSON.stringify(message)))
                            )
                        );
                        return;
                    }
                    websocketByConnectionId.set(connectionId, ws);
                }
                messages$.next(message);
            }).catch((err: any) => {
                try {
                    ws.send(JSON.stringify(buildErrorResponse(parsed, err)));
                } catch {
                    // Ignore secondary failure sending the error response.
                }
            });
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
            websocketClient.message$.subscribe(msg => {
                deserializeBlobsFromWs(msg).then(deserialized => messages$.next(deserialized)).catch(err => {
                    console.error('RxDB WebSocket client: failed to deserialize incoming message', err);
                    messages$.next(buildErrorResponse(msg, err));
                });
            });
            return {
                messages$,
                send(msg) {
                    serializeBlobsForWs(msg).then(serialized => websocketClient.socket.send(serialized)).catch(err => {
                        console.error('RxDB WebSocket client: failed to serialize outgoing message', err);
                        messages$.next(buildErrorResponse(msg, err));
                    });
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

