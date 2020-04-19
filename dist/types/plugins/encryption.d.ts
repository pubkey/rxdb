/**
 * this plugin adds the encryption-capabilities to rxdb
 * It's using crypto-js/aes for password-encryption
 * @link https://github.com/brix/crypto-js
 */
import type { RxPlugin, RxDatabase } from '../types';
export declare function encrypt(value: any, password: any): any;
export declare function decrypt(cipherText: string, password: any): any;
export declare type PasswordHashDocument = {
    _id: string;
    value: string;
};
/**
 * validates and inserts the password hash into the internal collection
 * to ensure there is/was no other instance with a different password
 * which would cause strange side effects when both instances save into the same db
 */
export declare function storePasswordHashIntoDatabase(rxDatabase: RxDatabase): Promise<boolean>;
export declare const rxdb = true;
export declare const prototypes: {
    /**
     * set crypto-functions for the Crypter.prototype
     */
    Crypter: (proto: any) => void;
};
export declare const overwritable: {
    validatePassword: (password: any) => void;
};
export declare const RxDBEncryptionPlugin: RxPlugin;
