import type {
    InternalStoreDocType,
    PlainJsonError
} from '../../types/index.d.ts';

export type RxMigrationStatus = {
    collectionName: string;
    status: 'RUNNING' | 'DONE' | 'ERROR';
    error?: PlainJsonError;

    /**
     * Counters so that you can display
     * the migration state to your user in the UI
     * and show a loading bar.
     */
    count: {
        /**
         * Total amount of documents that
         * have to be migrated
         */
        total: number;
        /**
         * Amount of documents that have been migrated already
         * = success + purged
         */
        handled: number;
        /**
         * Total percentage [0-100]
         */
        percent: number;
    };
};


/**
 * To be shared between browser tabs,
 * the migration status is written into a document in the internal storage of the database.
 */
export type RxMigrationStatusDocument = InternalStoreDocType<RxMigrationStatus>;


export type MigrationStatusUpdate = (before: RxMigrationStatus) => RxMigrationStatus;
