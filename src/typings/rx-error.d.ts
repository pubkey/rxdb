import { RxJsonSchema } from './rx-schema';

export declare class RxError extends Error {
    readonly rxdb: boolean; // always true, use this to detect if its an rxdb-error
    readonly parameters: RxErrorParameters; // an object with parameters to use the programatically
}

export interface RxErrorParameters {
    readonly errors: RxErrorItem[];
    readonly schemaPath: string;
    readonly obj: any;
    readonly schema: RxJsonSchema;
}

export interface RxErrorItem {
    readonly field: string;
    readonly message: string;
}
