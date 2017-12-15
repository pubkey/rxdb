'use strict';

Object.defineProperty(exports, "__esModule", {
    value: true
});
exports.newRxTypeError = exports.newRxError = exports.RxTypeError = exports.RxError = undefined;

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

var _overwritable = require('./overwritable');

var _overwritable2 = _interopRequireDefault(_overwritable);

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) newObj[key] = obj[key]; } } newObj['default'] = obj; return newObj; } }

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

/**
 * transform an object of parameters to a presentable string
 * @param  {any} parameters
 * @return {string}
 */
/**
 * here we use custom errors with the additional field 'parameters'
 */

var parametersToString = function parametersToString(parameters) {
    var ret = '';
    if (Object.keys(parameters).length === 0) return ret;
    ret += 'Given parameters: {\n';
    ret += Object.keys(parameters).map(function (k) {
        var paramStr = '[object Object]';
        try {
            paramStr = JSON.stringify(parameters[k], function (k, v) {
                return v === undefined ? null : v;
            }, 2);
        } catch (e) {}
        return k + ':' + paramStr;
    }).join('\n');
    ret += '}';
    return ret;
};

var messageForError = function messageForError(message, parameters) {
    return 'RxError:' + '\n' + message + '\n' + parametersToString(parameters);
};

var RxError = exports.RxError = function (_Error) {
    (0, _inherits3['default'])(RxError, _Error);

    function RxError(code, message) {
        var parameters = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : {};
        (0, _classCallCheck3['default'])(this, RxError);

        var mes = messageForError(message, parameters);

        var _this = (0, _possibleConstructorReturn3['default'])(this, (RxError.__proto__ || Object.getPrototypeOf(RxError)).call(this, mes));

        _this.code = code;
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
    }, {
        key: 'typeError',
        get: function get() {
            return false;
        }
    }]);
    return RxError;
}(Error);

;

var RxTypeError = exports.RxTypeError = function (_TypeError) {
    (0, _inherits3['default'])(RxTypeError, _TypeError);

    function RxTypeError(code, message) {
        var parameters = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : {};
        (0, _classCallCheck3['default'])(this, RxTypeError);

        var mes = messageForError(message, parameters);

        var _this2 = (0, _possibleConstructorReturn3['default'])(this, (RxTypeError.__proto__ || Object.getPrototypeOf(RxTypeError)).call(this, mes));

        _this2.code = code;
        _this2.message = mes;
        _this2.parameters = parameters;
        _this2.rxdb = true; // tag them as internal
        return _this2;
    }

    (0, _createClass3['default'])(RxTypeError, [{
        key: 'toString',
        value: function toString() {
            return this.message;
        }
    }, {
        key: 'name',
        get: function get() {
            return 'RxError';
        }
    }, {
        key: 'typeError',
        get: function get() {
            return true;
        }
    }]);
    return RxTypeError;
}(TypeError);

;

function pluginMissing(pluginKey) {
    return new RxError('PU', 'You are using a function which must be overwritten by a plugin.\n        You should either prevent the usage of this function or add the plugin via:\n          - es5-require:\n            RxDB.plugin(require(\'rxdb/plugins/' + pluginKey + '\'))\n          - es6-import:\n            import ' + util.ucfirst(pluginKey) + 'Plugin from \'rxdb/plugins/' + pluginKey + '\';\n            RxDB.plugin(' + util.ucfirst(pluginKey) + 'Plugin);\n        ', {
        pluginKey: pluginKey
    });
};

// const errorKeySearchLink = key => 'https://github.com/pubkey/rxdb/search?q=' + key + '+path%3Asrc%2Fmodules';
// const verboseErrorModuleLink = 'https://pubkey.github.io/rxdb/custom-builds.html#verbose-error';

var newRxError = exports.newRxError = function newRxError(code, parameters) {
    return new RxError(code, _overwritable2['default'].tunnelErrorMessage(code), parameters);
};
var newRxTypeError = exports.newRxTypeError = function newRxTypeError(code, parameters) {
    return new RxTypeError(code, _overwritable2['default'].tunnelErrorMessage(code), parameters);
};

exports['default'] = {
    newRxError: newRxError,
    newRxTypeError: newRxTypeError,
    pluginMissing: pluginMissing
};
