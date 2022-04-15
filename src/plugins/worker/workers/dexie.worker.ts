import { getRxStorageDexie } from '../../dexie';
import { wrappedWorkerRxStorage } from '../../worker';

const storage = getRxStorageDexie();
wrappedWorkerRxStorage({
    storage
});
