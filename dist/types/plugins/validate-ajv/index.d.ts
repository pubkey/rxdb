/**
 * this plugin validates documents before they can be inserted into the RxCollection.
 * It's using ajv as jsonschema-validator
 * @link https://github.com/epoberezkin/ajv
 * @link https://github.com/ajv-validator/ajv/issues/2132#issuecomment-1537224620
 */
import Ajv from 'ajv';
import type { RxDocumentData, RxJsonSchema } from '../../types/index.d.ts';
export declare function getAjv(): Ajv;
export declare function getValidator(schema: RxJsonSchema<any>): (docData: RxDocumentData<any>) => any;
export declare const wrappedValidateAjvStorage: <Internals, InstanceCreationOptions>(args: {
    storage: import("../../types/rx-storage.interface").RxStorage<Internals, InstanceCreationOptions>;
}) => import("../../types/rx-storage.interface").RxStorage<Internals, InstanceCreationOptions>;
