import {
    Observable
} from 'rxjs';
import {
    shareReplay
} from 'rxjs';
import type {
    RxPlugin,
    RxCollection,
    RxDatabase
} from '../../types/index.d.ts';
import {
    getFromMapOrCreate,
    PROMISE_RESOLVE_FALSE,
    RXJS_SHARE_REPLAY_DEFAULTS
} from '../../plugins/utils/index.ts';
import {
    RxMigrationState
} from './rx-migration-state.ts';
import {
    getMigrationStateByDatabase,
    mustMigrate,
    onDatabaseClose
} from './migration-helpers.ts';
import { addRxPlugin } from '../../plugin.ts';
import { RxDBLocalDocumentsPlugin } from '../local-documents/index.ts';

export const DATA_MIGRATOR_BY_COLLECTION: WeakMap<RxCollection, RxMigrationState> = new WeakMap();

export const RxDBMigrationPlugin: RxPlugin = {
    name: 'migration-schema',
    rxdb: true,
    init() {
        addRxPlugin(RxDBLocalDocumentsPlugin);
    },
    hooks: {
        preCloseRxDatabase: {
            after: onDatabaseClose
        },
        /**
         * Block writes to the new collection while a migration is pending.
         * For schemas with version > 0 we optimistically set the flag, then
         * release it once we know no migration is actually needed. If a
         * migration is needed, the flag stays set until startMigration()
         * runs to completion (or fails/cancels), which clears it.
         */
        createRxCollection: {
            after: (i: any) => {
                const collection: RxCollection = i.collection;
                if (collection.schema.version === 0) {
                    return;
                }
                collection.migrationInProgress = true;
                collection.migrationNeeded()
                    .then((needed: boolean) => {
                        if (!needed) {
                            collection.migrationInProgress = false;
                        }
                    })
                    .catch(() => {
                        collection.migrationInProgress = false;
                    });
            }
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

export const RxDBMigrationSchemaPlugin = RxDBMigrationPlugin;


export * from './rx-migration-state.ts';
export * from './migration-helpers.ts';
export * from './migration-types.ts';
