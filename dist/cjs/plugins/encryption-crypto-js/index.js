"use strict";

var _interopRequireDefault = require("@babel/runtime/helpers/interopRequireDefault");
Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.MINIMUM_PASSWORD_LENGTH = void 0;
exports.decryptString = decryptString;
exports.encryptString = encryptString;
exports.wrappedKeyEncryptionCryptoJsStorage = wrappedKeyEncryptionCryptoJsStorage;
var _cryptoJs = _interopRequireDefault(require("crypto-js"));
var _pluginHelpers = require("../../plugin-helpers.js");
var _rxError = require("../../rx-error.js");
var _rxStorageHelper = require("../../rx-storage-helper.js");
var _index = require("../../plugins/utils/index.js");
/**
 * this plugin adds the encryption-capabilities to rxdb
 * It's using crypto-js/aes for password-encryption
 * @link https://github.com/brix/crypto-js
 */

var {
  AES,
  enc: cryptoEnc
} = _cryptoJs.default;
var MINIMUM_PASSWORD_LENGTH = exports.MINIMUM_PASSWORD_LENGTH = 8;
function encryptString(value, password) {
  var encrypted = AES.encrypt(value, password);
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
  var decrypted = AES.decrypt(cipherText, password);
  var ret = decrypted.toString(cryptoEnc.Utf8);
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
      var schemaWithoutEncrypted = (0, _index.clone)(params.schema);
      delete schemaWithoutEncrypted.encrypted;
      if (schemaWithoutEncrypted.attachments) {
        schemaWithoutEncrypted.attachments.encrypted = false;
      }

      /**
       * Encrypted data is always stored as string
       * so we have to change the schema to have "type": "string"
       * on encrypted fields.
       */
      (0, _index.ensureNotFalsy)(params.schema.encrypted).forEach(key => {
        schemaWithoutEncrypted.properties[key].type = 'string';
        delete schemaWithoutEncrypted.properties[key].properties;
      });
      var instance = await args.storage.createStorageInstance(Object.assign({}, params, {
        schema: schemaWithoutEncrypted
      }));
      function modifyToStorage(docData) {
        docData = cloneWithoutAttachments(docData);
        (0, _index.ensureNotFalsy)(params.schema.encrypted).forEach(path => {
          var value = (0, _index.getProperty)(docData, path);
          if (typeof value === 'undefined') {
            return;
          }
          var stringValue = JSON.stringify(value);
          var encrypted = encryptString(stringValue, password);
          (0, _index.setProperty)(docData, path, encrypted);
        });

        // handle attachments
        if (params.schema.attachments && params.schema.attachments.encrypted) {
          var newAttachments = {};
          Object.entries(docData._attachments).forEach(([id, attachment]) => {
            var useAttachment = (0, _index.flatClone)(attachment);
            if (useAttachment.data) {
              var dataString = useAttachment.data;
              useAttachment.data = (0, _index.b64EncodeUnicode)(encryptString(dataString, password));
            }
            newAttachments[id] = useAttachment;
          });
          docData._attachments = newAttachments;
        }
        return docData;
      }
      function modifyFromStorage(docData) {
        docData = cloneWithoutAttachments(docData);
        (0, _index.ensureNotFalsy)(params.schema.encrypted).forEach(path => {
          var value = (0, _index.getProperty)(docData, path);
          if (typeof value === 'undefined') {
            return;
          }
          var decrypted = decryptString(value, password);
          var decryptedParsed = JSON.parse(decrypted);
          (0, _index.setProperty)(docData, path, decryptedParsed);
        });
        return docData;
      }
      function modifyAttachmentFromStorage(attachmentData) {
        if (params.schema.attachments && params.schema.attachments.encrypted) {
          var decrypted = decryptString((0, _index.b64DecodeUnicode)(attachmentData), password);
          return decrypted;
        } else {
          return attachmentData;
        }
      }
      return (0, _pluginHelpers.wrapRxStorageInstance)(params.schema, instance, modifyToStorage, modifyFromStorage, modifyAttachmentFromStorage);
    }
  });
}
function cloneWithoutAttachments(data) {
  var attachments = data._attachments;
  data = (0, _index.flatClone)(data);
  delete data._attachments;
  data = (0, _index.clone)(data);
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