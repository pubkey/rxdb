import {
    Subject,
    filter,
    firstValueFrom,
    map
} from 'rxjs';
import {
    isBulkWriteConflictError,
    newRxError
} from '../../rx-error';
import type {
    NumberFunctionMap,
    RxCollection,
    RxDatabase,
    RxReplicationWriteToMasterRow,
    RxStorageInstance
} from '../../types';
import {
    MIGRATION_DEFAULT_BATCH_SIZE,
    MIGRATION_STATUS_INTERNAL_DOCUMENT_CONTEXT,
    getOldCollectionMeta,
    migrateDocumentData,
    mustMigrate
} from './migration-helpers';
import {
    clone,
    ensureNotFalsy,
    getDefaultRevision,
    getDefaultRxDocumentMeta
} from '../utils';
import type {
    MigrationStatusUpdate,
    RxMigrationStatus,
    RxMigrationStatusDocument
} from './migration-types';
import {
    getSingleDocument,
    hasEncryption,
    observeSingle,
    writeSingle
} from '../../rx-storage-helper';
import {
    BroadcastChannel,
    createLeaderElection
} from 'broadcast-channel';
import {
    META_INSTANCE_SCHEMA_TITLE,
    awaitRxStorageReplicationFirstInSync,
    cancelRxStorageReplication,
    defaultConflictHandler,
    getRxReplicationMetaInstanceSchema,
    replicateRxStorageInstance,
    rxStorageInstanceToReplicationHandler
} from '../../replication-protocol';
import { overwritable } from '../../overwritable';
import {
    addConnectedStorageToCollection,
    getPrimaryKeyOfInternalDocument
} from '../../rx-database-internal-store';



export class RxMigrationState {

    public database: RxDatabase;


    private started: boolean = false;
    public readonly oldCollectionMeta = getOldCollectionMeta(this);
    public readonly mustMigrate = mustMigrate(this);
    public readonly statusDocId: string;

    constructor(
        public readonly collection: RxCollection,
        public readonly migrationStrategies: NumberFunctionMap,
        public readonly statusDocKey = [
            collection.name,
            'v',
            collection.schema.version
        ].join('-'),
    ) {
        this.statusDocId = getPrimaryKeyOfInternalDocument(
            this.statusDocKey,
            MIGRATION_STATUS_INTERNAL_DOCUMENT_CONTEXT
        );
        this.database = collection.database;
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

    /**
     * Starts the migration.
     * Returns void so that people to not get the idea to await
     * this function.
     * Instead use migratePromise() if you want to await
     * the migration. This ensures it works even if the migration
     * is run on a different browser tab.
     */
    async startMigration(batchSize: number = MIGRATION_DEFAULT_BATCH_SIZE): Promise<void> {
        const must = await this.mustMigrate;
        if (!must) {
            return;
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
                this.collection.name,
                this.collection.schema.version
            ].join('|'));
            const leaderElector = createLeaderElection(broadcastChannel);
            await leaderElector.awaitLeadership();
        }

        /**
         * Instead of writing a custom migration protocol,
         * we do a push-only replication from the old collection data to the new one.
         * This also ensure that restarting the replication works without problems.
         */
        const oldCollectionMeta = await this.oldCollectionMeta;
        console.dir(oldCollectionMeta);
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


        const connectedInstances = await this.getConnectedStorageInstances();


        /**
         * Initially write the migration status into a meta document.
         */
        const totalCount = await this.countAllDoucments(
            [oldStorageInstance].concat(connectedInstances.map(r => r.oldStorage))
        );
        await this.updateStatus(totalCount);




        /**
         * First migrate the connected storages,
         * afterwards migrate the normal collection.
         */
        await Promise.all(
            connectedInstances.map(async (connectedInstance) => {
                await this.migrateStorage(
                    connectedInstance.oldStorage,
                    connectedInstance.newStorage,
                    batchSize
                );
                await addConnectedStorageToCollection(
                    this.collection,
                    connectedInstance.newStorage.collectionName,
                    connectedInstance.newStorage.schema
                );
            })
        );

        await this.migrateStorage(
            oldStorageInstance,
            this.collection.storageInstance,
            batchSize
        );

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

    public async updateStatus(
        handlerOrTotalCount: number | MigrationStatusUpdate
    ) {

        const previous = await getSingleDocument<RxMigrationStatusDocument>(
            this.database.internalStore,
            this.statusDocId
        );
        let newDoc = clone(previous);

        if (!previous) {
            if (typeof handlerOrTotalCount !== 'number') {
                throw newRxError('SNH', {});
            }
            const newStatus: RxMigrationStatus = {
                status: 'RUNNING',
                count: {
                    total: handlerOrTotalCount,
                    handled: 0,
                    percent: 0,
                    purged: 0,
                    success: 0
                }
            };
            newDoc = {
                id: this.statusDocId,
                key: this.statusDocKey,
                context: MIGRATION_STATUS_INTERNAL_DOCUMENT_CONTEXT,
                data: {
                    collectionName: this.collection.name,
                    type: 'migration-status',
                    status: newStatus
                },
                _deleted: false,
                _meta: getDefaultRxDocumentMeta(),
                _rev: getDefaultRevision(),
                _attachments: {}
            }
        } else {
            if (typeof handlerOrTotalCount !== 'function') {
                throw newRxError('SNH', {});
            }
            const newStatus = handlerOrTotalCount(previous.data.status);
            ensureNotFalsy(newDoc).data.status = newStatus;
        }

        try {
            await writeSingle<RxMigrationStatusDocument>(
                this.database.internalStore,
                {
                    previous,
                    document: ensureNotFalsy(newDoc)
                },
                'rx-migration-status'
            );
        } catch (err) {
            // ignore conflicts
            if (!isBulkWriteConflictError(err)) {
                throw err;
            }
        }
    }


