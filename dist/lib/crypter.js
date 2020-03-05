"use strict";

var _interopRequireDefault = require("@babel/runtime/helpers/interopRequireDefault");

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.create = create;
exports["default"] = exports.Crypter = void 0;

var _objectPath = _interopRequireDefault(require("object-path"));

var _util = require("./util");

/**
 * handle the en/decryption of documents-data
 */
var Crypter = /*#__PURE__*/function () {
  function Crypter(password, schema) {
    this.password = password;
    this.schema = schema;
  }
  /**
   * encrypt and stringify data
   * @overwritten by plugin (optional)
   */


  var _proto = Crypter.prototype;

  _proto._encryptValue = function _encryptValue(_value) {
    throw (0, _util.pluginMissing)('encryption');
  }
  /**
   * decrypt and json-parse an encrypted value
   * @overwritten by plugin (optional)
   */
  ;

  _proto._decryptValue = function _decryptValue(_value) {
    throw (0, _util.pluginMissing)('encryption');
  };

  _proto.encrypt = function encrypt(obj) {
    var _this = this;

    if (!this.password) return obj;
    obj = (0, _util.clone)(obj);
    Object.keys(this.schema.encryptedPaths).forEach(function (path) {
      var value = _objectPath["default"].get(obj, path);

      if (typeof value === 'undefined') return;

      var encrypted = _this._encryptValue(value);

      _objectPath["default"].set(obj, path, encrypted);
    });
    return obj;
  };

  _proto.decrypt = function decrypt(obj) {
    var _this2 = this;

    if (!this.password) return obj;
    obj = (0, _util.clone)(obj);
    Object.keys(this.schema.encryptedPaths).forEach(function (path) {
      var value = _objectPath["default"].get(obj, path);

      if (typeof value === 'undefined') return;

      var decrypted = _this2._decryptValue(value);

      _objectPath["default"].set(obj, path, decrypted);
    });
    return obj;
  };

  return Crypter;
}();

exports.Crypter = Crypter;

function create(password, schema) {
  return new Crypter(password, schema);
}

var _default = {
  create: create,
  Crypter: Crypter
};
exports["default"] = _default;

//# sourceMappingURL=crypter.js.map