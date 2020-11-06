import { RxQuery, RxQueryOP, MangoQuery } from './rx-query';
import { RxCollection } from './rx-collection';

export type RxPluginPreCreateRxQueryArgs = {
    op: RxQueryOP;
    queryObj: MangoQuery;
    collection: RxCollection;
}

export interface RxPlugin {
    readonly rxdb: true;
    prototypes?: {
        RxSchema?: Function,
        Crypter?: Function,
        RxDocument?: Function,
        RxQuery?: Function,
        RxCollection?: Function,
        RxDatabase?: Function
    };
    overwritable?: {
        isDevMode?: () => boolean;
        validatePassword?: Function,
        createKeyCompressor?: Function,
        checkAdapter?: Function,
        tunnelErrorMessage?: Function
    };
    // TODO add typings to hook functions
    hooks?: {
        preCreateRxDatabase?: Function,
        createRxDatabase?: Function,
        preDestroyRxDatabase?: Function,
        createRxCollection?: Function,
        preCreateRxCollection?: Function,
        preCreateRxSchema?: Function,
        createRxSchema?: Function,
        preCreateRxQuery?: (data: RxPluginPreCreateRxQueryArgs) => void,
        createRxQuery?: (query: RxQuery) => void,
        createRxDocument?: Function,
        postCreateRxDocument?: Function,
        preCreatePouchDb?: Function,
        preMigrateDocument?: Function,
        postMigrateDocument?: Function
    };
}
