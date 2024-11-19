import { BehaviorSubject } from 'rxjs';
import {
    INTERNAL_CONTEXT_COLLECTION,
    getPrimaryKeyOfInternalDocument
} from '../../rx-database-internal-store.ts';
import { getPreviousVersions } from '../../rx-schema.ts';
import type {
    InternalStoreCollectionDocType,
    RxCollection,
    RxDatabase,
    RxDocumentData
} from '../../types/index.d.ts';
import {
    PROMISE_RESOLVE_FALSE,
    PROMISE_RESOLVE_NULL,
    clone,
    flatClone,
    getFromMapOrCreate,
    toPromise
} from '../utils/index.ts';
import { RxMigrationState } from './rx-migration-state.ts';

export async function getOldCollectionMeta(
    migrationState: RxMigrationState
): Promise<RxDocumentData<InternalStoreCollectionDocType>> {

    const collectionDocKeys = getPreviousVersions(migrationState.collection.schema.jsonSchema)
        .map(version => migrationState.collection.name + '-' + version);

    const found = await migrationState.database.internalStore.findDocumentsById(
        collectionDocKeys.map(key => getPrimaryKeyOfInternalDocument(
            key,
            INTERNAL_CONTEXT_COLLECTION
        )),
        false
    );
    if (found.length > 1) {
        throw new Error('more than one old collection meta found');
    }
    return found[0];
}


/**
 * runs the doc-data through all following migrationStrategies
 * so it will match the newest schema.
 * @throws Error if final doc does not match final schema or migrationStrategy crashes
 * @return final object or null if migrationStrategy deleted it
 */
export function migrateDocumentData(
    collection: RxCollection,
    docSchemaVersion: number,
    docData: any
): Promise<any | null> {
    /**
     * We cannot deep-clone Blob or Buffer
     * so we just flat clone it here
     * and attach it to the deep cloned document data.
     */
    const attachmentsBefore = flatClone(docData._attachments);
    const mutateableDocData = clone(docData);
    const meta = mutateableDocData._meta;
    delete mutateableDocData._meta;
    mutateableDocData._attachments = attachmentsBefore;

    let nextVersion = docSchemaVersion + 1;

    // run the document through migrationStrategies
    let currentPromise = Promise.resolve(mutateableDocData);
    while (nextVersion <= collection.schema.version) {
        const version = nextVersion;
        currentPromise = currentPromise.then(docOrNull => runStrategyIfNotNull(
            collection,
            version,
            docOrNull
        ));
        nextVersion++;
    }

    return currentPromise.then(doc => {
        if (doc === null) {
            return PROMISE_RESOLVE_NULL;
        }
        doc._meta = meta;
        return doc;
    });
}

export function runStrategyIfNotNull(
    collection: RxCollection,
    version: number,
    docOrNull: any | null
): Promise<any | null> {
    if (docOrNull === null) {
        return PROMISE_RESOLVE_NULL;
    } else {
        const ret = collection.migrationStrategies[version](docOrNull, collection);
        const retPromise = toPromise(ret);
        return retPromise;
    }
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
    const oldColDoc = await getOldCollectionMeta(migrationState);
    return !!oldColDoc;
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
 * Complete on database close
 * so people do not have to unsubscribe
 */
export function onDatabaseClose(database: RxDatabase) {
    const subject = DATA_MIGRATION_STATE_SUBJECT_BY_DATABASE.get(database);
    if (subject) {
        subject.complete();
    }
}
