import type { RxStorage } from 'rxdb';

export type EnvironmentParams = {
    isCapacitor: boolean;
    production: boolean;
    isServerSideRendering: boolean;
    rxdbSyncUrl: string;

    // RxDB database settings
    multiInstance: boolean,
    addRxDBPlugins: () => void;
    getRxStorage: () => RxStorage<any, any>;
}
