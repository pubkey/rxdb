"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.RXDB_POUCH_DELETED_FLAG = exports.POUCH_HASH_KEY = exports.POUCHDB_META_FIELDNAME = exports.POUCHDB_LOCAL_PREFIX_LENGTH = exports.POUCHDB_LOCAL_PREFIX = exports.POUCHDB_DESIGN_PREFIX = exports.OPEN_POUCHDB_STORAGE_INSTANCES = void 0;
exports.getEventKey = getEventKey;
exports.getPouchIndexDesignDocNameByIndex = getPouchIndexDesignDocNameByIndex;
exports.localDocumentFromPouch = localDocumentFromPouch;
exports.localDocumentToPouch = localDocumentToPouch;
exports.pouchChangeRowToChangeEvent = pouchChangeRowToChangeEvent;
exports.pouchChangeRowToChangeStreamEvent = pouchChangeRowToChangeStreamEvent;
exports.pouchDocumentDataToRxDocumentData = pouchDocumentDataToRxDocumentData;
exports.pouchHash = pouchHash;
exports.pouchStripLocalFlagFromPrimary = pouchStripLocalFlagFromPrimary;
exports.pouchSwapIdToPrimary = pouchSwapIdToPrimary;
exports.pouchSwapIdToPrimaryString = pouchSwapIdToPrimaryString;
exports.pouchSwapPrimaryToId = pouchSwapPrimaryToId;
exports.primarySwapPouchDbQuerySelector = primarySwapPouchDbQuerySelector;
exports.rxDocumentDataToPouchDocumentData = rxDocumentDataToPouchDocumentData;
exports.writeAttachmentsToAttachments = void 0;

var _pouchdbMd = require("pouchdb-md5");

var _util = require("../../util");

var _rxError = require("../../rx-error");

