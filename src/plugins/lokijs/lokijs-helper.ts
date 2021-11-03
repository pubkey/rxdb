import type { RxStorageInstanceLoki } from './rx-storage-instance-loki';
import type { RxStorageKeyObjectInstanceLoki } from './rx-storage-key-object-instance-loki';
import lokijs, { Collection } from 'lokijs';
import type { LokiDatabaseSettings, LokiDatabaseState } from '../../types';
import { ensureNotFalsy } from '../../util';

export const CHANGES_COLLECTION_SUFFIX = '-rxdb-changes';
export const CHANGES_LOCAL_SUFFIX = '-rxdb-local';
export const BROADCAST_CHANNEL_MESSAGE_TYPE = 'rxdb-lokijs-remote-request';

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

const LOKI_DATABASE_STATE_BY_NAME: Map<string, Promise<LokiDatabaseState>> = new Map();
export function getLokiDatabase(
    databaseName: string,
    databaseSettings: LokiDatabaseSettings
): Promise<LokiDatabaseState> {
    let databaseState: Promise<LokiDatabaseState> | undefined = LOKI_DATABASE_STATE_BY_NAME.get(databaseName);
    if (!databaseState) {
        console.log('getLokiDatabase()');
        console.dir(databaseSettings);
        /**
         * We assume that as soon as an adapter is passed,
         * the database has to be persistend.
         */
        const hasPersistence = !!databaseSettings.adapter;
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
                    verbose: true
                },
                databaseSettings
            );
            console.log('useSettings:');
            console.dir(useSettings);
            const database = new lokijs(
                databaseName + '.db',
                useSettings
            );

            // Wait until all data is load from persistence adapter.
            if (hasPersistence) {
                await new Promise<void>(res => {
                    database.loadDatabase({}, (_result) => {
                        res();
                    });
                });
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
        await new Promise<void>(res => {
            databaseState.database.close(res);
        });
    }
}
