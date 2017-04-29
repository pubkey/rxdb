/**
 * handle the en/decryption of documents-data
 */

import objectPath from 'object-path';
import clone from 'clone';

import * as util from './util';

class Crypter {

    constructor(password, schema) {
        this._password = password;
        this._schema = schema;
    }

    _encryptValue(value) {
        return util.encrypt(JSON.stringify(value), this._password);
    }
    _decryptValue(encValue) {
        const decrypted = util.decrypt(encValue, this._password);
        return JSON.parse(decrypted);
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
