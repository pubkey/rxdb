/**
 * this plugin validates documents before they can be inserted into the RxCollection.
 * It's using z-schema as jsonschema-validator
 * @link https://github.com/zaggino/z-schema
 */
import ZSchema from 'z-schema';
import type { RxJsonSchema } from '../../types';
import { wrappedValidateStorageFactory } from '../../plugin-helpers';


export function getValidator(
    schema: RxJsonSchema<any>
) {
    const validatorInstance = new (ZSchema as any)();
    const validator = (obj: any) => {
        validatorInstance.validate(obj, schema);
        return validatorInstance;
    };
    return (docData: any) => {
        const useValidator = validator(docData);
        if (useValidator === true) {
            return;
        }
        const errors: ZSchema.SchemaErrorDetail[] = (useValidator as any).getLastErrors();
        if (errors) {
            const formattedZSchemaErrors = (errors as any).map(({
                title,
                description,
                message
            }: any) => ({
                title,
                description,
                message
            }));
            return formattedZSchemaErrors;
        } else {
            return [];
        }
    };
}

export const wrappedValidateZSchemaStorage = wrappedValidateStorageFactory(
    getValidator,
    'z-schema'
);
