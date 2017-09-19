import _classCallCheck from 'babel-runtime/helpers/classCallCheck';
import _createClass from 'babel-runtime/helpers/createClass';
import _possibleConstructorReturn from 'babel-runtime/helpers/possibleConstructorReturn';
import _inherits from 'babel-runtime/helpers/inherits';
/**
 * here we use custom errors with the additional field 'parameters'
 */

import * as util from './util';

/**
 * transform an object of parameters to a presentable string
 * @param  {any} parameters
 * @return {string}
 */
var parametersToString = function parametersToString(parameters) {
    var ret = '';
    if (Object.keys(parameters).length === 0) return ret;
    ret += 'Given parameters: {\n';
    ret += Object.keys(parameters).map(function (k) {
        var paramStr = '[object Object]';
        try {
            paramStr = JSON.stringify(parameters[k], null, 2);
        } catch (e) {}
        return k + ':' + paramStr;
    }).join('\n');
    ret += '}';
    return ret;
};

var messageForError = function messageForError(message, parameters) {
    return 'RxError:' + '\n' + message + '\n' + parametersToString(parameters);
};

export var RxError = function (_Error) {
    _inherits(RxError, _Error);

    function RxError(message) {
        var parameters = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};

        _classCallCheck(this, RxError);

        var mes = messageForError(message, parameters);

        var _this = _possibleConstructorReturn(this, _Error.call(this, mes));

        _this.message = mes;
        _this.parameters = parameters;
        _this.rxdb = true; // tag them as internal
        return _this;
    }

    RxError.prototype.toString = function toString() {
        return this.message;
    };

    _createClass(RxError, [{
        key: 'name',
        get: function get() {
            return 'RxError';
        }
    }]);

    return RxError;
}(Error);;

export function pluginMissing(pluginKey) {
    return new RxError('You are using a function which must be overwritten by a plugin.\n        You should either prevent the usage of this function or add the plugin via:\n          - es5-require:\n            RxDB.plugin(require(\'rxdb/plugins/' + pluginKey + '\'))\n          - es6-import:\n            import ' + util.ucfirst(pluginKey) + 'Plugin from \'rxdb/plugins/' + pluginKey + '\';\n            RxDB.plugin(' + util.ucfirst(pluginKey) + 'Plugin);\n        ', {
        pluginKey: pluginKey
    });
};

// const errorKeySearchLink = key => 'https://github.com/pubkey/rxdb/search?q=' + key + '+path%3Asrc%2Fmodules';
// const verboseErrorModuleLink = 'https://pubkey.github.io/rxdb/custom-builds.html#verbose-error';

export var newRxError = function newRxError(message, parameters) {
    return new RxError(message, parameters);
};

export default {
    newRxError: newRxError,
    pluginMissing: pluginMissing
};