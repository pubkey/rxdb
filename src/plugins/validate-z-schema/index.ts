/**
 * this plugin validates documents before they can be inserted into the RxCollection.
 * It's using z-schema as jsonschema-validator
 * @link https://github.com/zaggino/z-schema
 */
import ZSchema, { SchemaErrorDetail } from 'z-schema';
import type { RxJsonSchema } from '../../types/index.d.ts';
import { wrappedValidateStorageFactory } from '../../plugin-helpers.ts';


export const ZSchemaClass = ZSchema;

let zSchema: ZSchema;

export function getZSchema() {
    if (!zSchema) {
        zSchema = ZSchema.create({
            strictMode: false
        });
    }
    return zSchema;
}

export function getValidator(
    schema: RxJsonSchema<any>
) {
    const validator = (obj: any) => {
        return getZSchema().validateSafe(obj, schema as any);
    };
    return (docData: any) => {
        const useValidator = validator(docData);
        if (useValidator.valid) {
            return [];
        }
        const errors: SchemaErrorDetail[] = (useValidator as any).error?.details || (useValidator as any).err?.details || [];
        if (errors) {
            const formattedZSchemaErrors = (errors as any).map(({
                title,
                description,
                message,
                path
            }: any) => ({
                title,
                description,
                message,
                path
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
