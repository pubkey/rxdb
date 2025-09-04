import { RxReplicationState, startReplicationOnLeaderShip } from '../replication/index.ts';
import { SupabaseCheckpoint, SyncOptionsSupabase } from './types.ts';
import { addRxPlugin } from '../../plugin.ts';
import { RxDBLeaderElectionPlugin } from '../leader-election/index.ts';
import {
    ReplicationPullOptions,
    ReplicationPushOptions,
    RxCollection,
    RxDocumentData,
    RxJsonSchema,
    RxReplicationPullStreamItem,
    RxReplicationWriteToMasterRow,
    WithDeleted
} from '../../types/index';
import { Subject } from 'rxjs';
import {
    DEFAULT_DELETED_FIELD,
    DEFAULT_MODIFIED_FIELD,
    POSTGRES_INSERT_CONFLICT_CODE,
    addDocEqualityToQuery
} from './helper.ts';
import { ensureNotFalsy, flatClone, lastOfArray } from '../utils/index.ts';



export class RxSupabaseReplicationState<RxDocType> extends RxReplicationState<RxDocType, SupabaseCheckpoint> {
    constructor(
        public readonly replicationIdentifier: string,
        public readonly collection: RxCollection<RxDocType, any, any, any>,
        public readonly pull?: ReplicationPullOptions<RxDocType, SupabaseCheckpoint>,
        public readonly push?: ReplicationPushOptions<RxDocType>,
        public readonly live: boolean = true,
        public retryTime: number = 1000 * 5,
        public autoStart: boolean = true
    ) {
        super(
            replicationIdentifier,
            collection,
            '_deleted',
            pull,
            push,
            live,
            retryTime,
            autoStart
        );
    }
}


