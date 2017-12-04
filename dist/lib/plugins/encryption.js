'use strict';

Object.defineProperty(exports, "__esModule", {
    value: true
});
exports.overwritable = exports.prototypes = exports.rxdb = undefined;
exports.encrypt = encrypt;
exports.decrypt = decrypt;

var _aes = require('crypto-js/aes');

var cryptoAes = _interopRequireWildcard(_aes);

var _encUtf = require('crypto-js/enc-utf8');

var cryptoEnc = _interopRequireWildcard(_encUtf);

var _rxError = require('../rx-error');

var _rxError2 = _interopRequireDefault(_rxError);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) newObj[key] = obj[key]; } } newObj['default'] = obj; return newObj; } }

var minPassLength = 8; /**
                        * this plugin adds the encrpytion-capabilities to rxdb
                        * It's using crypto-js/aes for password-encryption
                        * @link https://github.com/brix/crypto-js
                        */

function encrypt(value, password) {
    var encrypted = cryptoAes.encrypt(value, password);
    return encrypted.toString();
};

function decrypt(cipherText, password) {
    var decrypted = cryptoAes.decrypt(cipherText, password);
    return decrypted.toString(cryptoEnc);
};

var _encryptValue = function _encryptValue(value) {
    return encrypt(JSON.stringify(value), this._password);
};

var _decryptValue = function _decryptValue(encValue) {
    var decrypted = decrypt(encValue, this._password);
    return JSON.parse(decrypted);
};

var rxdb = exports.rxdb = true;
var prototypes = exports.prototypes = {
    /**
     * set crypto-functions for the Crypter.prototype
     * @param {[type]} prototype of Crypter
     */
    Crypter: function Crypter(proto) {
        proto._encryptValue = _encryptValue;
        proto._decryptValue = _decryptValue;
    }
};
var overwritable = exports.overwritable = {
    validatePassword: function validatePassword(password) {
        if (password && typeof password !== 'string') {
            throw _rxError2['default'].newRxTypeError('EN1', {
                password: password
            });
        }
        if (password && password.length < minPassLength) {
            throw _rxError2['default'].newRxError('EN2', {
                minPassLength: minPassLength,
                password: password
            });
        }
    }
};

exports['default'] = {
    rxdb: rxdb,
    prototypes: prototypes,
    overwritable: overwritable
};
