import type {
    RxMigrationStatus
} from '../plugins/migration-schema/index.ts';
import type { RxJsonSchema } from './rx-schema.d.ts';

export type InternalStoreDocType<Data = any> = {
    id: string;
    key: string;
    context: string;
    data: Data;
};

/**
 * Stores information about the collections.
 * The collection.name is the 'key' value.
 */
export type InternalStoreStorageTokenDocType = InternalStoreDocType<{
    rxdbVersion: string;
    token: string;
    instanceToken: string;
    passwordHash?: string;
}>;

/**
 * Stores information about the collections.
 * The collection.name is the 'key' value.
 */
export type InternalStoreCollectionDocType = InternalStoreDocType<{
    /**
     * Plain name of the collection
     */
    name: string;
    schema: RxJsonSchema<any>;
    schemaHash: string;
    version: number;

    /**
     * Storages that are connected to this collection
     * so that when the collection is removed,
     * these storages must also be removed.
     * For example the replication meta storage
     * must be reset when the collection is removed.
     */
    connectedStorages: {
        collectionName: string;
        schema: RxJsonSchema<any>;
    }[];

    /**
     * Contains the migration status
     * only if a migration has been started.
     */
    migrationStatus?: RxMigrationStatus;
}>;
