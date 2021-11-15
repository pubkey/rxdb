import type { RxStorageInstanceLoki } from './rx-storage-instance-loki';
import type { RxStorageKeyObjectInstanceLoki } from './rx-storage-key-object-instance-loki';
import lokijs, { Collection } from 'lokijs';
import type {
    LokiDatabaseSettings,
    LokiDatabaseState,
    LokiLocalDatabaseState
} from '../../types';
import {
    add as unloadAdd, AddReturn
} from 'unload';
import { flatClone } from '../../util';
import { LokiSaveQueue } from './loki-save-queue';
import type { IdleQueue } from 'custom-idle-queue';

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
                    autosave: false,
                    throttledSaves: false
                }
            );
            const database = new lokijs(
                databaseName + '.db',
                useSettings
            );
            const saveQueue = new LokiSaveQueue(
                database,
                useSettings,
                rxDatabaseIdleQueue
            );

            // Wait until all data is load from persistence adapter.
            if (hasPersistence) {
                await new Promise<void>((res, rej) => {
                    database.loadDatabase({}, (err) => {
                        err ? rej(err) : res();
                    });
                });
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
