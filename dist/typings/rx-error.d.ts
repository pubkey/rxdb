/**
 * here we use custom errors with the additional field 'parameters'
 */
export declare class RxError extends Error {
    code: string;
    message: string;
    parameters: any;
    rxdb: true;
    constructor(code: string, message: string, parameters?: any);
    readonly name: string;
    toString(): string;
    readonly typeError: boolean;
}
export declare class RxTypeError extends TypeError {
    code: string;
    message: string;
    parameters: any;
    rxdb: true;
    constructor(code: string, message: string, parameters?: any);
    readonly name: string;
    toString(): string;
    readonly typeError: boolean;
}
export declare function pluginMissing(pluginKey: string): RxError;
export declare function newRxError(code: string, parameters?: any): RxError;
export declare function newRxTypeError(code: string, parameters?: any): RxTypeError;
