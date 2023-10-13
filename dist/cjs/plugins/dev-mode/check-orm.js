"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.checkOrmDocumentMethods = checkOrmDocumentMethods;
exports.checkOrmMethods = checkOrmMethods;
var _rxError = require("../../rx-error.js");
var _entityProperties = require("./entity-properties.js");
/**
 * checks if the given static methods are allowed
 * @throws if not allowed
 */
function checkOrmMethods(statics) {
  if (!statics) {
    return;
  }
  Object.entries(statics).forEach(([k, v]) => {
    if (typeof k !== 'string') {
      throw (0, _rxError.newRxTypeError)('COL14', {
        name: k
      });
    }
    if (k.startsWith('_')) {
      throw (0, _rxError.newRxTypeError)('COL15', {
        name: k
      });
    }
    if (typeof v !== 'function') {
      throw (0, _rxError.newRxTypeError)('COL16', {
        name: k,
        type: typeof k
      });
    }
    if ((0, _entityProperties.rxCollectionProperties)().includes(k) || (0, _entityProperties.rxDocumentProperties)().includes(k)) {
      throw (0, _rxError.newRxError)('COL17', {
        name: k
      });
    }
  });
}
function checkOrmDocumentMethods(schema, methods) {
  var topLevelFields = Object.keys(schema.properties);
  if (!methods) {
    return;
  }
  Object.keys(methods).filter(funName => topLevelFields.includes(funName)).forEach(funName => {
    throw (0, _rxError.newRxError)('COL18', {
      funName
    });
  });
}
//# sourceMappingURL=check-orm.js.map