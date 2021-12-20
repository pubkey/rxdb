import { getRxStorageLoki } from '../../lokijs';
import { wrappedRxStorage } from '../../worker';
const LokiIndexedDBAdapter = require('lokijs/src/loki-indexed-adapter');

const storage = getRxStorageLoki({
    adapter: new LokiIndexedDBAdapter()
});
wrappedRxStorage({
    storage
});
