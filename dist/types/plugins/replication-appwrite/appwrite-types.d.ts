import type { ById, ReplicationOptions, ReplicationPullOptions, ReplicationPushOptions } from '../../types/index.d.ts';
import type { Client } from 'appwrite';
export type AppwriteCheckpointType = {
    updatedAt: string;
    id: string;
};
export type FetchMethodType = typeof fetch;
export type SyncOptionsAppwrite<RxDocType> = Omit<ReplicationOptions<RxDocType, any>, 'pull' | 'push' | 'deletedField'> & {
    databaseId: string;
    collectionId: string;
    client: Client;
    deletedField: string;
    pull?: Omit<ReplicationPullOptions<RxDocType, AppwriteCheckpointType>, 'handler' | 'stream$'> & {};
    push?: Omit<ReplicationPushOptions<RxDocType>, 'handler'>;
};
export type URLQueryParams = ById<string | number | undefined | boolean>;
