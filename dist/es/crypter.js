/**
 * handle the en/decryption of documents-data
 * TODO atm we have the crypter inside of rxdb core.
 * Instead all should be moved to the encryption plugin
 * and work via plugin hooks.
 */
import objectPath from 'object-path';
import { clone, flatClone, pluginMissing } from './util';
export var Crypter = /*#__PURE__*/function () {
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
    throw pluginMissing('encryption');
  }
  /**
   * decrypt a given string.
   * @overwritten by plugin (optional)
   */
  ;

  _proto._decryptString = function _decryptString(_value) {
    throw pluginMissing('encryption');
  };

  _proto.encrypt = function encrypt(obj) {
    var _this = this;

    if (!this.password) {
      return obj;
    }

    obj = flatClone(obj);
    /**
     * Extract attachments because deep-cloning
     * Buffer or Blob does not work
     */

    var attachments = obj._attachments;
    delete obj._attachments;
    var clonedObj = clone(obj);

    if (attachments) {
      clonedObj._attachments = attachments;
    }

    this.schema.encryptedPaths.forEach(function (path) {
      var value = objectPath.get(clonedObj, path);

      if (typeof value === 'undefined') {
        return;
      }

      var stringValue = JSON.stringify(value);

      var encrypted = _this._encryptString(stringValue);

      objectPath.set(clonedObj, path, encrypted);
    });
    return clonedObj;
  };

  _proto.decrypt = function decrypt(obj) {
    var _this2 = this;

    if (!this.password) return obj;
    obj = flatClone(obj);
    /**
     * Extract attachments because deep-cloning
     * Buffer or Blob does not work
     */

    var attachments = obj._attachments;
    delete obj._attachments;
    var clonedObj = clone(obj);

    if (attachments) {
      clonedObj._attachments = attachments;
    }

    this.schema.encryptedPaths.forEach(function (path) {
      var value = objectPath.get(clonedObj, path);

      if (typeof value === 'undefined') {
        return;
      }

      var decrypted = _this2._decryptString(value);

      var decryptedParsed = JSON.parse(decrypted);
      objectPath.set(clonedObj, path, decryptedParsed);
    });
    return clonedObj;
  };

  return Crypter;
}();
export function createCrypter(password, schema) {
  return new Crypter(password, schema);
}
//# sourceMappingURL=crypter.js.map