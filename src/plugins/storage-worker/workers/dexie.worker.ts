import { getRxStorageDexie } from '../../storage-dexie';
import { wrappedWorkerRxStorage } from '../../storage-worker';

const storage = getRxStorageDexie();
wrappedWorkerRxStorage({
    storage
});
