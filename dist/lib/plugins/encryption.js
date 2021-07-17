"use strict";

var _interopRequireDefault = require("@babel/runtime/helpers/interopRequireDefault");

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.encrypt = encrypt;
exports.decrypt = decrypt;
exports.storePasswordHashIntoDatabase = storePasswordHashIntoDatabase;
exports.RxDBEncryptionPlugin = exports.overwritable = exports.prototypes = exports.rxdb = void 0;

var _regenerator = _interopRequireDefault(require("@babel/runtime/regenerator"));

var _asyncToGenerator2 = _interopRequireDefault(require("@babel/runtime/helpers/asyncToGenerator"));

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

/**
 * validates and inserts the password hash into the internal collection
 * to ensure there is/was no other instance with a different password
 * which would cause strange side effects when both instances save into the same db
 */
function storePasswordHashIntoDatabase(_x) {
  return _storePasswordHashIntoDatabase.apply(this, arguments);
}

function _storePasswordHashIntoDatabase() {
  _storePasswordHashIntoDatabase = (0, _asyncToGenerator2["default"])( /*#__PURE__*/_regenerator["default"].mark(function _callee(rxDatabase) {
    var pwHash, pwHashDocumentId, pwHashDoc, docData;
    return _regenerator["default"].wrap(function _callee$(_context) {
      while (1) {
        switch (_context.prev = _context.next) {
          case 0:
            if (rxDatabase.password) {
              _context.next = 2;
              break;
            }

            return _context.abrupt("return", Promise.resolve(false));

          case 2:
            pwHash = (0, _util.hash)(rxDatabase.password);
            pwHashDocumentId = 'pwHash';
            _context.next = 6;
            return (0, _rxStorageHelper.findLocalDocument)(rxDatabase.localDocumentsStore, pwHashDocumentId);

          case 6:
            pwHashDoc = _context.sent;

            if (pwHashDoc) {
              _context.next = 14;
              break;
            }

            docData = {
              _id: pwHashDocumentId,
              value: pwHash,
              _attachments: {}
            };
            _context.next = 11;
            return rxDatabase.localDocumentsStore.bulkWrite([{
              document: docData
            }]);

          case 11:
            return _context.abrupt("return", true);

          case 14:
            if (!(pwHash !== pwHashDoc.value)) {
              _context.next = 20;
              break;
            }

            _context.next = 17;
            return rxDatabase.destroy();

          case 17:
            throw (0, _rxError.newRxError)('DB1', {
              passwordHash: (0, _util.hash)(rxDatabase.password),
              existingPasswordHash: pwHashDoc.value
            });

          case 20:
            return _context.abrupt("return", true);

          case 21:
          case "end":
            return _context.stop();
        }
      }
    }, _callee);
  }));
  return _storePasswordHashIntoDatabase.apply(this, arguments);
}

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