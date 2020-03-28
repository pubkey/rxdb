"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.ensureCollectionNameValid = ensureCollectionNameValid;

var _rxError = require("../../rx-error");

var _entityProperties = require("./entity-properties");

/**
 * if the name of a collection
 * clashes with a property of RxDatabase,
 * we get problems so this function prohibits this
 */
function ensureCollectionNameValid(args) {
  if ((0, _entityProperties.rxDatabaseProperties)().includes(args.name)) {
    throw (0, _rxError.newRxError)('DB5', {
      name: args.name
    });
  }
}

//# sourceMappingURL=unallowed-properties.js.map