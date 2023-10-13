import type { RxJsonSchema, NumberFunctionMap } from '../../types/index.d.ts';
/**
 * checks if the migrationStrategies are ok, throws if not
 * @throws {Error|TypeError} if not ok
 */
export declare function checkMigrationStrategies(schema: RxJsonSchema<any>, migrationStrategies: NumberFunctionMap): boolean;
