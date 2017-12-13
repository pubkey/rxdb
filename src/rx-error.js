/**
 * here we use custom errors with the additional field 'parameters'
 */

import * as util from './util';
import overwritable from './overwritable';

/**
 * transform an object of parameters to a presentable string
 * @param  {any} parameters
 * @return {string}
 */
const parametersToString = (parameters) => {
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
                    (k, v) => v === undefined ? null : v,
                    2
                );
            } catch (e) {}
            return k + ':' + paramStr;
        })
        .join('\n');
    ret += '}';
    return ret;
};

const messageForError = (message, parameters) => {
    return 'RxError:' + '\n' +
        message + '\n' +
        parametersToString(parameters);
};

export class RxError extends Error {
    constructor(code, message, parameters = {}) {
        const mes = messageForError(message, parameters);
        super(mes);
        this.code = code;
        this.message = mes;
        this.parameters = parameters;
        this.rxdb = true; // tag them as internal
    }
    get name() {
        return 'RxError';
    }
    toString() {
        return this.message;
    }
    get typeError() {
        return false;
    }
};

export class RxTypeError extends TypeError {
    constructor(code, message, parameters = {}) {
        const mes = messageForError(message, parameters);
        super(mes);
        this.code = code;
        this.message = mes;
        this.parameters = parameters;
        this.rxdb = true; // tag them as internal
    }
    get name() {
        return 'RxError';
    }
    toString() {
        return this.message;
    }
    get typeError() {
        return true;
    }
};


export function pluginMissing(pluginKey) {
    return new RxError(
        'PU',
        `You are using a function which must be overwritten by a plugin.
        You should either prevent the usage of this function or add the plugin via:
          - es5-require:
            RxDB.plugin(require(\'rxdb/plugins/${pluginKey}\'))
          - es6-import:
            import ${util.ucfirst(pluginKey)}Plugin from \'rxdb/plugins/${pluginKey}\';
            RxDB.plugin(${util.ucfirst(pluginKey)}Plugin);
        `, {
            pluginKey
        }
    );
};

// const errorKeySearchLink = key => 'https://github.com/pubkey/rxdb/search?q=' + key + '+path%3Asrc%2Fmodules';
// const verboseErrorModuleLink = 'https://pubkey.github.io/rxdb/custom-builds.html#verbose-error';

export const newRxError = (code, parameters) => new RxError(code, overwritable.tunnelErrorMessage(code), parameters);
export const newRxTypeError = (code, parameters) => new RxTypeError(code, overwritable.tunnelErrorMessage(code), parameters);

export default {
    newRxError,
    newRxTypeError,
    pluginMissing
};
