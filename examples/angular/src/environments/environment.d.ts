import type { RxStorage } from 'rxdb';

export type EnvironmentParams = {
    // identifier so we can check the logs to see if the correct environment was loaded
    name: string;
    isCapacitor: boolean;
    production: boolean;
    isServerSideRendering: boolean;
    rxdbSyncUrl: string;

    // RxDB database settings
    multiInstance: boolean,
    addRxDBPlugins: () => void;
    getRxStorage: () => RxStorage<any, any>;
}
