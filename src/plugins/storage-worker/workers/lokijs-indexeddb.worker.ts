import { getRxStorageLoki } from '../../storage-lokijs';
import { wrappedWorkerRxStorage } from '../../storage-worker';
const LokiIndexedDBAdapter = require('lokijs/src/loki-indexed-adapter');

const storage = getRxStorageLoki({
    adapter: new LokiIndexedDBAdapter()
});
wrappedWorkerRxStorage({
    storage
});
