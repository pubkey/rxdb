import {
    getRxStorageDexie
} from '../../../plugins/storage-dexie';
import {
    createRxDatabase,
    addRxPlugin
} from '../../../';
import {
    RxDBLocalDocumentsPlugin
} from '../../../plugins/local-documents';

export async function getDatabase() {
    addRxPlugin(RxDBLocalDocumentsPlugin);

    const database = await createRxDatabase({
        name: 'rxdb-landing-v3',
        localDocuments: true,
        storage: getRxStorageDexie()
    });

    return database;
}

export const colors = [
    '#e6008d',
    '#8d2089',
    '#5f2688'
];
