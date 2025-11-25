"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
var _exportNames = {
  RxAttachment: true,
  fromStorageInstanceResult: true,
  putAttachment: true,
  putAttachmentBase64: true,
  getAttachment: true,
  allAttachments: true,
  preMigrateDocument: true,
  postMigrateDocument: true,
  RxDBAttachmentsPlugin: true
};
exports.RxDBAttachmentsPlugin = exports.RxAttachment = void 0;
exports.allAttachments = allAttachments;
exports.fromStorageInstanceResult = fromStorageInstanceResult;
exports.getAttachment = getAttachment;
exports.postMigrateDocument = postMigrateDocument;
exports.preMigrateDocument = preMigrateDocument;
exports.putAttachment = putAttachment;
exports.putAttachmentBase64 = putAttachmentBase64;
var _rxjs = require("rxjs");
var _index = require("../../plugins/utils/index.js");
var _attachmentsUtils = require("./attachments-utils.js");
Object.keys(_attachmentsUtils).forEach(function (key) {
  if (key === "default" || key === "__esModule") return;
  if (Object.prototype.hasOwnProperty.call(_exportNames, key)) return;
  if (key in exports && exports[key] === _attachmentsUtils[key]) return;
  Object.defineProperty(exports, key, {
    enumerable: true,
    get: function () {
      return _attachmentsUtils[key];
    }
  });
});
/**
 * an RxAttachment is basically just the attachment-stub
 * wrapped so that you can access the attachment-data
 */
var RxAttachment = exports.RxAttachment = /*#__PURE__*/function () {
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
    (0, _attachmentsUtils.assignMethodsToAttachment)(this);
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
    var plainDataBase64 = await this.getDataBase64();
    var ret = await (0, _index.createBlobFromBase64)(plainDataBase64, this.type);
    return ret;
  };
  _proto.getStringData = async function getStringData() {
    var data = await this.getData();
    var asString = await (0, _index.blobToString)(data);
    return asString;
  };
  _proto.getDataBase64 = async function getDataBase64() {
    var plainDataBase64 = await this.doc.collection.storageInstance.getAttachmentData(this.doc.primary, this.id, this.digest);
    return plainDataBase64;
  };
  return RxAttachment;
}();
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
  (0, _attachmentsUtils.ensureSchemaSupportsAttachments)(this);
  var dataSize = (0, _index.getBlobSize)(attachmentData.data);
  var dataString = await (0, _index.blobToBase64String)(attachmentData.data);
  return this.putAttachmentBase64({
    id: attachmentData.id,
    length: dataSize,
    type: attachmentData.type,
    data: dataString
  });
}
async function putAttachmentBase64(attachmentData) {
  (0, _attachmentsUtils.ensureSchemaSupportsAttachments)(this);
  var digest = await this.collection.database.hashFunction(attachmentData.data);
  var id = attachmentData.id;
  var type = attachmentData.type;
  var data = attachmentData.data;
  return this.collection.incrementalWriteQueue.addWrite(this._data, docWriteData => {
    docWriteData = (0, _index.flatClone)(docWriteData);
    docWriteData._attachments = (0, _index.flatClone)(docWriteData._attachments);
    docWriteData._attachments[id] = {
      length: attachmentData.length,
      type,
      data,
      digest
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
  (0, _attachmentsUtils.ensureSchemaSupportsAttachments)(this);
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
  (0, _attachmentsUtils.ensureSchemaSupportsAttachments)(this);
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
      var rawAttachmentData = await data.oldCollection.storageInstance.getAttachmentData(docPrimary, attachmentId, attachment.digest);
      var digest = await data.oldCollection.database.hashFunction(rawAttachmentData);
      newAttachments[attachmentId] = {
        length: attachment.length,
        type: attachment.type,
        data: rawAttachmentData,
        digest
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
  return _index.PROMISE_RESOLVE_VOID;
}
var RxDBAttachmentsPlugin = exports.RxDBAttachmentsPlugin = {
  name: 'attachments',
  rxdb: true,
  prototypes: {
    RxDocument: proto => {
      proto.putAttachment = putAttachment;
      proto.putAttachmentBase64 = putAttachmentBase64;
      proto.getAttachment = getAttachment;
      proto.allAttachments = allAttachments;
      Object.defineProperty(proto, 'allAttachments$', {
        get: function allAttachments$() {
          return this.$.pipe((0, _rxjs.map)(rxDocument => Object.entries(rxDocument.toJSON(true)._attachments)), (0, _rxjs.map)(entries => {
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
//# sourceMappingURL=index.js.map