export function replicateSupabase<RxDocType>(
    options: SyncOptionsSupabase<RxDocType>
) {
    options = flatClone(options);
    addRxPlugin(RxDBLeaderElectionPlugin);
    const collection = options.collection;
    const primaryPath = collection.schema.primaryPath;

    // set defaults
    options.waitForLeadership = typeof options.waitForLeadership === 'undefined' ? true : options.waitForLeadership;
    options.live = typeof options.live === 'undefined' ? true : options.live;
    const modifiedField = options.modifiedField ? options.modifiedField : DEFAULT_MODIFIED_FIELD;
    const deletedField = options.deletedField ? options.deletedField : DEFAULT_DELETED_FIELD;

    const pullStream$: Subject<RxReplicationPullStreamItem<RxDocType, SupabaseCheckpoint>> = new Subject();
    let replicationPrimitivesPull: ReplicationPullOptions<RxDocType, SupabaseCheckpoint> | undefined;


    function rowToDoc(row: any): WithDeleted<RxDocType> {
        const deleted = !!row[deletedField];
        const modified = row[modifiedField];

        const doc: WithDeleted<RxDocType> = flatClone(row);
        delete (doc as any)[deletedField];
        delete (doc as any)[modifiedField];

        doc._deleted = deleted;

        /**
         * Only keep the modified value if that field is defined
         * in the schema.
         */
        if ((collection.schema.jsonSchema.properties as any)[modifiedField]) {
            (doc as any)[modifiedField] = modified;
        }

        return doc;
    }
    async function fetchById(id: string): Promise<WithDeleted<RxDocType>> {
        const { data, error } = await options.client
            .from(options.tableName)
            .select()
            .eq(primaryPath, id)
            .limit(1)
        if (error) throw error
        if (data.length != 1) throw new Error('doc not found ' + id)
        return rowToDoc(data[0])
    }


    if (options.pull) {
        replicationPrimitivesPull = {
            async handler(
                lastPulledCheckpoint: SupabaseCheckpoint | undefined,
                batchSize: number
            ) {
                let query = options.client
                    .from(options.tableName)
                    .select('*');
                if (lastPulledCheckpoint) {
                    const { modified, id } = lastPulledCheckpoint;

                    // WHERE modified > :m OR (modified = :m AND id > :id)
                    // PostgREST or() takes comma-separated disjuncts; use nested and() for the tie-breaker.
                    // Wrap identifiers with double quotes to be safe if they're mixed-case.
                    query = query.or(
                        `"${modifiedField}".gt.${modified},and("${modifiedField}".eq.${modified},"${primaryPath}".gt.${id})`
                    );
                }

                // deterministic order & batch size
                query = query
                    .order(modifiedField as any, { ascending: true })
                    .order(primaryPath as any, { ascending: true })
                    .limit(batchSize);

                const { data, error } = await query;
                if (error) {
                    throw error;
                }

                const lastDoc = lastOfArray(data);
                const newCheckpoint: SupabaseCheckpoint | null = lastDoc ? {
                    id: lastDoc[primaryPath],
                    modified: lastDoc[modifiedField]
                } : null;

                const docs = data.map(row => rowToDoc(row))
                return {
                    documents: docs,
                    checkpoint: newCheckpoint
                };
            },
            batchSize: ensureNotFalsy(options.pull).batchSize,
            modifier: ensureNotFalsy(options.pull).modifier,
            stream$: pullStream$.asObservable(),
            initialCheckpoint: options.pull.initialCheckpoint
        };
    }

    const replicationPrimitivesPush: ReplicationPushOptions<RxDocType> | undefined = options.push ? {
        async handler(
            rows: RxReplicationWriteToMasterRow<RxDocType>[]
        ) {
            async function insertOrReturnConflict(doc: WithDeleted<RxDocType>): Promise<WithDeleted<RxDocType> | undefined> {
                const id = (doc as any)[primaryPath];
                const { error } = await options.client.from(options.tableName).insert(doc)
                if (!error) {
                    return;
                } else if (error.code == POSTGRES_INSERT_CONFLICT_CODE) {
                    // conflict!
                    const conflict = await fetchById(id);
                    return conflict;
                } else {
                    throw error
                }
            }
            async function updateOrReturnConflict(
                doc: WithDeleted<RxDocType>,
                assumedMasterState: WithDeleted<RxDocType>
            ): Promise<WithDeleted<RxDocType> | undefined> {
                ensureNotFalsy(assumedMasterState);
                const id = (doc as any)[primaryPath];
                const toRow: Record<string, any> = flatClone(doc);
                if (doc._deleted) {
                    toRow[deletedField] = !!doc._deleted;
                    if (deletedField !== '_deleted') {
                        delete toRow._deleted;
                    }
                }

                // modified field will be set server-side
                delete toRow[modifiedField];

                let query = options.client
                    .from(options.tableName)
                    .update(toRow);

                query = addDocEqualityToQuery(
                    collection.schema.jsonSchema,
                    deletedField,
                    modifiedField,
                    assumedMasterState,
                    query
                );

                const { data, error } = await query.select();
                if (error) {
                    throw error;
                }

                if (data && data.length > 0) {
                    return;
                } else {
                    // no match -> conflict
                    return await fetchById(id);
                }
            }

            const conflicts: WithDeleted<RxDocType>[] = [];
            await Promise.all(
                rows.map(async (row) => {
                    const newDoc = row.newDocumentState as WithDeleted<RxDocType>;
                    if (!row.assumedMasterState) {
                        const c = await insertOrReturnConflict(newDoc);
                        if (c) conflicts.push(c);
                    } else {
                        const c = await updateOrReturnConflict(newDoc, row.assumedMasterState as any);
                        if (c) conflicts.push(c);
                    }
                })
            );

            return conflicts;
        }
    } : undefined;


    const replicationState = new RxSupabaseReplicationState<RxDocType>(
        options.replicationIdentifier,
        collection,
        replicationPrimitivesPull,
        replicationPrimitivesPush,
        options.live,
        options.retryTime,
        options.autoStart
    );

    /**
     * Subscribe to changes for the pull.stream$
     */
    if (options.live && options.pull) {
        const startBefore = replicationState.start.bind(replicationState);
        const cancelBefore = replicationState.cancel.bind(replicationState);
        replicationState.start = () => {
            const sub = options.client
                .channel('realtime:' + options.tableName)
                .on(
                    'postgres_changes',
                    { event: '*', schema: 'public', table: options.tableName },
                    (payload) => {
                        console.log('GOT EVENT:');
                        console.dir(payload);
                        /**
                         * We assume soft-deletes in supabase
                         * and therefore cleanup-hard-deletes
                         * are not relevant for the sync.
                         */
                        if (payload.eventType === 'DELETE') {
                            return;
                        }

                        const row = payload.new;
                        const doc = rowToDoc(row);
                        pullStream$.next({
                            checkpoint: {
                                id: (doc as any)[primaryPath],
                                modified: (row as any)[modifiedField]
                            },
                            documents: [doc as any],
                        });
                    }
                )
                .subscribe((status: string) => {
                    /**
                     * Trigger resync flag on reconnects
                     */
                    if (status === 'SUBSCRIBED') {
                        pullStream$.next('RESYNC');
                    }
                });
            replicationState.cancel = () => {
                sub.unsubscribe();
                return cancelBefore();
            };
            return startBefore();
        };
    }


    startReplicationOnLeaderShip(options.waitForLeadership, replicationState);
    return replicationState;
}


