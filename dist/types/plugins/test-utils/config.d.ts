import type { RxStorage, RxTestStorage } from '../../types';
export type TestConfig = {
    storage: RxTestStorage;
};
export declare const isDeno: boolean;
export declare const isBun: boolean;
export declare const isNode: boolean;
export declare function setConfig(newConfig: TestConfig): void;
export declare function getConfig(): TestConfig;
export declare const ENV_VARIABLES: any;
export declare const DEFAULT_STORAGE: string;
export declare function isFastMode(): boolean;
export declare function initTestEnvironment(): void;
export declare function getEncryptedStorage(baseStorage?: RxStorage<any, any>): RxStorage<any, any>;
export declare function isNotOneOfTheseStorages(storageNames: string[]): boolean;
export declare function getPassword(): Promise<string>;
