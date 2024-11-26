import type { EventBulk, RxAttachmentWriteData, RxDocumentData, RxStorage, RxStorageChangeEvent, RxStorageDefaultCheckpoint } from '../../types/index.d.ts';
export type RxStorageFoundationDBSettings = {
    /**
     * Version of the API of the foundationDB server.
     */
    apiVersion: number;
    /**
     * Path to the foundationDB cluster file
     * like '/path/to/fdb.cluster'
     * (optional)
     */
    clusterFile?: string;
    batchSize?: number;
};
export type RxStorageFoundationDBInstanceCreationOptions = {
    batchSize?: number;
};
/**
 * We cannot import types from 'foundationdb'
 * because 'foundationdb' is an optional peer dependency
 * this is NOT also in the devDependencies.
 * This is because it requires to install the foundationdb client cli
 * which would mean everyone that wants to develop RxDB must have this installed manually.
 */
export type FoundationDBIndexMeta<RxDocType> = {
    indexName: string;
    index: string[];
    getIndexableString: (doc: RxDocumentData<RxDocType>) => string;
    db: FoundationDBDatabase<string>;
};
export type FoundationDBConnection = any;
export type FoundationDBDatabase<RxDocType> = any;
export type FoundationDBTransaction<RxDocType> = any;
export type FoundationDBStorageInternals<RxDocType> = {
    connection: FoundationDBConnection;
    dbsPromise: Promise<{
        root: FoundationDBDatabase<any>;
        main: FoundationDBDatabase<RxDocType>;
        attachments: FoundationDBDatabase<RxAttachmentWriteData>;
        events: FoundationDBDatabase<EventBulk<RxStorageChangeEvent<RxDocumentData<RxDocType>>, RxStorageDefaultCheckpoint>>;
        indexes: {
            [indexName: string]: FoundationDBIndexMeta<RxDocType>;
        };
    }>;
};
export type RxStorageFoundationDB = RxStorage<FoundationDBStorageInternals<any>, RxStorageFoundationDBInstanceCreationOptions> & {};
