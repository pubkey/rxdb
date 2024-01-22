import { RxReplicationState } from '../replication/index.ts';
import { WebsocketClientOptions } from './websocket-types.ts';
import IsomorphicWebSocket from 'isomorphic-ws';
import { Subject, BehaviorSubject } from 'rxjs';
import type { RxError } from '../../types/index.d.ts';
export type WebsocketClient = {
    url: string;
    socket: any;
    connected$: BehaviorSubject<boolean>;
    message$: Subject<any>;
    error$: Subject<RxError>;
};
/**
 * Copied and adapted from the 'reconnecting-websocket' npm module.
 * Some bundlers have problems with bundling the isomorphic-ws plugin
 * so we directly check the correctness in RxDB to ensure that we can
 * throw a helpful error.
 */
export declare function ensureIsWebsocket(w: typeof IsomorphicWebSocket): void;
export declare function createWebSocketClient<RxDocType>(options: WebsocketClientOptions<RxDocType>): Promise<WebsocketClient>;
export declare function replicateWithWebsocketServer<RxDocType, CheckpointType>(options: WebsocketClientOptions<RxDocType>): Promise<RxReplicationState<RxDocType, CheckpointType>>;
