import {
    BehaviorSubject
} from 'rxjs';
import type {
    RxDatabase
} from '../../../types';
import { getFromMapOrCreate } from '../../../plugins/utils';
import { RxMigrationState } from '../rx-migration-state';


export const DATA_MIGRATION_STATE_SUBJECT_BY_DATABASE = new WeakMap<RxDatabase, BehaviorSubject<RxMigrationState[]>>();

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
