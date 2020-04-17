import { newRxTypeError, newRxError } from '../../rx-error';
import { getPreviousVersions } from '../../rx-schema';
/**
 * checks if the migrationStrategies are ok, throws if not
 * @throws {Error|TypeError} if not ok
 */

export function checkMigrationStrategies(schema, migrationStrategies) {
  // migrationStrategies must be object not array
  if (typeof migrationStrategies !== 'object' || Array.isArray(migrationStrategies)) {
    throw newRxTypeError('COL11', {
      schema: schema
    });
  }

  var previousVersions = getPreviousVersions(schema); // for every previousVersion there must be strategy

  if (previousVersions.length !== Object.keys(migrationStrategies).length) {
    throw newRxError('COL12', {
      have: Object.keys(migrationStrategies),
      should: previousVersions
    });
  } // every strategy must have number as property and be a function


  previousVersions.map(function (vNr) {
    return {
      v: vNr,
      s: migrationStrategies[vNr + 1]
    };
  }).filter(function (strat) {
    return typeof strat.s !== 'function';
  }).forEach(function (strat) {
    throw newRxTypeError('COL13', {
      version: strat.v,
      type: typeof strat,
      schema: schema
    });
  });
  return true;
}
//# sourceMappingURL=check-migration-strategies.js.map