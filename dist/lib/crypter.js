"use strict";

var _interopRequireDefault = require("@babel/runtime/helpers/interopRequireDefault");

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.Crypter = void 0;
exports.createCrypter = createCrypter;

var _objectPath = _interopRequireDefault(require("object-path"));

var _util = require("./util");

/**
 * handle the en/decryption of documents-data
 * TODO atm we have the crypter inside of rxdb core.
 * Instead all should be moved to the encryption plugin
 * and work via plugin hooks.
 */
var Crypter = /*#__PURE__*/function () {
  function Crypter(password, schema) {
    this.password = password;
    this.schema = schema;
  }
  /**
   * encrypt a given string.
   * @overwritten by plugin (optional)
   */


  var _proto = Crypter.prototype;

  _proto._encryptString = function _encryptString(_value) {
    throw (0, _util.pluginMissing)('encryption');
  }
  /**
   * decrypt a given string.
   * @overwritten by plugin (optional)
   */
  ;

  _proto._decryptString = function _decryptString(_value) {
    throw (0, _util.pluginMissing)('encryption');
  };

  _proto.encrypt = function encrypt(obj) {
    var _this = this;

    if (!this.password) {
      return obj;
    }

    obj = (0, _util.flatClone)(obj);
    /**
     * Extract attachments because deep-cloning
     * Buffer or Blob does not work
     */

    var attachments = obj._attachments;
    delete obj._attachments;
    var clonedObj = (0, _util.clone)(obj);

    if (attachments) {
      clonedObj._attachments = attachments;
    }

    this.schema.encryptedPaths.forEach(function (path) {
      var value = _objectPath["default"].get(clonedObj, path);

      if (typeof value === 'undefined') {
        return;
      }

      var stringValue = JSON.stringify(value);

      var encrypted = _this._encryptString(stringValue);

      _objectPath["default"].set(clonedObj, path, encrypted);
    });
    return clonedObj;
  };

  _proto.decrypt = function decrypt(obj) {
    var _this2 = this;

    if (!this.password) return obj;
    obj = (0, _util.flatClone)(obj);
    /**
     * Extract attachments because deep-cloning
     * Buffer or Blob does not work
     */

    var attachments = obj._attachments;
    delete obj._attachments;
    var clonedObj = (0, _util.clone)(obj);

    if (attachments) {
      clonedObj._attachments = attachments;
    }

    this.schema.encryptedPaths.forEach(function (path) {
      var value = _objectPath["default"].get(clonedObj, path);

      if (typeof value === 'undefined') {
        return;
      }

      var decrypted = _this2._decryptString(value);

      var decryptedParsed = JSON.parse(decrypted);

      _objectPath["default"].set(clonedObj, path, decryptedParsed);
    });
    return clonedObj;
  };

  return Crypter;
}();

exports.Crypter = Crypter;

function createCrypter(password, schema) {
  return new Crypter(password, schema);
}
//# sourceMappingURL=crypter.js.map