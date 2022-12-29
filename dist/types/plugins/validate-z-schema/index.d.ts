import type { RxJsonSchema } from '../../types';
export declare function getValidator(schema: RxJsonSchema<any>): (docData: any) => any;
export declare const wrappedValidateZSchemaStorage: <Internals, InstanceCreationOptions>(args: {
    storage: import("../../types").RxStorage<Internals, InstanceCreationOptions>;
}) => import("../../types").RxStorage<Internals, InstanceCreationOptions>;
