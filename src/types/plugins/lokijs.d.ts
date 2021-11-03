import type {
    Collection
} from 'lokijs';
import type { RxStorageChangedDocumentMeta } from '../rx-storage';

export type LokiDatabaseSettings = Partial<LokiConstructorOptions & LokiConfigOptions>;
export type LokiCollectionSettings = Partial<CollectionOptions<any>>;

export type LokiSettings = {
    database: LokiDatabaseSettings;
    collection: LokiCollectionSettings;
};

export type LokiLocalState = {
    database: Loki;
    collection: Collection;
    /**
     * LokiJS has no persistend, observable
     * or queryable changefeed. So we keep our own changefeed
     * in the changesCollection.
     */
    changesCollection: Collection<RxStorageChangedDocumentMeta>;
};

export type LokiStorageInternals = {
    localState?: Promise<LokiLocalState>;
};

export type LokiRemoteRequestBroadcastMessage = {
    type: string,
    databaseName: string;
    collectionName: string;
    operation: string;
    params: any[];
    requestId: string;
};

export type LokiRemoteResponseBroadcastMessage = {
    response: true;
    type: string,
    databaseName: string;
    requestId: string;
    result: any | any[];
    // if true, the result property will contain an error state
    isError: boolean;
};

export type LokiDatabaseState = {
    database: Loki;
    openCollections: { [collectionName: string]: Collection };
};
