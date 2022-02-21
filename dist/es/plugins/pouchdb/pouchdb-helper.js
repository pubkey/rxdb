import { binaryMd5 } from 'pouchdb-md5';
import { blobBufferUtil, flatClone, getHeightOfRevision } from '../../util';
import { newRxError } from '../../rx-error';
export var writeAttachmentsToAttachments = function writeAttachmentsToAttachments(attachments) {
  try {
    if (!attachments) {
      return Promise.resolve({});
    }

    var ret = {};
    return Promise.resolve(Promise.all(Object.entries(attachments).map(function (_ref4) {
      try {
        var key = _ref4[0],
            obj = _ref4[1];

        if (!obj.type) {
          throw newRxError('SNH', {
            args: {
              obj: obj
            }
          });
        }

        var _temp2 = function () {
          if (obj.data) {
            var asWrite = obj;
            return Promise.resolve(Promise.all([pouchHash(asWrite.data), blobBufferUtil.toString(asWrite.data)])).then(function (_ref5) {
              var hash = _ref5[0],
                  asString = _ref5[1];
              var length = asString.length;
              ret[key] = {
                digest: POUCH_HASH_KEY + '-' + hash,
                length: length,
                type: asWrite.type
              };
            });
          } else {
            ret[key] = obj;
          }
        }();

        return Promise.resolve(_temp2 && _temp2.then ? _temp2.then(function () {}) : void 0);
      } catch (e) {
        return Promise.reject(e);
      }
    }))).then(function () {
      return ret;
    });
  } catch (e) {
    return Promise.reject(e);
  }
};

/**
 * Used to check in tests if all instances have been cleaned up.
 */
export var OPEN_POUCHDB_STORAGE_INSTANCES = new Set();
/**
 * prefix of local pouchdb documents
 */

export var POUCHDB_LOCAL_PREFIX = '_local/';
export var POUCHDB_LOCAL_PREFIX_LENGTH = POUCHDB_LOCAL_PREFIX.length;
/**
 * Pouchdb stores indexes as design documents,
 * we have to filter them out and not return the
 * design documents to the outside.
 */

export var POUCHDB_DESIGN_PREFIX = '_design/';
/**
 * PouchDB does not allow to add custom properties
 * that start with lodash like RxDB's _meta field.
 * So we have to map this field into a non-lodashed field.
 */

export var POUCHDB_META_FIELDNAME = 'rxdbMeta';
export function pouchSwapIdToPrimary(primaryKey, docData) {
  if (primaryKey === '_id' || docData[primaryKey]) {
    return docData;
  }

  docData = flatClone(docData);
  docData[primaryKey] = docData._id;
  delete docData._id;
  return docData;
}
export function pouchSwapIdToPrimaryString(primaryKey, str) {
  if (str === '_id') {
    return primaryKey;
  } else {
    return str;
  }
}
export function pouchDocumentDataToRxDocumentData(primaryKey, pouchDoc) {
  var useDoc = pouchSwapIdToPrimary(primaryKey, pouchDoc); // always flat clone becaues we mutate the _attachments property.

  useDoc = flatClone(useDoc);
  delete useDoc._revisions; // ensure deleted flag is set.

  useDoc._deleted = !!useDoc._deleted;
  useDoc._attachments = {};

  if (pouchDoc._attachments) {
    Object.entries(pouchDoc._attachments).forEach(function (_ref) {
      var key = _ref[0],
          value = _ref[1];

      if (value.data) {
        useDoc._attachments[key] = {
          data: value.data,
          type: value.type ? value.type : value.content_type
        };
      } else {
        useDoc._attachments[key] = {
          digest: value.digest,
          // TODO why do we need to access value.type?
          type: value.type ? value.type : value.content_type,
          length: value.length
        };
      }
    });
  }

  useDoc._meta = useDoc[POUCHDB_META_FIELDNAME];
  delete useDoc[POUCHDB_META_FIELDNAME];
  return useDoc;
}
export function rxDocumentDataToPouchDocumentData(primaryKey, doc) {
  var pouchDoc = pouchSwapPrimaryToId(primaryKey, doc); // always flat clone becaues we mutate the _attachments property.

  pouchDoc = flatClone(pouchDoc);
  pouchDoc._attachments = {};

  if (doc._attachments) {
    Object.entries(doc._attachments).forEach(function (_ref2) {
      var key = _ref2[0],
          value = _ref2[1];
      var useValue = value;

      if (useValue.data) {
        pouchDoc._attachments[key] = {
          data: useValue.data,
          content_type: useValue.type
        };
      } else {
        pouchDoc._attachments[key] = {
          digest: useValue.digest,
          content_type: useValue.type,
          length: useValue.length,
          stub: true
        };
      }
    });
  }

  pouchDoc[POUCHDB_META_FIELDNAME] = pouchDoc._meta;
  delete pouchDoc._meta;
  return pouchDoc;
}
/**
 * Swaps the primaryKey of the document
 * to the _id property.
 */

