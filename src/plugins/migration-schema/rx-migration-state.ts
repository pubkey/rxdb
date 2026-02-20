import {
    Observable,
    Subject,
    filter,
    firstValueFrom,
    map,
    shareReplay
} from 'rxjs';
import {
    isBulkWriteConflictError,
    newRxError
} from '../../rx-error.ts';
import type {
    InternalStoreCollectionDocType,
    NumberFunctionMap,
    RxCollection,
    RxDatabase,
    RxError,
    RxReplicationWriteToMasterRow,
    RxStorageInstance,
    RxStorageInstanceReplicationState,
    RxTypeError
} from '../../types/index.d.ts';
import {
    MIGRATION_DEFAULT_BATCH_SIZE,
    addMigrationStateToDatabase,
    getOldCollectionMeta,
    migrateDocumentData,
    mustMigrate
} from './migration-helpers.ts';
import {
    PROMISE_RESOLVE_TRUE,
    RXJS_SHARE_REPLAY_DEFAULTS,
    clone,
    deepEqual,
    ensureNotFalsy,
    errorToPlainJson,
    getDefaultRevision,
    getDefaultRxDocumentMeta,
    promiseWait
} from '../utils/index.ts';
import type {
    MigrationStatusUpdate,
    RxMigrationStatus,
    RxMigrationStatusDocument
} from './migration-types.ts';
import {
    getSingleDocument,
    hasEncryption,
    observeSingle,
    writeSingle
} from '../../rx-storage-helper.ts';
import {
    BroadcastChannel,
    createLeaderElection
} from 'broadcast-channel';
import {
    META_INSTANCE_SCHEMA_TITLE,
    awaitRxStorageReplicationFirstInSync,
    awaitRxStorageReplicationInSync,
    cancelRxStorageReplication,
    defaultConflictHandler,
    getRxReplicationMetaInstanceSchema,
    replicateRxStorageInstance,
    rxStorageInstanceToReplicationHandler
} from '../../replication-protocol/index.ts';
import { overwritable } from '../../overwritable.ts';
import {
    INTERNAL_CONTEXT_MIGRATION_STATUS,
    addConnectedStorageToCollection,
    getPrimaryKeyOfInternalDocument
} from '../../rx-database-internal-store.ts';
import { normalizeMangoQuery, prepareQuery } from '../../rx-query-helper.ts';



export class RxMigrationState {

    public database: RxDatabase;


    private started: boolean = false;
    public readonly oldCollectionMeta: ReturnType<typeof getOldCollectionMeta>;
    public readonly mustMigrate: ReturnType<typeof mustMigrate>;
    public readonly statusDocId: string;
    public readonly $: Observable<RxMigrationStatus>;
    public replicationState?: RxStorageInstanceReplicationState<any>;
    public canceled: boolean = false;
    public broadcastChannel?: BroadcastChannel;
    constructor(
        public readonly collection: RxCollection,
        public readonly migrationStrategies: NumberFunctionMap,
        public readonly statusDocKey = [
            collection.name,
            'v',
            collection.schema.version
        ].join('-'),
    ) {
        this.database = collection.database;
        this.oldCollectionMeta = getOldCollectionMeta(this);
        this.mustMigrate = mustMigrate(this);
        this.statusDocId = getPrimaryKeyOfInternalDocument(
            this.statusDocKey,
            INTERNAL_CONTEXT_MIGRATION_STATUS
        );
        addMigrationStateToDatabase(this);

        this.$ = observeSingle<RxMigrationStatusDocument>(
            this.database.internalStore,
            this.statusDocId
        ).pipe(
            filter(d => !!d),
            map(d => ensureNotFalsy(d).data),
            shareReplay(RXJS_SHARE_REPLAY_DEFAULTS)
        );
    }

    getStatus() {
        return firstValueFrom(this.$);
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
            this.broadcastChannel = new BroadcastChannel([
                'rx-migration-state',
                this.database.name,
                this.collection.name,
                this.collection.schema.version
            ].join('|'));
            const leaderElector = createLeaderElection(this.broadcastChannel);
            await leaderElector.awaitLeadership();
        }

        /**
         * Instead of writing a custom migration protocol,
         * we do a push-only replication from the old collection data to the new one.
         * This also ensure that restarting the replication works without problems.
         */
        const oldCollectionMeta = await this.oldCollectionMeta;
        const oldStorageInstance = await this.database.storage.createStorageInstance({
            databaseName: this.database.name,
            collectionName: this.collection.name,
            databaseInstanceToken: this.database.token,
            multiInstance: this.database.multiInstance,
            options: {},
            schema: ensureNotFalsy(oldCollectionMeta).data.schema,
            password: this.database.password,
            devMode: overwritable.isDevMode()
        });


        const connectedInstances = await this.getConnectedStorageInstances();


