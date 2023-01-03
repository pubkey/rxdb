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
  ret += Object.keys(parameters).map(k => {
    var paramStr = '[object Object]';
    try {
      paramStr = JSON.stringify(parameters[k], (_k, v) => v === undefined ? null : v, 2);
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
  // always true, use this to detect if its an rxdb-error

  function RxError(code, message, parameters = {}) {
    var _this;
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
    get: function () {
      return 'RxError (' + this.code + ')';
    }
  }, {
    key: "typeError",
    get: function () {
      return false;
    }
  }]);
  return RxError;
}( /*#__PURE__*/_wrapNativeSuper(Error));
export var RxTypeError = /*#__PURE__*/function (_TypeError) {
  _inheritsLoose(RxTypeError, _TypeError);
  // always true, use this to detect if its an rxdb-error

  function RxTypeError(code, message, parameters = {}) {
    var _this2;
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
    get: function () {
      return 'RxTypeError (' + this.code + ')';
    }
  }, {
    key: "typeError",
    get: function () {
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

/**
 * Returns the error if it is a 409 conflict,
 * return false if it is another error.
 */
export function isBulkWriteConflictError(err) {
  if (err && err.status === 409) {
    return err;
  } else {
    return false;
  }
}
var STORAGE_WRITE_ERROR_CODE_TO_MESSAGE = {
  409: 'document write conflict',
  422: 'schema validation error',
  510: 'attachment data missing'
};
export function rxStorageWriteErrorToRxError(err) {
  return newRxError('COL20', {
    name: STORAGE_WRITE_ERROR_CODE_TO_MESSAGE[err.status],
    document: err.documentId,
    writeError: err
  });
}
//# sourceMappingURL=rx-error.js.map