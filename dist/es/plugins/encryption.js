/**
 * this plugin adds the encryption-capabilities to rxdb
 * It's using crypto-js/aes for password-encryption
 * @link https://github.com/brix/crypto-js
 */
import AES from 'crypto-js/aes';
import * as cryptoEnc from 'crypto-js/enc-utf8';
import { newRxTypeError, newRxError } from '../rx-error';
import { hash, LOCAL_PREFIX } from '../util';
var minPassLength = 8;
export function encrypt(value, password) {
  var encrypted = AES.encrypt(value, password);
  return encrypted.toString();
}
export function decrypt(cipherText, password) {
  var decrypted = AES.decrypt(cipherText, password);
  return decrypted.toString(cryptoEnc);
}

var _encryptValue = function _encryptValue(value) {
  return encrypt(JSON.stringify(value), this.password);
};

var _decryptValue = function _decryptValue(encryptedValue) {
  var decrypted = decrypt(encryptedValue, this.password);
  return JSON.parse(decrypted);
};

/**
 * validates and inserts the password hash into the internal collection
 * to ensure there is/was no other instance with a different password
 * which would cause strange side effects when both instances save into the same db
 */
export function storePasswordHashIntoDatabase(rxDatabase) {
  if (!rxDatabase.password) {
    return Promise.resolve(false);
  }

  var pwHash = hash(rxDatabase.password);
  return rxDatabase.internalStore.get(LOCAL_PREFIX + 'pwHash')["catch"](function () {
    return null;
  }).then(function (pwHashDoc) {
    /**
     * if pwHash was not saved, we save it,
     * this operation might throw because another instance runs save at the same time,
     */
    if (!pwHashDoc) {
      return rxDatabase.internalStore.put({
        _id: LOCAL_PREFIX + 'pwHash',
        value: pwHash
      })["catch"](function () {
        return null;
      }).then(function () {
        return true;
      });
    } else if (pwHash !== pwHashDoc.value) {
      // different hash was already set by other instance
      return rxDatabase.destroy().then(function () {
        throw newRxError('DB1', {
          passwordHash: hash(rxDatabase.password),
          existingPasswordHash: pwHashDoc.value
        });
      });
    }

    return true;
  });
}
export var rxdb = true;
export var prototypes = {
  /**
   * set crypto-functions for the Crypter.prototype
   */
  Crypter: function Crypter(proto) {
    proto._encryptValue = _encryptValue;
    proto._decryptValue = _decryptValue;
  }
};
export var overwritable = {
  validatePassword: function validatePassword(password) {
    if (password && typeof password !== 'string') {
      throw newRxTypeError('EN1', {
        password: password
      });
    }

    if (password && password.length < minPassLength) {
      throw newRxError('EN2', {
        minPassLength: minPassLength,
        password: password
      });
    }
  }
};
export var RxDBEncryptionPlugin = {
  name: 'encryption',
  rxdb: rxdb,
  prototypes: prototypes,
  overwritable: overwritable,
  hooks: {
    createRxDatabase: function createRxDatabase(db) {
      return storePasswordHashIntoDatabase(db);
    }
  }
};
//# sourceMappingURL=encryption.js.map