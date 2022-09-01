/* eslint-disable no-unused-vars */
/* eslint-disable @typescript-eslint/no-unused-vars */

import type {
    DexiePreparedQuery,
    EventBulk,
    RxAttachmentWriteData,
    RxDocumentData,
    RxStorage,
    RxStorageChangeEvent,
    RxStorageDefaultCheckpoint
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

/**
 * TODO atm we cannot import types from 'foundationdb'
 * because 'foundationdb' is an optional peer dependency
 * this is NOT also in the devDependencies.
 * This is because it requires to install the foundationdb client cli
 * which would mean everyone that wants to develop RxDB must have this installed manually.
 */
// import {
//     open as foundationDBOpen,
//     Database,
//     Transaction
// } from 'foundationdb';

export type FoundationDBIndexMeta<RxDocType> = {
    indexName: string;
    index: string[];
    getIndexableString: (doc: RxDocumentData<RxDocType>) => string;
    db: FoundationDBDatabase<string>;
};

export type FoundationDBConnection = any; // ReturnType<typeof foundationDBOpen>;
export type FoundationDBDatabase<RxDocType> = any; // Database<string, any, RxDocType, any>;
export type FoundationDBTransaction<RxDocType> = any; // Transaction<string, any, RxDocumentData<RxDocType>, any>;
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
export type RxStorageFoundationDB = RxStorage<FoundationDBStorageInternals<any>, RxStorageFoundationDBInstanceCreationOptions> & {
};


export type FoundationDBPreparedQuery<DocType> = DexiePreparedQuery<DocType>;
