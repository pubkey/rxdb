import type { LeaderElector } from 'broadcast-channel';
import type { AddReturn } from 'unload';
import type { LokiSaveQueue } from '../../plugins/storage-lokijs/loki-save-queue.ts';

export type LokiDatabaseSettings = any;

export type LokiCollectionSettings = Partial<any>;

export type LokiSettings = {
    database?: LokiDatabaseSettings;
    collection?: LokiCollectionSettings;
};

export type LokiStorageInternals = {
    leaderElector?: LeaderElector;
    localState?: Promise<LokiLocalDatabaseState>;
};

export type LokiRemoteRequestBroadcastMessage = {
    response: false;
    type: string;
    databaseName: string;
    collectionName: string;
    operation: string;
    params: any[];
    requestId: string;
};

export type LokiRemoteResponseBroadcastMessage = {
    response: true;
    type: string;
    databaseName: string;
    collectionName: string;
    requestId: string;
    result: any | any[];
    // if true, the result property will contain an error state
    isError: boolean;
};

export type LokiDatabaseState = {
    database: any;
    databaseSettings: LokiDatabaseSettings;
    saveQueue: LokiSaveQueue;

    // all known collections of the database
    collections: {
        [collectionName: string]: any;
    };

    /**
     * Registered unload handlers
     * so we can remove them on close.
     */
    unloads: AddReturn[];
};

export type LokiLocalDatabaseState = {
    databaseState: LokiDatabaseState;
    collection: any;
};
