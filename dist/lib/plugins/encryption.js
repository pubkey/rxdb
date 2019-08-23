"use strict";

var _interopRequireWildcard = require("@babel/runtime/helpers/interopRequireWildcard");

var _interopRequireDefault = require("@babel/runtime/helpers/interopRequireDefault");

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.encrypt = encrypt;
exports.decrypt = decrypt;
exports["default"] = exports.overwritable = exports.prototypes = exports.rxdb = void 0;

var _aes = _interopRequireDefault(require("crypto-js/aes"));

var cryptoEnc = _interopRequireWildcard(require("crypto-js/enc-utf8"));

var _rxError = require("../rx-error");

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

var _encryptValue = function _encryptValue(value) {
  return encrypt(JSON.stringify(value), this._password);
};

var _decryptValue = function _decryptValue(encryptedValue) {
  var decrypted = decrypt(encryptedValue, this._password);
  return JSON.parse(decrypted);
};

var rxdb = true;
exports.rxdb = rxdb;
var prototypes = {
  /**
   * set crypto-functions for the Crypter.prototype
   * @param {[type]} prototype of Crypter
   */
  Crypter: function Crypter(proto) {
    proto._encryptValue = _encryptValue;
    proto._decryptValue = _decryptValue;
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
var _default = {
  rxdb: rxdb,
  prototypes: prototypes,
  overwritable: overwritable
};
exports["default"] = _default;

//# sourceMappingURL=encryption.js.map