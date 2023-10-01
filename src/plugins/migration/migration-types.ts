import type {
    InternalStoreDocType
} from '../../types';

export type RxMigrationStatus = {
    status: 'RUNNING' | 'DONE';
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
         * = sucess + purged
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
export type RxMigrationStatusDocument = InternalStoreDocType<{
    type: 'migration-status';
    collectionName: string;
    status: RxMigrationStatus;
}>;


export type MigrationStatusUpdate = (before: RxMigrationStatus) => RxMigrationStatus;
