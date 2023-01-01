import {
    getRxStorageDexie
} from '../plugins/storage-dexie';
import {
    createRxDatabase,
    addRxPlugin
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
