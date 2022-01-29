import { getRxStorageDexie } from '../../dexie';
import { wrappedRxStorage } from '../../worker';

const storage = getRxStorageDexie();
wrappedRxStorage({
    storage
});
