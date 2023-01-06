import { getRxStorageMemory } from '../../storage-memory';
import { wrappedWorkerRxStorage } from '../../storage-worker';


const storage = getRxStorageMemory({});
wrappedWorkerRxStorage({
    storage
});
