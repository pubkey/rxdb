/**
 * here we use custom errors with the additional field 'parameters'
 */
import type { RxErrorParameters, RxErrorKey, RxStorageBulkWriteError } from './types';
export declare class RxError extends Error {
    code: RxErrorKey;
    message: string;
    parameters: RxErrorParameters;
    rxdb: true;
    constructor(code: RxErrorKey, message: string, parameters?: RxErrorParameters);
    get name(): string;
    toString(): string;
    get typeError(): boolean;
}
export declare class RxTypeError extends TypeError {
    code: RxErrorKey;
    message: string;
    parameters: RxErrorParameters;
    rxdb: true;
    constructor(code: RxErrorKey, message: string, parameters?: RxErrorParameters);
    get name(): string;
    toString(): string;
    get typeError(): boolean;
}
export declare function newRxError(code: RxErrorKey, parameters?: RxErrorParameters): RxError;
export declare function newRxTypeError(code: RxErrorKey, parameters?: RxErrorParameters): RxTypeError;
/**
 * Returns the error if it is a 409 conflict,
 * return false if it is another error.
 */
export declare function isBulkWriteConflictError<RxDocType>(err: RxStorageBulkWriteError<RxDocType> | any): RxStorageBulkWriteError<RxDocType> | false;
