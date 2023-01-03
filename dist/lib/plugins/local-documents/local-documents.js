"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.getLocal = getLocal;
exports.getLocal$ = getLocal$;
exports.insertLocal = insertLocal;
exports.upsertLocal = upsertLocal;
var _utils = require("../../plugins/utils");
var _operators = require("rxjs/operators");
var _localDocumentsHelper = require("./local-documents-helper");
var _rxStorageHelper = require("../../rx-storage-helper");
/**
 * save the local-document-data
 * throws if already exists
 */
async function insertLocal(id, data) {
  var state = await (0, _localDocumentsHelper.getLocalDocStateByParent)(this);

  // create new one
  var docData = {
    id: id,
    data,
    _deleted: false,
    _meta: (0, _utils.getDefaultRxDocumentMeta)(),
    _rev: (0, _utils.getDefaultRevision)(),
    _attachments: {}
  };
  return (0, _rxStorageHelper.writeSingle)(state.storageInstance, {
    document: docData
  }, 'local-document-insert').then(newDocData => state.docCache.getCachedRxDocument(newDocData));
}

/**
 * save the local-document-data
 * overwrites existing if exists
 */
function upsertLocal(id, data) {
  return this.getLocal(id).then(existing => {
    if (!existing) {
      // create new one
      var docPromise = this.insertLocal(id, data);
      return docPromise;
    } else {
      // update existing
      return existing.incrementalModify(() => {
        return data;
      });
    }
  });
}
async function getLocal(id) {
  var state = await (0, _localDocumentsHelper.getLocalDocStateByParent)(this);
  var docCache = state.docCache;

  // check in doc-cache
  var found = docCache.getLatestDocumentDataIfExists(id);
  if (found) {
    return Promise.resolve(docCache.getCachedRxDocument(found));
  }

  // if not found, check in storage instance
  return (0, _rxStorageHelper.getSingleDocument)(state.storageInstance, id).then(docData => {
    if (!docData) {
      return null;
    }
    return state.docCache.getCachedRxDocument(docData);
  });
}
function getLocal$(id) {
  return this.$.pipe((0, _operators.startWith)(null), (0, _operators.mergeMap)(async cE => {
    if (cE) {
      return {
        changeEvent: cE
      };
    } else {
      var doc = await this.getLocal(id);
      return {
        doc: doc
      };
    }
  }), (0, _operators.mergeMap)(async changeEventOrDoc => {
    if (changeEventOrDoc.changeEvent) {
      var cE = changeEventOrDoc.changeEvent;
      if (!cE.isLocal || cE.documentId !== id) {
        return {
          use: false
        };
      } else {
        var doc = await this.getLocal(id);
        return {
          use: true,
          doc: doc
        };
      }
    } else {
      return {
        use: true,
        doc: changeEventOrDoc.doc
      };
    }
  }), (0, _operators.filter)(filterFlagged => filterFlagged.use), (0, _operators.map)(filterFlagged => {
    return filterFlagged.doc;
  }));
}
//# sourceMappingURL=local-documents.js.map