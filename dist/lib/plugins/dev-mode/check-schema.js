"use strict";

var _interopRequireDefault = require("@babel/runtime/helpers/interopRequireDefault");

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.checkFieldNameRegex = checkFieldNameRegex;
exports.validateFieldsDeep = validateFieldsDeep;
exports.checkSchema = checkSchema;

var _objectPath = _interopRequireDefault(require("object-path"));

var _rxDocument = require("../../rx-document");

var _rxError = require("../../rx-error");

var _util = require("../../util");

/**
 * does additional checks over the schema-json
 * to ensure nothing is broken or not supported
 */

/**
 * checks if the fieldname is allowed
 * this makes sure that the fieldnames can be transformed into javascript-vars
 * and does not conquer the observe$ and populate_ fields
 * @throws {Error}
 */
function checkFieldNameRegex(fieldName) {
  if (fieldName === '') return;
  if (fieldName === '_id') return;

  if (['properties', 'language'].includes(fieldName)) {
    throw (0, _rxError.newRxError)('SC23', {
      fieldName: fieldName
    });
  }

  var regexStr = '^[a-zA-Z](?:[[a-zA-Z0-9_]*]?[a-zA-Z0-9])?$';
  var regex = new RegExp(regexStr);

  if (!fieldName.match(regex)) {
    throw (0, _rxError.newRxError)('SC1', {
      regex: regexStr,
      fieldName: fieldName
    });
  }
}
/**
 * validate that all schema-related things are ok
 */


function validateFieldsDeep(jsonSchema) {
  function checkField(fieldName, schemaObj, path) {
    if (typeof fieldName === 'string' && typeof schemaObj === 'object' && !Array.isArray(schemaObj)) checkFieldNameRegex(fieldName); // 'item' only allowed it type=='array'

    if (schemaObj.hasOwnProperty('item') && schemaObj.type !== 'array') {
      throw (0, _rxError.newRxError)('SC2', {
        fieldName: fieldName
      });
    }
    /**
     * required fields cannot be set via 'required: true',
     * but must be set via required: []
     */


    if (schemaObj.hasOwnProperty('required') && typeof schemaObj.required === 'boolean') {
      throw (0, _rxError.newRxError)('SC24', {
        fieldName: fieldName
      });
    } // if ref given, must be type=='string' or type=='array' with string-items


    if (schemaObj.hasOwnProperty('ref')) {
      switch (schemaObj.type) {
        case 'string':
          break;

        case 'array':
          if (!schemaObj.items || !schemaObj.items.type || schemaObj.items.type !== 'string') {
            throw (0, _rxError.newRxError)('SC3', {
              fieldName: fieldName
            });
          }

          break;

        default:
          throw (0, _rxError.newRxError)('SC4', {
            fieldName: fieldName
          });
      }
    } // if primary is ref, throw


    if (schemaObj.hasOwnProperty('ref') && schemaObj.primary) {
      throw (0, _rxError.newRxError)('SC5', {
        fieldName: fieldName
      });
    }

    var isNested = path.split('.').length >= 2; // nested only

    if (isNested) {
      if (schemaObj.primary) {
        throw (0, _rxError.newRxError)('SC6', {
          path: path,
          primary: schemaObj.primary
        });
      }

      if (schemaObj["default"]) {
        throw (0, _rxError.newRxError)('SC7', {
          path: path
        });
      }
    } // first level


    if (!isNested) {
      // check underscore fields
      if (fieldName.charAt(0) === '_') {
        if (fieldName === '_id' && schemaObj.primary) {
          return;
        }

        throw (0, _rxError.newRxError)('SC8', {
          fieldName: fieldName
        });
      }
    }
  }

  function traverse(currentObj, currentPath) {
    if (typeof currentObj !== 'object') return;
    Object.keys(currentObj).forEach(function (attributeName) {
      if (!currentObj.properties) {
        checkField(attributeName, currentObj[attributeName], currentPath);
      }

      var nextPath = currentPath;
      if (attributeName !== 'properties') nextPath = nextPath + '.' + attributeName;
      traverse(currentObj[attributeName], nextPath);
    });
  }

  traverse(jsonSchema, '');
  return true;
}
/**
 * computes real path of the index in the collection schema
 */


function getIndexRealPath(shortPath) {
  var pathParts = shortPath.split('.');
  var realPath = '';

  for (var i = 0; i < pathParts.length; i += 1) {
    if (pathParts[i] !== '[]') {
      realPath = realPath.concat('.properties.'.concat(pathParts[i]));
    } else {
      realPath = realPath.concat('.items');
    }
  }

  return (0, _util.trimDots)(realPath);
}
/**
 * does the checking
 * @throws {Error} if something is not ok
 */


