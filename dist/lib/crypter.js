"use strict";

var _interopRequireDefault = require("@babel/runtime/helpers/interopRequireDefault");

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.create = create;
exports["default"] = exports.Crypter = void 0;

var _objectPath = _interopRequireDefault(require("object-path"));

var _util = require("./util");

var _rxError = _interopRequireDefault(require("./rx-error"));

/**
 * handle the en/decryption of documents-data
 */
var Crypter =
/*#__PURE__*/
function () {
  function Crypter(password, schema) {
    this._password = password;
    this._schema = schema;
  }
  /**
   * encrypt and stringify data
   * @overwritten by plugin (optional)
   * @param  {any} value
   * @return {string}
   */


  var _proto = Crypter.prototype;

  _proto._encryptValue = function _encryptValue() {
    throw _rxError["default"].pluginMissing('encryption');
  };
  /**
   * decrypt and json-parse an encrypted value
   * @overwritten by plugin (optional)
   * @param  {string} encValue
   * @return {any}
   */


  _proto._decryptValue = function _decryptValue() {
    throw _rxError["default"].pluginMissing('encryption');
  };

  _proto.encrypt = function encrypt(obj) {
    var _this = this;

    obj = (0, _util.clone)(obj);
    if (!this._password) return obj;
    Object.keys(this._schema.encryptedPaths).map(function (path) {
      var value = _objectPath["default"].get(obj, path);

      var encrypted = _this._encryptValue(value);

      _objectPath["default"].set(obj, path, encrypted);
    });
    return obj;
  };

  _proto.decrypt = function decrypt(obj) {
    var _this2 = this;

    obj = (0, _util.clone)(obj);
    if (!this._password) return obj;
    Object.keys(this._schema.encryptedPaths).map(function (path) {
      var value = _objectPath["default"].get(obj, path);

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
