/**
 * this plugin validates documents before they can be inserted into the RxCollection.
 * It's using ajv as jsonschema-validator
 * @link https://github.com/epoberezkin/ajv
 * @link https://github.com/ajv-validator/ajv/issues/2132#issuecomment-1537224620
 */
import Ajv from 'ajv';
import addFormats from 'ajv-formats';
import type {
    RxDocumentData,
    RxJsonSchema
} from '../../types/index.d.ts';
import { wrappedValidateStorageFactory } from '../../plugin-helpers.ts';


let ajv: Ajv;


export function getAjv() {
    if (!ajv) {
        ajv = new Ajv({
            strict: true
        });
        ajv.addKeyword('version');
        ajv.addKeyword('keyCompression');
        ajv.addKeyword('primaryKey');
        ajv.addKeyword('indexes');
        ajv.addKeyword('encrypted');
        ajv.addKeyword('final');
        ajv.addKeyword('sharding');
        ajv.addKeyword('internalIndexes');
        ajv.addKeyword('attachments');
        ajv.addKeyword('ref');
        ajv.addKeyword('crdt');
        addFormats(ajv);
    }
    return ajv;
}



export function getValidator(
    schema: RxJsonSchema<any>
) {
    const validator = getAjv().compile(schema);
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
