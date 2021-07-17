/**
 * here we use custom errors with the additional field 'parameters'
 */
import type { RxErrorParameters, RxErrorKey } from './types';
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
export declare function isPouchdbConflictError(err: RxError | RxTypeError): boolean;
