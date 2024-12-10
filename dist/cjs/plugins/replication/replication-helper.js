"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.DEFAULT_MODIFIER = void 0;
exports.awaitRetry = awaitRetry;
exports.handlePulledDocuments = handlePulledDocuments;
exports.preventHibernateBrowserTab = preventHibernateBrowserTab;
exports.swapDefaultDeletedTodeletedField = swapDefaultDeletedTodeletedField;
var _index = require("../../plugins/utils/index.js");
var _rxSchemaHelper = require("../../rx-schema-helper.js");
// does nothing
var DEFAULT_MODIFIER = d => Promise.resolve(d);
exports.DEFAULT_MODIFIER = DEFAULT_MODIFIER;
function swapDefaultDeletedTodeletedField(deletedField, doc) {
  if (deletedField === '_deleted') {
    return doc;
  } else {
    doc = (0, _index.flatClone)(doc);
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
    var useDoc = (0, _index.flatClone)(doc);

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

/**
 * Like normal promiseWait()
 * but will skip the wait time if the online-state changes.
 */
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

/**
 * When a replication is running and the leading tab get hibernated
 * by the browser, the replication will be stuck.
 * To prevent this, we fire a mouseeven each X seconds while the replication is not canceled.
 * 
 * If you find a better way to prevent hibernation, please make a pull request.
 */
function preventHibernateBrowserTab(replicationState) {
  function simulateActivity() {
    if (typeof document === 'undefined' || typeof document.dispatchEvent !== 'function') {
      return;
    }
    var event = new Event('mousemove');
    document.dispatchEvent(event);
  }
  var intervalId = setInterval(simulateActivity, 20 * 1000); // Simulate activity every 20 seconds
  replicationState.onCancel.push(() => clearInterval(intervalId));
}
//# sourceMappingURL=replication-helper.js.map