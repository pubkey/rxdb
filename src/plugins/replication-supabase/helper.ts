import { SupabaseClient } from '@supabase/supabase-js';
import { RxDocumentData, RxJsonSchema, WithDeleted } from '../../types';

export const POSTGRES_INSERT_CONFLICT_CODE = "23505";
export const DEFAULT_MODIFIED_FIELD = '_modified';
export const DEFAULT_DELETED_FIELD = '_deleted';


export function addDocEqualityToQuery<RxDocType>(
    jsonSchema: RxJsonSchema<RxDocumentData<RxDocType>>,
    deletedField: string,
    modifiedField: string,
    doc: WithDeleted<RxDocType>,
    query: any
) {
    const ignoreKeys = new Set([
        modifiedField,
        deletedField,
        '_meta',
        '_attachments',
        '_rev'
    ]);

    for (const key of Object.keys(doc)) {
        if (
            ignoreKeys.has(key)
        ) {
            continue;
        }

        const v = (doc as any)[key];
        const type = typeof v;

        if (type === "string" || type === "number") {
            query = query.eq(key, v);
        } else if (type === "boolean" || v === null) {
            query = query.is(key, v);
        } else if (type === 'undefined') {
            query = query.is(key, null);
        } else {
            throw new Error(`unknown how to handle type: ${type}`)
        }
    }

    const schemaProps: Record<string, any> = jsonSchema.properties;
    for (const key of Object.keys(schemaProps)) {
        if (
            ignoreKeys.has(key) ||
            Object.hasOwn(doc, key)
        ) {
            continue;
        }
        query = query.is(key, null);
    }

    query = query.eq(deletedField, doc._deleted);
    if (schemaProps[modifiedField]) {
        query = query.eq(modifiedField, (doc as any)[modifiedField]);
    }


    return query;
}
