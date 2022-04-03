import { getRxStorageLoki } from '../../lokijs';
import { wrappedWorkerRxStorage } from '../../worker';

const lfsa = require('lokijs/src/loki-fs-structured-adapter.js');
const adapter = new lfsa();
const storage = getRxStorageLoki({
    adapter
});
wrappedWorkerRxStorage({
    storage
});
