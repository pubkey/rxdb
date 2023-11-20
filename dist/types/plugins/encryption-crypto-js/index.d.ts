import type { InternalStoreDocType, RxStorage } from '../../types/index.d.ts';
export declare const MINIMUM_PASSWORD_LENGTH: 8;
export declare function encryptString(value: string, password: string): string;
export declare function decryptString(cipherText: string, password: any): string;
export type InternalStorePasswordDocType = InternalStoreDocType<{
    hash: string;
}>;
export declare function wrappedKeyEncryptionCryptoJsStorage<Internals, InstanceCreationOptions>(args: {
    storage: RxStorage<Internals, InstanceCreationOptions>;
}): RxStorage<Internals, InstanceCreationOptions>;
