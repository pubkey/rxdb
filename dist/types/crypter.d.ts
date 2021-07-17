/**
 * handle the en/decryption of documents-data
 * TODO atm we have the crypter inside of rxdb core.
 * Instead all should be moved to the encryption plugin
 * and work via plugin hooks.
 */
import { RxSchema } from './rx-schema';
export declare class Crypter {
    password: any;
    schema: RxSchema;
    constructor(password: any, schema: RxSchema);
    /**
     * encrypt a given string.
     * @overwritten by plugin (optional)
     */
    _encryptString(_value: string): string;
    /**
     * decrypt a given string.
     * @overwritten by plugin (optional)
     */
    _decryptString(_value: string): string;
    encrypt(obj: any): any;
    decrypt(obj: any): any;
}
export declare function createCrypter(password: any, schema: RxSchema): Crypter;
