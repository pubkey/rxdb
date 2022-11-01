import { RxJsonSchema } from './rx-schema';
import {
    RxSchema
} from '../rx-schema';
import { RxPlugin } from './rx-plugin';
import { ERROR_MESSAGES } from '../plugins/dev-mode/error-messages';
import { RxReplicationWriteToMasterRow } from './replication-protocol';

type KeyOf<T extends object> = Extract<keyof T, string>;
export type RxErrorKey = KeyOf<typeof ERROR_MESSAGES>;

export declare class RxError extends Error {
    readonly rxdb: boolean; // always true, use this to detect if its an rxdb-error
    readonly parameters: RxErrorParameters; // an object with parameters to use the programmatically
    readonly code: RxErrorKey; // error-code
    readonly typeError: false; // true if is TypeError
}

export declare class RxTypeError extends TypeError {
    readonly rxdb: boolean; // always true, use this to detect if its an rxdb-error
    readonly parameters: RxErrorParameters; // an object with parameters to use the programmatically
    readonly code: RxErrorKey; // error-code
    readonly typeError: true; // true if is TypeError
}

/**
 * this lists all possible parameters
 */
export interface RxErrorParameters {
    readonly error?: any;
    readonly errors?: RxErrorItem[];
    readonly schemaPath?: string;
    readonly objPath?: string;
    readonly rootPath?: string;
    readonly childpath?: string;
    readonly obj?: any;
    readonly document?: any;
    readonly schema?: Readonly<RxJsonSchema<any> | RxSchema>;
    readonly schemaObj?: any;
    readonly pluginKey?: string;
    readonly originalDoc?: Readonly<any>;
    readonly finalDoc?: Readonly<any>;
    readonly regex?: string;
    readonly fieldName?: string;
    readonly id?: string;
    readonly data?: any;
    readonly missingCollections?: string[];
    readonly primaryPath?: string;
    readonly primary?: string;
    readonly primaryKey?: string;
    readonly have?: any;
    readonly should?: any;
    readonly name?: string;
    readonly adapter?: any;
    readonly link?: string;
    readonly path?: string;
    readonly value?: any;
    readonly givenName?: string;
    readonly pouchDbError?: any;
    readonly fromVersion?: number;
    readonly toVersion?: number;
    readonly version?: number;
    readonly args?: any;
    readonly opts?: any;
    readonly dataBefore?: any;
    readonly dataAfter?: any;
    readonly pull?: boolean;
    readonly push?: boolean;
    readonly key?: string;
    readonly queryObj?: any;
    readonly query?: any;
    readonly op?: string;
    readonly skip?: any;
    readonly limit?: any;
    readonly passwordHash?: string;
    readonly existingPasswordHash?: string;
    readonly password?: string;
    readonly minPassLength?: number;
    readonly own?: any;
    readonly source?: any;
    readonly method?: any;
    readonly field?: string;
    readonly ref?: string;
    readonly funName?: string;
    readonly functionName?: string;
    readonly schemaHash?: string;
    readonly previousSchema?: Readonly<RxJsonSchema<any>>;
    readonly previousSchemaHash?: string;
    readonly type?: string;
    readonly when?: string;
    readonly parallel?: boolean;
    readonly collection?: any;
    readonly database?: any;
    readonly indexes?: Array<string | string[]> | Readonly<Array<string | string[]>>;
    readonly index?: string | string[] | readonly string[];
    readonly plugin?: RxPlugin | any;
    readonly plugins?: Set<RxPlugin | any>;

    // used in the replication plugin

    /**
     * The checkpoint of the response from the last successful
     * pull by the client.
     * Null if there was no pull operation before
     * so that there is no last pulled checkpoint.
     */
    readonly checkpoint?: any;
    /**
     * The documents that failed to be pushed.
     * Typed as 'any' because they might be modified by the push modifier.
     */
    readonly pushRows?: RxReplicationWriteToMasterRow<any>[],
    readonly direction?: 'pull' | 'push'

}

/**
 * Error-Items which are created by the jsonschema-validator
 */
export interface RxErrorItem {
    readonly field: string;
    readonly message: string;
}
