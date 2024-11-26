"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.RX_STATE_SCHEMA_TITLE = exports.RX_STATE_ID_LENGTH = exports.RX_STATE_COLLECTION_SCHEMA = void 0;
exports.isValidWeakMapKey = isValidWeakMapKey;
exports.nextRxStateId = nextRxStateId;
var _overwritable = require("../../overwritable.js");
var _rxError = require("../../rx-error.js");
var RX_STATE_SCHEMA_TITLE = exports.RX_STATE_SCHEMA_TITLE = 'RxStateCollection';
var RX_STATE_ID_LENGTH = exports.RX_STATE_ID_LENGTH = 14;
var RX_STATE_COLLECTION_SCHEMA = exports.RX_STATE_COLLECTION_SCHEMA = {
  title: RX_STATE_SCHEMA_TITLE,
  primaryKey: 'id',
  version: 0,
  type: 'object',
  properties: {
    id: {
      type: 'string',
      /**
       * We store numbers in string format like '0001'
       * with a left-pad.
       */
      maxLength: RX_STATE_ID_LENGTH,
      minLength: RX_STATE_ID_LENGTH,
      pattern: '[0-9]+'
    },
    sId: {
      type: 'string',
      maxLength: 10,
      minLength: 10
    },
    ops: {
      type: 'array',
      minItems: 1,
      items: {
        type: 'object',
        properties: {
          k: {
            type: 'string'
          },
          v: {
            /**
             * Do not define a type for the value
             * because anything is allowed.
             */
          }
        },
        required: ['k', 'v']
      }
    }
  },
  required: ['id', 'sId', 'ops']
};
function nextRxStateId(lastId) {
  if (!lastId) {
    return ''.padStart(RX_STATE_ID_LENGTH, '0');
  }
  var parsed = parseInt(lastId, 10);
  var next = parsed + 1;
  var nextString = next.toString();
  return nextString.padStart(RX_STATE_ID_LENGTH, '0');
}

/**
 * Only non-primitives can be used as a key in WeakMap
 */
function isValidWeakMapKey(key) {
  // This method is slow and must only be used in dev-mode!
  if (!_overwritable.overwritable.isDevMode()) {
    throw (0, _rxError.newRxError)('SNH');
  }
  try {
    new WeakMap().set(key, {});
    return true;
  } catch (err) {
    return false;
  }
}
//# sourceMappingURL=helpers.js.map