import type {
    ById,
    ReplicationOptions,
    ReplicationPullOptions,
    ReplicationPushOptions
} from '../../types/index.d.ts';

import type { Client, Account } from 'appwrite';

export type AppwriteCheckpointType = {
    sequence: number;
};

export type FetchMethodType = typeof fetch;
export type SyncOptionsAppwrite<RxDocType> = Omit<
    ReplicationOptions<RxDocType, any>,
    'pull' | 'push'
> & {
    databaseId: string;
    collectionId: string;
    client: Client;

    pull?: Omit<ReplicationPullOptions<RxDocType, AppwriteCheckpointType>, 'handler' | 'stream$'> & {
        /**
         * Heartbeat time in milliseconds
         * for the long polling of the changestream.
         */
        heartbeat?: number;
    };
    push?: Omit<ReplicationPushOptions<RxDocType>, 'handler'>;
};


export type URLQueryParams = ById<string | number | undefined | boolean>;
