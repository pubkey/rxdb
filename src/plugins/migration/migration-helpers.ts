import { BehaviorSubject, Observable } from 'rxjs';
import { INTERNAL_CONTEXT_COLLECTION, getPrimaryKeyOfInternalDocument } from '../../rx-database-internal-store';
import { getPreviousVersions } from '../../rx-schema';
import type {
    InternalStoreCollectionDocType,
    MigrationState,
    RxCollection,
    RxDatabase,
    RxDocumentData
} from '../../types';
import { getFromMapOrCreate } from '../utils';
import { DataMigrator, RxMigrationState } from './data-migrator';

export function getOldCollectionDocs(
    dataMigrator: DataMigrator
): Promise<RxDocumentData<InternalStoreCollectionDocType>[]> {

    const collectionDocKeys = getPreviousVersions(dataMigrator.currentSchema.jsonSchema)
        .map(version => dataMigrator.name + '-' + version);

    return dataMigrator.database.internalStore.findDocumentsById(
        collectionDocKeys.map(key => getPrimaryKeyOfInternalDocument(
            key,
            INTERNAL_CONTEXT_COLLECTION
        )),
        false
    ).then(docsObj => Object.values(docsObj));
}

export const MIGRATION_DEFAULT_BATCH_SIZE = 200;


export type MigrationStateWithCollection = {
    collection: RxCollection;
    state: MigrationState;
    migrator: DataMigrator;
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
