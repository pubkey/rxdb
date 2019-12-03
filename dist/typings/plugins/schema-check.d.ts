/**
 * does additional checks over the schema-json
 * to ensure nothing is broken or not supported
 */
import { RxJsonSchema, RxCollectionCreator } from '../types';
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
export declare function checkSchema(jsonID: RxJsonSchema): void;
export declare const rxdb = true;
export declare const hooks: {
    preCreateRxSchema: typeof checkSchema;
    createRxCollection: (args: RxCollectionCreator) => void;
};
declare const _default: {
    rxdb: boolean;
    hooks: {
        preCreateRxSchema: typeof checkSchema;
        createRxCollection: (args: RxCollectionCreator) => void;
    };
};
export default _default;
