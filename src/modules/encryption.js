/**
 * this plugin adds the encrpytion-capabilities to rxdb
 * It's using crypto-js/aes for password-encryption
 * @link https://github.com/brix/crypto-js
 */

import * as crypto_AES from 'crypto-js/aes';
import * as crypto_enc from 'crypto-js/enc-utf8';

const minPassLength = 8;

export function encrypt(value, password) {
    const encrypted = crypto_AES.encrypt(value, password);
    return encrypted.toString();
};

export function decrypt(ciphertext, password) {
    const decrypted = crypto_AES.decrypt(ciphertext, password);
    return decrypted.toString(crypto_enc);
};

const _encryptValue = function(value) {
    return encrypt(JSON.stringify(value), this._password);
};

const _decryptValue = function(encValue) {
    const decrypted = decrypt(encValue, this._password);
    return JSON.parse(decrypted);
};

export default {
    rxdb: true,
    prototypes: {
        /**
         * set crypto-functions for the Crypter.prototype
         * @param {[type]} prototype of Crypter
         */
        Crypter: (proto) => {
            proto._encryptValue = _encryptValue;
            proto._decryptValue = _decryptValue;
        }
    },
    overwritable: {
        validatePassword: function(password) {
            if (password && typeof password !== 'string')
                throw new TypeError('password is no string');
            if (password && password.length < minPassLength)
                throw new Error(`password must have at least ${minPassLength} chars`);
        }
    }
};
