import type { RxDatabase, RxReplicationHandler } from '../../types/index.d.ts';
import type { ServerOptions } from 'isomorphic-ws';
import type { WebsocketServerOptions, WebsocketServerState } from './websocket-types.ts';
export declare function startSocketServer(options: ServerOptions): WebsocketServerState;
export declare function getReplicationHandlerByCollection<RxDocType>(database: RxDatabase<any>, collectionName: string): RxReplicationHandler<RxDocType, any>;
export declare function startWebsocketServer(options: WebsocketServerOptions): WebsocketServerState;
