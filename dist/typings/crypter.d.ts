/**
 * handle the en/decryption of documents-data
 */
import { RxSchema } from './rx-schema';
export declare class Crypter {
    password: any;
    schema: RxSchema;
    constructor(password: any, schema: RxSchema);
    /**
     * encrypt and stringify data
     * @overwritten by plugin (optional)
     */
    _encryptValue(_value: any): string;
    /**
     * decrypt and json-parse an encrypted value
     * @overwritten by plugin (optional)
     */
    _decryptValue(_value: any): string;
    encrypt(obj: any): any;
    decrypt(obj: any): any;
}
export declare function createCrypter(password: any, schema: RxSchema): Crypter;
