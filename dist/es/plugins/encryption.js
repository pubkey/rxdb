import _asyncToGenerator from "@babel/runtime/helpers/asyncToGenerator";
import _regeneratorRuntime from "@babel/runtime/regenerator";

/**
 * this plugin adds the encryption-capabilities to rxdb
 * It's using crypto-js/aes for password-encryption
 * @link https://github.com/brix/crypto-js
 */
import AES from 'crypto-js/aes';
import * as cryptoEnc from 'crypto-js/enc-utf8';
import { newRxTypeError, newRxError } from '../rx-error';
import { hash } from '../util';
import { findLocalDocument } from '../rx-storage-helper';
var minPassLength = 8;
export function encrypt(value, password) {
  var encrypted = AES.encrypt(value, password);
  return encrypted.toString();
}
export function decrypt(cipherText, password) {
  var decrypted = AES.decrypt(cipherText, password);
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
export function storePasswordHashIntoDatabase(_x) {
  return _storePasswordHashIntoDatabase.apply(this, arguments);
}

function _storePasswordHashIntoDatabase() {
  _storePasswordHashIntoDatabase = _asyncToGenerator( /*#__PURE__*/_regeneratorRuntime.mark(function _callee(rxDatabase) {
    var pwHash, pwHashDocumentId, pwHashDoc, docData;
    return _regeneratorRuntime.wrap(function _callee$(_context) {
      while (1) {
        switch (_context.prev = _context.next) {
          case 0:
            if (rxDatabase.password) {
              _context.next = 2;
              break;
            }

            return _context.abrupt("return", Promise.resolve(false));

          case 2:
            pwHash = hash(rxDatabase.password);
            pwHashDocumentId = 'pwHash';
            _context.next = 6;
            return findLocalDocument(rxDatabase.localDocumentsStore, pwHashDocumentId);

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
            throw newRxError('DB1', {
              passwordHash: hash(rxDatabase.password),
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

export var rxdb = true;
export var prototypes = {
  /**
   * set crypto-functions for the Crypter.prototype
   */
  Crypter: function Crypter(proto) {
    proto._encryptString = _encryptString;
    proto._decryptString = _decryptString;
  }
};
export var overwritable = {
  validatePassword: function validatePassword(password) {
    if (password && typeof password !== 'string') {
      throw newRxTypeError('EN1', {
        password: password
      });
    }

    if (password && password.length < minPassLength) {
      throw newRxError('EN2', {
        minPassLength: minPassLength,
        password: password
      });
    }
  }
};
export var RxDBEncryptionPlugin = {
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
//# sourceMappingURL=encryption.js.map