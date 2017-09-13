'use strict';

Object.defineProperty(exports, "__esModule", {
    value: true
});
exports.newRxError = exports.RxError = undefined;

var _classCallCheck2 = require('babel-runtime/helpers/classCallCheck');

var _classCallCheck3 = _interopRequireDefault(_classCallCheck2);

var _createClass2 = require('babel-runtime/helpers/createClass');

var _createClass3 = _interopRequireDefault(_createClass2);

var _possibleConstructorReturn2 = require('babel-runtime/helpers/possibleConstructorReturn');

var _possibleConstructorReturn3 = _interopRequireDefault(_possibleConstructorReturn2);

var _inherits2 = require('babel-runtime/helpers/inherits');

var _inherits3 = _interopRequireDefault(_inherits2);

exports.pluginMissing = pluginMissing;

var _util = require('./util');

var util = _interopRequireWildcard(_util);

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) newObj[key] = obj[key]; } } newObj['default'] = obj; return newObj; } }

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

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
}; /**
    * here we use custom errors with the additional field 'parameters'
    */

var messageForError = function messageForError(message, parameters) {
    return 'RxError:' + '\n' + message + '\n' + parametersToString(parameters);
};

var RxError = exports.RxError = function (_Error) {
    (0, _inherits3['default'])(RxError, _Error);

    function RxError(message) {
        var parameters = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};
        (0, _classCallCheck3['default'])(this, RxError);

        var mes = messageForError(message, parameters);

        var _this = (0, _possibleConstructorReturn3['default'])(this, (RxError.__proto__ || Object.getPrototypeOf(RxError)).call(this, mes));

        _this.message = mes;
        _this.parameters = parameters;
        _this.rxdb = true; // tag them as internal
        return _this;
    }

    (0, _createClass3['default'])(RxError, [{
        key: 'toString',
        value: function toString() {
            return this.message;
        }
    }, {
        key: 'name',
        get: function get() {
            return 'RxError';
        }
    }]);
    return RxError;
}(Error);

;

function pluginMissing(pluginKey) {
    return new RxError('You are using a function which must be overwritten by a plugin.\n        You should either prevent the usage of this function or add the plugin via:\n          - es5-require:\n            RxDB.plugin(require(\'rxdb/dist/lib/modules/' + pluginKey + '\'))\n          - es6-import:\n            import ' + util.ucfirst(pluginKey) + 'Plugin from \'rxdb/dist/es/modules/' + pluginKey + '\';\n            RxDB.plugin(' + util.ucfirst(pluginKey) + 'Plugin);\n        ', {
        pluginKey: pluginKey
    });
};

// const errorKeySearchLink = key => 'https://github.com/pubkey/rxdb/search?q=' + key + '+path%3Asrc%2Fmodules';
// const verboseErrorModuleLink = 'https://pubkey.github.io/rxdb/custom-builds.html#verbose-error';

var newRxError = exports.newRxError = function newRxError(message, parameters) {
    return new RxError(message, parameters);
};

exports['default'] = {
    newRxError: newRxError,
    pluginMissing: pluginMissing
};
