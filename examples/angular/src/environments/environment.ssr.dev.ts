import {
    getRxStorageMemory
} from 'rxdb/plugins/storage-memory';
import { wrappedValidateAjvStorage } from 'rxdb/plugins/validate-ajv';
import {
    SYNC_PORT,
    DATABASE_NAME
} from '../shared';
import {
    RxDBDevModePlugin
} from 'rxdb/plugins/dev-mode';
import {
    addRxPlugin
} from 'rxdb';
import { EnvironmentParams } from './environment-type';


export const environment: EnvironmentParams = {
    name: 'ssr-dev',
    production: false,
    isCapacitor: false,
    isServerSideRendering: true,
    multiInstance: false,
    rxdbSyncUrl: 'http://localhost:' + SYNC_PORT + '/' + DATABASE_NAME,
    addRxDBPlugins() {
        addRxPlugin(RxDBDevModePlugin);
    },
    getRxStorage() {
        return wrappedValidateAjvStorage({
            storage: getRxStorageMemory()
        });
    },
};
