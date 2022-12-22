import { getRxStorageDexie } from '../../storage-dexie';
import { wrappedWorkerRxStorage } from '../../storage-worker';

import {
    indexedDB,
    IDBKeyRange
} from 'fake-indexeddb';

const storage = getRxStorageDexie({
    indexedDB,
    IDBKeyRange
});
wrappedWorkerRxStorage({
    storage
});
