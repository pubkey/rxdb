"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.DEFAULT_MODIFIER = void 0;
exports.awaitRetry = awaitRetry;
exports.handlePulledDocuments = handlePulledDocuments;
exports.swapDefaultDeletedTodeletedField = swapDefaultDeletedTodeletedField;
var _utils = require("../../plugins/utils");
var _rxSchemaHelper = require("../../rx-schema-helper");
// does nothing
var DEFAULT_MODIFIER = d => Promise.resolve(d);
exports.DEFAULT_MODIFIER = DEFAULT_MODIFIER;
function swapDefaultDeletedTodeletedField(deletedField, doc) {
  if (deletedField === '_deleted') {
    return doc;
  } else {
    doc = (0, _utils.flatClone)(doc);
    var isDeleted = !!doc._deleted;
    doc[deletedField] = isDeleted;
    delete doc._deleted;
    return doc;
  }
}

/**
 * Must be run over all plain document data
 * that was pulled from the remote.
 * Used to fill up fields or modify the deleted field etc.
 */
function handlePulledDocuments(collection, deletedField, docs) {
  return docs.map(doc => {
    var useDoc = (0, _utils.flatClone)(doc);

    /**
     * Swap out the deleted field
     */
    if (deletedField !== '_deleted') {
      var isDeleted = !!useDoc[deletedField];
      useDoc._deleted = isDeleted;
      delete useDoc[deletedField];
    } else {
      // ensure we have a boolean.
      useDoc._deleted = !!useDoc._deleted;
    }

    /**
     * Fill up composed primary
     */
    var primaryPath = collection.schema.primaryPath;
    useDoc[primaryPath] = (0, _rxSchemaHelper.getComposedPrimaryKeyOfDocumentData)(collection.schema.jsonSchema, useDoc);
    return useDoc;
  });
}
function awaitRetry(collection, retryTime) {
  if (typeof window === 'undefined' || typeof window !== 'object' || typeof window.addEventListener === 'undefined' || navigator.onLine) {
    return collection.promiseWait(retryTime);
  }
  var listener;
  var onlineAgain = new Promise(res => {
    listener = () => {
      window.removeEventListener('online', listener);
      res();
    };
    window.addEventListener('online', listener);
  });
  return Promise.race([onlineAgain, collection.promiseWait(retryTime)]).then(() => {
    window.removeEventListener('online', listener);
  });
}
//# sourceMappingURL=replication-helper.js.map