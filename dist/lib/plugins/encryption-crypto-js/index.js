"use strict";

var _interopRequireDefault = require("@babel/runtime/helpers/interopRequireDefault");
Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.MINIMUM_PASSWORD_LENGTH = void 0;
exports.decryptString = decryptString;
exports.encryptString = encryptString;
exports.wrappedKeyEncryptionCryptoJsStorage = wrappedKeyEncryptionCryptoJsStorage;
var _aes = _interopRequireDefault(require("crypto-js/aes"));
var cryptoEnc = _interopRequireWildcard(require("crypto-js/enc-utf8"));
var _pluginHelpers = require("../../plugin-helpers");
var _rxError = require("../../rx-error");
var _rxStorageHelper = require("../../rx-storage-helper");
var _utils = require("../../plugins/utils");
function _getRequireWildcardCache(e) { if ("function" != typeof WeakMap) return null; var r = new WeakMap(), t = new WeakMap(); return (_getRequireWildcardCache = function (e) { return e ? t : r; })(e); }
function _interopRequireWildcard(e, r) { if (!r && e && e.__esModule) return e; if (null === e || "object" != typeof e && "function" != typeof e) return { default: e }; var t = _getRequireWildcardCache(r); if (t && t.has(e)) return t.get(e); var n = { __proto__: null }, a = Object.defineProperty && Object.getOwnPropertyDescriptor; for (var u in e) if ("default" !== u && Object.prototype.hasOwnProperty.call(e, u)) { var i = a ? Object.getOwnPropertyDescriptor(e, u) : null; i && (i.get || i.set) ? Object.defineProperty(n, u, i) : n[u] = e[u]; } return n.default = e, t && t.set(e, n), n; }
/**
 * this plugin adds the encryption-capabilities to rxdb
 * It's using crypto-js/aes for password-encryption
 * @link https://github.com/brix/crypto-js
 */

var MINIMUM_PASSWORD_LENGTH = exports.MINIMUM_PASSWORD_LENGTH = 8;
function encryptString(value, password) {
  var encrypted = _aes.default.encrypt(value, password);
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
        cipherText
      }
    });
  }
  var decrypted = _aes.default.decrypt(cipherText, password);
  var ret = decrypted.toString(cryptoEnc);
  return ret;
}
function wrappedKeyEncryptionCryptoJsStorage(args) {
  return Object.assign({}, args.storage, {
    async createStorageInstance(params) {
      if (typeof params.password !== 'undefined') {
        validatePassword(params.password);
      }
      if (!(0, _rxStorageHelper.hasEncryption)(params.schema)) {
        var retInstance = await args.storage.createStorageInstance(params);
        return retInstance;
      }
      if (!params.password) {
        throw (0, _rxError.newRxError)('EN3', {
          database: params.databaseName,
          collection: params.collectionName,
          schema: params.schema
        });
      }
      var password = params.password;
      var schemaWithoutEncrypted = (0, _utils.clone)(params.schema);
      delete schemaWithoutEncrypted.encrypted;
      if (schemaWithoutEncrypted.attachments) {
        schemaWithoutEncrypted.attachments.encrypted = false;
      }
      var instance = await args.storage.createStorageInstance(Object.assign({}, params, {
        schema: schemaWithoutEncrypted
      }));
      function modifyToStorage(docData) {
        docData = cloneWithoutAttachments(docData);
        (0, _utils.ensureNotFalsy)(params.schema.encrypted).forEach(path => {
          var value = (0, _utils.getProperty)(docData, path);
          if (typeof value === 'undefined') {
            return;
          }
          var stringValue = JSON.stringify(value);
          var encrypted = encryptString(stringValue, password);
          (0, _utils.setProperty)(docData, path, encrypted);
        });

        // handle attachments
        if (params.schema.attachments && params.schema.attachments.encrypted) {
          var newAttachments = {};
          Object.entries(docData._attachments).forEach(([id, attachment]) => {
            var useAttachment = (0, _utils.flatClone)(attachment);
            if (useAttachment.data) {
              var dataString = useAttachment.data;
              useAttachment.data = (0, _utils.b64EncodeUnicode)(encryptString(dataString, password));
            }
            newAttachments[id] = useAttachment;
          });
          docData._attachments = newAttachments;
        }
        return docData;
      }
      function modifyFromStorage(docData) {
        docData = cloneWithoutAttachments(docData);
        (0, _utils.ensureNotFalsy)(params.schema.encrypted).forEach(path => {
          var value = (0, _utils.getProperty)(docData, path);
          if (typeof value === 'undefined') {
            return;
          }
          var decrypted = decryptString(value, password);
          var decryptedParsed = JSON.parse(decrypted);
          (0, _utils.setProperty)(docData, path, decryptedParsed);
        });
        return docData;
      }
      function modifyAttachmentFromStorage(attachmentData) {
        if (params.schema.attachments && params.schema.attachments.encrypted) {
          var decrypted = decryptString((0, _utils.b64DecodeUnicode)(attachmentData), password);
          return decrypted;
        } else {
          return attachmentData;
        }
      }
      return (0, _pluginHelpers.wrapRxStorageInstance)(instance, modifyToStorage, modifyFromStorage, modifyAttachmentFromStorage);
    }
  });
}
function cloneWithoutAttachments(data) {
  var attachments = data._attachments;
  data = (0, _utils.flatClone)(data);
  delete data._attachments;
  data = (0, _utils.clone)(data);
  data._attachments = attachments;
  return data;
}
function validatePassword(password) {
  if (typeof password !== 'string') {
    throw (0, _rxError.newRxTypeError)('EN1', {
      password
    });
  }
  if (password.length < MINIMUM_PASSWORD_LENGTH) {
    throw (0, _rxError.newRxError)('EN2', {
      minPassLength: MINIMUM_PASSWORD_LENGTH,
      password
    });
  }
}
//# sourceMappingURL=index.js.map