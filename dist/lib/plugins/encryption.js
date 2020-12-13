"use strict";

var _interopRequireWildcard = require("@babel/runtime/helpers/interopRequireWildcard");

var _interopRequireDefault = require("@babel/runtime/helpers/interopRequireDefault");

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.encrypt = encrypt;
exports.decrypt = decrypt;
exports.storePasswordHashIntoDatabase = storePasswordHashIntoDatabase;
exports.RxDBEncryptionPlugin = exports.overwritable = exports.prototypes = exports.rxdb = void 0;

var _aes = _interopRequireDefault(require("crypto-js/aes"));

var cryptoEnc = _interopRequireWildcard(require("crypto-js/enc-utf8"));

var _rxError = require("../rx-error");

var _util = require("../util");

/**
 * this plugin adds the encryption-capabilities to rxdb
 * It's using crypto-js/aes for password-encryption
 * @link https://github.com/brix/crypto-js
 */
var minPassLength = 8;

function encrypt(value, password) {
  var encrypted = _aes["default"].encrypt(value, password);

  return encrypted.toString();
}

function decrypt(cipherText, password) {
  var decrypted = _aes["default"].decrypt(cipherText, password);

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
function storePasswordHashIntoDatabase(rxDatabase) {
  if (!rxDatabase.password) {
    return Promise.resolve(false);
  }

  var pwHash = (0, _util.hash)(rxDatabase.password);
  return rxDatabase.internalStore.get(_util.LOCAL_PREFIX + 'pwHash')["catch"](function () {
    return null;
  }).then(function (pwHashDoc) {
    /**
     * if pwHash was not saved, we save it,
     * this operation might throw because another instance runs save at the same time,
     */
    if (!pwHashDoc) {
      return rxDatabase.internalStore.put({
        _id: _util.LOCAL_PREFIX + 'pwHash',
        value: pwHash
      })["catch"](function () {
        return null;
      }).then(function () {
        return true;
      });
    } else if (pwHash !== pwHashDoc.value) {
      // different hash was already set by other instance
      return rxDatabase.destroy().then(function () {
        throw (0, _rxError.newRxError)('DB1', {
          passwordHash: (0, _util.hash)(rxDatabase.password),
          existingPasswordHash: pwHashDoc.value
        });
      });
    }

    return true;
  });
}

var rxdb = true;
exports.rxdb = rxdb;
var prototypes = {
  /**
   * set crypto-functions for the Crypter.prototype
   */
  Crypter: function Crypter(proto) {
    proto._encryptValue = _encryptValue;
    proto._decryptValue = _decryptValue;
  }
};
exports.prototypes = prototypes;
var overwritable = {
  validatePassword: function validatePassword(password) {
    if (password && typeof password !== 'string') {
      throw (0, _rxError.newRxTypeError)('EN1', {
        password: password
      });
    }

    if (password && password.length < minPassLength) {
      throw (0, _rxError.newRxError)('EN2', {
        minPassLength: minPassLength,
        password: password
      });
    }
  }
};
exports.overwritable = overwritable;
var RxDBEncryptionPlugin = {
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
exports.RxDBEncryptionPlugin = RxDBEncryptionPlugin;

//# sourceMappingURL=encryption.js.map