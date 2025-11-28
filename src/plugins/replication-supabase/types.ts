import type {
    ReplicationOptions,
    ReplicationPullOptions,
    ReplicationPushOptions
} from '../../types';
import type { SupabaseClient } from '@supabase/supabase-js';

export type SupabasePullQueryBuilderParams = {
    query: ReturnType<SupabaseClient['from']>['select'] extends (
        ...args: any[]
    ) => infer R
        ? R
        : never;
    lastPulledCheckpoint: SupabaseCheckpoint | undefined;
    batchSize: number;
};

export type SupabasePullQueryBuilder<RxDocType> = (
    params: SupabasePullQueryBuilderParams
) => SupabasePullQueryBuilderParams['query'] | void;

export type SyncOptionsSupabase<RxDocType> = Omit<
    ReplicationOptions<RxDocType, SupabaseCheckpoint>,
    'pull' | 'push'
> & {
    client: SupabaseClient;
    tableName: string;

    /**
     * Modified field, default "_modified"
     */
    modifiedField?: '_modified' | string;

    pull?: Omit<ReplicationPullOptions<RxDocType, SupabaseCheckpoint>, 'handler' | 'stream$'> & {
        /**
         * Allows modifying the PostgREST query before RxDB fetches remote changes.
         * You can return a new builder instance or mutate the provided one.
         */
        queryBuilder?: SupabasePullQueryBuilder<RxDocType>;
    };
    push?: Omit<ReplicationPushOptions<RxDocType>, 'handler'>;
};

export type SupabaseCheckpoint = {
    id: string;
    modified: string;
}
