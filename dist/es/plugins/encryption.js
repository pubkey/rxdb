/**
 * this plugin adds the encryption-capabilities to rxdb
 * It's using crypto-js/aes for password-encryption
 * @link https://github.com/brix/crypto-js
 */
import AES from 'crypto-js/aes';
import * as cryptoEnc from 'crypto-js/enc-utf8';
import { newRxTypeError, newRxError } from '../rx-error';
import { hash, PROMISE_RESOLVE_FALSE } from '../util';
import { findLocalDocument } from '../rx-storage-helper';

/**
 * validates and inserts the password hash into the internal collection
 * to ensure there is/was no other instance with a different password
 * which would cause strange side effects when both instances save into the same db
 */
export var storePasswordHashIntoDatabase = function storePasswordHashIntoDatabase(rxDatabase) {
  try {
    if (!rxDatabase.password) {
      return Promise.resolve(PROMISE_RESOLVE_FALSE);
    }

    var pwHash = hash(rxDatabase.password);
    var pwHashDocumentId = 'pwHash';
    return Promise.resolve(findLocalDocument(rxDatabase.localDocumentsStore, pwHashDocumentId)).then(function (pwHashDoc) {
      if (!pwHashDoc) {
        var docData = {
          _id: pwHashDocumentId,
          value: pwHash,
          _attachments: {}
        };
        return Promise.resolve(rxDatabase.localDocumentsStore.bulkWrite([{
          document: docData
        }])).then(function () {
          return true;
        });
      } else if (pwHash !== pwHashDoc.value) {
        // different hash was already set by other instance
        return Promise.resolve(rxDatabase.destroy()).then(function () {
          throw newRxError('DB1', {
            passwordHash: hash(rxDatabase.password),
            existingPasswordHash: pwHashDoc.value
          });
        });
      } else {
        return true;
      }
    });
  } catch (e) {
    return Promise.reject(e);
  }
};
var minPassLength = 8;
export function encrypt(value, password) {
  var encrypted = AES.encrypt(value, password);
  return encrypted.toString();
}
export function decrypt(cipherText, password) {
  var decrypted = AES.decrypt(cipherText, password);
  return decrypted.toString(cryptoEnc);
}

var _encryptString = function _encryptString(value) {
  return encrypt(value, this.password);
};

var _decryptString = function _decryptString(encryptedValue) {
  var decrypted = decrypt(encryptedValue, this.password);
  return decrypted;
};

export var rxdb = true;
export var prototypes = {
  /**
   * set crypto-functions for the Crypter.prototype
   */
  Crypter: function Crypter(proto) {
    proto._encryptString = _encryptString;
    proto._decryptString = _decryptString;
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