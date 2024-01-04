import type { KeyFunctionMap, RxJsonSchema } from '../../types/index.d.ts';
/**
 * checks if the given static methods are allowed
 * @throws if not allowed
 */
export declare function checkOrmMethods(statics?: KeyFunctionMap): void;
export declare function checkOrmDocumentMethods<RxDocType>(schema: RxJsonSchema<RxDocType>, methods?: any): void;
