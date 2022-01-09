export type MaybePromise<T> = Promise<T> | T;



/**
 * @link https://stackoverflow.com/a/49670389/3443137
 */
type DeepReadonly<T> =
    T extends (infer R)[] ? DeepReadonlyArray<R> :
    T extends Function ? T :
    T extends object ? DeepReadonlyObject<T> :
    T;

interface DeepReadonlyArray<T> extends ReadonlyArray<DeepReadonly<T>> {}

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
