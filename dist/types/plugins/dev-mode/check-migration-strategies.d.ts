import type { RxJsonSchema, NumberFunctionMap } from '../../types';
/**
 * checks if the migrationStrategies are ok, throws if not
 * @throws {Error|TypeError} if not ok
 */
export declare function checkMigrationStrategies(schema: RxJsonSchema, migrationStrategies: NumberFunctionMap): boolean;
