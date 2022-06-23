"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.RxDBAttachmentsPlugin = exports.RxAttachment = void 0;
exports.allAttachments = allAttachments;
exports.fromStorageInstanceResult = fromStorageInstanceResult;
exports.getAttachment = getAttachment;
exports.putAttachment = exports.preMigrateDocument = exports.postMigrateDocument = void 0;

var _operators = require("rxjs/operators");

var _util = require("./../util");

var _rxError = require("../rx-error");

var _rxStorageHelper = require("../rx-storage-helper");

var _hooks = require("../hooks");

function ensureSchemaSupportsAttachments(doc) {
  var schemaJson = doc.collection.schema.jsonSchema;

  if (!schemaJson.attachments) {
    throw (0, _rxError.newRxError)('AT1', {
      link: 'https://pubkey.github.io/rxdb/rx-attachment.html'
    });
  }
}

var postMigrateDocument = function postMigrateDocument(_action) {
  /**
   * No longer needed because
   * we store the attachemnts data buffers directly in the document.
   */
  return Promise.resolve();
};

exports.postMigrateDocument = postMigrateDocument;

var preMigrateDocument = function preMigrateDocument(data) {
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
              var hookInput = {
                database: data.oldCollection.database,
                schema: data.oldCollection.schema.jsonSchema,
                type: attachment.type,
                plainData: rawAttachmentData
              };
              return Promise.resolve((0, _hooks.runAsyncPluginHooks)('postReadAttachment', hookInput)).then(function () {
                rawAttachmentData = hookInput.plainData;
                newAttachments[attachmentId] = {
                  digest: attachment.digest,
                  length: attachment.length,
                  type: attachment.type,
                  data: rawAttachmentData
                };
              });
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

exports.preMigrateDocument = preMigrateDocument;

var putAttachment = function putAttachment(attachmentData) {
  try {
    var _arguments2 = arguments,
        _this8 = this;

    var skipIfSame = _arguments2.length > 1 && _arguments2[1] !== undefined ? _arguments2[1] : true;
    ensureSchemaSupportsAttachments(_this8);

    var dataSize = _util.blobBufferUtil.size(attachmentData.data);

    var storageStatics = _this8.collection.database.storage.statics;
    return Promise.resolve(_util.blobBufferUtil.toBase64String(attachmentData.data)).then(function (dataString) {
      var hookAttachmentData = {
        id: attachmentData.id,
        type: attachmentData.type,
        data: dataString
      };
      return Promise.resolve((0, _hooks.runAsyncPluginHooks)('preWriteAttachment', {
        database: _this8.collection.database,
        schema: _this8.collection.schema.jsonSchema,
        attachmentData: hookAttachmentData
      })).then(function () {
        var id = hookAttachmentData.id,
            data = hookAttachmentData.data,
            type = hookAttachmentData.type;
        return Promise.resolve((0, _rxStorageHelper.hashAttachmentData)(dataString, storageStatics).then(function (hash) {
          return storageStatics.hashKey + '-' + hash;
        })).then(function (newDigest) {
          _this8._atomicQueue = _this8._atomicQueue.then(function () {
            try {
              if (skipIfSame && _this8._data._attachments && _this8._data._attachments[id]) {
                var currentMeta = _this8._data._attachments[id];

                if (currentMeta.type === type && currentMeta.digest === newDigest) {
                  // skip because same data and same type
                  return Promise.resolve(_this8.getAttachment(id));
                }
              }

              var docWriteData = (0, _rxStorageHelper.flatCloneDocWithMeta)(_this8._data);
              docWriteData._attachments = (0, _util.flatClone)(docWriteData._attachments);
              docWriteData._attachments[id] = {
                digest: newDigest,
                length: dataSize,
                type: type,
                data: data
              };
              docWriteData._rev = (0, _util.createRevision)(docWriteData, _this8._data);
              var writeRow = {
                previous: (0, _util.flatClone)(_this8._data),
                document: (0, _util.flatClone)(docWriteData)
              };
              return Promise.resolve((0, _rxStorageHelper.writeSingle)(_this8.collection.storageInstance, writeRow)).then(function (writeResult) {
                var attachmentData = writeResult._attachments[id];
                var attachment = fromStorageInstanceResult(id, attachmentData, _this8);
                var newData = (0, _util.flatClone)(_this8._data);
                newData._rev = writeResult._rev;
                newData._attachments = writeResult._attachments;

                _this8._dataSync$.next(newData);

                return attachment;
              });
            } catch (e) {
              return Promise.reject(e);
            }
          });
          return _this8._atomicQueue;
        });
      });
    });
  } catch (e) {
    return Promise.reject(e);
  }
};
/**
 * get an attachment of the document by its id
 */


exports.putAttachment = putAttachment;

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
    try {
      var _this2 = this;

      _this2.doc._atomicQueue = _this2.doc._atomicQueue.then(function () {
        try {
          var docWriteData = (0, _rxStorageHelper.flatCloneDocWithMeta)(_this2.doc._data);
          docWriteData._attachments = (0, _util.flatClone)(docWriteData._attachments);
          delete docWriteData._attachments[_this2.id];
          docWriteData._rev = (0, _util.createRevision)(docWriteData, _this2.doc._data);
          return Promise.resolve((0, _rxStorageHelper.writeSingle)(_this2.doc.collection.storageInstance, {
            previous: (0, _util.flatClone)(_this2.doc._data),
            // TODO do we need a flatClone here?
            document: docWriteData
          })).then(function (writeResult) {
            var newData = (0, _util.flatClone)(_this2.doc._data);
            newData._rev = writeResult._rev;
            newData._attachments = writeResult._attachments;

            _this2.doc._dataSync$.next(newData);
          });
        } catch (e) {
          return Promise.reject(e);
        }
      });
      return Promise.resolve(_this2.doc._atomicQueue);
    } catch (e) {
      return Promise.reject(e);
    }
  }
  /**
   * returns the data for the attachment
   */
  ;

  _proto.getData = function getData() {
    try {
      var _this4 = this;

      return Promise.resolve(_this4.doc.collection.storageInstance.getAttachmentData(_this4.doc.primary, _this4.id)).then(function (plainDataBase64) {
        var hookInput = {
          database: _this4.doc.collection.database,
          schema: _this4.doc.collection.schema.jsonSchema,
          type: _this4.type,
          plainData: plainDataBase64
        };
        return Promise.resolve((0, _hooks.runAsyncPluginHooks)('postReadAttachment', hookInput)).then(function () {
          return Promise.resolve(_util.blobBufferUtil.createBlobBufferFromBase64(hookInput.plainData, _this4.type));
        });
      });
    } catch (e) {
      return Promise.reject(e);
    }
  };

  _proto.getStringData = function getStringData() {
    try {
      var _this6 = this;

      return Promise.resolve(_this6.getData()).then(function (data) {
        return Promise.resolve(_util.blobBufferUtil.toString(data));
      });
    } catch (e) {
      return Promise.reject(e);
    }
  };

  return RxAttachment;
}();

