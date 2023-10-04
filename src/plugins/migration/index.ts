import {
    Observable
} from 'rxjs';
import {
    shareReplay
} from 'rxjs/operators';
import type {
    RxPlugin,
    RxCollection,
    RxDatabase
} from '../../types';
import {
    getFromMapOrCreate,
    PROMISE_RESOLVE_FALSE,
    RXJS_SHARE_REPLAY_DEFAULTS
} from '../../plugins/utils';
import {
    RxMigrationState
} from './rx-migration-state';
import {
    getMigrationStateByDatabase,
    mustMigrate,
    onDatabaseDestroy
} from './migration-helpers';
import { addRxPlugin } from '../../plugin';
import { RxDBLocalDocumentsPlugin } from '../local-documents';

export const DATA_MIGRATOR_BY_COLLECTION: WeakMap<RxCollection, RxMigrationState> = new WeakMap();

export const RxDBMigrationPlugin: RxPlugin = {
    name: 'migration',
    rxdb: true,
    init() {
        addRxPlugin(RxDBLocalDocumentsPlugin);
    },
    hooks: {
        preDestroyRxDatabase: {
            after: onDatabaseDestroy
        }
    },
    prototypes: {
        RxDatabase: (proto: any) => {
            proto.migrationStates = function (this: RxDatabase): Observable<RxMigrationState[]> {
                return getMigrationStateByDatabase(this).pipe(
                    shareReplay(RXJS_SHARE_REPLAY_DEFAULTS)
                );
            };
        },
        RxCollection: (proto: any) => {
            proto.getMigrationState = function (this: RxCollection): RxMigrationState {
                return getFromMapOrCreate(
                    DATA_MIGRATOR_BY_COLLECTION,
                    this,
                    () => new RxMigrationState(
                        this.asRxCollection,
                        this.migrationStrategies
                    )
                );
            };
            proto.migrationNeeded = function (this: RxCollection) {
                if (this.schema.version === 0) {
                    return PROMISE_RESOLVE_FALSE;
                }
                return mustMigrate(this.getMigrationState());
            };
        }
    }
};


export * from './rx-migration-state';
export * from './migration-helpers';
export * from './migration-types';
