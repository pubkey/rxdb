export declare class RxError extends Error {
    rxdb: boolean; // always true, use this to detect if its an rxdb-error
    parameters: any; // an object with parameters to use the programatically
}
