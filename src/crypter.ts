/**
 * handle the en/decryption of documents-data
 */

import objectPath from 'object-path';
import {
    clone
} from './util';

import {
    pluginMissing
} from './rx-error';
import {
    RxSchema
} from './rx-schema';

export class Crypter {
    constructor(
        public password: any,
        public schema: RxSchema
    ) { }

    /**
     * encrypt and stringify data
     * @overwritten by plugin (optional)
     * @param  {any} value
     * @return {string}
     */
    _encryptValue(_value: any): string {
        throw pluginMissing('encryption');
    }

    /**
     * decrypt and json-parse an encrypted value
     * @overwritten by plugin (optional)
     * @param  {string} encValue
     * @return {any}
     */
    _decryptValue(_value: any): string {
        throw pluginMissing('encryption');
    }

    encrypt(obj) {
        obj = clone(obj);
        if (!this.password) return obj;
        Object.keys(this.schema.encryptedPaths)
            .forEach(path => {
                const value = objectPath.get(obj, path);
                if (typeof value === 'undefined') return;
                const encrypted = this._encryptValue(value);
                objectPath.set(obj, path, encrypted);
            });
        return obj;
    }

    decrypt(obj) {
        obj = clone(obj);
        if (!this.password) return obj;
        Object.keys(this.schema.encryptedPaths)
            .forEach(path => {
                const value = objectPath.get(obj, path);
                if (typeof value === 'undefined') return;
                const decrypted = this._decryptValue(value);
                objectPath.set(obj, path, decrypted);
            });
        return obj;
    }
}

export function create(password, schema) {
    return new Crypter(password, schema);
}

export default {
    create,
    Crypter
};
