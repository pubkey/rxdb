/**
 * handle the en/decryption of documents-data
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
        public password: string,
        public schema: RxSchema
    ) { }

    /**
     * encrypt and stringify data
     * @overwritten by plugin (optional)
     */
    _encryptValue(_value: any): string {
        throw pluginMissing('encryption');
    }

    /**
     * decrypt and json-parse an encrypted value
     * @overwritten by plugin (optional)
     */
    _decryptValue(_value: any): any {
        throw pluginMissing('encryption');
    }

    encrypt(obj: any) {
        if (!this.password) return obj;
        obj = clone(obj);
        Object.keys(this.schema.encryptedPaths)
            .forEach(path => {
                const value = objectPath.get(obj, path);
                if (typeof value === 'undefined') return;
                const encrypted = this._encryptValue(value);
                objectPath.set(obj, path, encrypted);
            });
        return obj;
    }

    decrypt(obj: any) {
        if (!this.password) return obj;
        obj = clone(obj);
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

export function create(password: any, schema: RxSchema) {
    return new Crypter(password, schema);
}

export default {
    create,
    Crypter
};
