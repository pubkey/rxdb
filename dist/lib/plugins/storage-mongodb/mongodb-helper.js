"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.RX_STORAGE_NAME_MONGODB = exports.MONGO_ID_SUBSTITUTE_FIELDNAME = void 0;
exports.getMongoDBIndexName = getMongoDBIndexName;
exports.primarySwapMongoDBQuerySelector = primarySwapMongoDBQuerySelector;
exports.swapMongoToRxDoc = swapMongoToRxDoc;
exports.swapRxDocToMongo = swapRxDocToMongo;
exports.swapToMongoSort = swapToMongoSort;
var _utils = require("../utils");
var RX_STORAGE_NAME_MONGODB = 'mongodb';

/**
 * MongoDB uses the _id field by itself (max 12 bytes)
 * so we have to substitute the _id field if
 * it is used in the RxDocType.
 */
exports.RX_STORAGE_NAME_MONGODB = RX_STORAGE_NAME_MONGODB;
var MONGO_ID_SUBSTITUTE_FIELDNAME = '__id';
exports.MONGO_ID_SUBSTITUTE_FIELDNAME = MONGO_ID_SUBSTITUTE_FIELDNAME;
function primarySwapMongoDBQuerySelector(primaryKey, selector) {
  selector = (0, _utils.flatClone)(selector);
  selector._deleted = false;
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
function swapMongoToRxDoc(docData) {
  docData = (0, _utils.flatClone)(docData);
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
  docData = (0, _utils.flatClone)(docData);
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