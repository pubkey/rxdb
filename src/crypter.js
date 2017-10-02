/**
 * handle the en/decryption of documents-data
 */

import objectPath from 'object-path';
import clone from 'clone';

import RxError from './rx-error';

export class Crypter {
    constructor(password, schema) {
        this._password = password;
        this._schema = schema;
    }

    /**
     * encrypt and stringify data
     * @overwritten by plugin (optional)
     * @param  {any} value
     * @return {string}
     */
    _encryptValue() {
        throw RxError.pluginMissing('encryption');
    }

    /**
     * decrypt and json-parse an encrypted value
     * @overwritten by plugin (optional)
     * @param  {string} encValue
     * @return {any}
     */
    _decryptValue() {
        throw RxError.pluginMissing('encryption');
    }

    encrypt(obj) {
        obj = clone(obj);
        if (!this._password) return obj;
        Object.keys(this._schema.encryptedPaths)
            .map(path => {
                const value = objectPath.get(obj, path);
                const encrypted = this._encryptValue(value);
                objectPath.set(obj, path, encrypted);
            });
        return obj;
    }

    decrypt(obj) {
        obj = clone(obj);
        if (!this._password) return obj;

        Object.keys(this._schema.encryptedPaths)
            .map(path => {
                const value = objectPath.get(obj, path);
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
