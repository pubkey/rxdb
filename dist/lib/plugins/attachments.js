"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.fromPouchDocument = fromPouchDocument;
exports.putAttachment = putAttachment;
exports.getAttachment = getAttachment;
exports.allAttachments = allAttachments;
exports.preMigrateDocument = preMigrateDocument;
exports.postMigrateDocument = postMigrateDocument;
exports["default"] = exports.hooks = exports.overwritable = exports.prototypes = exports.rxdb = exports.RxAttachment = exports.blobBufferUtil = void 0;

var _operators = require("rxjs/operators");

var _rxChangeEvent = require("./../rx-change-event");

var _util = require("./../util");

var _rxError = require("../rx-error");

function ensureSchemaSupportsAttachments(doc) {
  var schemaJson = doc.collection.schema.jsonID;

  if (!schemaJson.attachments) {
    throw (0, _rxError.newRxError)('AT1', {
      link: 'https://pubkey.github.io/rxdb/rx-attachment.html'
    });
  }
}

function resyncRxDocument(doc) {
  return doc.collection.pouch.get(doc.primary).then(function (docData) {
    var data = doc.collection._handleFromPouch(docData);

    var changeEvent = (0, _rxChangeEvent.createChangeEvent)('UPDATE', doc.collection.database, doc.collection, doc, data);
    doc.$emit(changeEvent);
  });
}

var blobBufferUtil = {
  /**
   * depending if we are on node or browser,
   * we have to use Buffer(node) or Blob(browser)
   */
  createBlobBuffer: function createBlobBuffer(data, type) {
    var blobBuffer;

    if (_util.isElectronRenderer) {
      // if we are inside of electron-renderer, always use the node-buffer
      return Buffer.from(data, {
        type: type
      });
    }

    try {
      // for browsers
      blobBuffer = new Blob([data], {
        type: type
      });
    } catch (e) {
      // for node
      blobBuffer = Buffer.from(data, {
        type: type
      });
    }

    return blobBuffer;
  },
  toString: function toString(blobBuffer) {
    if (blobBuffer instanceof Buffer) {
      // node
      return (0, _util.nextTick)().then(function () {
        return blobBuffer.toString();
      });
    }

    return new Promise(function (res) {
      // browsers
      var reader = new FileReader();
      reader.addEventListener('loadend', function (e) {
        var text = e.target.result;
        res(text);
      });
      var blobBufferType = Object.prototype.toString.call(blobBuffer);
      /**
       * in the electron-renderer we have a typed array insteaf of a blob
       * so we have to transform it.
       * @link https://github.com/pubkey/rxdb/issues/1371
       */

      if (blobBufferType === '[object Uint8Array]') {
        blobBuffer = new Blob([blobBuffer]);
      }

      reader.readAsText(blobBuffer);
    });
  }
};
exports.blobBufferUtil = blobBufferUtil;

var _assignMethodsToAttachment = function _assignMethodsToAttachment(attachment) {
  Object.entries(attachment.doc.collection.attachments).forEach(function (_ref) {
    var funName = _ref[0],
        fun = _ref[1];
    Object.defineProperty(attachment, funName, {
      get: function get() {
        return fun.bind(attachment);
      }
    });
  });
};
/**
 * an RxAttachment is basically just the attachment-stub
 * wrapped so that you can access the attachment-data
 */


var RxAttachment = /*#__PURE__*/function () {
  function RxAttachment(_ref2) {
    var doc = _ref2.doc,
        id = _ref2.id,
        type = _ref2.type,
        length = _ref2.length,
        digest = _ref2.digest,
        rev = _ref2.rev;
    this.doc = doc;
    this.id = id;
    this.type = type;
    this.length = length;
    this.digest = digest;
    this.rev = rev;

    _assignMethodsToAttachment(this);
  }

  var _proto = RxAttachment.prototype;

  _proto.remove = function remove() {
    var _this = this;

    return this.doc.collection.pouch.removeAttachment(this.doc.primary, this.id, this.doc._data._rev).then(function () {
      return resyncRxDocument(_this.doc);
    });
  }
  /**
   * returns the data for the attachment
   */
  ;

  _proto.getData = function getData() {
    var _this2 = this;

    return this.doc.collection.pouch.getAttachment(this.doc.primary, this.id).then(function (data) {
      if (shouldEncrypt(_this2.doc)) {
        return blobBufferUtil.toString(data).then(function (dataString) {
          return blobBufferUtil.createBlobBuffer(_this2.doc.collection._crypter._decryptValue(dataString), _this2.type);
        });
      } else return data;
    });
  };

  _proto.getStringData = function getStringData() {
    return this.getData().then(function (bufferBlob) {
      return blobBufferUtil.toString(bufferBlob);
    });
  };

  return RxAttachment;
}();

