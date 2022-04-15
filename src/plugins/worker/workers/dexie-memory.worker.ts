import { getRxStorageDexie } from '../../dexie';
import { wrappedWorkerRxStorage } from '../../worker';

const indexedDB = require('fake-indexeddb');
const IDBKeyRange = require('fake-indexeddb/lib/FDBKeyRange');

const storage = getRxStorageDexie({
    indexedDB,
    IDBKeyRange
});
wrappedWorkerRxStorage({
    storage
});
