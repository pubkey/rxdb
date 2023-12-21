import type { RxDatabase, RxCollection } from '../../types';
import { RxServer } from './rx-server';
import { RxServerAuthenticationHandler } from './types';

import pkg from 'isomorphic-ws';
const { WebSocketServer } = pkg;

import {
    App,
    SSLApp,
    TemplatedApp
} from 'uWebSockets.js';

const app = App({

    /* There are more SSL options, cut for brevity */
    key_file_name: 'misc/key.pem',
    cert_file_name: 'misc/cert.pem',

});


export async function startServer<AuthType>(
    database: RxDatabase,
    authenticationHandler: RxServerAuthenticationHandler<AuthType>,
    serverApp?: TemplatedApp
): Promise<RxServer<AuthType>> {
    if (!serverApp) {
        serverApp = App({});
    }

    const server = new RxServer<AuthType>(
        database,
        authenticationHandler
    );


    return server;
}

(async () => {
    const server = await startServer({} as any, {} as any);
    server.addReplicationEndpoint(
        collection: RxCollection,

    );

});

server.addReplicationEndpoint(
    collection: RxCollection,

) {

}
