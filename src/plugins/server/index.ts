import { ensureNotFalsy, flatClone } from '../utils/index.ts';
import { RxServer } from './rx-server.ts';
import { RxServerOptions } from './types.ts';
import express from 'express';
import {
    Server as HttpServer
} from 'http';


export async function startRxServer<AuthType>(options: RxServerOptions<AuthType>): Promise<RxServer<AuthType>> {
    options = flatClone(options);
    if (!options.serverApp) {
        const app = express();
        options.serverApp = app;
    }

    options.serverApp.use(express.json());


    const httpServer: HttpServer = await new Promise((res, rej) => {
        const ret = ensureNotFalsy(options.serverApp).listen(options.port, options.hostname, () => {
            res(ret);
        });
    });

    const server = new RxServer<AuthType>(
        options.database,
        options.authenticationHandler,
        httpServer,
        ensureNotFalsy(options.serverApp)
    );

    return server;
}
