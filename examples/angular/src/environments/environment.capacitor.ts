import { EnvironmentParams } from './environment.d';
import {
    getRxStorageDexie
} from 'rxdb/plugins/storage-dexie';
import {
    SYNC_PORT,
    DATABASE_NAME
} from '../shared';

export const environment: EnvironmentParams = {
    production: true,
    isCapacitor: true,
    isServerSideRendering: false,
    multiInstance: false,
    rxdbSyncUrl: 'http://' + window.location.hostname + ':' + SYNC_PORT + '/' + DATABASE_NAME,
    addRxDBPlugins() { },
    getRxStorage() {
        return getRxStorageDexie();
    },
};
