import {
    BehaviorSubject,
    Observable
} from 'rxjs';
import type {
    MigrationState,
    RxCollection,
    RxDatabase
} from '../../types';
import { getFromMapOrCreate } from '../../plugins/utils';

export type MigrationStateWithCollection = {
    collection: RxCollection;
    state: MigrationState;
};

export const DATA_MIGRATION_STATE_SUBJECT_BY_DATABASE = new WeakMap<RxDatabase, BehaviorSubject<Observable<MigrationStateWithCollection>[]>>();

export function getMigrationStateByDatabase(database: RxDatabase): BehaviorSubject<Observable<MigrationStateWithCollection>[]> {
    return getFromMapOrCreate(
        DATA_MIGRATION_STATE_SUBJECT_BY_DATABASE,
        database,
        () => new BehaviorSubject<Observable<MigrationStateWithCollection>[]>([])
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
