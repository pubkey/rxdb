import { RxDocumentData, RxJsonSchema, WithDeleted } from '../../types';

export const POSTGRES_INSERT_CONFLICT_CODE = "23505";
export const DEFAULT_MODIFIED_FIELD = '_modified';
export const DEFAULT_DELETED_FIELD = '_deleted';


export function addDocEqualityToQuery<RxDocType>(
    jsonSchema: RxJsonSchema<RxDocumentData<RxDocType>>,
    deletedField: string,
    modifiedField: string,
    primaryPath: string,
    doc: WithDeleted<RxDocType>,
    query: any
) {
    /**
     * Only use the primary key and modified timestamp for optimistic concurrency.
     * Adding all document fields to the WHERE clause can cause excessively long URLs
     * when documents contain large text or JSON fields, leading to 400 Bad Request errors.
     * @see https://github.com/pubkey/rxdb/issues/7986
     */
    query = query.eq(primaryPath, (doc as any)[primaryPath]);

    const schemaProps: Record<string, any> = jsonSchema.properties;
    if (schemaProps[modifiedField]) {
        query = query.eq(modifiedField, (doc as any)[modifiedField]);
    }

    return query;
}
