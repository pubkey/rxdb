import type { RxDocumentData, RxJsonSchema } from '../../types/index.d.ts';
export declare function getValidator(schema: RxJsonSchema<any>): (docData: RxDocumentData<any>) => any;
export declare const wrappedValidateAjvStorage: <Internals, InstanceCreationOptions>(args: {
    storage: import("../../types/rx-storage.interface").RxStorage<Internals, InstanceCreationOptions>;
}) => import("../../types/rx-storage.interface").RxStorage<Internals, InstanceCreationOptions>;
