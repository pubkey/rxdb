import { BehaviorSubject } from 'rxjs';
import {
    INTERNAL_CONTEXT_COLLECTION,
    getPrimaryKeyOfInternalDocument
} from '../../rx-database-internal-store';
import { getPreviousVersions } from '../../rx-schema';
import type {
    InternalStoreCollectionDocType,
    RxCollection,
    RxDatabase,
    RxDocumentData
} from '../../types';
import {
    PROMISE_RESOLVE_FALSE,
    getFromMapOrCreate
} from '../utils';
import { RxMigrationState } from './rx-migration-state';

export const MIGRATION_STATUS_DOC_PREFIX = 'rx-migration-status';

export function getOldCollectionMeta(
    migrationState: RxMigrationState
): Promise<RxDocumentData<InternalStoreCollectionDocType>[]> {

    const collectionDocKeys = getPreviousVersions(migrationState.collection.schema.jsonSchema)
        .map(version => migrationState.collection.name + '-' + version);

    return migrationState.database.internalStore.findDocumentsById(
        collectionDocKeys.map(key => getPrimaryKeyOfInternalDocument(
            key,
            INTERNAL_CONTEXT_COLLECTION
        )),
        false
    );
}


export function getRxStorageInstancesFromOldCollectionMeta(
    migrationState: RxMigrationState,
    oldCollectionMeta: RxDocumentData<InternalStoreCollectionDocType>
) {

}

/**
 * returns true if a migration is needed
 */
export async function mustMigrate(
    migrationState: RxMigrationState
): Promise<boolean> {
    if (migrationState.collection.schema.version === 0) {
        return PROMISE_RESOLVE_FALSE;
    }
    const oldColDocs = await getOldCollectionMeta(migrationState);
    if (oldColDocs.length === 0) {
        return false;
    } else {
        return true;
    }
}
export const MIGRATION_DEFAULT_BATCH_SIZE = 200;


export type MigrationStateWithCollection = {
    collection: RxCollection;
    migrationState: RxMigrationState;
};

export const DATA_MIGRATION_STATE_SUBJECT_BY_DATABASE = new WeakMap<RxDatabase, BehaviorSubject<RxMigrationState[]>>();
export function addMigrationStateToDatabase(
    migrationState: RxMigrationState
) {
    const allSubject = getMigrationStateByDatabase(migrationState.database);
    const allList = allSubject.getValue().slice(0);
    allList.push(migrationState);
    allSubject.next(allList);
}
export function getMigrationStateByDatabase(database: RxDatabase): BehaviorSubject<RxMigrationState[]> {
    return getFromMapOrCreate(
        DATA_MIGRATION_STATE_SUBJECT_BY_DATABASE,
        database,
        () => new BehaviorSubject<RxMigrationState[]>([])
    );
}

/**
 * Complete on database destroy
 * so people do not have to unsubscribe
 */
export function onDatabaseDestroy(database: RxDatabase) {
    const subject = DATA_MIGRATION_STATE_SUBJECT_BY_DATABASE.get(database);
    if (subject) {
        subject.complete();
    }
}
