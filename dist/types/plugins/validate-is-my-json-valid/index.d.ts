import type { RxJsonSchema } from '../../types/index.d.ts';
export declare function getValidator(schema: RxJsonSchema<any>): (docData: any) => any;
export declare const wrappedValidateIsMyJsonValidStorage: <Internals, InstanceCreationOptions>(args: {
    storage: import("../../types/rx-storage.interface").RxStorage<Internals, InstanceCreationOptions>;
}) => import("../../types/rx-storage.interface").RxStorage<Internals, InstanceCreationOptions>;
