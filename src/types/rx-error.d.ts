import type { RxJsonSchema } from './rx-schema.d.ts';
import {
    RxSchema
} from '../rx-schema.ts';
import type { RxPlugin } from './rx-plugin.d.ts';
import { ERROR_MESSAGES } from '../plugins/dev-mode/error-messages.ts';
import type { RxReplicationWriteToMasterRow } from './replication-protocol.d.ts';
import type { BulkWriteRow, RxDocumentData } from './rx-storage.d.ts';

type KeyOf<T extends object> = Extract<keyof T, string>;
export type RxErrorKey = KeyOf<typeof ERROR_MESSAGES>;

export type {
    RxError,
    RxTypeError
} from '../rx-error.ts';

/**
 * this lists all possible parameters
 */
export interface RxErrorParameters {
    readonly error?: PlainJsonError;
    readonly errors?: PlainJsonError[];
    readonly writeError?: RxStorageWriteError<any>;
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
    readonly fromVersion?: number;
    readonly toVersion?: number;
    readonly version?: number;
    readonly args?: any;
    readonly opts?: any;
    readonly dataBefore?: any;
    readonly dataAfter?: any;
    readonly pull?: boolean;
    readonly push?: boolean;
    readonly url?: string;
    readonly key?: string;
    readonly queryObj?: any;
    readonly query?: any;
    readonly op?: string;
    readonly skip?: any;
    readonly limit?: any;
    readonly passwordHash?: string;
    readonly existingPasswordHash?: string;
    readonly password?: string | any;
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
    readonly storage?: string;
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
    readonly pushRows?: RxReplicationWriteToMasterRow<any>[];
    readonly direction?: 'pull' | 'push';
    readonly body?: any;
    readonly status?: number;
    readonly statusText?: string;
    readonly headers?: Record<string, any>;
    readonly code?: string;
}

/**
 * Error-Items which are created by the jsonschema-validator
 */
export type RxValidationError = {
    readonly field: string;
    readonly message: string;
};

/**
 * Use to have a transferable error object
 * in plain json instead of a JavaScript Error instance.
 */
export type PlainJsonError = {
    name: string;
    message: string;
    rxdb?: true;
    code?: RxErrorKey;
    url?: string;
    extensions?: Record<string, any>;
    parameters?: RxErrorParameters;
    stack?: string;
};





/**
 * Error that can happen per document when
 * RxStorage.bulkWrite() is called
 */
export type RxStorageWriteErrorBase<RxDocType> = {
    /**
     * The content-string that has been passed to
     * RxStorageInstance.bulkWrite()
     * TODO add this!
     */
    // context: string;

    status: number
    | 409 // conflict
    | 422 // schema validation error
    | 510 // attachment data missing
    ;

    /**
     * set this property to make it easy
     * to detect if the object is a RxStorageBulkWriteError
     */
    isError: true;

    // primary key of the document
    documentId: string;

    // the original document data that should have been written.
    writeRow: BulkWriteRow<RxDocType>;

    /**
     * The context which was given to bulkWrite(),
     * used for debugging.
     */
    context: string;
};

export type RxStorageWriteErrorConflict<RxDocType> = RxStorageWriteErrorBase<RxDocType> & {
    status: 409;
    /**
     * A conflict error state must contain the
     * document state in the database.
     * This ensures that we can continue resolving a conflict
     * without having to pull the document out of the db first.
     * Is not set if the error happens on an insert.
     */
    documentInDb: RxDocumentData<RxDocType>;
};

export type RxStorageWriteErrorValidation<RxDocType> = RxStorageWriteErrorBase<RxDocType> & {
    status: 422;
    /**
     * Other properties that give
     * information about the error,
     * for example a schema validation error
     * might contain the exact error from the validator here.
     * Must be plain JSON!
     */
    validationErrors: RxValidationError[];
    /**
     * For easier debugging,
     * we directly put the schema into the error.
     */
    schema: RxJsonSchema<RxDocumentData<RxDocType>>;
};

export type RxStorageWriteErrorAttachment<RxDocType> = RxStorageWriteErrorBase<RxDocType> & {
    status: 510;
    attachmentId: string;
    documentInDb?: RxDocumentData<RxDocType>;
};


export type RxStorageWriteError<RxDocType> =
    RxStorageWriteErrorConflict<RxDocType> |
    RxStorageWriteErrorValidation<RxDocType> |
    RxStorageWriteErrorAttachment<RxDocType>;
