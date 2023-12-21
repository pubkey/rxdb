import type {
    RxCollection,
    RxDatabase
} from '../../types';
import type {
    RxServerAuthenticationHandler,
    RxServerChangeValidator,
    RxServerQueryModifier
} from './types';
import {
    TemplatedApp
} from 'uWebSockets.js';

export class RxServer<AuthType> {
    public readonly endpoints: RxServerEndpoint[] = [];

    constructor(
        public readonly database: RxDatabase,
        public readonly authenticationHandler: RxServerAuthenticationHandler<AuthType>,
        public readonly serverApp: TemplatedApp
    ) { }

    public addReplicationEndpoint<RxDocType>(
        collection: RxCollection<RxDocType>,
        queryModifier?: RxServerQueryModifier<AuthType, RxDocType>,
        changeValidator?: RxServerChangeValidator<AuthType, RxDocType>
    ) {
        const endpoint = new RxServerReplicationEndpoint(
            this,
            collection,
            queryModifier ? queryModifier : (_a, q) => q,
            changeValidator ? changeValidator : () => true
        );
        this.endpoints.push(endpoint);
        return endpoint;
    }
}

export interface RxServerEndpoint {
    type: 'replication';
    urlPath: string;
};

export class RxServerReplicationEndpoint<AuthType, RxDocType> implements RxServerEndpoint {
    readonly type = 'replication';
    readonly urlPath: string;
    constructor(
        public readonly server: RxServer<AuthType>,
        public readonly collection: RxCollection<RxDocType>,
        public readonly queryModifier: RxServerQueryModifier<AuthType, RxDocType>,
        public readonly changeValidator: RxServerChangeValidator<AuthType, RxDocType>
    ) {
        this.urlPath = [this.type, collection.name, collection.schema.version].join('/');

        this.server.serverApp.ws('/' + this.urlPath, {

            /* For brevity we skip the other events (upgrade, open, ping, pong, close) */
            message: (ws, message, isBinary) => {
                /* You can do app.publish('sensors/home/temperature', '22C') kind of pub/sub as well */

                /* Here we echo the message back, using compression if available */
                let ok = ws.send(message, isBinary, true);
            }
        });
    }
}
