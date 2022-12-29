"use strict";

var _interopRequireDefault = require("@babel/runtime/helpers/interopRequireDefault");
Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.MINIMUM_PASSWORD_LENGTH = void 0;
exports.decryptString = decryptString;
exports.encryptString = encryptString;
exports.wrappedKeyEncryptionStorage = wrappedKeyEncryptionStorage;
var _regenerator = _interopRequireDefault(require("@babel/runtime/regenerator"));
var _asyncToGenerator2 = _interopRequireDefault(require("@babel/runtime/helpers/asyncToGenerator"));
var _aes = _interopRequireDefault(require("crypto-js/aes"));
var cryptoEnc = _interopRequireWildcard(require("crypto-js/enc-utf8"));
var _objectPath = _interopRequireDefault(require("object-path"));
var _pluginHelpers = require("../../plugin-helpers");
var _rxDatabaseInternalStore = require("../../rx-database-internal-store");
var _rxError = require("../../rx-error");
var _rxStorageHelper = require("../../rx-storage-helper");
var _util = require("../../util");
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
    createStorageInstance: function () {
      var _createStorageInstance = (0, _asyncToGenerator2["default"])( /*#__PURE__*/_regenerator["default"].mark(function _callee(params) {
        var retInstance, password, schemaWithoutEncrypted, instance, modifyToStorage, modifyFromStorage, modifyAttachmentFromStorage;
        return _regenerator["default"].wrap(function _callee$(_context) {
          while (1) switch (_context.prev = _context.next) {
            case 0:
              modifyAttachmentFromStorage = function _modifyAttachmentFrom(attachmentData) {
                if (params.schema.attachments && params.schema.attachments.encrypted) {
                  var decrypted = decryptString((0, _util.b64DecodeUnicode)(attachmentData), password);
                  return decrypted;
                } else {
                  return attachmentData;
                }
              };
              modifyFromStorage = function _modifyFromStorage(docData) {
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
              };
              modifyToStorage = function _modifyToStorage(docData) {
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
              };
              if ((0, _rxStorageHelper.hasEncryption)(params.schema)) {
                _context.next = 18;
                break;
              }
              _context.next = 6;
              return args.storage.createStorageInstance(params);
            case 6:
              retInstance = _context.sent;
              if (!(params.schema.title === _rxDatabaseInternalStore.INTERNAL_STORE_SCHEMA_TITLE && params.password)) {
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
              throw (0, _rxError.newRxError)('EN3', {
                database: params.databaseName,
                collection: params.collectionName,
                schema: params.schema
              });
            case 20:
              password = params.password;
              schemaWithoutEncrypted = (0, _util.clone)(params.schema);
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
              return _context.abrupt("return", (0, _pluginHelpers.wrapRxStorageInstance)(instance, modifyToStorage, modifyFromStorage, modifyAttachmentFromStorage));
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