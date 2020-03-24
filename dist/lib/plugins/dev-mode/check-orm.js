"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.checkOrmMethods = checkOrmMethods;

var _rxError = require("../../rx-error");

var _rxDocument = require("../../rx-document");

var _rxCollection = require("../../rx-collection");

/**
 * checks if the given static methods are allowed
 * @throws if not allowed
 */
function checkOrmMethods(statics) {
  if (!statics) {
    return;
  }

  Object.entries(statics).forEach(function (_ref) {
    var k = _ref[0],
        v = _ref[1];

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

    if ((0, _rxCollection.properties)().includes(k) || (0, _rxDocument.properties)().includes(k)) {
      throw (0, _rxError.newRxError)('COL17', {
        name: k
      });
    }
  });
}

//# sourceMappingURL=check-orm.js.map