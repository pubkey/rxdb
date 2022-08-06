"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.RX_STORAGE_NAME_POUCHDB = exports.RXDB_POUCH_DELETED_FLAG = exports.POUCHDB_META_FIELDNAME = exports.POUCHDB_LOCAL_PREFIX_LENGTH = exports.POUCHDB_LOCAL_PREFIX = exports.POUCHDB_DESIGN_PREFIX = exports.OPEN_POUCH_INSTANCES = exports.OPEN_POUCHDB_STORAGE_INSTANCES = void 0;
exports.getEventKey = getEventKey;
exports.getPouchIndexDesignDocNameByIndex = getPouchIndexDesignDocNameByIndex;
exports.openPouchId = openPouchId;
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

var _attachments = require("../attachments");

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
        /**
         * Is write attachment,
         * so we have to remove the data to have a
         * non-write attachment.
         */


        var _temp4 = function () {
          if (obj.data) {
            var _temp5 = function _temp5(dataAsBase64String) {
              return Promise.resolve((0, _attachments.hashAttachmentData)(dataAsBase64String)).then(function (hash) {
                var length = (0, _attachments.getAttachmentSize)(dataAsBase64String);
                ret[key] = {
                  digest: 'md5-' + hash,
                  length: length,
                  type: _asWrite.type
                };
              });
            };

            var _asWrite = obj;
            var data = _asWrite.data;
            var isBuffer = typeof Buffer !== 'undefined' && Buffer.isBuffer(data);

            if (isBuffer) {
              data = new Blob([data]);
            }

            var _temp6 = typeof data === 'string';

            return _temp6 ? _temp5(data) : Promise.resolve(_util.blobBufferUtil.toBase64String(data)).then(_temp5);
          } else {
            ret[key] = obj;
          }
        }();

        return Promise.resolve(_temp4 && _temp4.then ? _temp4.then(function () {}) : void 0);
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
var RX_STORAGE_NAME_POUCHDB = 'pouchdb';
/**
 * Used to check in tests if all instances have been cleaned up.
 */

exports.RX_STORAGE_NAME_POUCHDB = RX_STORAGE_NAME_POUCHDB;
var OPEN_POUCHDB_STORAGE_INSTANCES = new Set();
/**
 * All open PouchDB instances are stored here
 * so that we can find them again when needed in the internals.
 */

exports.OPEN_POUCHDB_STORAGE_INSTANCES = OPEN_POUCHDB_STORAGE_INSTANCES;
var OPEN_POUCH_INSTANCES = new Map();
exports.OPEN_POUCH_INSTANCES = OPEN_POUCH_INSTANCES;

function openPouchId(databaseInstanceToken, databaseName, collectionName, schemaVersion) {
  return [databaseInstanceToken, databaseName, collectionName, schemaVersion + ''].join('||');
}
/**
 * prefix of local pouchdb documents
 */


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

function getEventKey(pouchDBInstance, primary, change) {
  var useRev = change.doc ? change.doc._rev : change.previous._rev;
  var eventKey = pouchDBInstance.name + '|' + primary + '|' + change.operation + '|' + useRev;
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
//# sourceMappingURL=pouchdb-helper.js.map