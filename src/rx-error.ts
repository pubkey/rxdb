/**
 * here we use custom errors with the additional field 'parameters'
 */

import {
    ucfirst
} from './util';
import overwritable from './overwritable';

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
    public parameters: any;
    public rxdb: true;
    constructor(
        code: string,
        message: string,
        parameters: any = {}
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
    public parameters: any;
    public rxdb: true;
    constructor(
        code: string,
        message: string,
        parameters: any = {}
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


export function pluginMissing(
    pluginKey: string
): RxError {
    return new RxError(
        'PU',
        `You are using a function which must be overwritten by a plugin.
        You should either prevent the usage of this function or add the plugin via:
          - es5-require:
            RxDB.plugin(require('rxdb/plugins/${pluginKey}'))
          - es6-import:
            import ${ucfirst(pluginKey)}Plugin from 'rxdb/plugins/${pluginKey}';
            RxDB.plugin(${ucfirst(pluginKey)}Plugin);
        `, {
            pluginKey
        }
    );
}

// const errorKeySearchLink = key => 'https://github.com/pubkey/rxdb/search?q=' + key + '+path%3Asrc%2Fmodules';
// const verboseErrorModuleLink = 'https://pubkey.github.io/rxdb/custom-builds.html#verbose-error';

export function newRxError(
    code: string,
    parameters?
): RxError {
    return new RxError(
        code,
        overwritable.tunnelErrorMessage(code),
        parameters
    );
}
export function newRxTypeError(
    code: string,
    parameters?
): RxTypeError {
    return new RxTypeError(
        code,
        overwritable.tunnelErrorMessage(code),
        parameters
    );
}
