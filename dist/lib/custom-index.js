"use strict";

var _interopRequireDefault = require("@babel/runtime/helpers/interopRequireDefault");

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.MAX_CHAR = void 0;
exports.getIndexableStringMonad = getIndexableStringMonad;
exports.getNumberIndexString = getNumberIndexString;
exports.getStartIndexStringFromLowerBound = getStartIndexStringFromLowerBound;
exports.getStartIndexStringFromUpperBound = getStartIndexStringFromUpperBound;
exports.getStringLengthOfIndexNumber = getStringLengthOfIndexNumber;

var _rxSchemaHelper = require("./rx-schema-helper");

var _objectPath = _interopRequireDefault(require("object-path"));

var _util = require("./util");

/**
 * For some RxStorage implementations,
 * we need to use our custom crafted indexes
 * so we can easily iterate over them. And sort plain arrays of document data.
 */

/**
 * Crafts an indexable string that can be used
 * to check if a document would be sorted below or above 
 * another documents, dependent on the index values.
 * @monad for better performance
 */
function getIndexableStringMonad(schema, index) {
  /**
   * Prepare all relevant information
   * outside of the returned function
   * to save performance when the returned
   * function is called many times.
   */
  var fieldNameProperties = {};
  index.forEach(function (fieldName) {
    var schemaPart = (0, _rxSchemaHelper.getSchemaByObjectPath)(schema, fieldName);
    fieldNameProperties[fieldName] = {
      schemaPart: schemaPart
    };
    var type = schemaPart.type;

    if (type === 'number' || type === 'integer') {
      var parsedLengths = getStringLengthOfIndexNumber(schemaPart);
      fieldNameProperties[fieldName].parsedLengths = parsedLengths;
    }
  });

  var ret = function ret(docData) {
    var str = '';
    index.forEach(function (fieldName) {
      var schemaPart = fieldNameProperties[fieldName].schemaPart;

      var fieldValue = _objectPath["default"].get(docData, fieldName);

      var type = schemaPart.type;

      switch (type) {
        case 'string':
          var maxLength = schemaPart.maxLength;

          if (!fieldValue) {
            fieldValue = '';
          }

          str += fieldValue.padStart(maxLength, ' ');
          break;

        case 'boolean':
          var boolToStr = fieldValue ? '1' : '0';
          str += boolToStr;
          break;

        case 'number':
        case 'integer':
          var parsedLengths = (0, _util.ensureNotFalsy)(fieldNameProperties[fieldName].parsedLengths);

          if (!fieldValue) {
            fieldValue = 0;
          }

          str += getNumberIndexString(parsedLengths, fieldValue);
          break;

        default:
          throw new Error('unknown index type ' + type);
      }
    });
    return str;
  };

  return ret;
}

function getStringLengthOfIndexNumber(schemaPart) {
  var minimum = Math.floor(schemaPart.minimum);
  var maximum = Math.ceil(schemaPart.maximum);
  var multipleOf = schemaPart.multipleOf;
  var valueSpan = maximum - minimum;
  var nonDecimals = valueSpan.toString().length;
  var multipleOfParts = multipleOf.toString().split('.');
  var decimals = 0;

  if (multipleOfParts.length > 1) {
    decimals = multipleOfParts[1].length;
  }

  return {
    nonDecimals: nonDecimals,
    decimals: decimals,
    roundedMinimum: minimum
  };
}

function getNumberIndexString(parsedLengths, fieldValue) {
  var str = '';
  var nonDecimalsValueAsString = (Math.floor(fieldValue) - parsedLengths.roundedMinimum).toString();
  str += nonDecimalsValueAsString.padStart(parsedLengths.nonDecimals, '0');
  var splittedByDecimalPoint = fieldValue.toString().split('.');
  var decimalValueAsString = splittedByDecimalPoint.length > 1 ? splittedByDecimalPoint[1] : '0';
  str += decimalValueAsString.padEnd(parsedLengths.decimals, '0');
  return str;
}

function getStartIndexStringFromLowerBound(schema, index, lowerBound) {
  var str = '';
  index.forEach(function (fieldName, idx) {
    var schemaPart = (0, _rxSchemaHelper.getSchemaByObjectPath)(schema, fieldName);
    var bound = lowerBound[idx];
    var type = schemaPart.type;

    switch (type) {
      case 'string':
        var maxLength = (0, _util.ensureNotFalsy)(schemaPart.maxLength);

        if (typeof bound === 'string') {
          str += bound.padStart(maxLength, ' ');
        } else {
          str += ''.padStart(maxLength, ' ');
        }

        break;

      case 'boolean':
        if (bound === null) {
          str += '0';
        } else {
          var boolToStr = bound ? '1' : '0';
          str += boolToStr;
        }

        break;

      case 'number':
      case 'integer':
        var parsedLengths = getStringLengthOfIndexNumber(schemaPart);

        if (bound === null) {
          str += '0'.repeat(parsedLengths.nonDecimals + parsedLengths.decimals);
        } else {
          str += getNumberIndexString(parsedLengths, bound);
        }

        break;

      default:
        throw new Error('unknown index type ' + type);
    }
  });
  return str;
}

var MAX_CHAR = String.fromCharCode(65535);
exports.MAX_CHAR = MAX_CHAR;

function getStartIndexStringFromUpperBound(schema, index, upperBound) {
  var str = '';
  index.forEach(function (fieldName, idx) {
    var schemaPart = (0, _rxSchemaHelper.getSchemaByObjectPath)(schema, fieldName);
    var bound = upperBound[idx];
    var type = schemaPart.type;

    switch (type) {
      case 'string':
        var maxLength = (0, _util.ensureNotFalsy)(schemaPart.maxLength);

        if (typeof bound === 'string') {
          str += bound.padStart(maxLength, MAX_CHAR);
        } else {
          str += ''.padStart(maxLength, MAX_CHAR);
        }

        break;

      case 'boolean':
        if (bound === null) {
          str += '1';
        } else {
          var boolToStr = bound ? '1' : '0';
          str += boolToStr;
        }

        break;

      case 'number':
      case 'integer':
        var parsedLengths = getStringLengthOfIndexNumber(schemaPart);

        if (bound === null || bound === MAX_CHAR) {
          str += '9'.repeat(parsedLengths.nonDecimals + parsedLengths.decimals);
        } else {
          str += getNumberIndexString(parsedLengths, bound);
        }

        break;

      default:
        throw new Error('unknown index type ' + type);
    }
  });
  return str;
}
//# sourceMappingURL=custom-index.js.map