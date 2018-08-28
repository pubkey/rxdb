/**
 * handle the en/decryption of documents-data
 */
import objectPath from 'object-path';
import { clone } from './util';
import RxError from './rx-error';
export var Crypter =
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
    throw RxError.pluginMissing('encryption');
  };
  /**
   * decrypt and json-parse an encrypted value
   * @overwritten by plugin (optional)
   * @param  {string} encValue
   * @return {any}
   */


  _proto._decryptValue = function _decryptValue() {
    throw RxError.pluginMissing('encryption');
  };

  _proto.encrypt = function encrypt(obj) {
    var _this = this;

    obj = clone(obj);
    if (!this._password) return obj;
    Object.keys(this._schema.encryptedPaths).map(function (path) {
      var value = objectPath.get(obj, path);

      var encrypted = _this._encryptValue(value);

      objectPath.set(obj, path, encrypted);
    });
    return obj;
  };

  _proto.decrypt = function decrypt(obj) {
    var _this2 = this;

    obj = clone(obj);
    if (!this._password) return obj;
    Object.keys(this._schema.encryptedPaths).map(function (path) {
      var value = objectPath.get(obj, path);

      var decrypted = _this2._decryptValue(value);

      objectPath.set(obj, path, decrypted);
    });
    return obj;
  };

  return Crypter;
}();
export function create(password, schema) {
  return new Crypter(password, schema);
}
export default {
  create: create,
  Crypter: Crypter
};