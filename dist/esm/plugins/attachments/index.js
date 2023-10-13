import { map } from 'rxjs';
import { blobToBase64String, blobToString, createBlobFromBase64, flatClone, getBlobSize, PROMISE_RESOLVE_VOID } from "../../plugins/utils/index.js";
import { assignMethodsToAttachment, ensureSchemaSupportsAttachments } from "./attachments-utils.js";

/**
 * an RxAttachment is basically just the attachment-stub
 * wrapped so that you can access the attachment-data
 */
export var RxAttachment = /*#__PURE__*/function () {
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
    assignMethodsToAttachment(this);
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
    var plainDataBase64 = await this.doc.collection.storageInstance.getAttachmentData(this.doc.primary, this.id, this.digest);
    var ret = await createBlobFromBase64(plainDataBase64, this.type);
    return ret;
  };
  _proto.getStringData = async function getStringData() {
    var data = await this.getData();
    var asString = await blobToString(data);
    return asString;
  };
  return RxAttachment;
}();
export function fromStorageInstanceResult(id, attachmentData, rxDocument) {
  return new RxAttachment({
    doc: rxDocument,
    id,
    type: attachmentData.type,
    length: attachmentData.length,
    digest: attachmentData.digest
  });
}
export async function putAttachment(attachmentData) {
  ensureSchemaSupportsAttachments(this);
  var dataSize = getBlobSize(attachmentData.data);
  var dataString = await blobToBase64String(attachmentData.data);
  var digest = await this.collection.database.hashFunction(dataString);
  var id = attachmentData.id;
  var type = attachmentData.type;
  var data = dataString;
  return this.collection.incrementalWriteQueue.addWrite(this._data, docWriteData => {
    docWriteData = flatClone(docWriteData);
    docWriteData._attachments = flatClone(docWriteData._attachments);
    docWriteData._attachments[id] = {
      length: dataSize,
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
export function getAttachment(id) {
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
export function allAttachments() {
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
export async function preMigrateDocument(data) {
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
export function postMigrateDocument(_action) {
  /**
   * No longer needed because
   * we store the attachments data buffers directly in the document.
   */
  return PROMISE_RESOLVE_VOID;
}
export var RxDBAttachmentsPlugin = {
  name: 'attachments',
  rxdb: true,
  prototypes: {
    RxDocument: proto => {
      proto.putAttachment = putAttachment;
      proto.getAttachment = getAttachment;
      proto.allAttachments = allAttachments;
      Object.defineProperty(proto, 'allAttachments$', {
        get: function allAttachments$() {
          return this.$.pipe(map(rxDocument => Object.entries(rxDocument.toJSON(true)._attachments)), map(entries => {
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
export * from "./attachments-utils.js";
//# sourceMappingURL=index.js.map