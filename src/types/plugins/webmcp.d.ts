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
    /**
     * The WebMCP registry to register the tools at.
     * By default document.modelContext is used with a fallback
     * to navigator.modelContext.
     * Set this when the tools must be registered at the registry of
     * another document, for example inside an iframe or a devtools panel.
     */
    modelContext?: any;
}

/**
 * Everything the WebMCP tools need from a collection.
 * The local implementation runs against an RxCollection, other
 * implementations can run against a collection that lives in another
 * process or on another device.
 */
export type WebMCPTarget = {
    databaseName: string;
    collectionName: string;
    schemaVersion: number;
    primaryPath: string;
    jsonSchema: any;
    awaitInSync: () => Promise<void>;
    query: (query: any) => Promise<any[]>;
    count: (query: any) => Promise<number>;
    changesSince: (limit: number, checkpoint?: any) => Promise<{ documents: any[]; checkpoint: any; }>;
    awaitChange: () => Promise<void>;
    insert: (document: any) => Promise<any>;
    upsert: (document: any) => Promise<any>;
    /**
     * Removes the document with the given primary key and returns it.
     * Returns undefined when no document with that primary key exists.
     */
    remove: (id: string) => Promise<any>;
    onClose: (fn: () => void) => void;
};

export type WebMCPTool = {
    name: string;
    description: string;
    annotations?: {
        readOnlyHint?: boolean;
    };
    inputSchema: any;
    execute: (args: any, context?: any) => Promise<any>;
};

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
