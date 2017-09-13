/**
 * here we use custom errors with the additional field 'parameters'
 */

import * as util from './util';

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
                paramStr = JSON.stringify(parameters[k], null, 2);
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
    constructor(message, parameters = {}) {
        const mes = messageForError(message, parameters);
        super(mes);
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
};


export function pluginMissing(pluginKey) {
    return new RxError(
        `You are using a function which must be overwritten by a plugin.
        You should either prevent the usage of this function or add the plugin via:
          - es5-require:
            RxDB.plugin(require(\'rxdb/dist/lib/modules/${pluginKey}\'))
          - es6-import:
            import ${util.ucfirst(pluginKey)}Plugin from \'rxdb/dist/es/modules/${pluginKey}\';
            RxDB.plugin(${util.ucfirst(pluginKey)}Plugin);
        `, {
            pluginKey
        }
    );
};

// const errorKeySearchLink = key => 'https://github.com/pubkey/rxdb/search?q=' + key + '+path%3Asrc%2Fmodules';
// const verboseErrorModuleLink = 'https://pubkey.github.io/rxdb/custom-builds.html#verbose-error';

export const newRxError = (message, parameters) => new RxError(message, parameters);


export default {
    newRxError,
    pluginMissing
};
