export type BackupOptions = {
    live: boolean;
    directory: string;
    /**
     * If true,
     * attachments will also be saved
     */
    attachments?: boolean;
    /**
     * How many documents can be processed in one batch
     * [default=10]
     */
    batchSize?: number;
    /**
     * If not set, all collections will be backed up.
     */
    collections?: string[];
};

export type BackupMetaFileContent = {
    createdAt: number;
    updatedAt: number;
    collectionStates: {
        [collectionName: string]: {
            checkpoint?: any;
        };
    };
};

export type RxBackupWriteEvent = {
    collectionName: string;
    documentId: string;
    files: string[];
    deleted: boolean;
};
