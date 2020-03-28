/**
 * handle the en/decryption of documents-data
 */
import objectPath from 'object-path';
import { clone, pluginMissing } from './util';
export var Crypter = /*#__PURE__*/function () {
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
    throw pluginMissing('encryption');
  }
  /**
   * decrypt and json-parse an encrypted value
   * @overwritten by plugin (optional)
   */
  ;

  _proto._decryptValue = function _decryptValue(_value) {
    throw pluginMissing('encryption');
  };

  _proto.encrypt = function encrypt(obj) {
    var _this = this;

    if (!this.password) return obj;
    obj = clone(obj);
    this.schema.encryptedPaths.forEach(function (path) {
      var value = objectPath.get(obj, path);
      if (typeof value === 'undefined') return;

      var encrypted = _this._encryptValue(value);

      objectPath.set(obj, path, encrypted);
    });
    return obj;
  };

  _proto.decrypt = function decrypt(obj) {
    var _this2 = this;

    if (!this.password) return obj;
    obj = clone(obj);
    this.schema.encryptedPaths.forEach(function (path) {
      var value = objectPath.get(obj, path);
      if (typeof value === 'undefined') return;

      var decrypted = _this2._decryptValue(value);

      objectPath.set(obj, path, decrypted);
    });
    return obj;
  };

  return Crypter;
}();
export function createCrypter(password, schema) {
  return new Crypter(password, schema);
}
//# sourceMappingURL=crypter.js.map