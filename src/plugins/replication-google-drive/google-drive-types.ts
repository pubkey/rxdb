import type {
    ReplicationOptions,
    ReplicationPullOptions,
    ReplicationPushOptions
} from '../../types/index.d.ts';

export type GoogleDriveCheckpointType = {
    id: string;
    modifiedTime: string;
};

export type GoogleDriveOptions = {
    oauthClientId: string;
    authToken: string;
    /**
     * like "https://www.googleapis.com/"
     */
    apiEndpoint?: string;
    /**
     * Path to a folder in Google Drive where all data is stored.
     * Example: 'rxdb-replication/my-app'
     */
    folderPath: string;
};

export type GoogleDriveOptionsWithDefaults = {
    oauthClientId: string;
    authToken: string;
    apiEndpoint: string;
    folderPath: string;
};

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
