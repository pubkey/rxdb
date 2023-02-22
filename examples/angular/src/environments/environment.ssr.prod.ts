import { EnvironmentParams } from './environment.d';
import {
    getRxStorageMemory
} from 'rxdb/plugins/storage-memory';
import {
    SYNC_PORT,
    DATABASE_NAME
} from '../shared';

export const environment: EnvironmentParams = {
    name: 'ssr-prod',
    production: true,
    isCapacitor: false,
    isServerSideRendering: true,
    multiInstance: false,
    rxdbSyncUrl: 'http://localhost:' + SYNC_PORT + '/' + DATABASE_NAME,
    addRxDBPlugins() { },
    getRxStorage() {
        return getRxStorageMemory();
    },
};
