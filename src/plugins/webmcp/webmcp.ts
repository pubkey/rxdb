import type {
    RxCollection,
    RxDatabase
} from '../../index.d.ts';
import type {
    RxWebMCPPlugin,
    WebMCPOptions,
    WebMCPLogEvent
} from '../../types/plugins/webmcp.d.ts';
import { Subject } from 'rxjs';
import { getWebMCPTargetFromCollection } from './webmcp-target.ts';
import { registerWebMCPTarget } from './webmcp-tools.ts';


export function registerWebMCPDatabase(this: RxDatabase, options?: WebMCPOptions): { error$: Subject<Error>; log$: Subject<WebMCPLogEvent> } {
    const database = this;
    const collections = this.collections;
    const error$ = new Subject<Error>();
    const log$ = new Subject<WebMCPLogEvent>();

    const registerCollection = (collection: RxCollection<any>) => {
        const res = collection.registerWebMCP(options);
        res.error$.subscribe(error$);
        res.log$.subscribe(log$);
    };

    // Register existing collections
    for (const [name, collection] of Object.entries(collections)) {
        registerCollection(collection as RxCollection<any>);
    }

    // Store options and subjects on the database instance so the hook can pick them up dynamically
    (database as any)._webmcpOptions = options || {};
    (database as any)._webmcpError$ = error$;
    (database as any)._webmcpLog$ = log$;

    // We should probably tear this down if the database is destroyed... For now it's okay.
    return { error$, log$ };
}

export function registerWebMCPCollection(this: RxCollection, options?: WebMCPOptions): { error$: Subject<Error>; log$: Subject<WebMCPLogEvent> } {
    const target = getWebMCPTargetFromCollection(this);
    const { error$, log$ } = registerWebMCPTarget(target, options);
    return { error$, log$ };
}

export const RxDBWebMCPPlugin: RxWebMCPPlugin = {
    name: 'webmcp',
    rxdb: true,
    prototypes: {
        RxDatabase: (proto: any) => {
            proto.registerWebMCP = registerWebMCPDatabase;
        },
        RxCollection: (proto: any) => {
            proto.registerWebMCP = registerWebMCPCollection;
        }
    },
    hooks: {
        createRxCollection: {
            after: ({ collection }: { collection: RxCollection }) => {
                const db = collection.database as any;
                if (db._webmcpOptions) {
                    const res = (collection as any).registerWebMCP(db._webmcpOptions);
                    if (db._webmcpError$) {
                        res.error$.subscribe(db._webmcpError$);
                    }
                    if (db._webmcpLog$) {
                        res.log$.subscribe(db._webmcpLog$);
                    }
                }
            }
        }
    }
};
