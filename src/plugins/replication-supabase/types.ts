import type { ReplicationOptions } from '../../types';
import type { SupabaseClient } from "@supabase/supabase-js"

export type SyncOptionsSupabase<RxDocType> = Omit<
    ReplicationOptions<RxDocType, SupabaseCheckpoint>,
    'pull.handler' | 'push.handler'
> & {
    client: SupabaseClient;
    tableName: string;
    modifiedField?: '_modified' | string;
};

export type SupabaseCheckpoint = {
    id: string;
    modified: string;
}
