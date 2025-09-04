import type {
    ReplicationOptions,
    ReplicationPullOptions,
    ReplicationPushOptions
} from '../../types';
import type { SupabaseClient } from '@supabase/supabase-js';

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
    };
    push?: Omit<ReplicationPushOptions<RxDocType>, 'handler'>;
};

export type SupabaseCheckpoint = {
    id: string;
    modified: string;
}