exports.RxAttachment = RxAttachment;

function fromStorageInstanceResult(id, attachmentData, rxDocument) {
  return new RxAttachment({
    doc: rxDocument,
    id: id,
    type: attachmentData.type,
    length: attachmentData.length,
    digest: attachmentData.digest
  });
}

function getAttachment(id) {
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


function allAttachments() {
  var _this9 = this;

  ensureSchemaSupportsAttachments(this);

  var docData = this._dataSync$.getValue(); // if there are no attachments, the field is missing


  if (!docData._attachments) {
    return [];
  }

  return Object.keys(docData._attachments).map(function (id) {
    return fromStorageInstanceResult(id, docData._attachments[id], _this9);
  });
}

var RxDBAttachmentsPlugin = {
  name: 'attachments',
  rxdb: true,
  prototypes: {
    RxDocument: function RxDocument(proto) {
      proto.putAttachment = putAttachment;
      proto.getAttachment = getAttachment;
      proto.allAttachments = allAttachments;
      Object.defineProperty(proto, 'allAttachments$', {
        get: function allAttachments$() {
          var _this10 = this;

          return this._dataSync$.pipe((0, _operators.map)(function (data) {
            if (!data['_attachments']) {
              return {};
            }

            return data['_attachments'];
          }), (0, _operators.map)(function (attachmentsData) {
            return Object.entries(attachmentsData);
          }), (0, _operators.map)(function (entries) {
            return entries.map(function (_ref3) {
              var id = _ref3[0],
                  attachmentData = _ref3[1];
              return fromStorageInstanceResult(id, attachmentData, _this10);
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
//# sourceMappingURL=attachments.js.map