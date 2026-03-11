import { RxDocumentData, RxJsonSchema, WithDeleted } from '../../types';

export const POSTGRES_INSERT_CONFLICT_CODE = "23505";
export const DEFAULT_MODIFIED_FIELD = '_modified';
export const DEFAULT_DELETED_FIELD = '_deleted';


export function addDocEqualityToQuery<RxDocType>(
    jsonSchema: RxJsonSchema<RxDocumentData<RxDocType>>,
    primaryPath: string,
    deletedField: string,
    modifiedField: string,
    doc: WithDeleted<RxDocType>,
    query: any
) {
    /**
     * Only match on the primary key, deleted field, and modified timestamp.
     * Using all document fields caused excessively long URLs for documents
     * with large text/JSON content, leading to 400 Bad Request errors.
     * @link https://github.com/pubkey/rxdb/issues/7986
     */
    query = query.eq(primaryPath, (doc as any)[primaryPath]);
    query = query.eq(deletedField, doc._deleted);

    const schemaProps: Record<string, any> = jsonSchema.properties;
    if (schemaProps[modifiedField]) {
        query = query.eq(modifiedField, (doc as any)[modifiedField]);
    }

    return query;
}
