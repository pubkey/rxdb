/**
 * does additional checks over the schema-json
 * to ensure nothing is broken or not supported
 */

import objectPath from 'object-path';
import { newRxError } from '../../rx-error';
import { getPrimaryFieldOfPrimaryKey, getSchemaByObjectPath } from '../../rx-schema-helper';
import { flattenObject, isMaybeReadonlyArray, trimDots } from '../../util';
import { rxDocumentProperties } from './entity-properties';

/**
 * checks if the fieldname is allowed
 * this makes sure that the fieldnames can be transformed into javascript-vars
 * and does not conquer the observe$ and populate_ fields
 * @throws {Error}
 */
export function checkFieldNameRegex(fieldName) {
  if (fieldName === '_deleted') {
    return;
  }
  if (['properties', 'language'].includes(fieldName)) {
    throw newRxError('SC23', {
      fieldName: fieldName
    });
  }
  var regexStr = '^[a-zA-Z](?:[[a-zA-Z0-9_]*]?[a-zA-Z0-9])?$';
  var regex = new RegExp(regexStr);
  if (
  /**
   * It must be allowed to set _id as primaryKey.
   * This makes it sometimes easier to work with RxDB+CouchDB
   * @link https://github.com/pubkey/rxdb/issues/681
   */
  fieldName !== '_id' && !fieldName.match(regex)) {
    throw newRxError('SC1', {
      regex: regexStr,
      fieldName: fieldName
    });
  }
}

/**
 * validate that all schema-related things are ok
 */
export function validateFieldsDeep(rxJsonSchema) {
  var primaryPath = getPrimaryFieldOfPrimaryKey(rxJsonSchema.primaryKey);
  function checkField(fieldName, schemaObj, path) {
    if (typeof fieldName === 'string' && typeof schemaObj === 'object' && !Array.isArray(schemaObj)) checkFieldNameRegex(fieldName);

    // 'item' only allowed it type=='array'
    if (schemaObj.hasOwnProperty('item') && schemaObj.type !== 'array') {
      throw newRxError('SC2', {
        fieldName: fieldName
      });
    }

    /**
     * required fields cannot be set via 'required: true',
     * but must be set via required: []
     */
    if (schemaObj.hasOwnProperty('required') && typeof schemaObj.required === 'boolean') {
      throw newRxError('SC24', {
        fieldName: fieldName
      });
    }

    // if ref given, must be type=='string', type=='array' with string-items or type==['string','null']
    if (schemaObj.hasOwnProperty('ref')) {
      if (Array.isArray(schemaObj.type)) {
        if (schemaObj.type.length > 2 || !schemaObj.type.includes('string') || !schemaObj.type.includes('null')) {
          throw newRxError('SC4', {
            fieldName: fieldName
          });
        }
      } else {
        switch (schemaObj.type) {
          case 'string':
            break;
          case 'array':
            if (!schemaObj.items || !schemaObj.items.type || schemaObj.items.type !== 'string') {
              throw newRxError('SC3', {
                fieldName: fieldName
              });
            }
            break;
          default:
            throw newRxError('SC4', {
              fieldName: fieldName
            });
        }
      }
    }
    var isNested = path.split('.').length >= 2;

    // nested only
    if (isNested) {
      if (schemaObj.primary) {
        throw newRxError('SC6', {
          path: path,
          primary: schemaObj.primary
        });
      }
      if (schemaObj["default"]) {
        throw newRxError('SC7', {
          path: path
        });
      }
    }

    // first level
    if (!isNested) {
      // if _id is used, it must be primaryKey
      if (fieldName === '_id' && primaryPath !== '_id') {
        throw newRxError('COL2', {
          fieldName: fieldName
        });
      }

      // check underscore fields
      if (fieldName.charAt(0) === '_') {
        if (
        // exceptional allow underscore on these fields.
        fieldName === '_id' || fieldName === '_deleted') {
          return;
        }
        throw newRxError('SC8', {
          fieldName: fieldName
        });
      }
    }
  }
  function traverse(currentObj, currentPath) {
    if (!currentObj || typeof currentObj !== 'object') return;
    Object.keys(currentObj).forEach(function (attributeName) {
      var schemaObj = currentObj[attributeName];
      if (!currentObj.properties && schemaObj && typeof schemaObj === 'object') {
        checkField(attributeName, schemaObj, currentPath);
      }
      var nextPath = currentPath;
      if (attributeName !== 'properties') nextPath = nextPath + '.' + attributeName;
      traverse(schemaObj, nextPath);
    });
  }
  traverse(rxJsonSchema, '');
  return true;
}
export function checkPrimaryKey(jsonSchema) {
  if (!jsonSchema.primaryKey) {
    throw newRxError('SC30', {
      schema: jsonSchema
    });
  }
  function validatePrimarySchemaPart(schemaPart) {
    if (!schemaPart) {
      throw newRxError('SC33', {
        schema: jsonSchema
      });
    }
    var type = schemaPart.type;
    if (!type || !['string', 'number', 'integer'].includes(type)) {
      throw newRxError('SC32', {
        schema: jsonSchema,
        args: {
          schemaPart: schemaPart
        }
      });
    }
  }
  if (typeof jsonSchema.primaryKey === 'string') {
    var key = jsonSchema.primaryKey;
    var schemaPart = jsonSchema.properties[key];
    validatePrimarySchemaPart(schemaPart);
  } else {
    var compositePrimaryKey = jsonSchema.primaryKey;
    var keySchemaPart = getSchemaByObjectPath(jsonSchema, compositePrimaryKey.key);
    validatePrimarySchemaPart(keySchemaPart);
    compositePrimaryKey.fields.forEach(function (field) {
      var schemaPart = getSchemaByObjectPath(jsonSchema, field);
      validatePrimarySchemaPart(schemaPart);
    });
  }

  /**
   * The primary key must have a maxLength set
   * which is required by some RxStorage implementations
   * to ensure we can craft custom index strings.
   */
  var primaryPath = getPrimaryFieldOfPrimaryKey(jsonSchema.primaryKey);
  var primaryPathSchemaPart = jsonSchema.properties[primaryPath];
  if (!primaryPathSchemaPart.maxLength) {
    throw newRxError('SC39', {
      schema: jsonSchema,
      args: {
        primaryPathSchemaPart: primaryPathSchemaPart
      }
    });
  }
}

