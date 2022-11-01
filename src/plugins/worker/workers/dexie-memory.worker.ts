import { getRxStorageDexie } from '../../dexie';
import { wrappedWorkerRxStorage } from '../../worker';

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
