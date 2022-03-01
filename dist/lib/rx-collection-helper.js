"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.createRxCollectionStorageInstance = void 0;
exports.fillObjectDataBeforeInsert = fillObjectDataBeforeInsert;

var _util = require("./util");

var _rxSchemaHelper = require("./rx-schema-helper");

/**
 * Creates the storage instances that are used internally in the collection
 */
var createRxCollectionStorageInstance = function createRxCollectionStorageInstance(rxDatabase, storageInstanceCreationParams) {
  try {
    storageInstanceCreationParams.multiInstance = rxDatabase.multiInstance;
    return Promise.resolve(rxDatabase.storage.createStorageInstance(storageInstanceCreationParams));
  } catch (e) {
    return Promise.reject(e);
  }
};

exports.createRxCollectionStorageInstance = createRxCollectionStorageInstance;

/**
 * fills in the default data.
 * This also clones the data.
 */
function fillObjectDataBeforeInsert(collection, data) {
  var useJson = collection.schema.fillObjectWithDefaults(data);
  useJson = (0, _rxSchemaHelper.fillPrimaryKey)(collection.schema.primaryPath, collection.schema.jsonSchema, useJson);
  useJson._meta = (0, _util.getDefaultRxDocumentMeta)();
  return useJson;
}
//# sourceMappingURL=rx-collection-helper.js.map