var writeAttachmentsToAttachments = function writeAttachmentsToAttachments(attachments) {
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
          throw (0, _rxError.newRxError)('SNH', {
            args: {
              obj: obj
            }
          });
        }

        var _temp2 = function () {
          if (obj.data) {
            var asWrite = obj;
            return Promise.resolve(Promise.all([pouchHash(asWrite.data), _util.blobBufferUtil.toString(asWrite.data)])).then(function (_ref5) {
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

exports.writeAttachmentsToAttachments = writeAttachmentsToAttachments;

/**
 * Used to check in tests if all instances have been cleaned up.
 */
var OPEN_POUCHDB_STORAGE_INSTANCES = new Set();
/**
 * prefix of local pouchdb documents
 */

exports.OPEN_POUCHDB_STORAGE_INSTANCES = OPEN_POUCHDB_STORAGE_INSTANCES;
var POUCHDB_LOCAL_PREFIX = '_local/';
exports.POUCHDB_LOCAL_PREFIX = POUCHDB_LOCAL_PREFIX;
var POUCHDB_LOCAL_PREFIX_LENGTH = POUCHDB_LOCAL_PREFIX.length;
/**
 * Pouchdb stores indexes as design documents,
 * we have to filter them out and not return the
 * design documents to the outside.
 */

exports.POUCHDB_LOCAL_PREFIX_LENGTH = POUCHDB_LOCAL_PREFIX_LENGTH;
var POUCHDB_DESIGN_PREFIX = '_design/';
/**
 * PouchDB does not allow to add custom properties
 * that start with lodash like RxDB's _meta field.
 * So we have to map this field into a non-lodashed field.
 */

exports.POUCHDB_DESIGN_PREFIX = POUCHDB_DESIGN_PREFIX;
var POUCHDB_META_FIELDNAME = 'rxdbMeta';
exports.POUCHDB_META_FIELDNAME = POUCHDB_META_FIELDNAME;

function pouchSwapIdToPrimary(primaryKey, docData) {
  if (primaryKey === '_id' || docData[primaryKey]) {
    return docData;
  }

  docData = (0, _util.flatClone)(docData);
  docData[primaryKey] = docData._id;
  delete docData._id;
  return docData;
}

function pouchSwapIdToPrimaryString(primaryKey, str) {
  if (str === '_id') {
    return primaryKey;
  } else {
    return str;
  }
}

function pouchDocumentDataToRxDocumentData(primaryKey, pouchDoc) {
  var useDoc = pouchSwapIdToPrimary(primaryKey, pouchDoc); // always flat clone becaues we mutate the _attachments property.

  useDoc = (0, _util.flatClone)(useDoc);
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

function rxDocumentDataToPouchDocumentData(primaryKey, doc) {
  var pouchDoc = pouchSwapPrimaryToId(primaryKey, doc); // always flat clone becaues we mutate the _attachments property.

  pouchDoc = (0, _util.flatClone)(pouchDoc);
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


function pouchSwapPrimaryToId(primaryKey, docData) {
  // optimisation shortcut
  if (primaryKey === '_id') {
    return docData;
  }

  var idValue = docData[primaryKey];
  var ret = (0, _util.flatClone)(docData);
  delete ret[primaryKey];
  ret._id = idValue;
  return ret;
}
/**
 * in:  '_local/foobar'
 * out: 'foobar'
 */


function pouchStripLocalFlagFromPrimary(str) {
  return str.substring(POUCHDB_LOCAL_PREFIX.length);
}

function getEventKey(isLocal, primary, revision) {
  var prefix = isLocal ? 'local' : 'non-local';
  var eventKey = prefix + '|' + primary + '|' + revision;
  return eventKey;
}

function pouchChangeRowToChangeEvent(primaryKey, pouchDoc) {
  if (!pouchDoc) {
    throw (0, _rxError.newRxError)('SNH', {
      args: {
        pouchDoc: pouchDoc
      }
    });
  }

  var id = pouchDoc._id;
  var doc = pouchDocumentDataToRxDocumentData(primaryKey, pouchDoc);
  var revHeight = doc._rev ? (0, _util.getHeightOfRevision)(doc._rev) : 1;

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

function pouchChangeRowToChangeStreamEvent(primaryKey, pouchRow) {
  var doc = pouchRow.doc;

  if (!doc) {
    throw (0, _rxError.newRxError)('SNH', {
      args: {
        pouchRow: pouchRow
      }
    });
  }

  var revHeight = (0, _util.getHeightOfRevision)(doc._rev);

  if (pouchRow.deleted) {
    var previousDoc = (0, _util.flatClone)(pouchDocumentDataToRxDocumentData(primaryKey, pouchRow.doc));
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


function primarySwapPouchDbQuerySelector(selector, primaryKey) {
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

function pouchHash(data) {
  return new Promise(function (res) {
    (0, _pouchdbMd.binaryMd5)(data, function (digest) {
      res(digest);
    });
  });
}

var POUCH_HASH_KEY = 'md5';
exports.POUCH_HASH_KEY = POUCH_HASH_KEY;

function getPouchIndexDesignDocNameByIndex(index) {
  var indexName = 'idx-rxdb-index-' + index.join(',');
  return indexName;
}
/**
 * PouchDB has not way to read deleted local documents
 * out of the database.
 * So instead of deleting them, we set a custom deleted flag.
 */


var RXDB_POUCH_DELETED_FLAG = 'rxdb-pouch-deleted';
exports.RXDB_POUCH_DELETED_FLAG = RXDB_POUCH_DELETED_FLAG;

function localDocumentToPouch(docData) {
  var ret = (0, _util.flatClone)(docData); // add local prefix

  ret._id = POUCHDB_LOCAL_PREFIX + ret._id; // add custom deleted flag if document is deleted 

  if (docData._deleted) {
    ret._deleted = false;
    ret[RXDB_POUCH_DELETED_FLAG] = true;
  }

  return ret;
}

function localDocumentFromPouch(docData) {
  var ret = (0, _util.flatClone)(docData); // strip local prefix

  ret._id = ret._id.slice(POUCHDB_LOCAL_PREFIX_LENGTH);

  if (docData[RXDB_POUCH_DELETED_FLAG]) {
    ret._deleted = true;
    delete ret[RXDB_POUCH_DELETED_FLAG];
  }

  return ret;
}
//# sourceMappingURL=pouchdb-helper.js.map