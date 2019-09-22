/**
 * this plugin adds the encryption-capabilities to rxdb
 * It's using crypto-js/aes for password-encryption
 * @link https://github.com/brix/crypto-js
 */

import AES from 'crypto-js/aes';
import * as cryptoEnc from 'crypto-js/enc-utf8';

import {
    newRxTypeError,
    newRxError
} from '../rx-error';

import {
    Crypter
} from '../crypter';

const minPassLength = 8;

export function encrypt(value, password) {
    const encrypted = AES.encrypt(value, password);
    return encrypted.toString();
}

export function decrypt(cipherText, password) {
    const decrypted = AES.decrypt(cipherText, password);
    return decrypted.toString(cryptoEnc);
}

const _encryptValue = function(this: Crypter, value) {
    return encrypt(JSON.stringify(value), this.password);
};

const _decryptValue = function(this: Crypter, encryptedValue) {
    const decrypted = decrypt(encryptedValue, this.password);
    return JSON.parse(decrypted);
};

export const rxdb = true;
export const prototypes = {
    /**
     * set crypto-functions for the Crypter.prototype
     */
    Crypter: proto => {
        proto._encryptValue = _encryptValue;
        proto._decryptValue = _decryptValue;
    }
};
export const overwritable = {
    validatePassword: function(password) {
        if (password && typeof password !== 'string') {
            throw newRxTypeError('EN1', {
                password
            });
        }
        if (password && password.length < minPassLength) {
            throw newRxError('EN2', {
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
