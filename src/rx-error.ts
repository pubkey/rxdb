/**
 * here we use custom errors with the additional field 'parameters'
 */

import overwritable from './overwritable';
import {
    RxErrorParameters
} from './types';

/**
 * transform an object of parameters to a presentable string
 */
function parametersToString(parameters: any): string {
    let ret = '';
    if (Object.keys(parameters).length === 0)
        return ret;
    ret += 'Given parameters: {\n';
    ret += Object.keys(parameters)
        .map(k => {
            let paramStr = '[object Object]';
            try {
                paramStr = JSON.stringify(
                    parameters[k],
                    (_k, v) => v === undefined ? null : v,
                    2
                );
            } catch (e) { }
            return k + ':' + paramStr;
        })
        .join('\n');
    ret += '}';
    return ret;
}

function messageForError(
    message: string,
    parameters: any
): string {
    return 'RxError:' + '\n' +
        message + '\n' +
        parametersToString(parameters);
}

export class RxError extends Error {
    public code: string;
    public message: string;
    public parameters: RxErrorParameters;
    public rxdb: true;
    constructor(
        code: string,
        message: string,
        parameters: RxErrorParameters = {}
    ) {
        const mes = messageForError(message, parameters);
        super(mes);
        this.code = code;
        this.message = mes;
        this.parameters = parameters;
        this.rxdb = true; // tag them as internal
    }
    get name(): string {
        return 'RxError';
    }
    toString(): string {
        return this.message;
    }
    get typeError(): boolean {
        return false;
    }
}

export class RxTypeError extends TypeError {
    public code: string;
    public message: string;
    public parameters: RxErrorParameters;
    public rxdb: true;
    constructor(
        code: string,
        message: string,
        parameters: RxErrorParameters = {}
    ) {
        const mes = messageForError(message, parameters);
        super(mes);
        this.code = code;
        this.message = mes;
        this.parameters = parameters;
        this.rxdb = true; // tag them as internal
    }
    get name(): string {
        return 'RxError';
    }
    toString(): string {
        return this.message;
    }
    get typeError(): boolean {
        return true;
    }
}

// const errorKeySearchLink = key => 'https://github.com/pubkey/rxdb/search?q=' + key + '+path%3Asrc%2Fmodules';
// const verboseErrorModuleLink = 'https://pubkey.github.io/rxdb/custom-builds.html#verbose-error';

export function newRxError(
    code: string,
    parameters?: RxErrorParameters
): RxError {
    return new RxError(
        code,
        overwritable.tunnelErrorMessage(code),
        parameters
    );
}
export function newRxTypeError(
    code: string,
    parameters?: RxErrorParameters
): RxTypeError {
    return new RxTypeError(
        code,
        overwritable.tunnelErrorMessage(code),
        parameters
    );
}