exports.RxAttachment = RxAttachment;

function fromPouchDocument(id, pouchDocAttachment, rxDocument) {
  return new RxAttachment({
    doc: rxDocument,
    id: id,
    type: pouchDocAttachment.content_type,
    length: pouchDocAttachment.length,
    digest: pouchDocAttachment.digest,
    rev: pouchDocAttachment.revpos
  });
}

function shouldEncrypt(doc) {
  return !!doc.collection.schema.jsonID.attachments.encrypted;
}

function putAttachment(_ref3) {
  var _this3 = this;

  var id = _ref3.id,
      data = _ref3.data,
      _ref3$type = _ref3.type,
      type = _ref3$type === void 0 ? 'text/plain' : _ref3$type;
  ensureSchemaSupportsAttachments(this);
  if (shouldEncrypt(this)) data = this.collection._crypter._encryptValue(data);
  var blobBuffer = blobBufferUtil.createBlobBuffer(data, type);
  this._atomicQueue = this._atomicQueue.then(function () {
    return _this3.collection.pouch.putAttachment(_this3.primary, id, _this3._data._rev, blobBuffer, type);
  }).then(function () {
    return _this3.collection.pouch.get(_this3.primary);
  }).then(function (docData) {
    var attachmentData = docData._attachments[id];
    var attachment = fromPouchDocument(id, attachmentData, _this3);
    _this3._data._rev = docData._rev;
    _this3._data._attachments = docData._attachments;
    return resyncRxDocument(_this3).then(function () {
      return attachment;
    });
  });
  return this._atomicQueue;
}
/**
 * get an attachment of the document by its id
 */


function getAttachment(id) {
  ensureSchemaSupportsAttachments(this);

  var docData = this._dataSync$.getValue();

  if (!docData._attachments || !docData._attachments[id]) return null;
  var attachmentData = docData._attachments[id];
  var attachment = fromPouchDocument(id, attachmentData, this);
  return attachment;
}
/**
 * returns all attachments of the document
 */


function allAttachments() {
  var _this4 = this;

  ensureSchemaSupportsAttachments(this);

  var docData = this._dataSync$.getValue(); // if there are no attachments, the field is missing


  if (!docData._attachments) return [];
  return Object.keys(docData._attachments).map(function (id) {
    return fromPouchDocument(id, docData._attachments[id], _this4);
  });
}

function preMigrateDocument(action) {
  delete action.migrated._attachments;
  return action;
}

function postMigrateDocument(action) {
  var primaryPath = action.oldCollection.schema.primaryPath;
  var attachments = action.doc._attachments;
  if (!attachments) return Promise.resolve(action);
  var currentPromise = Promise.resolve();
  Object.keys(attachments).forEach(function (id) {
    var stubData = attachments[id];
    var primary = action.doc[primaryPath];
    currentPromise = currentPromise.then(function () {
      return action.oldCollection.pouchdb.getAttachment(primary, id);
    }).then(function (data) {
      return blobBufferUtil.toString(data);
    }).then(function (data) {
      return action.newestCollection.pouch.putAttachment(primary, id, action.res.rev, blobBufferUtil.createBlobBuffer(data, stubData.content_type), stubData.content_type);
    }).then(function (res) {
      return action.res = res;
    });
  });
  return currentPromise;
}

var rxdb = true;
exports.rxdb = rxdb;
var prototypes = {
  RxDocument: function RxDocument(proto) {
    proto.putAttachment = putAttachment;
    proto.getAttachment = getAttachment;
    proto.allAttachments = allAttachments;
    Object.defineProperty(proto, 'allAttachments$', {
      get: function allAttachments$() {
        var _this5 = this;

        return this._dataSync$.pipe((0, _operators.map)(function (data) {
          if (!data['_attachments']) return {};
          return data['_attachments'];
        }), (0, _operators.map)(function (attachmentsData) {
          return Object.entries(attachmentsData);
        }), (0, _operators.map)(function (entries) {
          return entries.map(function (_ref4) {
            var id = _ref4[0],
                attachmentData = _ref4[1];
            return fromPouchDocument(id, attachmentData, _this5);
          });
        }));
      }
    });
  }
};
exports.prototypes = prototypes;
var overwritable = {};
exports.overwritable = overwritable;
var hooks = {
  preMigrateDocument: preMigrateDocument,
  postMigrateDocument: postMigrateDocument
};
exports.hooks = hooks;
var _default = {
  rxdb: rxdb,
  prototypes: prototypes,
  overwritable: overwritable,
  hooks: hooks,
  blobBufferUtil: blobBufferUtil
};
exports["default"] = _default;

//# sourceMappingURL=attachments.js.map