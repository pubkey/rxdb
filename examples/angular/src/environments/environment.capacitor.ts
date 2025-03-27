import { EnvironmentParams } from './environment.d';
import {
    getRxStorageLocalstorage
} from 'rxdb/plugins/storage-localstorage';
import {
    SYNC_PORT,
    DATABASE_NAME
} from '../shared';

/**
 * In capacitor/cordova you have to wait until all plugins are loaded and 'window.sqlitePlugin'
 * can be accessed.
 * This function waits until document deviceready is called which ensures that everything is loaded.
 * @link https://cordova.apache.org/docs/de/latest/cordova/events/events.deviceready.html
 */
const capacitorDeviceReadyPromise = new Promise<void>(res => {
    document.addEventListener('deviceready', () => {
        res();
    });
});

export const environment: EnvironmentParams = {
    name: 'capacitor',
    production: false,
    isCapacitor: true,
    isServerSideRendering: false,
    multiInstance: false,
    rxdbSyncUrl: 'http://' + window.location.hostname + ':' + SYNC_PORT + '/' + DATABASE_NAME,
    addRxDBPlugins() { },
    getRxStorage() {
        return getRxStorageLocalstorage();
    }
};
