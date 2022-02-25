import { RxQuery, RxQueryOP, MangoQuery } from './rx-query';
import { RxCollection } from './rx-collection';
import {
    RxAttachmentData,
    RxStorageInstanceCreationParams
} from './rx-storage';
import type {
    BlobBuffer,
    DeepReadonly,
    RxAttachmentCreator,
    RxDatabase,
    RxJsonSchema
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


/**
 * Depending on which plugins are used together,
 * it is important that the plugin is able to define if
 * the hooks must be added as first or as last array item.
 * For example the encryption plugin must run encryption
 * before the key-compression changes the fieldnames.
 */
export type RxPluginHooks<Input> = {
    /**
     * Hook function that is added as first.
     */
    before?: (i: Input) => void;
    /**
     * Hook function that is added as last.
     */
    after?: (i: Input) => void;
}

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
    init?(): any;

    prototypes?: {
        RxSchema?: Function,
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
        preAddRxPlugin?: RxPluginHooks<RxPluginPreAddRxPluginArgs>,
        preCreateRxDatabase?: RxPluginHooks<any>,
        createRxDatabase?: RxPluginHooks<any>,
        preDestroyRxDatabase?: RxPluginHooks<any>,
        createRxCollection?: RxPluginHooks<any>,
        preCreateRxCollection?: RxPluginHooks<any>,
        postDestroyRxCollection?: RxPluginHooks<any>,
        preCreateRxSchema?: RxPluginHooks<any>,
        createRxSchema?: RxPluginHooks<any>,
        preCreateRxQuery?: RxPluginHooks<RxPluginPreCreateRxQueryArgs>,
        prePrepareQuery?: RxPluginHooks<RxPluginPrePrepareQueryArgs>,
        preQueryMatcher?: RxPluginHooks<{ rxQuery: RxQuery<any>; doc: any }>;
        preSortComparator?: RxPluginHooks<{ rxQuery: RxQuery<any>; docA: any; docB: any; }>;
        preWriteToStorageInstance?: RxPluginHooks<{
            database: RxDatabase;
            primaryPath: string;
            schema: RxJsonSchema<any>;
            doc: any;
        }>;
        postReadFromInstance?: RxPluginHooks<{
            database: RxDatabase;
            primaryPath: string;
            schema: RxJsonSchema<any>;
            doc: any;
        }>;
        preWriteAttachment?: RxPluginHooks<{
            database: RxDatabase;
            schema: RxJsonSchema<any>;
            /**
             * By mutating the attachmentData,
             * the hook can modify the output.
             */
            attachmentData: {
                id: string;
                type: string;
                data: string;
            }
        }>;
        postReadAttachment?: RxPluginHooks<{
            database: RxDatabase;
            schema: RxJsonSchema<any>;
            attachmentData: RxAttachmentData;
            type: string;
            /**
             * By mutating the plainData,
             * the hook can modify the output.
             */
            plainData: string;
        }>;
        createRxQuery?: RxPluginHooks<RxQuery>;
        createRxDocument?: RxPluginHooks<any>;
        postCreateRxDocument?: RxPluginHooks<any>;
        preCreateRxStorageInstance?: RxPluginHooks<RxStorageInstanceCreationParams<any, any>>;
        preMigrateDocument?: RxPluginHooks<any>;
        postMigrateDocument?: RxPluginHooks<any>;
    };
}
