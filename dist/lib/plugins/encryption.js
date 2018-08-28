"use strict";

var _interopRequireDefault = require("@babel/runtime/helpers/interopRequireDefault");

var _interopRequireWildcard = require("@babel/runtime/helpers/interopRequireWildcard");

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.encrypt = encrypt;
exports.decrypt = decrypt;
exports["default"] = exports.overwritable = exports.prototypes = exports.rxdb = void 0;

var _aes = require("crypto-js/aes");

var cryptoEnc = _interopRequireWildcard(require("crypto-js/enc-utf8"));

var _rxError = _interopRequireDefault(require("../rx-error"));

/**
 * this plugin adds the encrpytion-capabilities to rxdb
 * It's using crypto-js/aes for password-encryption
 * @link https://github.com/brix/crypto-js
 */
var minPassLength = 8;

function encrypt(value, password) {
  var encrypted = (0, _aes.encrypt)(value, password);
  return encrypted.toString();
}

function decrypt(cipherText, password) {
  var decrypted = (0, _aes.decrypt)(cipherText, password);
  return decrypted.toString(cryptoEnc);
}

var _encryptValue = function _encryptValue(value) {
  return encrypt(JSON.stringify(value), this._password);
};

var _decryptValue = function _decryptValue(encValue) {
  var decrypted = decrypt(encValue, this._password);
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
      throw _rxError["default"].newRxTypeError('EN1', {
        password: password
      });
    }

    if (password && password.length < minPassLength) {
      throw _rxError["default"].newRxError('EN2', {
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
