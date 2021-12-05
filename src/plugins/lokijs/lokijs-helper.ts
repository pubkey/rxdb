import type { RxStorageInstanceLoki } from './rx-storage-instance-loki';
import type { RxStorageKeyObjectInstanceLoki } from './rx-storage-key-object-instance-loki';
import lokijs, { Collection } from 'lokijs';
import type {
    LokiDatabaseSettings,
    LokiDatabaseState,
    LokiLocalDatabaseState,
    MangoQuery,
    MangoQuerySortDirection,
    MangoQuerySortPart,
    RxJsonSchema
} from '../../types';
import {
    add as unloadAdd, AddReturn
} from 'unload';
import { flatClone } from '../../util';
import { LokiSaveQueue } from './loki-save-queue';
import type { IdleQueue } from 'custom-idle-queue';
import type { DeterministicSortComparator } from 'event-reduce-js';
import { getPrimaryFieldOfPrimaryKey } from '../../rx-schema';
import { newRxError } from '../../rx-error';

export const CHANGES_COLLECTION_SUFFIX = '-rxdb-changes';
export const LOKI_BROADCAST_CHANNEL_MESSAGE_TYPE = 'rxdb-lokijs-remote-request';
export const LOKI_KEY_OBJECT_BROADCAST_CHANNEL_MESSAGE_TYPE = 'rxdb-lokijs-remote-request-key-object';


/**
 * Loki attaches a $loki property to all data
 * which must be removed before returning the data back to RxDB.
 */
export function stripLokiKey<T>(docData: T & { $loki?: number }): T {
    if (!docData.$loki) {
        return docData;
    }
    const cloned = flatClone(docData);
    delete cloned.$loki;
    return cloned;
}

export function getLokiEventKey(
    isLocal: boolean,
    primary: string,
    revision: string
): string {
    const prefix = isLocal ? 'local' : 'non-local';
    const eventKey = prefix + '|' + primary + '|' + revision;
    return eventKey;
}

/**
 * Used to check in tests if all instances have been cleaned up.
 */
export const OPEN_LOKIJS_STORAGE_INSTANCES: Set<RxStorageKeyObjectInstanceLoki | RxStorageInstanceLoki<any>> = new Set();


export const LOKIJS_COLLECTION_DEFAULT_OPTIONS: Partial<CollectionOptions<any>> = {
    disableChangesApi: true,
    disableMeta: true,
    disableDeltaChangesApi: true,
    disableFreeze: true,
    // TODO use 'immutable' like WatermelonDB does it
    cloneMethod: 'shallow-assign',
    clone: false,
    transactional: false,
    autoupdate: false
}

const LOKI_DATABASE_STATE_BY_NAME: Map<string, Promise<LokiDatabaseState>> = new Map();
export function getLokiDatabase(
    databaseName: string,
    databaseSettings: LokiDatabaseSettings,
    rxDatabaseIdleQueue: IdleQueue
): Promise<LokiDatabaseState> {
    let databaseState: Promise<LokiDatabaseState> | undefined = LOKI_DATABASE_STATE_BY_NAME.get(databaseName);
    if (!databaseState) {
        /**
         * We assume that as soon as an adapter is passed,
         * the database has to be persistend.
         */
        const hasPersistence: boolean = !!databaseSettings.adapter;
        databaseState = (async () => {

            let persistenceMethod = hasPersistence ? 'adapter' : 'memory';
            if (databaseSettings.persistenceMethod) {
                persistenceMethod = databaseSettings.persistenceMethod;
            }
            const useSettings = Object.assign(
                // defaults
                {
                    autoload: hasPersistence,
                    persistenceMethod,
                    verbose: true
                },
                databaseSettings,
                // overwrites
                {
                    /**
                     * RxDB uses its custom load and save handling
                     * so we disable the LokiJS save/load handlers.
                     */
                    autoload: false,
                    autosave: false,
                    throttledSaves: false
                }
            );
            const database = new lokijs(
                databaseName + '.db',
                flatClone(useSettings)
            );
            const saveQueue = new LokiSaveQueue(
                database,
                useSettings,
                rxDatabaseIdleQueue
            );

            /**
             * Wait until all data is loaded from persistence adapter.
             * Wrap the loading into the saveQueue to ensure that when many
             * collections are created a the same time, the load-calls do not interfer
             * with each other and cause error logs.
             */
            if (hasPersistence) {
                await saveQueue.runningSavesIdleQueue.wrapCall(
                    () => new Promise<void>((res, rej) => {
                        database.loadDatabase({}, (err) => {
                            if (useSettings.autoloadCallback) {
                                useSettings.autoloadCallback(err);
                            }
                            err ? rej(err) : res();
                        });
                    })
                );
            }

            /**
             * Autosave database on process end
             */
            const unloads: AddReturn[] = [];
            if (hasPersistence) {
                unloads.push(
                    unloadAdd(() => saveQueue.run())
                );
            }

            const state: LokiDatabaseState = {
                database,
                databaseSettings: useSettings,
                saveQueue,
                collections: {},
                unloads
            };

            return state;
        })();
        LOKI_DATABASE_STATE_BY_NAME.set(databaseName, databaseState);
    }
    return databaseState;
}

export async function closeLokiCollections(
    databaseName: string,
    collections: Collection[]
) {
    const databaseState = await LOKI_DATABASE_STATE_BY_NAME.get(databaseName);
    if (!databaseState) {
        // already closed
        return;
    }
    await databaseState.saveQueue.run();
    collections.forEach(collection => {
        const collectionName = collection.name;
        delete databaseState.collections[collectionName];
    });
    if (Object.keys(databaseState.collections).length === 0) {
        // all collections closed -> also close database
        LOKI_DATABASE_STATE_BY_NAME.delete(databaseName);
        databaseState.unloads.forEach(u => u.remove());
        await new Promise<void>((res, rej) => {
            databaseState.database.close(err => {
                err ? rej(err) : res();
            });
        });
    }
}

/**
 * This function is at lokijs-helper
 * because we need it in multiple places.
 */
export function getLokiSortComparator<RxDocType>(
    schema: RxJsonSchema<RxDocType>,
    query: MangoQuery<RxDocType>
): DeterministicSortComparator<RxDocType> {
    const primaryKey = getPrimaryFieldOfPrimaryKey(schema.primaryKey);
    // TODO if no sort is given, use sort by primary.
    // This should be done inside of RxDB and not in the storage implementations.
    const sortOptions: MangoQuerySortPart<RxDocType>[] = query.sort ? (query.sort as any) : [{
        [primaryKey]: 'asc'
    }];
    const fun: DeterministicSortComparator<RxDocType> = (a: RxDocType, b: RxDocType) => {
        let compareResult: number = 0; // 1 | -1
        sortOptions.find(sortPart => {
            const fieldName: string = Object.keys(sortPart)[0];
            const direction: MangoQuerySortDirection = Object.values(sortPart)[0];
            const directionMultiplier = direction === 'asc' ? 1 : -1;
            const valueA: any = (a as any)[fieldName];
            const valueB: any = (b as any)[fieldName];
            if (valueA === valueB) {
                return false;
            } else {
                if (valueA > valueB) {
                    compareResult = 1 * directionMultiplier;
                    return true;
                } else {
                    compareResult = -1 * directionMultiplier;
                    return true;
                }
            }
        });

        /**
         * Two different objects should never have the same sort position.
         * We ensure this by having the unique primaryKey in the sort params
         * at this.prepareQuery()
         */
        if (!compareResult) {
            throw newRxError('SNH', { args: { query, a, b } });
        }

        return compareResult as any;
    }
    return fun;
}
