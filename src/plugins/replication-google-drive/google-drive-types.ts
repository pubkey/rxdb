import type {
    ReplicationOptions,
    ReplicationPullOptions,
    ReplicationPushOptions
} from '../../types/index.d.ts';
import { SignalingOptions } from './signaling.ts';

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
    fileSize?: string; // v2
    etag?: string;
}

/**
 * The Google Drive "space" that the data is stored in.
 * - 'drive' stores data in the user visible "My Drive".
 * - 'appDataFolder' stores data in the hidden, per-application
 *   data folder. This requires the
 *   'https://www.googleapis.com/auth/drive.appdata' OAuth scope and
 *   is isolated per OAuth client id.
 */
export type GoogleDriveSpace = 'drive' | 'appDataFolder';

export type GoogleDriveOptions = {
    oauthClientId: string;
    authToken: string;
    /**
     * like "https://www.googleapis.com"
     * No trailing slash!
     */
    apiEndpoint?: string;
    /**
     * Path to a folder in Google Drive where all data is stored.
     * Example: 'rxdb-replication/my-app'
     *
     * When space is 'appDataFolder' this is optional and interpreted
     * relative to the appDataFolder root. If omitted, data is stored
     * directly in the appDataFolder root.
     */
    folderPath?: string;

    /**
     * Defaults to 'drive'.
     */
    space?: GoogleDriveSpace;

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
     * No trailing slash!
     */
    apiEndpoint: string;
    folderPath: string;
    space: GoogleDriveSpace;
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
    signalingOptions?: SignalingOptions;
    pull?: GoogleDriveSyncPullOptions<RxDocType>;
    push?: GoogleDriveSyncPushOptions<RxDocType>;
    /**
     * Set to false to disable attachment replication.
     * When enabled (default), attachment binary data is stored as base64
     * directly inside the document JSON file on Google Drive.
     * Attachment replication only has an effect when the collection schema
     * has `attachments: {}` defined.
     */
    attachments?: false;
};
