import type { ServerOptions } from 'isomorphic-ws';
import type { WebsocketServerOptions, WebsocketServerState } from './websocket-types.ts';
export declare function startSocketServer(options: ServerOptions): WebsocketServerState;
export declare function startWebsocketServer(options: WebsocketServerOptions): WebsocketServerState;
