import { ById, ReplicationOptions, ReplicationPullOptions, ReplicationPushOptions } from '../../types';
export declare type CouchDBCheckpointType = {
    sequence: number;
};
export declare type FetchMethodType = typeof fetch;
export declare type SyncOptionsCouchDB<RxDocType> = Omit<ReplicationOptions<RxDocType, any>, 'pull' | 'push' | 'replicationIdentifier' | 'collection'> & {
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
export declare type URLQueryParams = ById<string | number | undefined | boolean>;
