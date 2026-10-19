/**
 * this plugin validates documents before they can be inserted into the RxCollection.
 * It's using ajv as jsonschema-validator
 * @link https://github.com/epoberezkin/ajv
 * @link https://github.com/ajv-validator/ajv/issues/2132#issuecomment-1537224620
 */
import { Ajv, type Options } from 'ajv';
import addFormats from 'ajv-formats';
import type {
    RxDocumentData,
    RxJsonSchema
} from '../../types/index.d.ts';
import { wrappedValidateStorageFactory } from '../../plugin-helpers.ts';


let ajv: Ajv;

/**
 * Creates a new Ajv instance that knows
 * the RxDB specific schema keywords and the default formats.
 * Use this at build time together with the ajv standalone tools
 * so that the precompiled validators behave like the runtime ones.
 */
export function createAjv(options: Options = {}): Ajv {
    const ret = new Ajv(Object.assign({
        strict: true
    }, options));
    ret.addKeyword('version');
    ret.addKeyword('keyCompression');
    ret.addKeyword('primaryKey');
    ret.addKeyword('indexes');
    ret.addKeyword('encrypted');
    ret.addKeyword('final');
    ret.addKeyword('sharding');
    ret.addKeyword('internalIndexes');
    ret.addKeyword('attachments');
    ret.addKeyword('ref');
    ret.addKeyword('crdt');
    addFormats(ret);
    return ret;
}

export function getAjv() {
    if (!ajv) {
        ajv = createAjv();
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
