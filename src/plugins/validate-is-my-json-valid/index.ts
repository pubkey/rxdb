/**
 * this plugin validates documents before they can be inserted into the RxCollection.
 * It's using is-my-json-valid as jsonschema-validator
 * @link https://github.com/mafintosh/is-my-json-valid
 */
import isMyJsonValid from 'is-my-json-valid';
import type {
    RxJsonSchema
} from '../../types';
import { wrappedValidateStorageFactory } from '../../plugin-helpers';


export function getValidator(
    schema: RxJsonSchema<any>
) {
    const validator = isMyJsonValid(schema as any);
    return (docData: any) => {
        const isValid = validator(docData);
        if (isValid) {
            return [];
        } else {
            return validator.errors as any;
        }
    };
}

export const wrappedValidateIsMyJsonValidStorage = wrappedValidateStorageFactory(
    getValidator,
    'is-my-json-valid'
);
