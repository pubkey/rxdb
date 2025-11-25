import { RxDocumentData, RxJsonSchema, WithDeleted } from '../../types';
export declare const POSTGRES_INSERT_CONFLICT_CODE = "23505";
export declare const DEFAULT_MODIFIED_FIELD = "_modified";
export declare const DEFAULT_DELETED_FIELD = "_deleted";
export declare function addDocEqualityToQuery<RxDocType>(jsonSchema: RxJsonSchema<RxDocumentData<RxDocType>>, deletedField: string, modifiedField: string, doc: WithDeleted<RxDocType>, query: any): any;