/**
 * computes real path of the object path in the collection schema
 */
function getSchemaPropertyRealPath(shortPath) {
  var pathParts = shortPath.split('.');
  var realPath = '';
  for (var i = 0; i < pathParts.length; i += 1) {
    if (pathParts[i] !== '[]') {
      realPath = realPath.concat('.properties.'.concat(pathParts[i]));
    } else {
      realPath = realPath.concat('.items');
    }
  }
  return trimDots(realPath);
}

/**
 * does the checking
 * @throws {Error} if something is not ok
 */
export function checkSchema(jsonSchema) {
  if (!jsonSchema.primaryKey) {
    throw newRxError('SC30', {
      schema: jsonSchema
    });
  }
  if (!jsonSchema.hasOwnProperty('properties')) {
    throw newRxError('SC29', {
      schema: jsonSchema
    });
  }

  // _rev MUST NOT exist, it is added by RxDB
  if (jsonSchema.properties._rev) {
    throw newRxError('SC10', {
      schema: jsonSchema
    });
  }

  // check version
  if (!jsonSchema.hasOwnProperty('version') || typeof jsonSchema.version !== 'number' || jsonSchema.version < 0) {
    throw newRxError('SC11', {
      version: jsonSchema.version
    });
  }
  validateFieldsDeep(jsonSchema);
  checkPrimaryKey(jsonSchema);
  Object.keys(jsonSchema.properties).forEach(function (key) {
    var value = jsonSchema.properties[key];
    // check primary
    if (key === jsonSchema.primaryKey) {
      if (jsonSchema.indexes && jsonSchema.indexes.includes(key)) {
        throw newRxError('SC13', {
          value: value,
          schema: jsonSchema
        });
      }
      if (value.unique) {
        throw newRxError('SC14', {
          value: value,
          schema: jsonSchema
        });
      }
      if (jsonSchema.encrypted && jsonSchema.encrypted.includes(key)) {
        throw newRxError('SC15', {
          value: value,
          schema: jsonSchema
        });
      }
      if (value.type !== 'string') {
        throw newRxError('SC16', {
          value: value,
          schema: jsonSchema
        });
      }
    }

    // check if RxDocument-property
    if (rxDocumentProperties().includes(key)) {
      throw newRxError('SC17', {
        key: key,
        schema: jsonSchema
      });
    }
  });

  // check format of jsonSchema.indexes
  if (jsonSchema.indexes) {
    // should be an array
    if (!isMaybeReadonlyArray(jsonSchema.indexes)) {
      throw newRxError('SC18', {
        indexes: jsonSchema.indexes,
        schema: jsonSchema
      });
    }
    jsonSchema.indexes.forEach(function (index) {
      // should contain strings or array of strings
      if (!(typeof index === 'string' || Array.isArray(index))) {
        throw newRxError('SC19', {
          index: index,
          schema: jsonSchema
        });
      }
      // if is a compound index it must contain strings
      if (Array.isArray(index)) {
        for (var i = 0; i < index.length; i += 1) {
          if (typeof index[i] !== 'string') {
            throw newRxError('SC20', {
              index: index,
              schema: jsonSchema
            });
          }
        }
      }

      /**
       * To be able to craft custom indexable string with compound fields,
       * we need to know the maximum fieldlength of the fields values
       * when they are transformed to strings.
       * Therefore we need to enforce some properties inside of the schema.
       */
      var indexAsArray = isMaybeReadonlyArray(index) ? index : [index];
      indexAsArray.forEach(function (fieldName) {
        var schemaPart = getSchemaByObjectPath(jsonSchema, fieldName);
        var type = schemaPart.type;
        switch (type) {
          case 'string':
            var maxLength = schemaPart.maxLength;
            if (!maxLength) {
              throw newRxError('SC34', {
                index: index,
                field: fieldName,
                schema: jsonSchema
              });
            }
            break;
          case 'number':
          case 'integer':
            var multipleOf = schemaPart.multipleOf;
            if (!multipleOf) {
              throw newRxError('SC35', {
                index: index,
                field: fieldName,
                schema: jsonSchema
              });
            }
            var maximum = schemaPart.maximum;
            var minimum = schemaPart.minimum;
            if (typeof maximum === 'undefined' || typeof minimum === 'undefined') {
              throw newRxError('SC37', {
                index: index,
                field: fieldName,
                schema: jsonSchema
              });
            }
            break;
          case 'boolean':
            /**
             * If a boolean field is used as an index,
             * it must be required.
             */
            var parentPath = '';
            var lastPathPart = fieldName;
            if (fieldName.includes('.')) {
              var partParts = fieldName.split('.');
              lastPathPart = partParts.pop();
              parentPath = partParts.join('.');
            }
            var parentSchemaPart = parentPath === '' ? jsonSchema : getSchemaByObjectPath(jsonSchema, parentPath);
            if (!parentSchemaPart.required || !parentSchemaPart.required.includes(lastPathPart)) {
              throw newRxError('SC38', {
                index: index,
                field: fieldName,
                schema: jsonSchema
              });
            }
            break;
          default:
            throw newRxError('SC36', {
              fieldName: fieldName,
              type: schemaPart.type,
              schema: jsonSchema
            });
        }
      });
    });
  }

  // remove backward-compatibility for index: true
  Object.keys(flattenObject(jsonSchema)).map(function (key) {
    // flattenObject returns only ending paths, we need all paths pointing to an object
    var split = key.split('.');
    split.pop(); // all but last
    return split.join('.');
  }).filter(function (key) {
    return key !== '';
  }).filter(function (elem, pos, arr) {
    return arr.indexOf(elem) === pos;
  }) // unique
  .filter(function (key) {
    // check if this path defines an index
    var value = objectPath.get(jsonSchema, key);
    return !!value.index;
  }).forEach(function (key) {
    // replace inner properties
    key = key.replace('properties.', ''); // first
    key = key.replace(/\.properties\./g, '.'); // middle
    throw newRxError('SC26', {
      index: trimDots(key),
      schema: jsonSchema
    });
  });

  /* check types of the indexes */
  (jsonSchema.indexes || []).reduce(function (indexPaths, currentIndex) {
    if (isMaybeReadonlyArray(currentIndex)) {
      indexPaths.concat(currentIndex);
    } else {
      indexPaths.push(currentIndex);
    }
    return indexPaths;
  }, []).filter(function (elem, pos, arr) {
    return arr.indexOf(elem) === pos;
  }) // from now on working only with unique indexes
  .map(function (indexPath) {
    var realPath = getSchemaPropertyRealPath(indexPath); // real path in the collection schema
    var schemaObj = objectPath.get(jsonSchema, realPath); // get the schema of the indexed property
    if (!schemaObj || typeof schemaObj !== 'object') {
      throw newRxError('SC21', {
        index: indexPath,
        schema: jsonSchema
      });
    }
    return {
      indexPath: indexPath,
      schemaObj: schemaObj
    };
  }).filter(function (index) {
    return index.schemaObj.type !== 'string' && index.schemaObj.type !== 'integer' && index.schemaObj.type !== 'number' && index.schemaObj.type !== 'boolean';
  }).forEach(function (index) {
    throw newRxError('SC22', {
      key: index.indexPath,
      type: index.schemaObj.type,
      schema: jsonSchema
    });
  });

  /**
   * TODO
   * in 9.0.0 we changed the way encrypted fields are defined
   * This check ensures people do not oversee the breaking change
   * Remove this check in the future
   */
  Object.keys(flattenObject(jsonSchema)).map(function (key) {
    // flattenObject returns only ending paths, we need all paths pointing to an object
    var split = key.split('.');
    split.pop(); // all but last
    return split.join('.');
  }).filter(function (key) {
    return key !== '' && key !== 'attachments';
  }).filter(function (elem, pos, arr) {
    return arr.indexOf(elem) === pos;
  }) // unique
  .filter(function (key) {
    // check if this path defines an encrypted field
    var value = objectPath.get(jsonSchema, key);
    return !!value.encrypted;
  }).forEach(function (key) {
    // replace inner properties
    key = key.replace('properties.', ''); // first
    key = key.replace(/\.properties\./g, '.'); // middle
    throw newRxError('SC27', {
      index: trimDots(key),
      schema: jsonSchema
    });
  });

  /* ensure encrypted fields exist in the schema */
  if (jsonSchema.encrypted) {
    jsonSchema.encrypted.forEach(function (propPath) {
      // real path in the collection schema
      var realPath = getSchemaPropertyRealPath(propPath);
      // get the schema of the indexed property
      var schemaObj = objectPath.get(jsonSchema, realPath);
      if (!schemaObj || typeof schemaObj !== 'object') {
        throw newRxError('SC28', {
          field: propPath,
          schema: jsonSchema
        });
      }
    });
  }
}
//# sourceMappingURL=check-schema.js.map