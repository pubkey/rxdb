import { EnvironmentParams } from './environment.d';
import {
  getRxStorageLocalstorage
} from 'rxdb/plugins/storage-localstorage';
import { wrappedValidateAjvStorage } from 'rxdb/plugins/validate-ajv';
import {
  SYNC_PORT,
  DATABASE_NAME
} from '../shared';
import { addRxPlugin } from 'rxdb';
import { RxDBLeaderElectionPlugin } from 'rxdb/plugins/leader-election';
import {
  RxDBDevModePlugin
} from 'rxdb/plugins/dev-mode';

export const environment: EnvironmentParams = {
  name: 'web-dev',
  production: false,
  isCapacitor: false,
  isServerSideRendering: false,
  multiInstance: true,
  rxdbSyncUrl: 'http://' + window.location.hostname + ':' + SYNC_PORT + '/' + DATABASE_NAME,
  addRxDBPlugins() {
    addRxPlugin(RxDBDevModePlugin);
    addRxPlugin(RxDBLeaderElectionPlugin);
  },
  getRxStorage() {
    return wrappedValidateAjvStorage({
      storage: getRxStorageLocalstorage()
    });
  },
};
