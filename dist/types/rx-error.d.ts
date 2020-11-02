/**
 * here we use custom errors with the additional field 'parameters'
 */
import type { RxErrorParameters } from './types';
export declare class RxError extends Error {
    code: string;
    message: string;
    parameters: RxErrorParameters;
    rxdb: true;
    constructor(code: string, message: string, parameters?: RxErrorParameters);
    get name(): string;
    toString(): string;
    get typeError(): boolean;
}
export declare class RxTypeError extends TypeError {
    code: string;
    message: string;
    parameters: RxErrorParameters;
    rxdb: true;
    constructor(code: string, message: string, parameters?: RxErrorParameters);
    get name(): string;
    toString(): string;
    get typeError(): boolean;
}
export declare function newRxError(code: string, parameters?: RxErrorParameters): RxError;
export declare function newRxTypeError(code: string, parameters?: RxErrorParameters): RxTypeError;
export declare function isPouchdbConflictError(err: RxError | RxTypeError): boolean;
