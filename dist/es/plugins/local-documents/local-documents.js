import { createRevision, flatClone, getDefaultRevision, getDefaultRxDocumentMeta } from '../../util';
import { filter, map, startWith, mergeMap } from 'rxjs/operators';
import { createRxLocalDocument } from './rx-local-document';
import { getLocalDocStateByParent } from './local-documents-helper';
import { getSingleDocument, writeSingle } from '../../rx-storage-helper';
/**
 * save the local-document-data
 * throws if already exists
 */

export var getLocal = function getLocal(id) {
  try {
    var _this5 = this;

    return Promise.resolve(getLocalDocStateByParent(_this5)).then(function (state) {
      var docCache = state.docCache; // check in doc-cache

      var found = docCache.get(id);
      return found ? Promise.resolve(found) : getSingleDocument(state.storageInstance, id).then(function (docData) {
        if (!docData) {
          return null;
        }

        var doc = createRxLocalDocument(id, docData, _this5, state);
        return doc;
      })["catch"](function () {
        return null;
      });
    });
  } catch (e) {
    return Promise.reject(e);
  }
};
export var insertLocal = function insertLocal(id, data) {
  try {
    var _this2 = this;

    return Promise.resolve(getLocalDocStateByParent(_this2)).then(function (state) {
      // create new one
      var docData = {
        id: id,
        data: data,
        _deleted: false,
        _meta: getDefaultRxDocumentMeta(),
        _rev: getDefaultRevision(),
        _attachments: {}
      };
      docData._rev = createRevision(docData);
      return writeSingle(state.storageInstance, {
        document: docData
      }).then(function (res) {
        docData = flatClone(docData);
        docData._rev = res._rev;
        var newDoc = createRxLocalDocument(id, docData, _this2, state);
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

export function upsertLocal(id, data) {
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
export function getLocal$(id) {
  var _this6 = this;

  return this.$.pipe(startWith(null), mergeMap(function (cE) {
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
  }), mergeMap(function (changeEventOrDoc) {
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
  }), filter(function (filterFlagged) {
    return filterFlagged.use;
  }), map(function (filterFlagged) {
    return filterFlagged.doc;
  }));
}
//# sourceMappingURL=local-documents.js.map