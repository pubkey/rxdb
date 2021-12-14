import { getRxStorageLoki } from '../../plugins/lokijs';
import { wrappedRxStorage } from '../../plugins/worker';

const storage = getRxStorageLoki();
wrappedRxStorage({
    storage
});
