
export type RxMigrationStatus = {
    status: 'NOT-STARTED' | 'RUNNING' | 'DONE';
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
         */
        handled: number;
        /**
         * Amount handled docs which where
         * successfully migrated
         * (the migration strategy did NOT return null)
         */
        success: number;
        /**
         * Amount of handled docs which got purged.
         * (the migration strategy returned null)
         */
        purged: number;
        /**
         * Total percentage [0-100]
         */
        percent: number;
    };
};


/**
 * To be shared between browser tabs,
 * the migration status is written into a local document
 * We have a single document, that contains the migration state
 * for ALL collections.
 */
export type RxMigrationStatusDocumentData = {
    status: 'NOT-STARTED' | 'RUNNING' | 'DONE';
};
