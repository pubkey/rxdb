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
import type {
    RxPlugin,
    RxDatabase,
    RxLocalDocumentData
} from '../types';
import { hash } from '../util';
import { findLocalDocument } from '../rx-storage-helper';

const minPassLength = 8;

export function encrypt(value: any, password: any) {
    const encrypted = AES.encrypt(value, password);
    return encrypted.toString();
}

export function decrypt(cipherText: string, password: any) {
    const decrypted = AES.decrypt(cipherText, password);
    return decrypted.toString(cryptoEnc);
}

const _encryptValue = function (this: Crypter, value: any) {
    return encrypt(JSON.stringify(value), this.password);
};

const _decryptValue = function (this: Crypter, encryptedValue: any) {
    const decrypted = decrypt(encryptedValue, this.password);
    return JSON.parse(decrypted);
};


export type PasswordHashDocument = {
    _id: string;
    value: string;
};

/**
 * validates and inserts the password hash into the internal collection
 * to ensure there is/was no other instance with a different password
 * which would cause strange side effects when both instances save into the same db
 */
export async function storePasswordHashIntoDatabase(
    rxDatabase: RxDatabase
): Promise<boolean> {
    if (!rxDatabase.password) {
        return Promise.resolve(false);
    }
    const pwHash = hash(rxDatabase.password);
    const pwHashDocumentId = 'pwHash';

    const pwHashDoc = await findLocalDocument(
        rxDatabase.localDocumentsStore,
        pwHashDocumentId
    );
    if (!pwHashDoc) {
        const docData: RxLocalDocumentData = {
            _id: pwHashDocumentId,
            value: pwHash
        };
        await rxDatabase.localDocumentsStore.bulkWrite(false, [docData]);
        return true;
    } else if (pwHash !== pwHashDoc.value) {
        // different hash was already set by other instance
        await rxDatabase.destroy();
        throw newRxError('DB1', {
            passwordHash: hash(rxDatabase.password),
            existingPasswordHash: pwHashDoc.value
        });
    } else {
        return true;
    }
}




export const rxdb = true;
export const prototypes = {
    /**
     * set crypto-functions for the Crypter.prototype
     */
    Crypter: (proto: any) => {
        proto._encryptValue = _encryptValue;
        proto._decryptValue = _decryptValue;
    }
};
export const overwritable = {
    validatePassword: function (password: any) {
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

export const RxDBEncryptionPlugin: RxPlugin = {
    name: 'encryption',
    rxdb,
    prototypes,
    overwritable,
    hooks: {
        createRxDatabase: (db: RxDatabase) => {
            return storePasswordHashIntoDatabase(db);
        }
    }
};
