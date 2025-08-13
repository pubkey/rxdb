"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.RX_STORAGE_NAME_MONGODB = exports.MONGO_OPTIONS_DRIVER_INFO = exports.MONGO_ID_SUBSTITUTE_FIELDNAME = void 0;
exports.getMongoDBIndexName = getMongoDBIndexName;
exports.prepareMongoDBQuery = prepareMongoDBQuery;
exports.primarySwapMongoDBQuerySelector = primarySwapMongoDBQuerySelector;
exports.swapMongoToRxDoc = swapMongoToRxDoc;
exports.swapRxDocToMongo = swapRxDocToMongo;
exports.swapToMongoSort = swapToMongoSort;
var _index = require("../utils/index.js");
var _rxSchemaHelper = require("../../rx-schema-helper.js");
var RX_STORAGE_NAME_MONGODB = exports.RX_STORAGE_NAME_MONGODB = 'mongodb';
var MONGO_OPTIONS_DRIVER_INFO = exports.MONGO_OPTIONS_DRIVER_INFO = {
  driverInfo: {
    name: 'RxDB',
    version: _index.RXDB_VERSION
  }
};

/**
 * MongoDB uses the _id field by itself (max 12 bytes)
 * so we have to substitute the _id field if
 * it is used in the RxDocType.
 */
var MONGO_ID_SUBSTITUTE_FIELDNAME = exports.MONGO_ID_SUBSTITUTE_FIELDNAME = '__id';
function primarySwapMongoDBQuerySelector(primaryKey, selector) {
  selector = (0, _index.flatClone)(selector);
  if (primaryKey !== '_id') {
    return selector;
  }
  if (Array.isArray(selector)) {
    return selector.map(item => primarySwapMongoDBQuerySelector(primaryKey, item));
  } else if (typeof selector === 'object') {
    var ret = {};
    Object.entries(selector).forEach(([k, v]) => {
      if (k === primaryKey) {
        ret._id = v;
      } else {
        if (k.startsWith('$')) {
          ret[k] = primarySwapMongoDBQuerySelector(primaryKey, v);
        } else {
          ret[k] = v;
        }
      }
    });
    return ret;
  } else {
    return selector;
  }
}
function prepareMongoDBQuery(schema, mutateableQuery) {
  var primaryKey = (0, _rxSchemaHelper.getPrimaryFieldOfPrimaryKey)(schema.primaryKey);
  var preparedQuery = {
    query: mutateableQuery,
    mongoSelector: primarySwapMongoDBQuerySelector(primaryKey, mutateableQuery.selector),
    mongoSort: swapToMongoSort(mutateableQuery.sort)
  };
  return preparedQuery;
}
;
function swapMongoToRxDoc(docData) {
  docData = (0, _index.flatClone)(docData);
  if (docData[MONGO_ID_SUBSTITUTE_FIELDNAME]) {
    var value = docData[MONGO_ID_SUBSTITUTE_FIELDNAME];
    delete docData[MONGO_ID_SUBSTITUTE_FIELDNAME];
    docData._id = value;
  } else {
    delete docData._id;
  }
  return docData;
}
function swapRxDocToMongo(docData) {
  docData = (0, _index.flatClone)(docData);
  if (docData._id) {
    var value = docData._id;
    delete docData._id;
    docData[MONGO_ID_SUBSTITUTE_FIELDNAME] = value;
  }
  return docData;
}
function swapToMongoSort(sort) {
  var ret = {};
  sort.forEach(sortPart => {
    var [key, direction] = Object.entries(sortPart)[0];
    var mongoKey = key === '_id' ? MONGO_ID_SUBSTITUTE_FIELDNAME : key;
    var mongoDirection = direction === 'asc' ? 1 : -1;
    ret[mongoKey] = mongoDirection;
  });
  return ret;
}
function getMongoDBIndexName(index) {
  return index.join('|');
}
//# sourceMappingURL=mongodb-helper.js.map