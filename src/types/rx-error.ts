import { RxJsonSchema } from './rx-schema';

export declare class RxError extends Error {
    readonly rxdb: boolean; // always true, use this to detect if its an rxdb-error
    readonly parameters: RxErrorParameters; // an object with parameters to use the programatically
    readonly code: string; // error-code
    readonly typeError: false; // true if is TypeError
}

export declare class RxTypeError extends TypeError {
    readonly rxdb: boolean; // always true, use this to detect if its an rxdb-error
    readonly parameters: RxErrorParameters; // an object with parameters to use the programatically
    readonly code: string; // error-code
    readonly typeError: true; // true if is TypeError
}


/**
 * this lists all possible parameters
 * @type {RxErrorItem[]}
 */
export interface RxErrorParameters {
    readonly errors: RxErrorItem[];
    readonly schemaPath: string;
    readonly obj: any;
    readonly schema: RxJsonSchema;
    readonly pluginKey: string;
    readonly finalDoc: any;
    readonly regex: string;
    readonly fieldName: string;
    readonly id: string;
    readonly data: any;
    readonly missingCollections: string[];
    readonly primaryPath: string;
    readonly have: string[];
    readonly should: string[];
    readonly name: string;
    readonly adapter: any;
    readonly link: string;
    readonly path: string;
    readonly value: any;
    readonly givenName: string;
}

/**
 * Error-Items which are created by the jsonschema-validator
 */
export interface RxErrorItem {
    readonly field: string;
    readonly message: string;
}
