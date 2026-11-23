import type {
    RxCollectionCreator,
    RxDatabase,
    RxDatabaseCreator
} from '../../types/index.d.ts';
import { createRxSchema } from '../../rx-schema.ts';
import {
    INTERNAL_CONTEXT_COLLECTION,
    _collectionNamePrimary,
    getPrimaryKeyOfInternalDocument
} from '../../rx-database-internal-store.ts';
import { getSingleDocument } from '../../rx-storage-helper.ts';
import { removeCollectionStorages } from '../../rx-collection-helper.ts';
import { deepEqual } from '../../plugins/utils/index.ts';

/**
 * Contains the databases that were created
 * with the setting resetCollectionOnSchemaChange: true.
 */
const RESET_ON_SCHEMA_CHANGE_DATABASES = new WeakSet<RxDatabase>();

export function rememberResetCollectionOnSchemaChange(args: {
    database: RxDatabase;
    creator: RxDatabaseCreator;
}) {
    if (args.creator.resetCollectionOnSchemaChange) {
        RESET_ON_SCHEMA_CHANGE_DATABASES.add(args.database);
    }
}

/**
 * When the database has the setting resetCollectionOnSchemaChange,
 * a collection whose schema was changed without increasing the version number
 * is not rejected with the error DB6.
 * Instead the whole stored state of that collection is deleted
 * (documents of all schema versions, attachments, replication and migration states)
 * so that the collection is created empty with the new schema.
 */
export async function resetCollectionsWithChangedSchema(args: {
    database: RxDatabase;
    collectionCreators: { [collectionName: string]: RxCollectionCreator<any>; };
}) {
    const database = args.database;
    if (!RESET_ON_SCHEMA_CHANGE_DATABASES.has(database)) {
        return;
    }
    await Promise.all(
        Object.entries(args.collectionCreators).map(async ([collectionName, creator]) => {
            /**
             * A missing schema and a collection that already exists on this instance
             * are reported with the errors DB4 and DB3 later in addCollections().
             */
            if (!creator.schema || (database.collections as any)[collectionName]) {
                return;
            }
            const schema = createRxSchema(creator.schema, database.hashFunction);
            const metaDoc = await getSingleDocument(
                database.internalStore,
                getPrimaryKeyOfInternalDocument(
                    _collectionNamePrimary(collectionName, creator.schema),
                    INTERNAL_CONTEXT_COLLECTION
                )
            );
            if (
                !metaDoc ||
                metaDoc.data.schemaHash === await schema.hash ||
                /**
                 * The hash depends on the device locale,
                 * so the content is compared before data is deleted.
                 */
                deepEqual(metaDoc.data.schema, schema.jsonSchema)
            ) {
                return;
            }
            console.warn(
                'RxDB dev-mode: The schema of the collection "' + collectionName + '" in the database "' + database.name + '"' +
                ' has changed without a new version number. Because the database setting resetCollectionOnSchemaChange is enabled,' +
                ' all stored data of that collection is deleted.'
            );
            await removeCollectionStorages(
                database.storage,
                database.internalStore,
                database.token,
                database.name,
                collectionName,
                database.multiInstance,
                database.password,
                database.hashFunction
            );
        })
    );
}
