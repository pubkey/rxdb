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

import type {
    Crypter
} from '../crypter';
import type {
    RxPlugin,
    RxDatabase,
    RxLocalDocumentData
} from '../types';
import { getDefaultRxDocumentMeta, hash, PROMISE_RESOLVE_FALSE } from '../util';
import { findLocalDocument } from '../rx-storage-helper';

const minPassLength = 8;

export function encrypt(value: string, password: any): string {
    const encrypted = AES.encrypt(value, password);
    return encrypted.toString();
}

export function decrypt(cipherText: string, password: any): string {
    /**
     * Trying to decrypt non-strings
     * will cause no errors and will be hard to debug.
     * So instead we do this check here.
     */
    if (typeof cipherText !== 'string') {
        throw newRxError('SNH', {
            args: {
                cipherText
            }
        });
    }
    const decrypted = AES.decrypt(cipherText, password);
    const ret = decrypted.toString(cryptoEnc);
    return ret;
}

const _encryptString = function (this: Crypter, value: string) {
    return encrypt(value, this.password);
};

const _decryptString = function (this: Crypter, encryptedValue: string): string {
    const decrypted = decrypt(encryptedValue, this.password);
    return decrypted;
};


export type PasswordHashDocument = RxLocalDocumentData<{
    value: string;
}>;

/**
 * validates and inserts the password hash into the internal collection
 * to ensure there is/was no other instance with a different password
 * which would cause strange side effects when both instances save into the same db
 */
export async function storePasswordHashIntoDatabase(
    rxDatabase: RxDatabase
): Promise<boolean> {
    if (!rxDatabase.password) {
        return PROMISE_RESOLVE_FALSE;
    }
    const pwHash = hash(rxDatabase.password);
    const pwHashDocumentId = 'pwHash';

    const pwHashDoc = await findLocalDocument<PasswordHashDocument>(
        rxDatabase.localDocumentsStore,
        pwHashDocumentId,
        false
    );
    if (!pwHashDoc) {
        const docData: PasswordHashDocument = {
            _id: pwHashDocumentId,
            value: pwHash,
            _attachments: {},
            _meta: getDefaultRxDocumentMeta(),
            _deleted: false
        };
        await rxDatabase.localDocumentsStore.bulkWrite([{
            document: docData
        }]);
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
        proto._encryptString = _encryptString;
        proto._decryptString = _decryptString;
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
