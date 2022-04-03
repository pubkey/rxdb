import { getRxStorageLoki } from '../../lokijs';
import { wrappedWorkerRxStorage } from '../../worker';

const storage = getRxStorageLoki();
wrappedWorkerRxStorage({
    storage
});