        /**
         * Initially write the migration status into a meta document.
         */
        const totalCount = await this.countAllDocuments(
            [oldStorageInstance].concat(connectedInstances.map(r => r.oldStorage))
        );
        await this.updateStatus(s => {
            s.count.total = totalCount;
            return s;
        });


        try {
            /**
             * First migrate the connected storages,
             * afterwards migrate the normal collection.
            */
            await Promise.all(
                connectedInstances.map(async (connectedInstance) => {
                    await addConnectedStorageToCollection(
                        this.collection,
                        connectedInstance.newStorage.collectionName,
                        connectedInstance.newStorage.schema
                    );
                    await this.migrateStorage(
                        connectedInstance.oldStorage,
                        connectedInstance.newStorage,
                        batchSize
                    );
                    await connectedInstance.newStorage.close();
                })
            );

            await this.migrateStorage(
                oldStorageInstance,
                /**
                 * Use the originalStorageInstance here
                 * so that the _meta.lwt time keeps the same
                 * and our replication checkpoints still point to the
                 * correct checkpoint.
                */
                this.collection.storageInstance.originalStorageInstance,
                batchSize
            );
        } catch (err) {
            await oldStorageInstance.close();
            await this.updateStatus(s => {
                s.status = 'ERROR';
                s.error = errorToPlainJson(err as Error);
                return s;
            });
            return;
        }

        /**
         * Remove old collection meta doc with retry on conflict.
         * The _rev of the meta doc may have changed since we fetched it
         * at the start of migration (due to updateStatus() calls),
         * so we re-fetch before each deletion attempt.
         * @link https://github.com/pubkey/rxdb/issues/7791
         */
        while (true) {
            const currentMeta = await getOldCollectionMeta(this);
            if (!currentMeta) {
                break;
            }
            try {
                await writeSingle(
                    this.database.internalStore,
                    {
                        previous: currentMeta,
                        document: Object.assign(
                            {},
                            currentMeta,
                            {
                                _deleted: true
                            }
                        )
                    },
                    'rx-migration-remove-collection-meta'
                );
                break;
            } catch (error) {
                const isConflict = isBulkWriteConflictError<InternalStoreCollectionDocType>(error);
                if (isConflict && !!isConflict.documentInDb._deleted) {
                    break;
                } else if (isConflict) {
                    continue;
                } else {
                    throw error;
                }
            }
        }

