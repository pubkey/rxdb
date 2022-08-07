import { map } from 'rxjs/operators';
import { b64DecodeUnicode, blobBufferUtil, flatClone, PROMISE_RESOLVE_VOID } from './../util';
import { newRxError } from '../rx-error';
import { flatCloneDocWithMeta, writeSingle } from '../rx-storage-helper';
import { pouchHash } from './pouchdb';
/**
 * To be able to support PouchDB with attachments,
 * we have to use the md5 hashing here, even if the RxDatabase itself
 * has a different hashing function.
 */

export var preMigrateDocument = function preMigrateDocument(data) {
  try {
    var attachments = data.docData._attachments;

    var _temp2 = function () {
      if (attachments) {
        var newAttachments = {};
        return Promise.resolve(Promise.all(Object.keys(attachments).map(function (attachmentId) {
          try {
            var attachment = attachments[attachmentId];
            var docPrimary = data.docData[data.oldCollection.schema.primaryPath];
            return Promise.resolve(data.oldCollection.storageInstance.getAttachmentData(docPrimary, attachmentId)).then(function (rawAttachmentData) {
              newAttachments[attachmentId] = {
                digest: attachment.digest,
                length: attachment.length,
                type: attachment.type,
                data: rawAttachmentData
              };
            });
          } catch (e) {
            return Promise.reject(e);
          }
        }))).then(function () {
          /**
           * Hooks mutate the input
           * instead of returning stuff
           */
          data.docData._attachments = newAttachments;
        });
      }
    }();

    return Promise.resolve(_temp2 && _temp2.then ? _temp2.then(function () {}) : void 0);
  } catch (e) {
    return Promise.reject(e);
  }
};
export var putAttachment = function putAttachment(attachmentData) {
  try {
    var _arguments2 = arguments,
        _this7 = this;

    var skipIfSame = _arguments2.length > 1 && _arguments2[1] !== undefined ? _arguments2[1] : true;
    ensureSchemaSupportsAttachments(_this7);
    var dataSize = blobBufferUtil.size(attachmentData.data);
    return Promise.resolve(blobBufferUtil.toBase64String(attachmentData.data)).then(function (dataString) {
      var id = attachmentData.id;
      var type = attachmentData.type;
      var data = dataString;
      return Promise.resolve(hashAttachmentData(dataString).then(function (hash) {
        return 'md5-' + hash;
      })).then(function (newDigest) {
        _this7._atomicQueue = _this7._atomicQueue.then(function () {
          try {
            if (skipIfSame && _this7._data._attachments && _this7._data._attachments[id]) {
              var currentMeta = _this7._data._attachments[id];

              if (currentMeta.type === type && currentMeta.digest === newDigest) {
                // skip because same data and same type
                return Promise.resolve(_this7.getAttachment(id));
              }
            }

            var docWriteData = flatCloneDocWithMeta(_this7._data);
            docWriteData._attachments = flatClone(docWriteData._attachments);
            docWriteData._attachments[id] = {
              digest: newDigest,
              length: dataSize,
              type: type,
              data: data
            };
            var writeRow = {
              previous: flatClone(_this7._data),
              document: flatClone(docWriteData)
            };
            return Promise.resolve(writeSingle(_this7.collection.storageInstance, writeRow, 'attachment-put')).then(function (writeResult) {
              var attachmentData = writeResult._attachments[id];
              var attachment = fromStorageInstanceResult(id, attachmentData, _this7);
              var newData = flatClone(_this7._data);
              newData._rev = writeResult._rev;
              newData._attachments = writeResult._attachments;

              _this7._dataSync$.next(newData);

              return attachment;
            });
          } catch (e) {
            return Promise.reject(e);
          }
        });
        return _this7._atomicQueue;
      });
    });
  } catch (e) {
    return Promise.reject(e);
  }
};
/**
 * get an attachment of the document by its id
 */

export function hashAttachmentData(attachmentBase64String) {
  var binary;

  try {
    binary = b64DecodeUnicode(attachmentBase64String);
  } catch (err) {
    console.log('could not run b64DecodeUnicode() on ' + attachmentBase64String);
    throw err;
  }

  return pouchHash(binary);
}
export function getAttachmentSize(attachmentBase64String) {
  return atob(attachmentBase64String).length;
}

