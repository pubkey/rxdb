/**
 * handle the en/decryption of documents-data
 * TODO atm we have the crypter inside of rxdb core.
 * Instead all should be moved to the encryption plugin
 * and work via plugin hooks.
 */

import objectPath from 'object-path';
import {
    clone,
    pluginMissing
} from './util';

import {
    RxSchema
} from './rx-schema';

export class Crypter {
    constructor(
        public password: any,
        public schema: RxSchema
    ) { }

    /**
     * encrypt a given string.
     * @overwritten by plugin (optional)
     */
    public _encryptString(_value: string): string {
        throw pluginMissing('encryption');
    }

    /**
     * decrypt a given string.
     * @overwritten by plugin (optional)
     */
    public _decryptString(_value: string): string {
        throw pluginMissing('encryption');
    }

    encrypt(obj: any) {
        if (!this.password) {
            return obj;
        }
        const clonedObj = clone(obj);
        this.schema.encryptedPaths
            .forEach(path => {
                const value = objectPath.get(clonedObj, path);
                if (typeof value === 'undefined') {
                    return;
                }

                const stringValue = JSON.stringify(value);
                const encrypted = this._encryptString(stringValue);
                objectPath.set(clonedObj, path, encrypted);
            });
        return clonedObj;
    }

    decrypt(obj: any) {
        if (!this.password) return obj;
        obj = clone(obj);
        this.schema.encryptedPaths
            .forEach(path => {
                const value = objectPath.get(obj, path);
                if (typeof value === 'undefined') {
                    return;
                }
                const decrypted = this._decryptString(value);
                const decryptedParsed = JSON.parse(decrypted);
                objectPath.set(obj, path, decryptedParsed);
            });
        return obj;
    }
}

export function createCrypter(password: any, schema: RxSchema): Crypter {
    return new Crypter(password, schema);
}
