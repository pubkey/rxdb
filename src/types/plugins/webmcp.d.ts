import type {
    RxDatabase,
    RxCollection
} from '../../index.d.ts';

import type { Observable } from 'rxjs';

export interface WebMCPOptions {
    /**
     * If true, modifier tools (insert, upsert, delete) will not be registered
     * for this database or collection.
     * @default false
     */
    readOnly?: boolean;
    /**
     * If true, delays queries until all replication states of the collection
     * are in sync.
     * @default true
     */
    awaitReplicationsInSync?: boolean;
}

export interface WebMCPLogEvent {
    collectionName: string;
    databaseName: string;
    toolName: string;
    args: any;
    result?: any;
    error?: any;
}

export interface RxWebMCPPlugin {
    name: 'webmcp';
    rxdb: true;
    prototypes: {
        RxDatabase: (proto: any) => void;
        RxCollection: (proto: any) => void;
    };
    hooks?: any;
}
