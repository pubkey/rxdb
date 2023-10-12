/**
 * this plugin validates documents before they can be inserted into the RxCollection.
 * It's using ajv as jsonschema-validator
 * @link https://github.com/epoberezkin/ajv
 * @link https://github.com/ajv-validator/ajv/issues/2132#issuecomment-1537224620
 */
import Ajv from 'ajv';
import type {
    RxDocumentData,
    RxJsonSchema
} from '../../types/index.d.ts';
import { wrappedValidateStorageFactory } from '../../plugin-helpers.ts';


const ajv = new Ajv({
    strict: false
});


export function getValidator(
    schema: RxJsonSchema<any>
) {
    const validator = ajv.compile(schema);
    return (docData: RxDocumentData<any>) => {
        const isValid = validator(docData);
        if (isValid) {
            return [];
        } else {
            return validator.errors as any;
        }
    };
}

export const wrappedValidateAjvStorage = wrappedValidateStorageFactory(
    getValidator,
    'ajv'
);
