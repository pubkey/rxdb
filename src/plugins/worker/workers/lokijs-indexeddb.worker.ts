import { getRxStorageLoki } from '../../lokijs';
import { wrappedWorkerRxStorage } from '../../worker';
const LokiIndexedDBAdapter = require('lokijs/src/loki-indexed-adapter');

const storage = getRxStorageLoki({
    adapter: new LokiIndexedDBAdapter()
});
wrappedWorkerRxStorage({
    storage
});
