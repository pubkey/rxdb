import { ensureNotFalsy, flatClone } from '../utils/index.ts';
import { RxServer } from './rx-server.ts';
import { RxServerOptions } from './types.ts';

import Fastify from 'fastify';
import type {
    FastifyInstance
} from 'fastify';

import * as FSWebsocket from '@fastify/websocket';

export async function startRxServer<AuthType>(options: RxServerOptions<AuthType>): Promise<RxServer<AuthType>> {
    options = flatClone(options);
    if (!options.serverApp) {
        options.serverApp = Fastify(options.appOptions);
        console.log('XXX_');
        console.dir(!!FSWebsocket.default);
        options.serverApp.register(FSWebsocket.default);
    }

    const server = new RxServer<AuthType>(
        options.database,
        options.authenticationHandler,
        options.serverApp
    );

    return server;
}
