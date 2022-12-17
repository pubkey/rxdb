/**
 * this plugin validates documents before they can be inserted into the RxCollection.
 * It's using ajv as jsonschema-validator
 * @link https://github.com/epoberezkin/ajv
 */
import Ajv from 'ajv';
import {
    newRxError
} from '../rx-error';
import type {
    RxDocumentData,
    RxJsonSchema
} from '../types';
import { wrappedValidateStorageFactory } from '../plugin-helpers';


const ajv = new Ajv({
    strict: false
});


export function getValidator(
    schema: RxJsonSchema<any>
) {
    const validator = ajv.compile(schema);
    return (docData: RxDocumentData<any>) => {
        const isValid = validator(docData);
        if (!isValid) {
            throw newRxError('VD2', {
                validationErrors: validator.errors as any,
                document: docData,
                schema
            });
        }
    };
}

export const wrappedValidateAjvStorage = wrappedValidateStorageFactory(
    getValidator,
    'ajv'
);
