/**
 * this plugin adds the encryption-capabilities to rxdb
 * It's using crypto-js/aes for password-encryption
 * @link https://github.com/brix/crypto-js
 */
import type { RxPlugin, RxDatabase, InternalStoreDocType } from '../types';
export declare const MINIMUM_PASSWORD_LENGTH: 8;
export declare function encryptString(value: string, password: string): string;
export declare function decryptString(cipherText: string, password: any): string;
export declare type InternalStorePasswordDocType = InternalStoreDocType<{
    hash: string;
}>;
/**
 * validates and inserts the password hash into the internal collection
 * to ensure there is/was no other instance with a different password
 * which would cause strange side effects when both instances save into the same db
 */
export declare function storePasswordHashIntoDatabase(rxDatabase: RxDatabase): Promise<boolean>;
export declare const RxDBEncryptionPlugin: RxPlugin;
