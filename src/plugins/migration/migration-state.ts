import {
    BehaviorSubject,
    Observable
} from 'rxjs';
import type {
    MigrationState,
    RxCollection,
    RxDatabase
} from '../../types';
import { ensureNotFalsy } from '../../plugins/utils';

export type MigrationStateWithCollection = {
    collection: RxCollection;
    state: MigrationState;
};

export const DATA_MIGRATION_STATE_SUBJECT_BY_DATABASE = new WeakMap<RxDatabase, BehaviorSubject<Observable<MigrationStateWithCollection>[]>>();

export function getMigrationStateByDatabase(database: RxDatabase): BehaviorSubject<Observable<MigrationStateWithCollection>[]> {
    if (!DATA_MIGRATION_STATE_SUBJECT_BY_DATABASE.has(database)) {
        DATA_MIGRATION_STATE_SUBJECT_BY_DATABASE.set(
            database,
            new BehaviorSubject<Observable<MigrationStateWithCollection>[]>([])
        );
    }
    const subject = DATA_MIGRATION_STATE_SUBJECT_BY_DATABASE.get(database);
    return ensureNotFalsy(subject);
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
