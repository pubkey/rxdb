import { getRxStorageLoki } from '../../storage-lokijs';
import { wrappedWorkerRxStorage } from '../../storage-worker';

const storage = getRxStorageLoki();
wrappedWorkerRxStorage({
    storage
});
