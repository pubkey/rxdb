"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.getLocal = void 0;
exports.getLocal$ = getLocal$;
exports.insertLocal = void 0;
exports.upsertLocal = upsertLocal;

var _util = require("../../util");

var _operators = require("rxjs/operators");

var _rxLocalDocument = require("./rx-local-document");

var _localDocumentsHelper = require("./local-documents-helper");

var _rxStorageHelper = require("../../rx-storage-helper");

var getLocal = function getLocal(id) {
  try {
    var _this5 = this;

    return Promise.resolve((0, _localDocumentsHelper.getLocalDocStateByParent)(_this5)).then(function (state) {
      var docCache = state.docCache; // check in doc-cache

      var found = docCache.get(id);
      return found ? Promise.resolve(found) : (0, _rxStorageHelper.getSingleDocument)(state.storageInstance, id).then(function (docData) {
        if (!docData) {
          return null;
        }

        var doc = (0, _rxLocalDocument.createRxLocalDocument)(id, docData, _this5, state);
        return doc;
      })["catch"](function () {
        return null;
      });
    });
  } catch (e) {
    return Promise.reject(e);
  }
};

exports.getLocal = getLocal;

/**
 * save the local-document-data
 * throws if already exists
 */
var insertLocal = function insertLocal(id, data) {
  try {
    var _this2 = this;

    return Promise.resolve((0, _localDocumentsHelper.getLocalDocStateByParent)(_this2)).then(function (state) {
      // create new one
      var docData = {
        id: id,
        data: data,
        _deleted: false,
        _meta: (0, _util.getDefaultRxDocumentMeta)(),
        _rev: (0, _util.getDefaultRevision)(),
        _attachments: {}
      };
      docData._rev = (0, _util.createRevision)(docData);
      return (0, _rxStorageHelper.writeSingle)(state.storageInstance, {
        document: docData
      }).then(function (res) {
        docData = (0, _util.flatClone)(docData);
        docData._rev = res._rev;
        var newDoc = (0, _rxLocalDocument.createRxLocalDocument)(id, docData, _this2, state);
        return newDoc;
      });
    });
  } catch (e) {
    return Promise.reject(e);
  }
};
/**
 * save the local-document-data
 * overwrites existing if exists
 */


exports.insertLocal = insertLocal;

function upsertLocal(id, data) {
  var _this3 = this;

  return this.getLocal(id).then(function (existing) {
    if (!existing) {
      // create new one
      var docPromise = _this3.insertLocal(id, data);

      return docPromise;
    } else {
      // update existing
      return existing.atomicUpdate(function () {
        return data;
      }).then(function () {
        return existing;
      });
    }
  });
}

function getLocal$(id) {
  var _this6 = this;

  return this.$.pipe((0, _operators.startWith)(null), (0, _operators.mergeMap)(function (cE) {
    try {
      if (cE) {
        return Promise.resolve({
          changeEvent: cE
        });
      } else {
        return Promise.resolve(_this6.getLocal(id)).then(function (doc) {
          return {
            doc: doc
          };
        });
      }
    } catch (e) {
      return Promise.reject(e);
    }
  }), (0, _operators.mergeMap)(function (changeEventOrDoc) {
    try {
      if (changeEventOrDoc.changeEvent) {
        var cE = changeEventOrDoc.changeEvent;

        if (!cE.isLocal || cE.documentId !== id) {
          return Promise.resolve({
            use: false
          });
        } else {
          return Promise.resolve(_this6.getLocal(id)).then(function (doc) {
            return {
              use: true,
              doc: doc
            };
          });
        }
      } else {
        return Promise.resolve({
          use: true,
          doc: changeEventOrDoc.doc
        });
      }
    } catch (e) {
      return Promise.reject(e);
    }
  }), (0, _operators.filter)(function (filterFlagged) {
    return filterFlagged.use;
  }), (0, _operators.map)(function (filterFlagged) {
    return filterFlagged.doc;
  }));
}
//# sourceMappingURL=local-documents.js.map