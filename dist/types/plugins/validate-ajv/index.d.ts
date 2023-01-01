import type { RxDocumentData, RxJsonSchema } from '../../types';
export declare function getValidator(schema: RxJsonSchema<any>): (docData: RxDocumentData<any>) => any;
export declare const wrappedValidateAjvStorage: <Internals, InstanceCreationOptions>(args: {
    storage: import("../../types").RxStorage<Internals, InstanceCreationOptions>;
}) => import("../../types").RxStorage<Internals, InstanceCreationOptions>;
