import _createClass from "@babel/runtime/helpers/createClass";
import _possibleConstructorReturn from "@babel/runtime/helpers/possibleConstructorReturn";
import _getPrototypeOf from "@babel/runtime/helpers/getPrototypeOf";
import _inheritsLoose from "@babel/runtime/helpers/inheritsLoose";
import _wrapNativeSuper from "@babel/runtime/helpers/wrapNativeSuper";

function _createSuper(Derived) { return function () { var Super = _getPrototypeOf(Derived), result; if (_isNativeReflectConstruct()) { var NewTarget = _getPrototypeOf(this).constructor; result = Reflect.construct(Super, arguments, NewTarget); } else { result = Super.apply(this, arguments); } return _possibleConstructorReturn(this, result); }; }

function _isNativeReflectConstruct() { if (typeof Reflect === "undefined" || !Reflect.construct) return false; if (Reflect.construct.sham) return false; if (typeof Proxy === "function") return true; try { Date.prototype.toString.call(Reflect.construct(Date, [], function () {})); return true; } catch (e) { return false; } }

/**
 * here we use custom errors with the additional field 'parameters'
 */
import overwritable from './overwritable';

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

function messageForError(message, parameters) {
  return 'RxError:' + '\n' + message + '\n' + parametersToString(parameters);
}

export var RxError = /*#__PURE__*/function (_Error) {
  _inheritsLoose(RxError, _Error);

  var _super = _createSuper(RxError);

  function RxError(code, message) {
    var _this;

    var parameters = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : {};
    var mes = messageForError(message, parameters);
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

  var _super2 = _createSuper(RxTypeError);

  function RxTypeError(code, message) {
    var _this2;

    var parameters = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : {};
    var mes = messageForError(message, parameters);
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
//# sourceMappingURL=rx-error.js.map