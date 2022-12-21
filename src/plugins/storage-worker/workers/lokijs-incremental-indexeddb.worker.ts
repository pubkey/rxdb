import { getRxStorageLoki } from '../../storage-lokijs';
import { wrappedWorkerRxStorage } from '../../storage-worker';
const LokiIncrementalIndexedDBAdapter = require('lokijs/src/incremental-indexeddb-adapter');

const storage = getRxStorageLoki({
    adapter: new LokiIncrementalIndexedDBAdapter()
});
wrappedWorkerRxStorage({
    storage
});
