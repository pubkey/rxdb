import { BehaviorSubject, Observable } from 'rxjs';
import type { MigrationState, RxCollection, RxDatabase } from '../../types';
export type MigrationStateWithCollection = {
    collection: RxCollection;
    state: MigrationState;
};
export declare const DATA_MIGRATION_STATE_SUBJECT_BY_DATABASE: WeakMap<RxDatabase<import("../../types").CollectionsOfDatabase, any, any>, BehaviorSubject<Observable<MigrationStateWithCollection>[]>>;
export declare function getMigrationStateByDatabase(database: RxDatabase): BehaviorSubject<Observable<MigrationStateWithCollection>[]>;
/**
 * Complete on database destroy
 * so people do not have to unsubscribe
 */
export declare function onDatabaseDestroy(database: RxDatabase): void;
