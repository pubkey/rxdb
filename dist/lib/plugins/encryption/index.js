"use strict";

var _interopRequireDefault = require("@babel/runtime/helpers/interopRequireDefault");
Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.MINIMUM_PASSWORD_LENGTH = void 0;
exports.decryptString = decryptString;
exports.encryptString = encryptString;
exports.wrappedKeyEncryptionStorage = wrappedKeyEncryptionStorage;
var _aes = _interopRequireDefault(require("crypto-js/aes"));
var cryptoEnc = _interopRequireWildcard(require("crypto-js/enc-utf8"));
var _objectPath = _interopRequireDefault(require("object-path"));
var _pluginHelpers = require("../../plugin-helpers");
var _rxDatabaseInternalStore = require("../../rx-database-internal-store");
var _rxError = require("../../rx-error");
var _rxStorageHelper = require("../../rx-storage-helper");
var _util = require("../../util");
function _catch(body, recover) {
  try {
    var result = body();
  } catch (e) {
    return recover(e);
  }
  if (result && result.then) {
    return result.then(void 0, recover);
  }
  return result;
}
function _getRequireWildcardCache(nodeInterop) { if (typeof WeakMap !== "function") return null; var cacheBabelInterop = new WeakMap(); var cacheNodeInterop = new WeakMap(); return (_getRequireWildcardCache = function _getRequireWildcardCache(nodeInterop) { return nodeInterop ? cacheNodeInterop : cacheBabelInterop; })(nodeInterop); }
function _interopRequireWildcard(obj, nodeInterop) { if (!nodeInterop && obj && obj.__esModule) { return obj; } if (obj === null || typeof obj !== "object" && typeof obj !== "function") { return { "default": obj }; } var cache = _getRequireWildcardCache(nodeInterop); if (cache && cache.has(obj)) { return cache.get(obj); } var newObj = {}; var hasPropertyDescriptor = Object.defineProperty && Object.getOwnPropertyDescriptor; for (var key in obj) { if (key !== "default" && Object.prototype.hasOwnProperty.call(obj, key)) { var desc = hasPropertyDescriptor ? Object.getOwnPropertyDescriptor(obj, key) : null; if (desc && (desc.get || desc.set)) { Object.defineProperty(newObj, key, desc); } else { newObj[key] = obj[key]; } } } newObj["default"] = obj; if (cache) { cache.set(obj, newObj); } return newObj; }
/**
 * this plugin adds the encryption-capabilities to rxdb
 * It's using crypto-js/aes for password-encryption
 * @link https://github.com/brix/crypto-js
 */

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
function wrappedKeyEncryptionStorage(args) {
  return Object.assign({}, args.storage, {
    createStorageInstance: function createStorageInstance(params) {
      try {
        var _temp4 = function _temp4(_result) {
          if (_exit) return _result;
          if (!params.password) {
            throw (0, _rxError.newRxError)('EN3', {
              database: params.databaseName,
              collection: params.collectionName,
              schema: params.schema
            });
          }
          var password = params.password;
          var schemaWithoutEncrypted = (0, _util.clone)(params.schema);
          delete schemaWithoutEncrypted.encrypted;
          if (schemaWithoutEncrypted.attachments) {
            schemaWithoutEncrypted.attachments.encrypted = false;
          }
          function modifyToStorage(docData) {
            docData = cloneWithoutAttachments(docData);
            (0, _util.ensureNotFalsy)(params.schema.encrypted).forEach(function (path) {
              var value = _objectPath["default"].get(docData, path);
              if (typeof value === 'undefined') {
                return;
              }
              var stringValue = JSON.stringify(value);
              var encrypted = encryptString(stringValue, password);
              _objectPath["default"].set(docData, path, encrypted);
            });

            // handle attachments
            if (params.schema.attachments && params.schema.attachments.encrypted) {
              var newAttachments = {};
              Object.entries(docData._attachments).forEach(function (_ref) {
                var id = _ref[0],
                  attachment = _ref[1];
                var useAttachment = (0, _util.flatClone)(attachment);
                if (useAttachment.data) {
                  var dataString = useAttachment.data;
                  useAttachment.data = (0, _util.b64EncodeUnicode)(encryptString(dataString, password));
                }
                newAttachments[id] = useAttachment;
              });
              docData._attachments = newAttachments;
            }
            return docData;
          }
          function modifyFromStorage(docData) {
            docData = cloneWithoutAttachments(docData);
            (0, _util.ensureNotFalsy)(params.schema.encrypted).forEach(function (path) {
              var value = _objectPath["default"].get(docData, path);
              if (typeof value === 'undefined') {
                return;
              }
              var decrypted = decryptString(value, password);
              var decryptedParsed = JSON.parse(decrypted);
              _objectPath["default"].set(docData, path, decryptedParsed);
            });
            return docData;
          }
          function modifyAttachmentFromStorage(attachmentData) {
            if (params.schema.attachments && params.schema.attachments.encrypted) {
              var decrypted = decryptString((0, _util.b64DecodeUnicode)(attachmentData), password);
              return decrypted;
            } else {
              return attachmentData;
            }
          }
          return Promise.resolve(args.storage.createStorageInstance(Object.assign({}, params, {
            schema: schemaWithoutEncrypted
          }))).then(function (instance) {
            return (0, _pluginHelpers.wrapRxStorageInstance)(instance, modifyToStorage, modifyFromStorage, modifyAttachmentFromStorage);
          });
        };
        var _exit = false;
        var _temp3 = function () {
          if (!(0, _rxStorageHelper.hasEncryption)(params.schema)) {
            return Promise.resolve(args.storage.createStorageInstance(params)).then(function (retInstance) {
              var _exit2 = false;
              function _temp2(_result3) {
                if (_exit2) return _result3;
                _exit = true;
                return retInstance;
              }
              var _temp = function () {
                if (params.schema.title === _rxDatabaseInternalStore.INTERNAL_STORE_SCHEMA_TITLE && params.password) {
                  return _catch(function () {
                    validatePassword(params.password);
                  }, function (err) {
                    /**
                     * Even if the checks fail,
                     * we have to clean up.
                     */
                    return Promise.resolve(retInstance.close()).then(function () {
                      throw err;
                    });
                  });
                }
              }();
              return _temp && _temp.then ? _temp.then(_temp2) : _temp2(_temp);
            });
          }
        }();
        return Promise.resolve(_temp3 && _temp3.then ? _temp3.then(_temp4) : _temp4(_temp3));
      } catch (e) {
        return Promise.reject(e);
      }
    }
  });
}
function cloneWithoutAttachments(data) {
  var attachments = data._attachments;
  data = (0, _util.flatClone)(data);
  delete data._attachments;
  data = (0, _util.clone)(data);
  data._attachments = attachments;
  return data;
}
function validatePassword(password) {
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
//# sourceMappingURL=index.js.map