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
function fillObjectDataBeforeInsert(schema, data) {
  var useJson = schema.fillObjectWithDefaults(data);
  useJson = (0, _rxSchemaHelper.fillPrimaryKey)(schema.primaryPath, schema.jsonSchema, useJson);
  useJson._meta = (0, _util.getDefaultRxDocumentMeta)();

  if (!useJson.hasOwnProperty('_deleted')) {
    useJson._deleted = false;
  }

  if (!useJson.hasOwnProperty('_attachments')) {
    useJson._attachments = {};
  }

  if (!useJson.hasOwnProperty('_rev')) {
    useJson._rev = (0, _util.getDefaultRevision)();
  }

  return useJson;
}
//# sourceMappingURL=rx-collection-helper.js.map