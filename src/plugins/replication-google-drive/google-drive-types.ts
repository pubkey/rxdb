import type {
    ReplicationOptions,
    ReplicationPullOptions,
    ReplicationPushOptions
} from '../../types/index.d.ts';

export type GoogleDriveCheckpointType = {
    modifiedTime: string;
    /**
     * There is no way to do a comparison (> or >=)
     * on fileNames or ids in google drive.
     * Also modifiedTime can be sometimes the same
     * on multiple files.
     * Therefore we might overfetch documents and
     * after the request removed the ones that have been known before.
     */
    docIdsWithSameModifiedTime: string[];
};

export interface DriveFileMetadata {
    id: string;
    name: string;
    mimeType: string;
    parents?: string[];
    modifiedTime?: string;
    size?: string; // Drive returns size as string
}

export type GoogleDriveOptions = {
    oauthClientId: string;
    authToken: string;
    /**
     * like "https://www.googleapis.com"
     * No endling slash!
     */
    apiEndpoint?: string;
    /**
     * Path to a folder in Google Drive where all data is stored.
     * Example: 'rxdb-replication/my-app'
     */
    folderPath: string;

    /**
     * Time in milliseconds.
     */
    transactionTimeout?: number;
};

export type GoogleDriveOptionsWithDefaults = {
    oauthClientId: string;
    authToken: string;
    /**
     * like "https://www.googleapis.com"
     * No endling slash!
     */
    apiEndpoint: string;
    folderPath: string;
    /**
     * Time in milliseconds.
     */
    transactionTimeout: number;
};

export interface DriveFileListResponse {
    nextPageToken?: string;
    files: DriveFileMetadata[];
}


export type GoogleDriveSyncPullOptions<RxDocType> = Omit<ReplicationPullOptions<RxDocType, GoogleDriveCheckpointType>, 'handler' | 'stream$'>;

export type GoogleDriveSyncPushOptions<RxDocType> = Omit<ReplicationPushOptions<RxDocType>, 'handler'>;

export type SyncOptionsGoogleDrive<RxDocType> = Omit<
    ReplicationOptions<RxDocType, any>,
    'pull' | 'push'
> & {
    googleDrive: GoogleDriveOptions;
    pull?: GoogleDriveSyncPullOptions<RxDocType>;
    push?: GoogleDriveSyncPushOptions<RxDocType>;
};
