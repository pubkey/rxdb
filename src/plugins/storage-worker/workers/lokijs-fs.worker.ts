import { getRxStorageLoki } from '../../storage-lokijs';
import { wrappedWorkerRxStorage } from '../../storage-worker';

const lfsa = require('lokijs/src/loki-fs-structured-adapter.js');
const adapter = new lfsa();
const storage = getRxStorageLoki({
    adapter
});
wrappedWorkerRxStorage({
    storage
});
