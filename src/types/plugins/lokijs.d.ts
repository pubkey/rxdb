import lokijs, {
    LokiMemoryAdapter
} from 'lokijs';


export type LokiDatabaseSettings = Partial<LokiConstructorOptions>;
export type LokiCollectionSettings = Partial<CollectionOptions<any>>;

export type LokiSettings = {
    database: LokiDatabaseSettings;
    collection: LokiCollectionSettings;
};
