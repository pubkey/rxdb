/**
 * this plugin adds the encrpytion-capabilities to rxdb
 * It's using crypto-js/aes for password-encryption
 * @link https://github.com/brix/crypto-js
 */

import * as cryptoAes from 'crypto-js/aes';
import * as cryptoEnc from 'crypto-js/enc-utf8';

import RxError from '../rx-error';

var minPassLength = 8;

export function encrypt(value, password) {
    var encrypted = cryptoAes.encrypt(value, password);
    return encrypted.toString();
};

export function decrypt(cipherText, password) {
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

export var rxdb = true;
export var prototypes = {
    /**
     * set crypto-functions for the Crypter.prototype
     * @param {[type]} prototype of Crypter
     */
    Crypter: function Crypter(proto) {
        proto._encryptValue = _encryptValue;
        proto._decryptValue = _decryptValue;
    }
};
export var overwritable = {
    validatePassword: function validatePassword(password) {
        if (password && typeof password !== 'string') {
            throw RxError.newRxTypeError('EN1', {
                password: password
            });
        }
        if (password && password.length < minPassLength) {
            throw RxError.newRxError('EN2', {
                minPassLength: minPassLength,
                password: password
            });
        }
    }
};

export default {
    rxdb: rxdb,
    prototypes: prototypes,
    overwritable: overwritable
};