import { getRxStorageDexie } from '../../dexie';
import { wrappedRxStorage } from '../../worker';

const indexedDB = require('fake-indexeddb');
const IDBKeyRange = require('fake-indexeddb/lib/FDBKeyRange');

const storage = getRxStorageDexie({
    indexedDB,
    IDBKeyRange
});
wrappedRxStorage({
    storage
});
