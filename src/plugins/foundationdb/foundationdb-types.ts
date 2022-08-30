import type {
    DexiePreparedQuery,
    RxDocumentData,
    RxStorage
} from '../../types';
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
    // can be overwritte per instance
    batchSize?: number;
};

import {
    open as foundationDBOpen,
    Database,
    Transaction
} from 'foundationdb';

export type FoundationDBIndexMeta<RxDocType> = {
    index: string[];
    getIndexableString: (doc: RxDocumentData<RxDocType>) => string;
    db: FoundationDBDatabase<string>;
};

export type FoundationDBConnection = ReturnType<typeof foundationDBOpen>;
export type FoundationDBDatabase<RxDocType> = Database<string, any, RxDocType, any>;
export type FoundationDBTransaction<RxDocType> = Transaction<string, any, RxDocumentData<RxDocType>, any>;
export type FoundationDBStorageInternals<RxDocType> = {
    connection: FoundationDBConnection;
    dbsPromise: Promise<{
        root: FoundationDBDatabase<any>;
        main: FoundationDBDatabase<RxDocType>;
        indexes: {
            [indexName: string]: FoundationDBIndexMeta<RxDocType>;
        };
    }>;
};
export type RxStorageFoundationDB = RxStorage<FoundationDBStorageInternals<any>, RxStorageFoundationDBInstanceCreationOptions> & {
};


export type FoundationDBPreparedQuery<DocType> = DexiePreparedQuery<DocType>;
