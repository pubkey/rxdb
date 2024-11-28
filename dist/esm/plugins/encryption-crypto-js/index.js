/**
 * this plugin adds the encryption-capabilities to rxdb
 * It's using crypto-js/aes for password-encryption
 * @link https://github.com/brix/crypto-js
 */
import pkg from 'crypto-js';
var {
  AES,
  enc: cryptoEnc
} = pkg;
import { wrapRxStorageInstance } from "../../plugin-helpers.js";
import { newRxError, newRxTypeError } from "../../rx-error.js";
import { hasEncryption } from "../../rx-storage-helper.js";
import { b64DecodeUnicode, b64EncodeUnicode, clone, ensureNotFalsy, flatClone, getProperty, setProperty } from "../../plugins/utils/index.js";
export var MINIMUM_PASSWORD_LENGTH = 8;
export function encryptString(value, password) {
  var encrypted = AES.encrypt(value, password);
  return encrypted.toString();
}
export function decryptString(cipherText, password) {
  /**
   * Trying to decrypt non-strings
   * will cause no errors and will be hard to debug.
   * So instead we do this check here.
   */
  if (typeof cipherText !== 'string') {
    throw newRxError('SNH', {
      args: {
        cipherText
      }
    });
  }
  var decrypted = AES.decrypt(cipherText, password);
  var ret = decrypted.toString(cryptoEnc.Utf8);
  return ret;
}
export function wrappedKeyEncryptionCryptoJsStorage(args) {
  return Object.assign({}, args.storage, {
    async createStorageInstance(params) {
      if (typeof params.password !== 'undefined') {
        validatePassword(params.password);
      }
      if (!hasEncryption(params.schema)) {
        var retInstance = await args.storage.createStorageInstance(params);
        return retInstance;
      }
      if (!params.password) {
        throw newRxError('EN3', {
          database: params.databaseName,
          collection: params.collectionName,
          schema: params.schema
        });
      }
      var password = params.password;
      var schemaWithoutEncrypted = clone(params.schema);
      delete schemaWithoutEncrypted.encrypted;
      if (schemaWithoutEncrypted.attachments) {
        schemaWithoutEncrypted.attachments.encrypted = false;
      }

      /**
       * Encrypted data is always stored as string
       * so we have to change the schema to have "type": "string"
       * on encrypted fields.
       */
      ensureNotFalsy(params.schema.encrypted).forEach(key => {
        schemaWithoutEncrypted.properties[key].type = 'string';
        delete schemaWithoutEncrypted.properties[key].properties;
      });
      var instance = await args.storage.createStorageInstance(Object.assign({}, params, {
        schema: schemaWithoutEncrypted
      }));
      function modifyToStorage(docData) {
        docData = cloneWithoutAttachments(docData);
        ensureNotFalsy(params.schema.encrypted).forEach(path => {
          var value = getProperty(docData, path);
          if (typeof value === 'undefined') {
            return;
          }
          var stringValue = JSON.stringify(value);
          var encrypted = encryptString(stringValue, password);
          setProperty(docData, path, encrypted);
        });

        // handle attachments
        if (params.schema.attachments && params.schema.attachments.encrypted) {
          var newAttachments = {};
          Object.entries(docData._attachments).forEach(([id, attachment]) => {
            var useAttachment = flatClone(attachment);
            if (useAttachment.data) {
              var dataString = useAttachment.data;
              useAttachment.data = b64EncodeUnicode(encryptString(dataString, password));
            }
            newAttachments[id] = useAttachment;
          });
          docData._attachments = newAttachments;
        }
        return docData;
      }
      function modifyFromStorage(docData) {
        docData = cloneWithoutAttachments(docData);
        ensureNotFalsy(params.schema.encrypted).forEach(path => {
          var value = getProperty(docData, path);
          if (typeof value === 'undefined') {
            return;
          }
          var decrypted = decryptString(value, password);
          var decryptedParsed = JSON.parse(decrypted);
          setProperty(docData, path, decryptedParsed);
        });
        return docData;
      }
      function modifyAttachmentFromStorage(attachmentData) {
        if (params.schema.attachments && params.schema.attachments.encrypted) {
          var decrypted = decryptString(b64DecodeUnicode(attachmentData), password);
          return decrypted;
        } else {
          return attachmentData;
        }
      }
      return wrapRxStorageInstance(params.schema, instance, modifyToStorage, modifyFromStorage, modifyAttachmentFromStorage);
    }
  });
}
function cloneWithoutAttachments(data) {
  var attachments = data._attachments;
  data = flatClone(data);
  delete data._attachments;
  data = clone(data);
  data._attachments = attachments;
  return data;
}
function validatePassword(password) {
  if (typeof password !== 'string') {
    throw newRxTypeError('EN1', {
      password
    });
  }
  if (password.length < MINIMUM_PASSWORD_LENGTH) {
    throw newRxError('EN2', {
      minPassLength: MINIMUM_PASSWORD_LENGTH,
      password
    });
  }
}
//# sourceMappingURL=index.js.map