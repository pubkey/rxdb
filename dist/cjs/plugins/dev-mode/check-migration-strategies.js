"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.checkMigrationStrategies = checkMigrationStrategies;
var _rxError = require("../../rx-error.js");
var _rxSchema = require("../../rx-schema.js");
/**
 * checks if the migrationStrategies are ok, throws if not
 * @throws {Error|TypeError} if not ok
 */
function checkMigrationStrategies(schema, migrationStrategies) {
  // migrationStrategies must be object not array
  if (typeof migrationStrategies !== 'object' || Array.isArray(migrationStrategies)) {
    throw (0, _rxError.newRxTypeError)('COL11', {
      schema
    });
  }
  var previousVersions = (0, _rxSchema.getPreviousVersions)(schema);

  // for every previousVersion there must be strategy
  if (previousVersions.length !== Object.keys(migrationStrategies).length) {
    throw (0, _rxError.newRxError)('COL12', {
      have: Object.keys(migrationStrategies),
      should: previousVersions
    });
  }

  // every strategy must have number as property and be a function
  previousVersions.map(vNr => ({
    v: vNr,
    s: migrationStrategies[vNr + 1]
  })).filter(strategy => typeof strategy.s !== 'function').forEach(strategy => {
    throw (0, _rxError.newRxTypeError)('COL13', {
      version: strategy.v,
      type: typeof strategy,
      schema
    });
  });
  return true;
}
//# sourceMappingURL=check-migration-strategies.js.map