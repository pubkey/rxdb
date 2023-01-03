"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.RxDBAttachmentsPlugin = exports.RxAttachment = void 0;
exports.allAttachments = allAttachments;
exports.fromStorageInstanceResult = fromStorageInstanceResult;
exports.getAttachment = getAttachment;
exports.postMigrateDocument = postMigrateDocument;
exports.preMigrateDocument = preMigrateDocument;
exports.putAttachment = putAttachment;
var _operators = require("rxjs/operators");
var _utils = require("../../plugins/utils");
var _rxError = require("../../rx-error");
function ensureSchemaSupportsAttachments(doc) {
  var schemaJson = doc.collection.schema.jsonSchema;
  if (!schemaJson.attachments) {
    throw (0, _rxError.newRxError)('AT1', {
      link: 'https://pubkey.github.io/rxdb/rx-attachment.html'
    });
  }
}
var _assignMethodsToAttachment = function (attachment) {
  Object.entries(attachment.doc.collection.attachments).forEach(([funName, fun]) => {
    Object.defineProperty(attachment, funName, {
      get: () => fun.bind(attachment)
    });
  });
};

/**
 * an RxAttachment is basically just the attachment-stub
 * wrapped so that you can access the attachment-data
 */
var RxAttachment = /*#__PURE__*/function () {
  function RxAttachment({
    doc,
    id,
    type,
    length,
    digest
  }) {
    this.doc = doc;
    this.id = id;
    this.type = type;
    this.length = length;
    this.digest = digest;
    _assignMethodsToAttachment(this);
  }
  var _proto = RxAttachment.prototype;
  _proto.remove = function remove() {
    return this.doc.collection.incrementalWriteQueue.addWrite(this.doc._data, docWriteData => {
      delete docWriteData._attachments[this.id];
      return docWriteData;
    }).then(() => {});
  }

  /**
   * returns the data for the attachment
   */;
  _proto.getData = async function getData() {
    var plainDataBase64 = await this.doc.collection.storageInstance.getAttachmentData(this.doc.primary, this.id);
    var ret = await _utils.blobBufferUtil.createBlobBufferFromBase64(plainDataBase64, this.type);
    return ret;
  };
  _proto.getStringData = async function getStringData() {
    var data = await this.getData();
    var asString = await _utils.blobBufferUtil.toString(data);
    return asString;
  };
  return RxAttachment;
}();
exports.RxAttachment = RxAttachment;
function fromStorageInstanceResult(id, attachmentData, rxDocument) {
  return new RxAttachment({
    doc: rxDocument,
    id,
    type: attachmentData.type,
    length: attachmentData.length,
    digest: attachmentData.digest
  });
}
async function putAttachment(attachmentData) {
  ensureSchemaSupportsAttachments(this);
  var dataSize = _utils.blobBufferUtil.size(attachmentData.data);
  var dataString = await _utils.blobBufferUtil.toBase64String(attachmentData.data);
  var id = attachmentData.id;
  var type = attachmentData.type;
  var data = dataString;
  return this.collection.incrementalWriteQueue.addWrite(this._data, docWriteData => {
    docWriteData._attachments = (0, _utils.flatClone)(docWriteData._attachments);
    docWriteData._attachments[id] = {
      length: dataSize,
      type,
      data
    };
    return docWriteData;
  }).then(writeResult => {
    var newDocument = this.collection._docCache.getCachedRxDocument(writeResult);
    var attachmentDataOfId = writeResult._attachments[id];
    var attachment = fromStorageInstanceResult(id, attachmentDataOfId, newDocument);
    return attachment;
  });
}

/**
 * get an attachment of the document by its id
 */
function getAttachment(id) {
  ensureSchemaSupportsAttachments(this);
  var docData = this._data;
  if (!docData._attachments || !docData._attachments[id]) return null;
  var attachmentData = docData._attachments[id];
  var attachment = fromStorageInstanceResult(id, attachmentData, this);
  return attachment;
}

/**
 * returns all attachments of the document
 */
function allAttachments() {
  ensureSchemaSupportsAttachments(this);
  var docData = this._data;

  // if there are no attachments, the field is missing
  if (!docData._attachments) {
    return [];
  }
  return Object.keys(docData._attachments).map(id => {
    return fromStorageInstanceResult(id, docData._attachments[id], this);
  });
}
async function preMigrateDocument(data) {
  var attachments = data.docData._attachments;
  if (attachments) {
    var newAttachments = {};
    await Promise.all(Object.keys(attachments).map(async attachmentId => {
      var attachment = attachments[attachmentId];
      var docPrimary = data.docData[data.oldCollection.schema.primaryPath];
      var rawAttachmentData = await data.oldCollection.storageInstance.getAttachmentData(docPrimary, attachmentId);
      newAttachments[attachmentId] = {
        length: attachment.length,
        type: attachment.type,
        data: rawAttachmentData
      };
    }));

    /**
     * Hooks mutate the input
     * instead of returning stuff
     */
    data.docData._attachments = newAttachments;
  }
}
function postMigrateDocument(_action) {
  /**
   * No longer needed because
   * we store the attachments data buffers directly in the document.
   */
  return _utils.PROMISE_RESOLVE_VOID;
}
var RxDBAttachmentsPlugin = {
  name: 'attachments',
  rxdb: true,
  prototypes: {
    RxDocument: proto => {
      proto.putAttachment = putAttachment;
      proto.getAttachment = getAttachment;
      proto.allAttachments = allAttachments;
      Object.defineProperty(proto, 'allAttachments$', {
        get: function allAttachments$() {
          return this.$.pipe((0, _operators.map)(data => Object.entries(data._attachments)), (0, _operators.map)(entries => {
            return entries.map(([id, attachmentData]) => {
              return fromStorageInstanceResult(id, attachmentData, this);
            });
          }));
        }
      });
    }
  },
  overwritable: {},
  hooks: {
    preMigrateDocument: {
      after: preMigrateDocument
    },
    postMigrateDocument: {
      after: postMigrateDocument
    }
  }
};
exports.RxDBAttachmentsPlugin = RxDBAttachmentsPlugin;
//# sourceMappingURL=index.js.map