import { Observable } from 'rxjs';
import type { NumberFunctionMap, RxCollection, RxDatabase, RxStorageInstance, RxStorageInstanceReplicationState } from '../../types/index.d.ts';
import { getOldCollectionMeta, mustMigrate } from './migration-helpers.ts';
import type { MigrationStatusUpdate, RxMigrationStatus } from './migration-types.ts';
import { BroadcastChannel } from 'broadcast-channel';
export declare class RxMigrationState {
    readonly collection: RxCollection;
    readonly migrationStrategies: NumberFunctionMap;
    readonly statusDocKey: string;
    database: RxDatabase;
    private started;
    readonly oldCollectionMeta: ReturnType<typeof getOldCollectionMeta>;
    readonly mustMigrate: ReturnType<typeof mustMigrate>;
    readonly statusDocId: string;
    readonly $: Observable<RxMigrationStatus>;
    replicationState?: RxStorageInstanceReplicationState<any>;
    canceled: boolean;
    broadcastChannel?: BroadcastChannel;
    constructor(collection: RxCollection, migrationStrategies: NumberFunctionMap, statusDocKey?: string);
    getStatus(): Promise<RxMigrationStatus>;
    /**
     * Starts the migration.
     * Returns void so that people to not get the idea to await
     * this function.
     * Instead use migratePromise() if you want to await
     * the migration. This ensures it works even if the migration
     * is run on a different browser tab.
     */
    startMigration(batchSize?: number): Promise<void>;
    updateStatusHandlers: MigrationStatusUpdate[];
    updateStatusQueue: Promise<any>;
    updateStatus(handler: MigrationStatusUpdate): Promise<any>;
    migrateStorage(oldStorage: RxStorageInstance<any, any, any>, newStorage: RxStorageInstance<any, any, any>, batchSize: number): Promise<void>;
    /**
     * Stops the migration.
     * Mostly used in tests to simulate what happens
     * when the user reloads the page during a migration.
     */
    cancel(): Promise<void>;
    countAllDocuments(storageInstances: RxStorageInstance<any, any, any>[]): Promise<number>;
    getConnectedStorageInstances(): Promise<{
        oldStorage: RxStorageInstance<any, any, any>;
        newStorage: RxStorageInstance<any, any, any>;
    }[]>;
    migratePromise(batchSize?: number): Promise<RxMigrationStatus>;
}
