import { getRxStorageLoki } from '../../lokijs';
import { wrappedWorkerRxStorage } from '../../worker';
const LokiIncrementalIndexedDBAdapter = require('lokijs/src/incremental-indexeddb-adapter');

const storage = getRxStorageLoki({
    adapter: new LokiIncrementalIndexedDBAdapter()
});
wrappedWorkerRxStorage({
    storage
});
