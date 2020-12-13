import _createClass from "@babel/runtime/helpers/createClass";
import _inheritsLoose from "@babel/runtime/helpers/inheritsLoose";
import _wrapNativeSuper from "@babel/runtime/helpers/wrapNativeSuper";

/**
 * here we use custom errors with the additional field 'parameters'
 */
import { overwritable } from './overwritable';

/**
 * transform an object of parameters to a presentable string
 */
function parametersToString(parameters) {
  var ret = '';
  if (Object.keys(parameters).length === 0) return ret;
  ret += 'Given parameters: {\n';
  ret += Object.keys(parameters).map(function (k) {
    var paramStr = '[object Object]';

    try {
      paramStr = JSON.stringify(parameters[k], function (_k, v) {
        return v === undefined ? null : v;
      }, 2);
    } catch (e) {}

    return k + ':' + paramStr;
  }).join('\n');
  ret += '}';
  return ret;
}

function messageForError(message, code, parameters) {
  return 'RxError (' + code + '):' + '\n' + message + '\n' + parametersToString(parameters);
}

export var RxError = /*#__PURE__*/function (_Error) {
  _inheritsLoose(RxError, _Error);

  function RxError(code, message) {
    var _this;

    var parameters = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : {};
    var mes = messageForError(message, code, parameters);
    _this = _Error.call(this, mes) || this;
    _this.code = code;
    _this.message = mes;
    _this.parameters = parameters;
    _this.rxdb = true; // tag them as internal

    return _this;
  }

  var _proto = RxError.prototype;

  _proto.toString = function toString() {
    return this.message;
  };

  _createClass(RxError, [{
    key: "name",
    get: function get() {
      return 'RxError (' + this.code + ')';
    }
  }, {
    key: "typeError",
    get: function get() {
      return false;
    }
  }]);

  return RxError;
}( /*#__PURE__*/_wrapNativeSuper(Error));
export var RxTypeError = /*#__PURE__*/function (_TypeError) {
  _inheritsLoose(RxTypeError, _TypeError);

  function RxTypeError(code, message) {
    var _this2;

    var parameters = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : {};
    var mes = messageForError(message, code, parameters);
    _this2 = _TypeError.call(this, mes) || this;
    _this2.code = code;
    _this2.message = mes;
    _this2.parameters = parameters;
    _this2.rxdb = true; // tag them as internal

    return _this2;
  }

  var _proto2 = RxTypeError.prototype;

  _proto2.toString = function toString() {
    return this.message;
  };

  _createClass(RxTypeError, [{
    key: "name",
    get: function get() {
      return 'RxTypeError (' + this.code + ')';
    }
  }, {
    key: "typeError",
    get: function get() {
      return true;
    }
  }]);

  return RxTypeError;
}( /*#__PURE__*/_wrapNativeSuper(TypeError));
export function newRxError(code, parameters) {
  return new RxError(code, overwritable.tunnelErrorMessage(code), parameters);
}
export function newRxTypeError(code, parameters) {
  return new RxTypeError(code, overwritable.tunnelErrorMessage(code), parameters);
}
export function isPouchdbConflictError(err) {
  if (err.parameters && err.parameters.pouchDbError && err.parameters.pouchDbError.status === 409) {
    return true;
  } else {
    return false;
  }
}
//# sourceMappingURL=rx-error.js.map