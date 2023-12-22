import type {
    RxCollection,
    RxDatabase
} from '../../types';
import { ensureNotFalsy } from '../utils/index.ts';
import { RxServerReplicationEndpoint } from './rx-server-endpoint-replication.ts';
import type {
    RxServerAuthenticationHandler,
    RxServerChangeValidator,
    RxServerEndpoint,
    RxServerQueryModifier
} from './types.ts';
import type {
    FastifyInstance,
    FastifyListenOptions
} from 'fastify';

export class RxServer<AuthType> {
    public readonly endpoints: RxServerEndpoint[] = [];
    public started = false;

    constructor(
        public readonly database: RxDatabase,
        public readonly authenticationHandler: RxServerAuthenticationHandler<AuthType>,
        public readonly serverApp: FastifyInstance
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
        await endpoint.start();
        this.endpoints.push(endpoint);
        return endpoint;
    }

    async start(listenOptions: FastifyListenOptions) {
        if (this.started) {
            return;
        }
        this.started = true;
        await new Promise((res, rej) => {
            ensureNotFalsy(this.serverApp).listen(listenOptions, (err, address) => {
                if (err) {
                    rej(err);
                } else {
                    console.log('STARTED ' + address);
                    res(address);
                };
            });
        });
    }

    close() {

    }
}
