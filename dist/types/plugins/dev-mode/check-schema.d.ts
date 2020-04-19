/**
 * does additional checks over the schema-json
 * to ensure nothing is broken or not supported
 */
import type { RxJsonSchema } from '../../types';
/**
 * checks if the fieldname is allowed
 * this makes sure that the fieldnames can be transformed into javascript-vars
 * and does not conquer the observe$ and populate_ fields
 * @throws {Error}
 */
export declare function checkFieldNameRegex(fieldName: string): void;
/**
 * validate that all schema-related things are ok
 */
export declare function validateFieldsDeep(jsonSchema: any): true;
/**
 * does the checking
 * @throws {Error} if something is not ok
 */
export declare function checkSchema(jsonSchema: RxJsonSchema): void;
