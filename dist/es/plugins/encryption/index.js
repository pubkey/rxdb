/**
 * this plugin adds the encryption-capabilities to rxdb
 * It's using crypto-js/aes for password-encryption
 * @link https://github.com/brix/crypto-js
 */
import AES from 'crypto-js/aes';
import * as cryptoEnc from 'crypto-js/enc-utf8';
import { wrapRxStorageInstance } from '../../plugin-helpers';
import { INTERNAL_STORE_SCHEMA_TITLE } from '../../rx-database-internal-store';
import { newRxError, newRxTypeError } from '../../rx-error';
import { hasEncryption } from '../../rx-storage-helper';
import { b64DecodeUnicode, b64EncodeUnicode, clone, ensureNotFalsy, flatClone, getProperty, setProperty } from '../../plugins/utils';
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
  var ret = decrypted.toString(cryptoEnc);
  return ret;
}
export function wrappedKeyEncryptionStorage(args) {
  return Object.assign({}, args.storage, {
    async createStorageInstance(params) {
      if (!hasEncryption(params.schema)) {
        var retInstance = await args.storage.createStorageInstance(params);
        if (params.schema.title === INTERNAL_STORE_SCHEMA_TITLE && params.password) {
          try {
            validatePassword(params.password);
          } catch (err) {
            /**
             * Even if the checks fail,
             * we have to clean up.
             */
            await retInstance.close();
            throw err;
          }
        }
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
      return wrapRxStorageInstance(instance, modifyToStorage, modifyFromStorage, modifyAttachmentFromStorage);
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
  if (password && typeof password !== 'string') {
    throw newRxTypeError('EN1', {
      password
    });
  }
  if (password && password.length < MINIMUM_PASSWORD_LENGTH) {
    throw newRxError('EN2', {
      minPassLength: MINIMUM_PASSWORD_LENGTH,
      password
    });
  }
}
//# sourceMappingURL=index.js.map