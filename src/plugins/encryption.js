/**
 * this plugin adds the encrpytion-capabilities to rxdb
 * It's using crypto-js/aes for password-encryption
 * @link https://github.com/brix/crypto-js
 */

import * as cryptoAes from 'crypto-js/aes';
import * as cryptoEnc from 'crypto-js/enc-utf8';

import RxError from '../rx-error';

const minPassLength = 8;

export function encrypt(value, password) {
    const encrypted = cryptoAes.encrypt(value, password);
    return encrypted.toString();
};

export function decrypt(cipherText, password) {
    const decrypted = cryptoAes.decrypt(cipherText, password);
    return decrypted.toString(cryptoEnc);
};

const _encryptValue = function(value) {
    return encrypt(JSON.stringify(value), this._password);
};

const _decryptValue = function(encValue) {
    const decrypted = decrypt(encValue, this._password);
    return JSON.parse(decrypted);
};


export const rxdb = true;
export const prototypes = {
    /**
     * set crypto-functions for the Crypter.prototype
     * @param {[type]} prototype of Crypter
     */
    Crypter: proto => {
        proto._encryptValue = _encryptValue;
        proto._decryptValue = _decryptValue;
    }
};
export const overwritable = {
    validatePassword: function(password) {
        if (password && typeof password !== 'string') {
            throw RxError.newRxTypeError('EN1', {
                password
            });
        }
        if (password && password.length < minPassLength) {
            throw RxError.newRxError('EN2', {
                minPassLength,
                password
            });
        }
    }
};

export default {
    rxdb,
    prototypes,
    overwritable
};