export function pouchSwapPrimaryToId(primaryKey, docData) {
  // optimisation shortcut
  if (primaryKey === '_id') {
    return docData;
  }

  var idValue = docData[primaryKey];
  var ret = flatClone(docData);
  delete ret[primaryKey];
  ret._id = idValue;
  return ret;
}
/**
 * in:  '_local/foobar'
 * out: 'foobar'
 */

export function pouchStripLocalFlagFromPrimary(str) {
  return str.substring(POUCHDB_LOCAL_PREFIX.length);
}
export function getEventKey(isLocal, primary, revision) {
  var prefix = isLocal ? 'local' : 'non-local';
  var eventKey = prefix + '|' + primary + '|' + revision;
  return eventKey;
}
export function pouchChangeRowToChangeEvent(primaryKey, pouchDoc) {
  if (!pouchDoc) {
    throw newRxError('SNH', {
      args: {
        pouchDoc: pouchDoc
      }
    });
  }

  var id = pouchDoc._id;
  var doc = pouchDocumentDataToRxDocumentData(primaryKey, pouchDoc);
  var revHeight = doc._rev ? getHeightOfRevision(doc._rev) : 1;

  if (pouchDoc._deleted) {
    return {
      operation: 'DELETE',
      id: id,
      doc: null,
      previous: doc
    };
  } else if (revHeight === 1) {
    return {
      operation: 'INSERT',
      id: id,
      doc: doc,
      previous: null
    };
  } else {
    return {
      operation: 'UPDATE',
      id: id,
      doc: doc,
      previous: 'UNKNOWN'
    };
  }
}
export function pouchChangeRowToChangeStreamEvent(primaryKey, pouchRow) {
  var doc = pouchRow.doc;

  if (!doc) {
    throw newRxError('SNH', {
      args: {
        pouchRow: pouchRow
      }
    });
  }

  var revHeight = getHeightOfRevision(doc._rev);

  if (pouchRow.deleted) {
    var previousDoc = flatClone(pouchDocumentDataToRxDocumentData(primaryKey, pouchRow.doc));
    var ev = {
      sequence: pouchRow.seq,
      id: pouchRow.id,
      operation: 'DELETE',
      doc: null,
      previous: previousDoc
    };
    return ev;
  } else if (revHeight === 1) {
    var _ev = {
      sequence: pouchRow.seq,
      id: pouchRow.id,
      operation: 'INSERT',
      doc: pouchDocumentDataToRxDocumentData(primaryKey, pouchRow.doc),
      previous: null
    };
    return _ev;
  } else {
    var _ev2 = {
      sequence: pouchRow.seq,
      id: pouchRow.id,
      operation: 'UPDATE',
      doc: pouchDocumentDataToRxDocumentData(primaryKey, pouchRow.doc),
      previous: 'UNKNOWN'
    };
    return _ev2;
  }
}
/**
 * Runs a primary swap with transform all custom primaryKey occurences
 * into '_id'
 * @recursive
 */

export function primarySwapPouchDbQuerySelector(selector, primaryKey) {
  if (primaryKey === '_id') {
    return selector;
  }

  if (Array.isArray(selector)) {
    return selector.map(function (item) {
      return primarySwapPouchDbQuerySelector(item, primaryKey);
    });
  } else if (typeof selector === 'object') {
    var ret = {};
    Object.entries(selector).forEach(function (_ref3) {
      var k = _ref3[0],
          v = _ref3[1];

      if (k === primaryKey) {
        ret._id = v;
      } else {
        if (k.startsWith('$')) {
          ret[k] = primarySwapPouchDbQuerySelector(v, primaryKey);
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
export function pouchHash(data) {
  return new Promise(function (res) {
    binaryMd5(data, function (digest) {
      res(digest);
    });
  });
}
export var POUCH_HASH_KEY = 'md5';
export function getPouchIndexDesignDocNameByIndex(index) {
  var indexName = 'idx-rxdb-index-' + index.join(',');
  return indexName;
}
/**
 * PouchDB has not way to read deleted local documents
 * out of the database.
 * So instead of deleting them, we set a custom deleted flag.
 */

export var RXDB_POUCH_DELETED_FLAG = 'rxdb-pouch-deleted';
export function localDocumentToPouch(docData) {
  var ret = flatClone(docData); // add local prefix

  ret._id = POUCHDB_LOCAL_PREFIX + ret._id; // add custom deleted flag if document is deleted 

  if (docData._deleted) {
    ret._deleted = false;
    ret[RXDB_POUCH_DELETED_FLAG] = true;
  }

  return ret;
}
export function localDocumentFromPouch(docData) {
  var ret = flatClone(docData); // strip local prefix

  ret._id = ret._id.slice(POUCHDB_LOCAL_PREFIX_LENGTH);

  if (docData[RXDB_POUCH_DELETED_FLAG]) {
    ret._deleted = true;
    delete ret[RXDB_POUCH_DELETED_FLAG];
  }

  return ret;
}
//# sourceMappingURL=pouchdb-helper.js.map