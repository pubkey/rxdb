"use strict";

var _interopRequireDefault = require("@babel/runtime/helpers/interopRequireDefault");

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.RxDBEncryptionPlugin = exports.MINIMUM_PASSWORD_LENGTH = void 0;
exports.decryptString = decryptString;
exports.encryptString = encryptString;
exports.storePasswordHashIntoDatabase = void 0;

var _aes = _interopRequireDefault(require("crypto-js/aes"));

var cryptoEnc = _interopRequireWildcard(require("crypto-js/enc-utf8"));

var _rxError = require("../rx-error");

var _objectPath = _interopRequireDefault(require("object-path"));

var _util = require("../util");

var _rxStorageHelper = require("../rx-storage-helper");

var _rxDatabaseInternalStore = require("../rx-database-internal-store");

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
    var pwHashDocumentKey = 'pwHash';
    var pwHashDocumentId = (0, _rxDatabaseInternalStore.getPrimaryKeyOfInternalDocument)(pwHashDocumentKey, _rxDatabaseInternalStore.INTERNAL_CONTEXT_ENCRYPTION);
    return Promise.resolve((0, _rxStorageHelper.getSingleDocument)(rxDatabase.internalStore, pwHashDocumentId)).then(function (pwHashDoc) {
      if (!pwHashDoc) {
        var docData = {
          id: pwHashDocumentId,
          key: pwHashDocumentKey,
          context: _rxDatabaseInternalStore.INTERNAL_CONTEXT_ENCRYPTION,
          data: {
            hash: pwHash
          },
          _attachments: {},
          _meta: (0, _util.getDefaultRxDocumentMeta)(),
          _deleted: false
        };
        return Promise.resolve(rxDatabase.internalStore.bulkWrite([{
          document: docData
        }])).then(function () {
          return true;
        });
      } else if (pwHash !== pwHashDoc.data.hash) {
        // different hash was already set by other instance
        return Promise.resolve(rxDatabase.destroy()).then(function () {
          throw (0, _rxError.newRxError)('DB1', {
            passwordHash: (0, _util.hash)(rxDatabase.password),
            existingPasswordHash: pwHashDoc.data.hash
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
var MINIMUM_PASSWORD_LENGTH = 8;
exports.MINIMUM_PASSWORD_LENGTH = MINIMUM_PASSWORD_LENGTH;

function encryptString(value, password) {
  var encrypted = _aes["default"].encrypt(value, password);

  return encrypted.toString();
}

function decryptString(cipherText, password) {
  /**
   * Trying to decrypt non-strings
   * will cause no errors and will be hard to debug.
   * So instead we do this check here.
   */
  if (typeof cipherText !== 'string') {
    throw (0, _rxError.newRxError)('SNH', {
      args: {
        cipherText: cipherText
      }
    });
  }

  var decrypted = _aes["default"].decrypt(cipherText, password);

  var ret = decrypted.toString(cryptoEnc);
  return ret;
}

function cloneWithoutAttachments(data) {
  var attachments = data._attachments;
  data = (0, _util.flatClone)(data);
  delete data._attachments;
  data = (0, _util.clone)(data);
  data._attachments = attachments;
  return data;
}

var RxDBEncryptionPlugin = {
  name: 'encryption',
  rxdb: true,
  prototypes: {},
  overwritable: {
    validatePassword: function validatePassword(password) {
      if (password && typeof password !== 'string') {
        throw (0, _rxError.newRxTypeError)('EN1', {
          password: password
        });
      }

      if (password && password.length < MINIMUM_PASSWORD_LENGTH) {
        throw (0, _rxError.newRxError)('EN2', {
          minPassLength: MINIMUM_PASSWORD_LENGTH,
          password: password
        });
      }
    }
  },
  hooks: {
    createRxDatabase: {
      after: function after(args) {
        return storePasswordHashIntoDatabase(args.database);
      }
    },
    preWriteToStorageInstance: {
      before: function before(args) {
        var password = args.database.password;
        var schema = args.schema;

        if (!password || !schema.encrypted || schema.encrypted.length === 0) {
          return;
        }

        var docData = cloneWithoutAttachments(args.doc);
        schema.encrypted.forEach(function (path) {
          var value = _objectPath["default"].get(docData, path);

          if (typeof value === 'undefined') {
            return;
          }

          var stringValue = JSON.stringify(value);
          var encrypted = encryptString(stringValue, password);

          _objectPath["default"].set(docData, path, encrypted);
        });
        args.doc = docData;
      }
    },
    postReadFromInstance: {
      after: function after(args) {
        var password = args.database.password;
        var schema = args.schema;

        if (!password || !schema.encrypted || schema.encrypted.length === 0) {
          return;
        }

        var docData = cloneWithoutAttachments(args.doc);
        schema.encrypted.forEach(function (path) {
          var value = _objectPath["default"].get(docData, path);

          if (typeof value === 'undefined') {
            return;
          }

          var decrypted = decryptString(value, password);
          var decryptedParsed = JSON.parse(decrypted);

          _objectPath["default"].set(docData, path, decryptedParsed);
        });
        args.doc = docData;
      }
    },
    preWriteAttachment: {
      after: function (args) {
        try {
          var password = args.database.password;
          var schema = args.schema;

          var _temp2 = function () {
            if (password && schema.attachments && schema.attachments.encrypted) {
              return Promise.resolve(_util.blobBufferUtil.toString(args.attachmentData.data)).then(function (dataString) {
                var encrypted = encryptString(dataString, password);
                args.attachmentData.data = encrypted;
              });
            }
          }();

          return Promise.resolve(_temp2 && _temp2.then ? _temp2.then(function () {}) : void 0);
        } catch (e) {
          return Promise.reject(e);
        }
      }
    },
    postReadAttachment: {
      after: function (args) {
        try {
          var password = args.database.password;
          var schema = args.schema;

          var _temp4 = function () {
            if (password && schema.attachments && schema.attachments.encrypted) {
              return Promise.resolve(_util.blobBufferUtil.toString(args.plainData)).then(function (dataString) {
                var decrypted = decryptString(dataString, password);
                args.plainData = decrypted;
              });
            }
          }();

          return Promise.resolve(_temp4 && _temp4.then ? _temp4.then(function () {}) : void 0);
        } catch (e) {
          return Promise.reject(e);
        }
      }
    }
  }
};
exports.RxDBEncryptionPlugin = RxDBEncryptionPlugin;
//# sourceMappingURL=encryption.js.map