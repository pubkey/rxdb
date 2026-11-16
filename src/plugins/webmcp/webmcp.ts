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
import {
    ensureWebMCPToolNamesNotRegistered,
    registerWebMCPTarget
} from './webmcp-tools.ts';
import { RX_STATE_SCHEMA_TITLE } from '../state/helpers.ts';

/**
 * The collection of an RxState is internal.
 * Writes to it that do not go through the RxState corrupt the state,
 * so the database-wide registration does not expose it.
 */
function isInternalCollection(collection: RxCollection<any>): boolean {
    return collection.schema.jsonSchema.title === RX_STATE_SCHEMA_TITLE;
}


export function registerWebMCPDatabase(this: RxDatabase, options?: WebMCPOptions): { error$: Subject<Error>; log$: Subject<WebMCPLogEvent> } {
    const database = this;
    const collections = this.collections;
    const error$ = new Subject<Error>();
    const log$ = new Subject<WebMCPLogEvent>();

    const unregisterFunctions: (() => void)[] = [];
    const registerCollection = (collection: RxCollection<any>) => {
        const res = registerWebMCPTarget(getWebMCPTargetFromCollection(collection), options);
        unregisterFunctions.push(res.unregister);
        res.error$.subscribe(error$);
        res.log$.subscribe(log$);
    };

    const exposedCollections = Object.values(collections)
        .filter(collection => !isInternalCollection(collection as RxCollection<any>));

    exposedCollections.forEach(collection => {
        ensureWebMCPToolNamesNotRegistered({
            databaseName: database.name,
            collectionName: collection.name,
            schemaVersion: collection.schema.version
        }, options);
    });

    // Register existing collections
    try {
        for (const collection of exposedCollections) {
            registerCollection(collection as RxCollection<any>);
        }
    } catch (err) {
        /**
         * When one collection cannot be registered, the collections
         * that were registered before it are unregistered again.
         */
        unregisterFunctions.forEach(unregister => unregister());
        throw err;
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
                if (db._webmcpOptions && !isInternalCollection(collection)) {
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
