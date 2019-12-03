/**
 * this plugin adds the encryption-capabilities to rxdb
 * It's using crypto-js/aes for password-encryption
 * @link https://github.com/brix/crypto-js
 */
export declare function encrypt(value: any, password: any): any;
export declare function decrypt(cipherText: string, password: any): any;
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
declare const _default: {
    rxdb: boolean;
    prototypes: {
        /**
         * set crypto-functions for the Crypter.prototype
         */
        Crypter: (proto: any) => void;
    };
    overwritable: {
        validatePassword: (password: any) => void;
    };
};
export default _default;
