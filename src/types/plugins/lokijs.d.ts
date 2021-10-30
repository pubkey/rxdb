import lokijs, {
    LokiMemoryAdapter,
    Collection
} from 'lokijs';
import { RxStorageChangedDocumentMeta } from '../rx-storage';


export type LokiDatabaseSettings = Partial<LokiConstructorOptions & LokiConfigOptions>;
export type LokiCollectionSettings = Partial<CollectionOptions<any>>;

export type LokiSettings = {
    database: LokiDatabaseSettings;
    collection: LokiCollectionSettings;
};

export type LokiStorageInternals = {
    loki: Loki;
    collection: Collection;
    /**
     * LokiJS has no persistend, observable
     * or queryable changefeed. So we keep our own changefeed
     * in the changesCollection.
     */
    changesCollection: Collection<RxStorageChangedDocumentMeta>;
};

export type LokiDatabaseState = {
    database: Loki;
    openCollections: { [collectionName: string]: Collection };
};
