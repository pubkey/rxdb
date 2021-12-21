"use strict";

var _interopRequireDefault = require("@babel/runtime/helpers/interopRequireDefault");

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.RxDBEncryptionPlugin = void 0;
exports.decrypt = decrypt;
exports.encrypt = encrypt;
exports.storePasswordHashIntoDatabase = exports.rxdb = exports.prototypes = exports.overwritable = void 0;

var _aes = _interopRequireDefault(require("crypto-js/aes"));

var cryptoEnc = _interopRequireWildcard(require("crypto-js/enc-utf8"));

var _rxError = require("../rx-error");

var _util = require("../util");

var _rxStorageHelper = require("../rx-storage-helper");

function _getRequireWildcardCache(nodeInterop) { if (typeof WeakMap !== "function") return null; var cacheBabelInterop = new WeakMap(); var cacheNodeInterop = new WeakMap(); return (_getRequireWildcardCache = function _getRequireWildcardCache(nodeInterop) { return nodeInterop ? cacheNodeInterop : cacheBabelInterop; })(nodeInterop); }

function _interopRequireWildcard(obj, nodeInterop) { if (!nodeInterop && obj && obj.__esModule) { return obj; } if (obj === null || typeof obj !== "object" && typeof obj !== "function") { return { "default": obj }; } var cache = _getRequireWildcardCache(nodeInterop); if (cache && cache.has(obj)) { return cache.get(obj); } var newObj = {}; var hasPropertyDescriptor = Object.defineProperty && Object.getOwnPropertyDescriptor; for (var key in obj) { if (key !== "default" && Object.prototype.hasOwnProperty.call(obj, key)) { var desc = hasPropertyDescriptor ? Object.getOwnPropertyDescriptor(obj, key) : null; if (desc && (desc.get || desc.set)) { Object.defineProperty(newObj, key, desc); } else { newObj[key] = obj[key]; } } } newObj["default"] = obj; if (cache) { cache.set(obj, newObj); } return newObj; }

/**
 * this plugin adds the encryption-capabilities to rxdb
 * It's using crypto-js/aes for password-encryption
 * @link https://github.com/brix/crypto-js
 */

/**
 * validates and inserts the password hash into the internal collection
 * to ensure there is/was no other instance with a different password
 * which would cause strange side effects when both instances save into the same db
 */
var storePasswordHashIntoDatabase = function storePasswordHashIntoDatabase(rxDatabase) {
  try {
    if (!rxDatabase.password) {
      return Promise.resolve(_util.PROMISE_RESOLVE_FALSE);
    }

    var pwHash = (0, _util.hash)(rxDatabase.password);
    var pwHashDocumentId = 'pwHash';
    return Promise.resolve((0, _rxStorageHelper.findLocalDocument)(rxDatabase.localDocumentsStore, pwHashDocumentId)).then(function (pwHashDoc) {
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
          throw (0, _rxError.newRxError)('DB1', {
            passwordHash: (0, _util.hash)(rxDatabase.password),
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

exports.storePasswordHashIntoDatabase = storePasswordHashIntoDatabase;
var minPassLength = 8;

function encrypt(value, password) {
  var encrypted = _aes["default"].encrypt(value, password);

  return encrypted.toString();
}

function decrypt(cipherText, password) {
  var decrypted = _aes["default"].decrypt(cipherText, password);

  return decrypted.toString(cryptoEnc);
}

var _encryptString = function _encryptString(value) {
  return encrypt(value, this.password);
};

var _decryptString = function _decryptString(encryptedValue) {
  var decrypted = decrypt(encryptedValue, this.password);
  return decrypted;
};

var rxdb = true;
exports.rxdb = rxdb;
var prototypes = {
  /**
   * set crypto-functions for the Crypter.prototype
   */
  Crypter: function Crypter(proto) {
    proto._encryptString = _encryptString;
    proto._decryptString = _decryptString;
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