function checkSchema(jsonSchema) {
  // check _rev
  if (jsonSchema.properties._rev) {
    throw (0, _rxError.newRxError)('SC10', {
      schema: jsonSchema
    });
  } // check version


  if (!jsonSchema.hasOwnProperty('version') || typeof jsonSchema.version !== 'number' || jsonSchema.version < 0) {
    throw (0, _rxError.newRxError)('SC11', {
      version: jsonSchema.version
    });
  }

  validateFieldsDeep(jsonSchema);
  var primaryPath;
  Object.keys(jsonSchema.properties).forEach(function (key) {
    var value = jsonSchema.properties[key]; // check primary

    if (value.primary) {
      if (primaryPath) {
        throw (0, _rxError.newRxError)('SC12', {
          value: value
        });
      }

      primaryPath = key;

      if (value.index) {
        throw (0, _rxError.newRxError)('SC13', {
          value: value
        });
      }

      if (value.unique) {
        throw (0, _rxError.newRxError)('SC14', {
          value: value
        });
      }

      if (value.encrypted) {
        throw (0, _rxError.newRxError)('SC15', {
          value: value
        });
      }

      if (value.type !== 'string') {
        throw (0, _rxError.newRxError)('SC16', {
          value: value
        });
      }
    } // check if RxDocument-property


    if ((0, _rxDocument.properties)().includes(key)) {
      throw (0, _rxError.newRxError)('SC17', {
        key: key
      });
    }
  }); // check format of jsonSchema.indexes

  if (jsonSchema.indexes) {
    // should be an array
    if (!Array.isArray(jsonSchema.indexes)) {
      throw (0, _rxError.newRxError)('SC18', {
        indexes: jsonSchema.indexes
      });
    }

    jsonSchema.indexes.forEach(function (index) {
      // should contain strings or array of strings
      if (!(typeof index === 'string' || Array.isArray(index))) {
        throw (0, _rxError.newRxError)('SC19', {
          index: index
        });
      } // if is a compound index it must contain strings


      if (Array.isArray(index)) {
        for (var i = 0; i < index.length; i += 1) {
          if (typeof index[i] !== 'string') {
            throw (0, _rxError.newRxError)('SC20', {
              index: index
            });
          }
        }
      }
    });
  }
  /** FIXME this check has to exist only in beta-version, to help developers migrate their schemas */
  // remove backward-compatibility for compoundIndexes


  if (Object.keys(jsonSchema).includes('compoundIndexes')) {
    throw (0, _rxError.newRxError)('SC25');
  } // remove backward-compatibility for index: true


  Object.keys((0, _util.flattenObject)(jsonSchema)).map(function (key) {
    // flattenObject returns only ending paths, we need all paths pointing to an object
    var splitted = key.split('.');
    splitted.pop(); // all but last

    return splitted.join('.');
  }).filter(function (key) {
    return key !== '';
  }).filter(function (elem, pos, arr) {
    return arr.indexOf(elem) === pos;
  }) // unique
  .filter(function (key) {
    // check if this path defines an index
    var value = _objectPath["default"].get(jsonSchema, key);

    return !!value.index;
  }).forEach(function (key) {
    // replace inner properties
    key = key.replace('properties.', ''); // first

    key = key.replace(/\.properties\./g, '.'); // middle

    throw (0, _rxError.newRxError)('SC26', {
      index: (0, _util.trimDots)(key)
    });
  });
  /* check types of the indexes */

  (jsonSchema.indexes || []).reduce(function (indexPaths, currentIndex) {
    if (Array.isArray(currentIndex)) {
      indexPaths.concat(currentIndex);
    } else {
      indexPaths.push(currentIndex);
    }

    return indexPaths;
  }, []).filter(function (elem, pos, arr) {
    return arr.indexOf(elem) === pos;
  }) // from now on working only with unique indexes
  .map(function (indexPath) {
    var realPath = getIndexRealPath(indexPath); // real path in the collection schema

    var schemaObj = _objectPath["default"].get(jsonSchema, realPath); // get the schema of the indexed property


    if (!schemaObj || typeof schemaObj !== 'object') {
      throw (0, _rxError.newRxError)('SC21', {
        index: indexPath
      });
    }

    return {
      indexPath: indexPath,
      schemaObj: schemaObj
    };
  }).filter(function (index) {
    return index.schemaObj.type !== 'string' && index.schemaObj.type !== 'integer' && index.schemaObj.type !== 'number';
  }).forEach(function (index) {
    throw (0, _rxError.newRxError)('SC22', {
      key: index.indexPath,
      type: index.schemaObj.type
    });
  });
}

//# sourceMappingURL=check-schema.js.map