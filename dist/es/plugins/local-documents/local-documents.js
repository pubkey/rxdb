import { getDefaultRevision, getDefaultRxDocumentMeta } from '../../plugins/utils';
import { filter, map, startWith, mergeMap } from 'rxjs/operators';
import { getLocalDocStateByParent } from './local-documents-helper';
import { getSingleDocument, writeSingle } from '../../rx-storage-helper';

/**
 * save the local-document-data
 * throws if already exists
 */
export async function insertLocal(id, data) {
  var state = await getLocalDocStateByParent(this);

  // create new one
  var docData = {
    id: id,
    data,
    _deleted: false,
    _meta: getDefaultRxDocumentMeta(),
    _rev: getDefaultRevision(),
    _attachments: {}
  };
  return writeSingle(state.storageInstance, {
    document: docData
  }, 'local-document-insert').then(newDocData => state.docCache.getCachedRxDocument(newDocData));
}

/**
 * save the local-document-data
 * overwrites existing if exists
 */
export function upsertLocal(id, data) {
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
export async function getLocal(id) {
  var state = await getLocalDocStateByParent(this);
  var docCache = state.docCache;

  // check in doc-cache
  var found = docCache.getLatestDocumentDataIfExists(id);
  if (found) {
    return Promise.resolve(docCache.getCachedRxDocument(found));
  }

  // if not found, check in storage instance
  return getSingleDocument(state.storageInstance, id).then(docData => {
    if (!docData) {
      return null;
    }
    return state.docCache.getCachedRxDocument(docData);
  });
}
export function getLocal$(id) {
  return this.$.pipe(startWith(null), mergeMap(async cE => {
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
  }), mergeMap(async changeEventOrDoc => {
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
  }), filter(filterFlagged => filterFlagged.use), map(filterFlagged => {
    return filterFlagged.doc;
  }));
}
//# sourceMappingURL=local-documents.js.map