    public async migrateStorage(
        oldStorage: RxStorageInstance<any, any, any>,
        newStorage: RxStorageInstance<any, any, any>,
        batchSize: number
    ) {
        const replicationMetaStorageInstance = await this.database.storage.createStorageInstance({
            databaseName: this.database.name,
            collectionName: 'rx-migration-state-meta-' + this.collection.name + '-' + this.collection.schema.version,
            databaseInstanceToken: this.database.token,
            multiInstance: this.database.multiInstance,
            options: {},
            schema: getRxReplicationMetaInstanceSchema(oldStorage.schema, hasEncryption(oldStorage.schema)),
            password: this.database.password,
            devMode: overwritable.isDevMode()
        });


        const replicationHandlerBase = rxStorageInstanceToReplicationHandler(
            newStorage,
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
                oldStorage.schema.version,
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
                        rows
                            .map(async (row) => {
                                let newDocData = row.newDocumentState;
                                if (newStorage.schema.title === META_INSTANCE_SCHEMA_TITLE) {
                                    newDocData = row.newDocumentState.data;
                                }
                                const migratedDocData: RxReplicationWriteToMasterRow<any> = await migrateDocumentData(
                                    this.collection,
                                    oldStorage.schema.version,
                                    newDocData
                                );
                                const newRow: RxReplicationWriteToMasterRow<any> = {
                                    // drop the assumed master state, we do not have to care about conflicts here.
                                    assumedMasterState: undefined,
                                    newDocumentState: newStorage.schema.title === META_INSTANCE_SCHEMA_TITLE
                                        ? Object.assign({}, row.newDocumentState, { data: migratedDocData })
                                        : migratedDocData
                                };
                                return newRow;
                            })
                    );

                    // filter out the documents where the migration strategy returned null
                    rows = rows.filter(row => !!row.newDocumentState);

                    const result = await replicationHandlerBase.masterWrite(rows);
                    return result;
                },
                masterChangeStream$: new Subject<any>().asObservable()
            },
            forkInstance: oldStorage,
            metaInstance: replicationMetaStorageInstance,
            pushBatchSize: batchSize,
            pullBatchSize: 0,
            conflictHandler: defaultConflictHandler,
            hashFunction: this.database.hashFunction
        });

        // update replication status on each change
        replicationState.events.processed.up.subscribe(row => {
            row.assumedMasterState
        });

        await awaitRxStorageReplicationFirstInSync(replicationState);
        await cancelRxStorageReplication(replicationState);

        // cleanup old storages
        await Promise.all([
            oldStorage.remove(),
            replicationMetaStorageInstance.remove()
        ]);
    }

    public async countAllDoucments(
        storageInstances: RxStorageInstance<any, any, any>[]
    ): Promise<number> {
        let ret = 0;
        await Promise.all(
            storageInstances.map(async (instance) => {
                const info = await instance.info();
                ret += info.totalCount;
            })
        );
        return ret;
    }

    public async getConnectedStorageInstances() {
        const oldCollectionMeta = await this.oldCollectionMeta;
        const ret: {
            oldStorage: RxStorageInstance<any, any, any>;
            newStorage: RxStorageInstance<any, any, any>;
        }[] = [];

        await Promise.all(
            await Promise.all(
                oldCollectionMeta
                    .data
                    .connectedStorages
                    .map(async (connectedStorage) => {

                        // atm we can only migrate replication states.
                        if (connectedStorage.schema.title !== META_INSTANCE_SCHEMA_TITLE) {
                            throw new Error('unknown migration handling for schema');
                        }

                        const newSchema = getRxReplicationMetaInstanceSchema(
                            clone(connectedStorage.schema),
                            hasEncryption(connectedStorage.schema)
                        );
                        newSchema.version = newSchema.version + 1;
                        const [oldStorage, newStorage] = await Promise.all([
                            this.database.storage.createStorageInstance({
                                databaseInstanceToken: this.database.token,
                                databaseName: this.database.name,
                                devMode: overwritable.isDevMode(),
                                multiInstance: this.database.multiInstance,
                                options: {},
                                schema: connectedStorage.schema,
                                password: this.database.password,
                                collectionName: connectedStorage.collectionName
                            }),
                            this.database.storage.createStorageInstance({
                                databaseInstanceToken: this.database.token,
                                databaseName: this.database.name,
                                devMode: overwritable.isDevMode(),
                                multiInstance: this.database.multiInstance,
                                options: {},
                                schema: newSchema,
                                password: this.database.password,
                                collectionName: connectedStorage.collectionName
                            })
                        ]);
                        ret.push({ oldStorage, newStorage });
                    })
            )
        );

        return ret;
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
