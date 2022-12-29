import _asyncToGenerator from "@babel/runtime/helpers/asyncToGenerator";
import _regeneratorRuntime from "@babel/runtime/regenerator";
/**
 * this plugin adds the encryption-capabilities to rxdb
 * It's using crypto-js/aes for password-encryption
 * @link https://github.com/brix/crypto-js
 */
import AES from 'crypto-js/aes';
import * as cryptoEnc from 'crypto-js/enc-utf8';
import objectPath from 'object-path';
import { wrapRxStorageInstance } from '../../plugin-helpers';
import { INTERNAL_STORE_SCHEMA_TITLE } from '../../rx-database-internal-store';
import { newRxError, newRxTypeError } from '../../rx-error';
import { hasEncryption } from '../../rx-storage-helper';
import { b64DecodeUnicode, b64EncodeUnicode, clone, ensureNotFalsy, flatClone } from '../../util';
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
    createStorageInstance: function () {
      var _createStorageInstance = _asyncToGenerator( /*#__PURE__*/_regeneratorRuntime.mark(function _callee(params) {
        var retInstance, password, schemaWithoutEncrypted, instance, modifyToStorage, modifyFromStorage, modifyAttachmentFromStorage;
        return _regeneratorRuntime.wrap(function _callee$(_context) {
          while (1) switch (_context.prev = _context.next) {
            case 0:
              modifyAttachmentFromStorage = function _modifyAttachmentFrom(attachmentData) {
                if (params.schema.attachments && params.schema.attachments.encrypted) {
                  var decrypted = decryptString(b64DecodeUnicode(attachmentData), password);
                  return decrypted;
                } else {
                  return attachmentData;
                }
              };
              modifyFromStorage = function _modifyFromStorage(docData) {
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
              };
              modifyToStorage = function _modifyToStorage(docData) {
                docData = cloneWithoutAttachments(docData);
                ensureNotFalsy(params.schema.encrypted).forEach(function (path) {
                  var value = objectPath.get(docData, path);
                  if (typeof value === 'undefined') {
                    return;
                  }
                  var stringValue = JSON.stringify(value);
                  var encrypted = encryptString(stringValue, password);
                  objectPath.set(docData, path, encrypted);
                });

                // handle attachments
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
              };
              if (hasEncryption(params.schema)) {
                _context.next = 18;
                break;
              }
              _context.next = 6;
              return args.storage.createStorageInstance(params);
            case 6:
              retInstance = _context.sent;
              if (!(params.schema.title === INTERNAL_STORE_SCHEMA_TITLE && params.password)) {
                _context.next = 17;
                break;
              }
              _context.prev = 8;
              validatePassword(params.password);
              _context.next = 17;
              break;
            case 12:
              _context.prev = 12;
              _context.t0 = _context["catch"](8);
              _context.next = 16;
              return retInstance.close();
            case 16:
              throw _context.t0;
            case 17:
              return _context.abrupt("return", retInstance);
            case 18:
              if (params.password) {
                _context.next = 20;
                break;
              }
              throw newRxError('EN3', {
                database: params.databaseName,
                collection: params.collectionName,
                schema: params.schema
              });
            case 20:
              password = params.password;
              schemaWithoutEncrypted = clone(params.schema);
              delete schemaWithoutEncrypted.encrypted;
              if (schemaWithoutEncrypted.attachments) {
                schemaWithoutEncrypted.attachments.encrypted = false;
              }
              _context.next = 26;
              return args.storage.createStorageInstance(Object.assign({}, params, {
                schema: schemaWithoutEncrypted
              }));
            case 26:
              instance = _context.sent;
              return _context.abrupt("return", wrapRxStorageInstance(instance, modifyToStorage, modifyFromStorage, modifyAttachmentFromStorage));
            case 28:
            case "end":
              return _context.stop();
          }
        }, _callee, null, [[8, 12]]);
      }));
      function createStorageInstance(_x) {
        return _createStorageInstance.apply(this, arguments);
      }
      return createStorageInstance;
    }()
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
//# sourceMappingURL=index.js.map