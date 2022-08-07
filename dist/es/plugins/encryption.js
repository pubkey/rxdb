/**
 * this plugin adds the encryption-capabilities to rxdb
 * It's using crypto-js/aes for password-encryption
 * @link https://github.com/brix/crypto-js
 */
import AES from 'crypto-js/aes';
import * as cryptoEnc from 'crypto-js/enc-utf8';
import objectPath from 'object-path';
import { wrapRxStorageInstance } from '../plugin-helpers';
import { INTERNAL_STORE_SCHEMA_TITLE } from '../rx-database-internal-store';
import { newRxError, newRxTypeError } from '../rx-error';
import { hasEncryption } from '../rx-storage-helper';
import { b64DecodeUnicode, b64EncodeUnicode, clone, ensureNotFalsy, flatClone } from '../util';

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
        cipherText: cipherText
      }
    });
  }

  var decrypted = AES.decrypt(cipherText, password);
  var ret = decrypted.toString(cryptoEnc);
  return ret;
}
export function wrappedKeyEncryptionStorage(args) {
  return Object.assign({}, args.storage, {
    createStorageInstance: function createStorageInstance(params) {
      try {
        var _temp5 = function _temp5(_result) {
          if (_exit3) return _result;

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

          function modifyToStorage(docData) {
            docData = cloneWithoutAttachments(docData);
            ensureNotFalsy(params.schema.encrypted).forEach(function (path) {
              var value = objectPath.get(docData, path);

              if (typeof value === 'undefined') {
                return;
              }

              var stringValue = JSON.stringify(value);
              var encrypted = encryptString(stringValue, password);
              objectPath.set(docData, path, encrypted);
            }); // handle attachments

            if (params.schema.attachments && params.schema.attachments.encrypted) {
              var newAttachments = {};
              Object.entries(docData._attachments).forEach(function (_ref) {
                var id = _ref[0],
                    attachment = _ref[1];
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
            ensureNotFalsy(params.schema.encrypted).forEach(function (path) {
              var value = objectPath.get(docData, path);

              if (typeof value === 'undefined') {
                return;
              }

              var decrypted = decryptString(value, password);
              var decryptedParsed = JSON.parse(decrypted);
              objectPath.set(docData, path, decryptedParsed);
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

          return Promise.resolve(args.storage.createStorageInstance(Object.assign({}, params, {
            schema: schemaWithoutEncrypted
          }))).then(function (instance) {
            return wrapRxStorageInstance(instance, modifyToStorage, modifyFromStorage, modifyAttachmentFromStorage);
          });
        };

        var _exit3 = false;

        var _temp6 = function () {
          if (!hasEncryption(params.schema)) {
            return Promise.resolve(args.storage.createStorageInstance(params)).then(function (retInstance) {
              var _exit2 = false;

              function _temp2(_result3) {
                if (_exit2) return _result3;
                _exit3 = true;
                return retInstance;
              }

              var _temp = function () {
                if (params.schema.title === INTERNAL_STORE_SCHEMA_TITLE && params.password) {
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

        return Promise.resolve(_temp6 && _temp6.then ? _temp6.then(_temp5) : _temp5(_temp6));
      } catch (e) {
        return Promise.reject(e);
      }
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
      password: password
    });
  }

  if (password && password.length < MINIMUM_PASSWORD_LENGTH) {
    throw newRxError('EN2', {
      minPassLength: MINIMUM_PASSWORD_LENGTH,
      password: password
    });
  }
}
//# sourceMappingURL=encryption.js.map