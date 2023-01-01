import { ById, ReplicationOptions, ReplicationPullOptions, ReplicationPushOptions } from '../../types';
export type CouchDBCheckpointType = {
    sequence: number;
};
export type FetchMethodType = typeof fetch;
export type SyncOptionsCouchDB<RxDocType> = Omit<ReplicationOptions<RxDocType, any>, 'pull' | 'push' | 'replicationIdentifier'> & {
    url: string;
    /**
     * Here you can set a custom fetch method
     * to use http headers or credentials when doing requests.
     */
    fetch?: FetchMethodType;
    pull?: Omit<ReplicationPullOptions<RxDocType, CouchDBCheckpointType>, 'handler' | 'stream$'> & {
        /**
         * Heartbeat time in milliseconds
         * for the long polling of the changestream.
         */
        heartbeat?: number;
    };
    push?: Omit<ReplicationPushOptions<RxDocType>, 'handler'>;
};
export type URLQueryParams = ById<string | number | undefined | boolean>;
