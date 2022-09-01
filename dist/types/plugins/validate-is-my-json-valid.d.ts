import type { RxJsonSchema } from '../types';
export declare function getValidator(schema: RxJsonSchema<any>): (docData: any) => void;
export declare const wrappedValidateIsMyJsonValidStorage: <Internals, InstanceCreationOptions>(args: {
    storage: import("../types").RxStorage<Internals, InstanceCreationOptions>;
}) => import("../types").RxStorage<Internals, InstanceCreationOptions>;