        await this.updateStatus(s => {
            s.status = 'DONE';
            return s;
        });
        if (this.broadcastChannel) {
            await this.broadcastChannel.close();
        }
    }

    public updateStatusHandlers: MigrationStatusUpdate[] = [];
    public updateStatusQueue: Promise<any> = PROMISE_RESOLVE_TRUE;
    public updateStatus(
        handler: MigrationStatusUpdate
    ) {
        this.updateStatusHandlers.push(handler);
        this.updateStatusQueue = this.updateStatusQueue.then(async () => {
            if (this.updateStatusHandlers.length === 0) {
                return;
            }
            // re-run until no conflict
            const useHandlers = this.updateStatusHandlers;
            this.updateStatusHandlers = [];
            while (true) {
                const previous = await getSingleDocument<RxMigrationStatusDocument>(
                    this.database.internalStore,
                    this.statusDocId
                );
                let newDoc = clone(previous);
                if (!previous) {
                    newDoc = {
                        id: this.statusDocId,
                        key: this.statusDocKey,
                        context: INTERNAL_CONTEXT_MIGRATION_STATUS,
                        data: {
                            collectionName: this.collection.name,
                            status: 'RUNNING',
                            count: {
                                total: 0,
                                handled: 0,
                                percent: 0
                            }
                        },
                        _deleted: false,
                        _meta: getDefaultRxDocumentMeta(),
                        _rev: getDefaultRevision(),
                        _attachments: {}
                    };
                }

                let status = ensureNotFalsy(newDoc).data;
                for (const oneHandler of useHandlers) {
                    status = oneHandler(status);
                }
                status.count.percent = Math.round((status.count.handled / status.count.total) * 100);

                if (
                    newDoc && previous &&
                    deepEqual(newDoc.data, previous.data)
                ) {
                    break;
                }


                try {
                    await writeSingle<RxMigrationStatusDocument>(
                        this.database.internalStore,
                        {
                            previous,
                            document: ensureNotFalsy(newDoc)
                        },
                        INTERNAL_CONTEXT_MIGRATION_STATUS
                    );

                    // write successful
                    break;
                } catch (err) {
                    // ignore conflicts
                    if (!isBulkWriteConflictError(err)) {
                        throw err;
                    }
                }
            }
        });
        return this.updateStatusQueue;
    }


    public async migrateStorage(
        oldStorage: RxStorageInstance<any, any, any>,
        newStorage: RxStorageInstance<any, any, any>,
        batchSize: number
    ) {

        this.collection.onClose.push(() => this.cancel());
        this.database.onClose.push(() => this.cancel());
        const replicationMetaStorageInstance = await this.database.storage.createStorageInstance({
            databaseName: this.database.name,
            collectionName: 'rx-migration-state-meta-' + oldStorage.collectionName + '-' + oldStorage.schema.version,
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
            this.database.token,
            true
        );

        const replicationState = replicateRxStorageInstance({
            keepMeta: true,
            skipStoringPullMeta: false,
            identifier: [
                'rx-migration-state',
                oldStorage.collectionName,
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
                    let migratedRows = await Promise.all(
                        rows
                            .map(async (row) => {
                                let newDocData = row.newDocumentState;
                                if (newStorage.schema.title === META_INSTANCE_SCHEMA_TITLE) {
                                    newDocData = row.newDocumentState.docData;
                                    if (row.newDocumentState.isCheckpoint === '1') {
                                        return {
                                            assumedMasterState: undefined,
                                            newDocumentState: row.newDocumentState
                                        };
                                    }
                                }
                                const migratedDocData: RxReplicationWriteToMasterRow<any> = await migrateDocumentData(
                                    this.collection,
                                    oldStorage.schema.version,
                                    newDocData
                                );

                                /**
                                 * The migration strategy can return null
                                 * which means the document must be deleted during migration.
                                 */
                                if (migratedDocData === null) {
                                    return null;
                                }

                                const newRow: RxReplicationWriteToMasterRow<any> = {
                                    // drop the assumed master state, we do not have to care about conflicts here.
                                    assumedMasterState: undefined,
                                    newDocumentState: newStorage.schema.title === META_INSTANCE_SCHEMA_TITLE
                                        ? Object.assign({}, row.newDocumentState, { docData: migratedDocData })
                                        : migratedDocData
                                };

                                return newRow;
                            })
                    );

                    // filter out the documents where the migration strategy returned null
                    migratedRows = migratedRows.filter(row => !!row && !!row.newDocumentState);

                    const result = await replicationHandlerBase.masterWrite(migratedRows as any);
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


        let hasError: RxError | RxTypeError | false = false;
        replicationState.events.error.subscribe(err => hasError = err);

        // update replication status on each change
        replicationState.events.processed.up.subscribe(() => {
            this.updateStatus(status => {
                status.count.handled = status.count.handled + 1;
                return status;
            });
        });

        await awaitRxStorageReplicationFirstInSync(replicationState);
        await awaitRxStorageReplicationInSync(replicationState);

        await this.updateStatusQueue;
        if (hasError) {
            await replicationMetaStorageInstance.close();
            throw hasError;
        }

        // cleanup old storages
        await Promise.all([
            oldStorage.remove(),
            replicationMetaStorageInstance.remove()
        ]);

        await this.cancel();
    }

    /**
     * Stops the migration.
     * Mostly used in tests to simulate what happens
     * when the user reloads the page during a migration.
     */
    public async cancel() {
        this.canceled = true;
        if (this.replicationState) {
            await cancelRxStorageReplication(this.replicationState);
        }
        if (this.broadcastChannel) {
            await this.broadcastChannel.close();
        }
    }

    public async countAllDocuments(
        storageInstances: RxStorageInstance<any, any, any>[]
    ): Promise<number> {
        let ret = 0;
        await Promise.all(
            storageInstances.map(async (instance) => {

                const preparedQuery = prepareQuery(
                    instance.schema,
                    normalizeMangoQuery(
                        instance.schema,
                        {
                            selector: {}
                        }
                    )
                );
                const countResult = await instance.count(preparedQuery);
                ret += countResult.count;
            })
        );
        return ret;
    }

    public async getConnectedStorageInstances() {
        const oldCollectionMeta = ensureNotFalsy(await this.oldCollectionMeta);
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
                            clone(this.collection.schema.jsonSchema),
                            hasEncryption(connectedStorage.schema)
                        );
                        newSchema.version = this.collection.schema.version;
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



    async migratePromise(batchSize?: number): Promise<RxMigrationStatus> {
        this.startMigration(batchSize).catch(() => {});
        const must = await this.mustMigrate;
        if (!must) {
            return {
                status: 'DONE',
                collectionName: this.collection.name,
                count: {
                    handled: 0,
                    percent: 0,
                    total: 0
                }
            };
        }

        const result = await Promise.race([
            firstValueFrom(
                this.$.pipe(
                    filter(d => d.status === 'DONE')
                )
            ),
            firstValueFrom(
                this.$.pipe(
                    filter(d => d.status === 'ERROR')
                )
            )
        ]);

        if (result.status === 'ERROR') {
            throw newRxError('DM4', {
                collection: this.collection.name,
                error: result.error
            });
        } else {
            return result;
        }

    }
}