function ensureSchemaSupportsAttachments(doc) {
  var schemaJson = doc.collection.schema.jsonSchema;

  if (!schemaJson.attachments) {
    throw newRxError('AT1', {
      link: 'https://pubkey.github.io/rxdb/rx-attachment.html'
    });
  }
}

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


export var RxAttachment = /*#__PURE__*/function () {
  function RxAttachment(_ref2) {
    var doc = _ref2.doc,
        id = _ref2.id,
        type = _ref2.type,
        length = _ref2.length,
        digest = _ref2.digest;
    this.doc = doc;
    this.id = id;
    this.type = type;
    this.length = length;
    this.digest = digest;

    _assignMethodsToAttachment(this);
  }

  var _proto = RxAttachment.prototype;

  _proto.remove = function remove() {
    var _this = this;

    this.doc._atomicQueue = this.doc._atomicQueue.then(function () {
      try {
        var docWriteData = flatCloneDocWithMeta(_this.doc._data);
        docWriteData._attachments = flatClone(docWriteData._attachments);
        delete docWriteData._attachments[_this.id];
        return Promise.resolve(writeSingle(_this.doc.collection.storageInstance, {
          previous: flatClone(_this.doc._data),
          // TODO do we need a flatClone here?
          document: docWriteData
        }, 'attachment-remove')).then(function (writeResult) {
          var newData = flatClone(_this.doc._data);
          newData._rev = writeResult._rev;
          newData._attachments = writeResult._attachments;

          _this.doc._dataSync$.next(newData);
        });
      } catch (e) {
        return Promise.reject(e);
      }
    });
    return this.doc._atomicQueue;
  }
  /**
   * returns the data for the attachment
   */
  ;

  _proto.getData = function getData() {
    try {
      var _this3 = this;

      return Promise.resolve(_this3.doc.collection.storageInstance.getAttachmentData(_this3.doc.primary, _this3.id)).then(function (plainDataBase64) {
        console.dir(plainDataBase64);
        return Promise.resolve(blobBufferUtil.createBlobBufferFromBase64(plainDataBase64, _this3.type));
      });
    } catch (e) {
      return Promise.reject(e);
    }
  };

  _proto.getStringData = function getStringData() {
    try {
      var _this5 = this;

      return Promise.resolve(_this5.getData()).then(function (data) {
        return Promise.resolve(blobBufferUtil.toString(data));
      });
    } catch (e) {
      return Promise.reject(e);
    }
  };

  return RxAttachment;
}();
export function fromStorageInstanceResult(id, attachmentData, rxDocument) {
  return new RxAttachment({
    doc: rxDocument,
    id: id,
    type: attachmentData.type,
    length: attachmentData.length,
    digest: attachmentData.digest
  });
}
export function getAttachment(id) {
  ensureSchemaSupportsAttachments(this);

  var docData = this._dataSync$.getValue();

  if (!docData._attachments || !docData._attachments[id]) return null;
  var attachmentData = docData._attachments[id];
  var attachment = fromStorageInstanceResult(id, attachmentData, this);
  return attachment;
}
/**
 * returns all attachments of the document
 */

export function allAttachments() {
  var _this8 = this;

  ensureSchemaSupportsAttachments(this);

  var docData = this._dataSync$.getValue(); // if there are no attachments, the field is missing


  if (!docData._attachments) {
    return [];
  }

  return Object.keys(docData._attachments).map(function (id) {
    return fromStorageInstanceResult(id, docData._attachments[id], _this8);
  });
}
export function postMigrateDocument(_action) {
  /**
   * No longer needed because
   * we store the attachemnts data buffers directly in the document.
   */
  return PROMISE_RESOLVE_VOID;
}
export var RxDBAttachmentsPlugin = {
  name: 'attachments',
  rxdb: true,
  prototypes: {
    RxDocument: function RxDocument(proto) {
      proto.putAttachment = putAttachment;
      proto.getAttachment = getAttachment;
      proto.allAttachments = allAttachments;
      Object.defineProperty(proto, 'allAttachments$', {
        get: function allAttachments$() {
          var _this9 = this;

          return this._dataSync$.pipe(map(function (data) {
            if (!data['_attachments']) {
              return {};
            }

            return data['_attachments'];
          }), map(function (attachmentsData) {
            return Object.entries(attachmentsData);
          }), map(function (entries) {
            return entries.map(function (_ref3) {
              var id = _ref3[0],
                  attachmentData = _ref3[1];
              return fromStorageInstanceResult(id, attachmentData, _this9);
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
//# sourceMappingURL=attachments.js.map