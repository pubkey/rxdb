import {
    getRxStorageDexie
} from '../plugins/dexie';
import {
    ensureNotFalsy,
    createRxDatabase,
    RxLocalDocument,
    now,
    addRxPlugin,
    promiseWait
} from '../';
import {
    RxDBLocalDocumentsPlugin
} from '../plugins/local-documents';

export async function getDatabase() {
    addRxPlugin(RxDBLocalDocumentsPlugin);

    const database = await createRxDatabase({
        name: 'rxdb-landingpage',
        localDocuments: true,
        storage: getRxStorageDexie()
    });

    return database;
}
