import type { ReplicationOptions, ReplicationPullOptions, ReplicationPushOptions } from '../../types/index.d.ts';
import { SignalingOptions } from './signaling.ts';

/**
 * Represents a Microsoft Graph DriveItem.
 * https://learn.microsoft.com/en-us/graph/api/resources/driveitem?view=graph-rest-1.0
 */
export interface OneDriveItem {
    id: string;
    name: string;
    eTag: string;
    cTag: string;
    createdDateTime?: string;
    lastModifiedDateTime: string;
    folder?: {
        childCount: number;
    };
    file?: {
        mimeType: string;
    };
    '@microsoft.graph.downloadUrl'?: string;
    size?: number;
    parentReference?: {
        driveId: string;
        id: string;
    };
}

export interface OneDriveState {
    oauthClientId?: string; // Kept for config compatibility, maybe used if graph API client library is added later
    authToken: string;
    /**
     * Microsoft Graph API Endpoint.
     * Default: `https://graph.microsoft.com/v1.0`
     */
    apiEndpoint?: string;

    /**
     * ID of the personal OneDrive root or SharePoint Document Library root.
     * 'me/drive' is common for personal.
     */
    driveId?: string;

    /**
     * Provide a folderPath to the app root in the cloud.
     * Must not be the root folder.
     */
    folderPath: string;

    /**
     * In ms.
     * Default: 10000
     */
    transactionTimeout?: number;
}

export type OneDriveSyncPullOptions<RxDocType> = Omit<ReplicationPullOptions<RxDocType, OneDriveCheckpointType>, 'handler' | 'stream$'>;

export type OneDriveSyncPushOptions<RxDocType> = Omit<ReplicationPushOptions<RxDocType>, 'handler'>;

export type SyncOptionsOneDrive<RxDocType> = Omit<
    ReplicationOptions<RxDocType, any>,
    'pull' | 'push'
> & {
    oneDrive: OneDriveState;
    signalingOptions?: SignalingOptions;
    pull?: OneDriveSyncPullOptions<RxDocType>;
    push?: OneDriveSyncPushOptions<RxDocType>;
};

export type OneDriveCheckpointType = {
    /**
     * The last 'lastModifiedDateTime' of a document.
     */
    lastModifiedDateTime: string;
};



export type OneDriveTransaction = {
    retry: true;
} | OneDriveItem;


export type OneDriveResponse<T> = {
    value: T;
    '@odata.nextLink'?: string;
};
