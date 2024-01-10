import type {
    RxCollection,
    RxDatabase
} from '../../types';
import { RxServerReplicationEndpoint } from './rx-server-endpoint-replication.ts';
import type {
    RxServerAuthenticationHandler,
    RxServerChangeValidator,
    RxServerEndpoint,
    RxServerQueryModifier
} from './types.ts';
import {
    Server as HttpServer
} from 'http';
import { Express } from 'express';

export class RxServer<AuthType> {
    public readonly endpoints: RxServerEndpoint[] = [];

    constructor(
        public readonly database: RxDatabase,
        public readonly authenticationHandler: RxServerAuthenticationHandler<AuthType>,
        public readonly httpServer: HttpServer,
        public readonly expressApp: Express
    ) {
        database.onDestroy.push(() => this.close());
    }

    public async addReplicationEndpoint<RxDocType>(opts: {
        collection: RxCollection<RxDocType>,
        queryModifier?: RxServerQueryModifier<AuthType, RxDocType>,
        changeValidator?: RxServerChangeValidator<AuthType, RxDocType>
    }) {
        const endpoint = new RxServerReplicationEndpoint(
            this,
            opts.collection,
            opts.queryModifier ? opts.queryModifier : (_a, q) => q,
            opts.changeValidator ? opts.changeValidator : () => true
        );
        this.endpoints.push(endpoint);
        return endpoint;
    }

    async close() {
        await new Promise<void>((res, rej) => {
            this.httpServer.close((err) => {
                if (err) { rej(err); } else { res(); }
            });
            /**
             * By default it will await all ongoing connections
             * before it closes. So we have to close it directly.
             * @link https://stackoverflow.com/a/36830072/3443137
             */
            setImmediate(() => this.httpServer.emit('close'));
        });

    }
}
