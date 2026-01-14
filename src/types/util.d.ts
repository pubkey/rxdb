import type { RxStorage } from './rx-storage.interface';

export type MaybePromise<T> = Promise<T> | T;


export type PlainJsonValue = string | number | boolean | PlainSimpleJsonObject | PlainSimpleJsonObject[] | PlainJsonValue[];
export type PlainSimpleJsonObject = {
    [k: string]: PlainJsonValue | PlainJsonValue[];
};

/**
 * @link https://stackoverflow.com/a/49670389/3443137
 */
type DeepReadonly<T> =
    T extends (infer R)[] ? DeepReadonlyArray<R> :
    T extends Function ? T :
    T extends object ? DeepReadonlyObject<T> :
    T;

interface DeepReadonlyArray<T> extends ReadonlyArray<DeepReadonly<T>> { }

type DeepReadonlyObject<T> = {
    readonly [P in keyof T]: DeepReadonly<T[P]>;
};

export type MaybeReadonly<T> = T | Readonly<T>;


/**
 * Opposite of DeepReadonly,
 * makes everything mutable again.
 */
type DeepMutable<T> = (
    T extends object
    ? {
        -readonly [K in keyof T]: (
            T[K] extends object
            ? DeepMutable<T[K]>
            : T[K]
        )
    }
    : never
);

/**
 * Can be used like 'keyof'
 * but only represents the string keys, not the Symbols or numbers.
 * @link https://stackoverflow.com/a/51808262/3443137
 */
export type StringKeys<X> = Extract<keyof X, string>;

export type AnyKeys<T> = { [P in keyof T]?: T[P] | any };
export interface AnyObject {
    [k: string]: any;
}

/**
 * @link https://dev.to/vborodulin/ts-how-to-override-properties-with-type-intersection-554l
 */
export type Override<T1, T2> = Omit<T1, keyof T2> & T2;



export type ById<T> = {
    [id: string]: T;
};

/**
 * Must be async to support async hashing like from the WebCrypto API.
 */
export type HashFunction = (input: string) => Promise<string>;

export declare type QueryMatcher<DocType> = (doc: DocType | DeepReadonly<DocType>) => boolean;

/**
 * To have a deterministic sorting, we cannot return 0,
 * we only return 1 or -1.
 * This ensures that we always end with the same output array, no mather of the
 * pre-sorting of the input array.
 */
export declare type DeterministicSortComparator<DocType> = (a: DocType, b: DocType) => 1 | -1;

/**
 * To test a storage, we need these
 * configuration values.
 */
export type RxTestStorage = {
    // can be used to setup async stuff
    readonly init?: () => any;
    readonly name: string;
    readonly getStorage: () => RxStorage<any, any>;
    /**
     * Returns a storage that is used in performance tests.
     * For example in a browser it should return the storage with an IndexedDB based adapter,
     * while in node.js it must use the filesystem.
     */
    readonly getPerformanceStorage: () => {
        storage: RxStorage<any, any>;
        /**
         * A description that describes the storage and setting.
         * For example 'dexie-native'.
         */
        description: string;
    };
    /**
     * True if the storage is able to
     * keep data after an instance is closed and opened again.
     */
    readonly hasPersistence: boolean;
    readonly hasMultiInstance: boolean;
    readonly hasAttachments: boolean;

    /**
     * Some storages likes the memory-synced storage,
     * are not able to provide a replication while guaranteeing
     * data integrity.
     */
    readonly hasReplication: boolean;

    /**
     * To make it possible to test alternative encryption plugins,
     * you can specify hasEncryption to signal
     * the test runner that the given storage already contains an
     * encryption plugin that should be used to test encryption tests.
     * Otherwise the encryption-crypto-js plugin will be tested.
     *
     * hasEncryption must contain a function that is able
     * to create a new password.
     */
    readonly hasEncryption?: () => Promise<string>;
};


/**
 * The paths as strings-type of nested object
 * @link https://stackoverflow.com/a/58436959/3443137
 */
type Join<K, P> = K extends string | number ?
    P extends string | number ?
    `${K}${'' extends P ? '' : '.'}${P}`
    : never : never;

export type Paths<T, D extends number = 10> = [D] extends [never] ? never : T extends object ?
    { [K in keyof T]-?: K extends string | number ?
        `${K}` | (Paths<T[K], Prev[D]> extends infer R ? Join<K, R> : never)
        : never
    }[keyof T] : '';

export type Leaves<T, D extends number = 10> = [D] extends [never] ? never : T extends object ?
    { [K in keyof T]-?: Join<K, Leaves<T[K], Prev[D]>> }[keyof T] : '';
type Prev = [never, 0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10,
    11, 12, 13, 14, 15, 16, 17, 18, 19, 20, ...0[]];



/**
 * In the past, users had to add WeakRef to their typescript config.
 * To create an easier setup, we use our own typings instead, because WeakRef
 * is used internally only anyways.
 */

export interface WeakRef<T extends object = any> {
    deref(): T | undefined;
}

export interface FinalizationRegistry<T> {
    register(target: object, heldValue: T, unregisterToken?: object): void;
    unregister(unregisterToken: object): boolean;
}
