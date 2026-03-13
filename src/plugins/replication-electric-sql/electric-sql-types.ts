import type {
    ReplicationOptions,
    ReplicationPullOptions,
    ReplicationPushOptions
} from '../../types/index.d.ts';

export type ElectricSQLCheckpointType = {
    offset: string;
    handle: string;
};

export type ElectricSQLShapeParams = {
    table: string;
    where?: string;
    columns?: string;
    replica?: 'default' | 'full';
    [key: string]: string | undefined;
};

export type ElectricSQLSyncPullOptions<RxDocType> =
    Omit<ReplicationPullOptions<RxDocType, ElectricSQLCheckpointType>, 'handler' | 'stream$'>;

export type ElectricSQLSyncPushOptions<RxDocType> = ReplicationPushOptions<RxDocType>;

export type SyncOptionsElectricSQL<RxDocType> = Omit<
    ReplicationOptions<RxDocType, ElectricSQLCheckpointType>,
    'pull' | 'push'
> & {
    /**
     * URL to the Electric shape endpoint.
     * Example: 'http://localhost:3000/v1/shape'
     */
    url: string;
    /**
     * Parameters for the Electric shape request.
     * Must include 'table' at minimum.
     */
    params: ElectricSQLShapeParams;
    /**
     * Custom HTTP headers sent with each request to the Electric endpoint.
     */
    headers?: Record<string, string>;
    /**
     * Custom fetch function. Defaults to the global fetch.
     */
    fetch?: typeof fetch;
    pull?: ElectricSQLSyncPullOptions<RxDocType>;
    /**
     * Push handler for writing data back to PostgreSQL.
     * Electric-SQL only provides a read path (syncing data from PostgreSQL),
     * so you must provide your own push handler that writes to your backend API.
     */
    push?: ElectricSQLSyncPushOptions<RxDocType>;
};
