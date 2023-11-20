import {
    getRxStorageDexie
} from '../../../plugins/storage-dexie';
import {
    createRxDatabase,
    addRxPlugin,
    RxDatabase
} from '../../../plugins/core';
import {
    RxDBLocalDocumentsPlugin
} from '../../../plugins/local-documents';


let dbPromise;

export function getDatabase(): Promise<RxDatabase> {
    if (!dbPromise) {
        dbPromise = (async () => {
            addRxPlugin(RxDBLocalDocumentsPlugin);
            const database = await createRxDatabase({
                name: 'rxdb-landing-v3',
                localDocuments: true,
                storage: getRxStorageDexie()
            });
            return database;
        })();
    }
    return dbPromise;
}

export const colors = [
    '#e6008d',
    '#8d2089',
    '#5f2688'
];
