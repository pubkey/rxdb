import { Observable, Subject, map } from 'rxjs';
import { newRxError } from '../../rx-error';
import type {
    RxMigrationStatus,
    NumberFunctionMap,
    RxCollection,
    RxDatabase
} from '../../types';
import {
    MIGRATION_DEFAULT_BATCH_SIZE,
    MigrationStateWithCollection,
    addMigrationStateToDatabase
} from './migration-helpers';
import { PROMISE_RESOLVE_FALSE } from '../utils';



export class RxMigrationState {

    public database: RxDatabase;
    private migrationPromise?: Promise<any>;
    public status: RxMigrationStatus = {
        started: false
        done: false, // true if finished
        
        total: 0, // will be the doc-count
        handled: 0, // amount of handled docs
        success: 0, // handled docs which succeeded
        deleted: 0, // handled docs which got deleted
        percent: 0 // percentage
    };
    /**
     * Use Subject instead of BehaviorSubject
     * so that it does not initially emit `total: 0`
     */
    statusSubject = new Subject<MigrationStateWithCollection>();

    constructor(
        public readonly collection: RxCollection,
        public readonly migrationStrategies: NumberFunctionMap
    ) {
        this.database = collection.database;
    }

    get $() {
        return this.statusSubject.asObservable();
    }

    startMigration(batchSize: number = MIGRATION_DEFAULT_BATCH_SIZE): RxMigrationState {
        if (this.migrationPromise) {
            throw newRxError('DM1');
        }
        this.migrationStarted = true;



        /**
         * Add to output of RxDatabase.migrationStates
         */
        addMigrationStateToDatabase(this);


        return stateSubject.pipe(
            map(withCollection => withCollection.state)
        );
    }

    migratePromise(batchSize: number): Promise<any> {
        if (!this.migrationPromise) {
            this.migrationPromise = mustMigrate(this)
                .then(must => {
                    if (!must) {
                        return PROMISE_RESOLVE_FALSE;
                    } else {
                        return new Promise((res, rej) => {
                            const state$ = this.migrate(batchSize);
                            (state$ as any).subscribe(null, rej, res);
                            this.allOldCollections.forEach(c => c.storageInstance.close().catch(() => { }));
                        })
                            .catch(err => {
                                this.allOldCollections.forEach(c => c.storageInstance.close().catch(() => { }));
                                throw err;
                            });
                    }
                });
        }
        return this.migrationPromise;
    }
}
