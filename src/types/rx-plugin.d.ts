import { RxQuery, RxQueryOP, MangoQuery } from './rx-query';
import { RxCollection } from './rx-collection';
import { RxStorageInstanceCreationParams } from './rx-storage';
import type {
    DeepReadonly
} from '../types'

export type RxPluginPreCreateRxQueryArgs = {
    op: RxQueryOP;
    queryObj: MangoQuery;
    collection: RxCollection;
}

export type RxPluginPreAddRxPluginArgs = {
    // the plugin that is getting added
    plugin: RxPlugin | any;
    // previous added plugins
    plugins: Set<RxPlugin | any>
}

export type RxPluginPrePrepareQueryArgs = {
    rxQuery: RxQuery<any>;
    mangoQuery: MangoQuery<any>;
};

export interface RxPlugin {
    /**
     * A string to uniquely identifies the plugin.
     * Can be used to throw when different versions of the same plugin are used.
     * And also other checks.
     * Use kebab-case.
     */
    readonly name: string;

    /**
     * set this to true so RxDB
     * knows that this object in a rxdb plugin
     */
    readonly rxdb: true;

    /**
     * Init function where dependend plugins could be added.
     * (optional)
     */
    init(): any;

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
        deepFreezeWhenDevMode?: <T>(obj: T) => DeepReadonly<T>,
        validatePassword?: Function,
        checkAdapter?: Function,
        tunnelErrorMessage?: Function
    };
    // TODO add typings to hook functions
    hooks?: {
        preAddRxPlugin?: (args: RxPluginPreAddRxPluginArgs) => void,
        preCreateRxDatabase?: Function,
        createRxDatabase?: Function,
        preDestroyRxDatabase?: Function,
        createRxCollection?: Function,
        preCreateRxCollection?: Function,
        postDestroyRxCollection?: Function,
        preCreateRxSchema?: Function,
        createRxSchema?: Function,
        preCreateRxQuery?: (data: RxPluginPreCreateRxQueryArgs) => void,
        prePrepareQuery?: (data: RxPluginPrePrepareQueryArgs) => void,
        preQueryMatcher?: (i: { rxQuery: RxQuery<any>; doc: any }) => void;
        preSortComparator?: (i: { rxQuery: RxQuery<any>; docA: any; docB: any; }) => void,
        preWriteToStorageInstance?: (i: { collection: RxCollection; doc: any }) => void;
        postReadFromInstance?: (i: { collection: RxCollection, doc: any }) => void;
        createRxQuery?: (query: RxQuery) => void,
        createRxDocument?: Function,
        postCreateRxDocument?: Function,
        preCreateRxStorageInstance?: (params: RxStorageInstanceCreationParams<any, any>) => void,
        preMigrateDocument?: Function,
        postMigrateDocument?: Function
    };
}
