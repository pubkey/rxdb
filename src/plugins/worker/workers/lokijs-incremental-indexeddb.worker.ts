import { getRxStorageLoki } from '../../lokijs';
import { wrappedRxStorage } from '../../worker';
const LokiIncrementalIndexedDBAdapter = require('lokijs/src/incremental-indexeddb-adapter');

const storage = getRxStorageLoki({
    adapter: new LokiIncrementalIndexedDBAdapter()
});
wrappedRxStorage({
    storage
});
