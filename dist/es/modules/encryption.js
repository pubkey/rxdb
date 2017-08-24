/**
 * this plugin adds the encrpytion-capabilities to rxdb
 * It's using crypto-js/aes for password-encryption
 * @link https://github.com/brix/crypto-js
 */

import * as crypto_AES from 'crypto-js/aes';
import * as crypto_enc from 'crypto-js/enc-utf8';

var minPassLength = 8;

export function encrypt(value, password) {
    var encrypted = crypto_AES.encrypt(value, password);
    return encrypted.toString();
};

export function decrypt(ciphertext, password) {
    var decrypted = crypto_AES.decrypt(ciphertext, password);
    return decrypted.toString(crypto_enc);
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
        if (password && typeof password !== 'string') throw new TypeError('password is no string');
        if (password && password.length < minPassLength) throw new Error('password must have at least ' + minPassLength + ' chars');
    }
};

export default {
    rxdb: rxdb,
    prototypes: prototypes,
    overwritable: overwritable
};