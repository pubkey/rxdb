import { RxStorage } from './rx-storage.interface';

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
 * To test a storage, we need these
 * configuration values.
 */
export type RxTestStorage = {
    // TODO remove name here, it can be read out already via getStorage().name
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
    readonly hasCouchDBReplication: boolean;
    readonly hasAttachments: boolean;
    // true if the storage supports $regex queries, false if not.
    readonly hasRegexSupport: boolean;
};


export type HashFunction = (input: string) => string;
