import {
    Subject,
    filter,
    firstValueFrom,
    map
} from 'rxjs';
import { newRxError } from '../../rx-error';
import type {
    NumberFunctionMap,
    RxCollection,
    RxDatabase,
    RxReplicationWriteToMasterRow
} from '../../types';
import {
    MIGRATION_DEFAULT_BATCH_SIZE,
    MIGRATION_STATUS_DOC_PREFIX,
    addMigrationStateToDatabase,
    getOldCollectionMeta,
    migrateDocumentData,
    mustMigrate
} from './migration-helpers';
import { clone, ensureNotFalsy } from '../utils';
import type {
    RxMigrationStatus,
    RxMigrationStatusDocument
} from './migration-types';
import { observeSingle, writeSingle } from '../../rx-storage-helper';
import {
    BroadcastChannel,
    createLeaderElection
} from 'broadcast-channel';
import {
    awaitRxStorageReplicationFirstInSync,
    cancelRxStorageReplication,
    defaultConflictHandler,
    replicateRxStorageInstance,
    rxStorageInstanceToReplicationHandler
} from '../../replication-protocol';
import { overwritable } from '../../overwritable';



export class RxMigrationState {

    public database: RxDatabase;


    private started: boolean = false;
    public readonly mustMigrate: Promise<boolean>;


    public status: RxMigrationStatus = {
        status: 'NOT-STARTED',
        count: {
            handled: 0,
            percent: 0,
            purged: 0,
            success: 0,
            total: -1
        }
    };
    constructor(
        public readonly collection: RxCollection,
        public readonly migrationStrategies: NumberFunctionMap,
        public readonly statusDocId = [
            MIGRATION_STATUS_DOC_PREFIX,
            collection.name,
            'v',
            collection.schema.version
        ].join('-'),
    ) {
        this.database = collection.database;
        this.mustMigrate = mustMigrate(this);
    }

    get $() {
        return observeSingle<RxMigrationStatusDocument>(
            this.database.internalStore,
            this.statusDocId
        ).pipe(
            filter(d => !!d),
            map(d => ensureNotFalsy(d).data.status)
        );
    }

    async startMigration(batchSize: number = MIGRATION_DEFAULT_BATCH_SIZE): Promise<RxMigrationState> {
        const must = await this.mustMigrate;
        if (!must) {
            return this;
        }
        if (this.started) {
            throw newRxError('DM1');
        }
        this.started = true;


        /**
         * To ensure that multiple tabs do not migrate the same collection,
         * we use a new broadcastChannel/leaderElector for each collection.
         * This is required because collections can be added dynamically and
         * not all tabs might know about this collection.
         */
        if (this.database.multiInstance) {
            const broadcastChannel = new BroadcastChannel([
                'rx-migration-state',
                this.database.name,
                this.collection.name
            ].join('|'));
            const leaderElector = createLeaderElection(broadcastChannel);
            await leaderElector.awaitLeadership();
        }

        /**
         * Instead of writing a custom migration protocol,
         * we do a push-only replication from the old collection data to the new one.
         * This also ensure that restarting the replication works without problems.
         */
        const oldCollectionMetas = await getOldCollectionMeta(this);
        console.dir(oldCollectionMetas);

        for (const oldCollectionMeta of oldCollectionMetas) {
            const oldStorageInstance = await this.database.storage.createStorageInstance({
                databaseName: this.database.name,
                collectionName: this.collection.name,
                databaseInstanceToken: this.database.token,
                multiInstance: this.database.multiInstance,
                options: {},
                schema: oldCollectionMeta.data.schema,
                password: this.database.password,
                devMode: overwritable.isDevMode()
            });
            const replicationMetaStorageInstance = await this.database.storage.createStorageInstance({
                databaseName: this.database.name,
                collectionName: 'rx-migration-state-meta-' + this.collection.name + '-' + this.collection.schema.version,
                databaseInstanceToken: this.database.token,
                multiInstance: this.database.multiInstance,
                options: {},
                schema: oldCollectionMeta.data.schema,
                password: this.database.password,
                devMode: overwritable.isDevMode()
            });


            const replicationHandlerBase = rxStorageInstanceToReplicationHandler(
                this.collection.storageInstance,
                /**
                 * Ignore push-conflicts.
                 * If this happens we drop the 'old' document state.
                 */
                defaultConflictHandler,
                this.database.token
            );

            const replicationState = replicateRxStorageInstance({
                identifier: [
                    'rx-migration-state',
                    this.collection.name,
                    oldCollectionMeta.data.version,
                    this.collection.schema.version
                ].join('-'),
                replicationHandler: {
                    masterChangesSince() {
                        return Promise.resolve({
                            checkpoint: null,
                            documents: []
                        });
                    },
                    masterWrite: async (rows) => {
                        rows = await Promise.all(
                            rows.map(async (row) => {
                                const migratedDocData: RxReplicationWriteToMasterRow<any> = await migrateDocumentData(
                                    this.collection,
                                    oldCollectionMeta.data.version,
                                    row.newDocumentState
                                );
                                const newRow: RxReplicationWriteToMasterRow<any> = {
                                    // drop the assumed master state, we do not have to care about conflicts here.
                                    assumedMasterState: undefined,
                                    newDocumentState: migratedDocData
                                };
                                return newRow;
                            })
                        );
                        const result = await replicationHandlerBase.masterWrite(rows);
                        return result;
                    },
                    masterChangeStream$: new Subject<any>().asObservable()
                },
                forkInstance: oldStorageInstance,
                metaInstance: replicationMetaStorageInstance,
                pushBatchSize: batchSize,
                pullBatchSize: 0,
                conflictHandler: defaultConflictHandler,
                hashFunction: this.database.hashFunction
            });

            await awaitRxStorageReplicationFirstInSync(replicationState);
            await cancelRxStorageReplication(replicationState);

            // cleanup old storages
            await Promise.all([
                oldStorageInstance.remove(),
                replicationMetaStorageInstance.remove()
            ]);

            // remove old collection meta doc
            await writeSingle(
                this.database.internalStore,
                {
                    previous: oldCollectionMeta,
                    document: Object.assign(
                        {},
                        oldCollectionMeta,
                        {
                            _deleted: true
                        }
                    )
                },
                'rx-migration-remove-collection-meta'
            );
        }

        return null as any; // TODO
    }

    async migratePromise(batchSize?: number): Promise<any> {
        this.startMigration(batchSize);
        const must = await this.mustMigrate;
        if (!must) {
            return;
        }
        return firstValueFrom(
            this.$.pipe(
                filter(d => d.status === 'DONE')
            )
        );

    }
}
