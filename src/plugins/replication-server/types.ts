import type {
    ReplicationOptions,
    ReplicationPullOptions,
    ReplicationPushOptions,
    RxStorageDefaultCheckpoint
} from '../../types/index.d.ts';

export type ServerSyncPullOptions<RxDocType> =
    Omit<ReplicationPullOptions<RxDocType, RxStorageDefaultCheckpoint>, 'handler' | 'stream$'>
    & {
    };

export type ServerSyncPushOptions<RxDocType> = Omit<ReplicationPushOptions<RxDocType>, 'handler'>
    & {
};

export type ServerSyncOptions<RxDocType> = Omit<
    ReplicationOptions<RxDocType, any>,
    'pull' | 'push'
> & {
    url: string;
    headers?: { [k: string]: string };
    pull?: ServerSyncPullOptions<RxDocType>;
    push?: ServerSyncPushOptions<RxDocType>;
};
