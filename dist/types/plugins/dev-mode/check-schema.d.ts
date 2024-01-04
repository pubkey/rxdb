import type { RxJsonSchema } from '../../types/index.d.ts';
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
export declare function validateFieldsDeep(rxJsonSchema: RxJsonSchema<any>): true;
export declare function checkPrimaryKey(jsonSchema: RxJsonSchema<any>): void;
/**
 * does the checking
 * @throws {Error} if something is not ok
 */
export declare function checkSchema(jsonSchema: RxJsonSchema<any>): void;
