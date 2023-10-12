import type { RxJsonSchema, NumberFunctionMap } from '../../types/index.d.ts';
import { newRxTypeError, newRxError } from '../../rx-error.ts';
import { getPreviousVersions } from '../../rx-schema.ts';


/**
 * checks if the migrationStrategies are ok, throws if not
 * @throws {Error|TypeError} if not ok
 */
export function checkMigrationStrategies(
    schema: RxJsonSchema<any>,
    migrationStrategies: NumberFunctionMap
): boolean {
    // migrationStrategies must be object not array
    if (
        typeof migrationStrategies !== 'object' ||
        Array.isArray(migrationStrategies)
    ) {
        throw newRxTypeError('COL11', {
            schema
        });
    }

    const previousVersions = getPreviousVersions(schema);

    // for every previousVersion there must be strategy
    if (
        previousVersions.length !== Object
            .keys(migrationStrategies).length
    ) {
        throw newRxError('COL12', {
            have: Object.keys(migrationStrategies),
            should: previousVersions
        });
    }

    // every strategy must have number as property and be a function
    previousVersions
        .map(vNr => ({
            v: vNr,
            s: migrationStrategies[(vNr + 1)]
        }))
        .filter(strategy => typeof strategy.s !== 'function')
        .forEach(strategy => {
            throw newRxTypeError('COL13', {
                version: strategy.v,
                type: typeof strategy,
                schema
            });
        });

    return true;
}
