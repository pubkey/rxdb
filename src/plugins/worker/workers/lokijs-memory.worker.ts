import { getRxStorageLoki } from '../../lokijs';
import { wrappedRxStorage } from '../../worker';

const storage = getRxStorageLoki();
wrappedRxStorage({
    storage
});
