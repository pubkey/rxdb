import type { RxStorageInstanceLoki } from './rx-storage-instance-loki';
import type { RxStorageKeyObjectInstanceLoki } from './rx-storage-key-object-instance-loki';
import lokijs, { Collection } from 'lokijs';
import type {
    LokiDatabaseSettings,
    LokiDatabaseState
} from '../../types';
import {
    add as unloadAdd
} from 'unload';
import { flatClone } from '../../util';

export const CHANGES_COLLECTION_SUFFIX = '-rxdb-changes';
export const CHANGES_LOCAL_SUFFIX = '-rxdb-local';
export const LOKI_BROADCAST_CHANNEL_MESSAGE_TYPE = 'rxdb-lokijs-remote-request';
export const LOKI_KEY_OBJECT_BROADCAST_CHANNEL_MESSAGE_TYPE = 'rxdb-lokijs-remote-request-key-object';


/**
 * Loki attaches a $loki property to all data
 * which must be removed before returning the data back to RxDB.
 */
export function stripLokiKey<T>(docData: T & { $loki?: number }): T {
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
    databaseSettings: LokiDatabaseSettings
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
                    autosave: hasPersistence,
                    persistenceMethod,
                    autosaveInterval: hasPersistence ? 500 : undefined,
                    verbose: true,
                    throttledSaves: false,
                    // TODO remove this log
                    autosaveCallback: hasPersistence ? () => console.log('LokiJS autosave done!') : undefined
                },
                databaseSettings
            );
            console.log('useSettings:');
            console.dir(flatClone(useSettings));
            const database = new lokijs(
                databaseName + '.db',
                useSettings
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
            if (hasPersistence) {
                unloadAdd(() => database.saveDatabase());
            }



            const state: LokiDatabaseState = {
                database,
                openCollections: {}
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
    collections.forEach(collection => {
        const collectionName = collection.name;
        delete databaseState.openCollections[collectionName];
    });
    if (Object.keys(databaseState.openCollections).length === 0) {
        // all collections closed -> also close database
        LOKI_DATABASE_STATE_BY_NAME.delete(databaseName);
        await new Promise<void>((res, rej) => {
            databaseState.database.close(err => {
                err ? rej(err) : res();
            });
        });
    }
}
