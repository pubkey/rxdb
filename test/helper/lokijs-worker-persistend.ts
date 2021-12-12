import { getRxStorageLoki } from '../../plugins/lokijs';
import { wrappedRxStorage } from '../../plugins/worker';

const lfsa = require('lokijs/src/loki-fs-structured-adapter.js');
const adapter = new lfsa();
const storage = getRxStorageLoki({
    adapter
});
wrappedRxStorage(
    storage
);
