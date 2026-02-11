/**
 * here we use custom errors with the additional field 'parameters'
 */

import { overwritable } from './overwritable.ts';
import type {
    RxErrorParameters,
    RxErrorKey,
    RxStorageWriteError,
    RxStorageWriteErrorConflict
} from './types/index.d.ts';

/**
 * transform an object of parameters to a presentable string
 */
function parametersToString(parameters: any): string {
    let ret = '';
    if (Object.keys(parameters).length === 0)
        return ret;
    ret += '-'.repeat(20) + '\n';
    ret += 'Parameters:\n';
    ret += Object.keys(parameters)
        .map(k => {
            let paramStr = '[object Object]';
            try {
                if (k === 'errors') {
                    paramStr = parameters[k].map((err: any) => JSON.stringify(err, Object.getOwnPropertyNames(err)));
                } else {
                    paramStr = JSON.stringify(parameters[k], function (_k, v) {
                        return v === undefined ? null : v;
                    }, 2);
                }
            } catch (e) { }
            return k + ': ' + paramStr;
        })
        .join('\n');
    ret += '\n';
    return ret;
}

function messageForError(
    message: string,
    code: string,
    parameters: any
): string {
    return '' + '\n' +
        message + '\n' +
        parametersToString(parameters);
}

export class RxError extends Error {
    public code: RxErrorKey;
    public message: string;
    public url: string;
    public parameters: RxErrorParameters;
    // always true, use this to detect if its an rxdb-error
    public rxdb: true;
    constructor(
        code: RxErrorKey,
        message: string,
        parameters: RxErrorParameters = {}
    ) {
        const mes = messageForError(message, code, parameters);
        super(mes);
        this.code = code;
        this.message = mes;
        this.url = getErrorUrl(code);
        this.parameters = parameters;
        this.rxdb = true; // tag them as internal
    }
    get name(): string {
        return 'RxError (' + this.code + ')';
    }
    toString(): string {
        return this.message;
    }
    get typeError(): boolean {
        return false;
    }
}

export class RxTypeError extends TypeError {
    public code: RxErrorKey;
    public message: string;
    public url: string;
    public parameters: RxErrorParameters;
    // always true, use this to detect if its an rxdb-error
    public rxdb: true;
    constructor(
        code: RxErrorKey,
        message: string,
        parameters: RxErrorParameters = {}
    ) {
        const mes = messageForError(message, code, parameters);
        super(mes);
        this.code = code;
        this.message = mes;
        this.url = getErrorUrl(code);
        this.parameters = parameters;
        this.rxdb = true; // tag them as internal
    }
    get name(): string {
        return 'RxTypeError (' + this.code + ')';
    }
    toString(): string {
        return this.message;
    }
    get typeError(): boolean {
        return true;
    }
}


export function getErrorUrl(code: RxErrorKey) {
    return 'https://rxdb.info/errors.html?console=errors#' + code;
}

export function errorUrlHint(code: RxErrorKey) {
    return '\nFind out more about this error here: ' + getErrorUrl(code) + ' \n';
}

export function newRxError(
    code: RxErrorKey,
    parameters?: RxErrorParameters
): RxError {
    return new RxError(
        code,
        overwritable.tunnelErrorMessage(code) + errorUrlHint(code),
        parameters
    );
}

export function newRxTypeError(
    code: RxErrorKey,
    parameters?: RxErrorParameters
): RxTypeError {
    return new RxTypeError(
        code,
        overwritable.tunnelErrorMessage(code) + errorUrlHint(code),
        parameters
    );
}


/**
 * Returns the error if it is a 409 conflict,
 * return false if it is another error.
 */
export function isBulkWriteConflictError<RxDocType>(
    err?: RxStorageWriteError<RxDocType> | any
): RxStorageWriteErrorConflict<RxDocType> | false {
    if (
        err &&
        err.status === 409
    ) {
        return err;
    } else {
        return false;
    }
}


const STORAGE_WRITE_ERROR_CODE_TO_MESSAGE: { [k: number]: string; } = {
    409: 'document write conflict',
    422: 'schema validation error',
    510: 'attachment data missing'
};

export function rxStorageWriteErrorToRxError(err: RxStorageWriteError<any>): RxError {
    return newRxError('COL20', {
        name: STORAGE_WRITE_ERROR_CODE_TO_MESSAGE[err.status],
        document: err.documentId,
        writeError: err
    });
}

export function newRxFetchError(
    input: any,
    body?: any,
    additionalParameters?: any
): RxError {
    const parameters: any = {
        body,
        ...additionalParameters
    };
    if (input.code) {
        parameters.code = input.code;
    }
    if (input.url) {
        parameters.url = input.url;
    }
    if (input.method) {
        parameters.method = input.method;
    }
    if (input.status) {
        parameters.status = input.status;
    }
    if (input.statusText) {
        parameters.statusText = input.statusText;
    }
    return newRxError('FETCH', parameters);
}
