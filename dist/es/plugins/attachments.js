import _asyncToGenerator from "@babel/runtime/helpers/asyncToGenerator";
import _regeneratorRuntime from "@babel/runtime/regenerator";
import { map } from 'rxjs/operators';
import { createUpdateEvent } from './../rx-change-event';
import { now, blobBufferUtil } from './../util';
import { newRxError } from '../rx-error';
import { pouchAttachmentBinaryHash } from '../pouch-db';

function ensureSchemaSupportsAttachments(doc) {
  var schemaJson = doc.collection.schema.jsonSchema;

  if (!schemaJson.attachments) {
    throw newRxError('AT1', {
      link: 'https://pubkey.github.io/rxdb/rx-attachment.html'
    });
  }
}

function resyncRxDocument(doc) {
  var startTime = now();
  return doc.collection.pouch.get(doc.primary).then(function (docDataFromPouch) {
    var data = doc.collection._handleFromPouch(docDataFromPouch);

    var endTime = now();
    var changeEvent = createUpdateEvent(doc.collection, data, null, startTime, endTime, doc);
    doc.$emit(changeEvent);
  });
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
      if (shouldEncrypt(_this2.doc.collection.schema)) {
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
export function fromPouchDocument(id, pouchDocAttachment, rxDocument) {
  return new RxAttachment({
    doc: rxDocument,
    id: id,
    type: pouchDocAttachment.content_type,
    length: pouchDocAttachment.length,
    digest: pouchDocAttachment.digest,
    rev: pouchDocAttachment.revpos
  });
}

function shouldEncrypt(schema) {
  return !!(schema.jsonSchema.attachments && schema.jsonSchema.attachments.encrypted);
}

export function putAttachment(_x) {
  return _putAttachment.apply(this, arguments);
}
/**
 * get an attachment of the document by its id
 */

function _putAttachment() {
  _putAttachment = _asyncToGenerator( /*#__PURE__*/_regeneratorRuntime.mark(function _callee2(_ref3) {
    var _this5 = this;

    var id,
        data,
        _ref3$type,
        type,
        skipIfSame,
        blobBuffer,
        _args2 = arguments;

    return _regeneratorRuntime.wrap(function _callee2$(_context2) {
      while (1) {
        switch (_context2.prev = _context2.next) {
          case 0:
            id = _ref3.id, data = _ref3.data, _ref3$type = _ref3.type, type = _ref3$type === void 0 ? 'text/plain' : _ref3$type;
            skipIfSame = _args2.length > 1 && _args2[1] !== undefined ? _args2[1] : false;
            ensureSchemaSupportsAttachments(this);

            if (shouldEncrypt(this.collection.schema)) {
              data = this.collection._crypter._encryptValue(data);
            }

            blobBuffer = blobBufferUtil.createBlobBuffer(data, type);
            this._atomicQueue = this._atomicQueue.then( /*#__PURE__*/_asyncToGenerator( /*#__PURE__*/_regeneratorRuntime.mark(function _callee() {
              var currentMeta, newHash;
              return _regeneratorRuntime.wrap(function _callee$(_context) {
                while (1) {
                  switch (_context.prev = _context.next) {
                    case 0:
                      if (!(skipIfSame && _this5._data._attachments && _this5._data._attachments[id])) {
                        _context.next = 7;
                        break;
                      }

                      currentMeta = _this5._data._attachments[id];
                      _context.next = 4;
                      return pouchAttachmentBinaryHash(data);

                    case 4:
                      newHash = _context.sent;

                      if (!(currentMeta.content_type === type && currentMeta.digest === newHash)) {
                        _context.next = 7;
                        break;
                      }

                      return _context.abrupt("return", _this5.getAttachment(id));

                    case 7:
                      return _context.abrupt("return", _this5.collection.pouch.putAttachment(_this5.primary, id, _this5._data._rev, blobBuffer, type).then(function () {
                        return _this5.collection.pouch.get(_this5.primary);
                      }).then(function (docData) {
                        var attachmentData = docData._attachments[id];
                        var attachment = fromPouchDocument(id, attachmentData, _this5);
                        _this5._data._rev = docData._rev;
                        _this5._data._attachments = docData._attachments;
                        return resyncRxDocument(_this5).then(function () {
                          return attachment;
                        });
                      }));

                    case 8:
                    case "end":
                      return _context.stop();
                  }
                }
              }, _callee);
            })));
            return _context2.abrupt("return", this._atomicQueue);

          case 7:
          case "end":
            return _context2.stop();
        }
      }
    }, _callee2, this);
  }));
  return _putAttachment.apply(this, arguments);
}

export function getAttachment(id) {
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

export function allAttachments() {
  var _this3 = this;

  ensureSchemaSupportsAttachments(this);

  var docData = this._dataSync$.getValue(); // if there are no attachments, the field is missing


  if (!docData._attachments) return [];
  return Object.keys(docData._attachments).map(function (id) {
    return fromPouchDocument(id, docData._attachments[id], _this3);
  });
}
export function preMigrateDocument(_x2) {
  return _preMigrateDocument.apply(this, arguments);
}

function _preMigrateDocument() {
  _preMigrateDocument = _asyncToGenerator( /*#__PURE__*/_regeneratorRuntime.mark(function _callee4(data) {
    var attachments, mustDecrypt, newAttachments;
    return _regeneratorRuntime.wrap(function _callee4$(_context4) {
      while (1) {
        switch (_context4.prev = _context4.next) {
          case 0:
            attachments = data.docData._attachments;

            if (!attachments) {
              _context4.next = 7;
              break;
            }

            mustDecrypt = !!shouldEncrypt(data.oldCollection.schema);
            newAttachments = {};
            _context4.next = 6;
            return Promise.all(Object.keys(attachments).map( /*#__PURE__*/function () {
              var _ref6 = _asyncToGenerator( /*#__PURE__*/_regeneratorRuntime.mark(function _callee3(attachmentId) {
                var attachment, docPrimary, rawAttachmentData;
                return _regeneratorRuntime.wrap(function _callee3$(_context3) {
                  while (1) {
                    switch (_context3.prev = _context3.next) {
                      case 0:
                        attachment = attachments[attachmentId];
                        docPrimary = data.docData[data.oldCollection.schema.primaryPath];
                        _context3.next = 4;
                        return data.oldCollection.pouchdb.getAttachment(docPrimary, attachmentId);

                      case 4:
                        rawAttachmentData = _context3.sent;

                        if (!mustDecrypt) {
                          _context3.next = 9;
                          break;
                        }

                        _context3.next = 8;
                        return blobBufferUtil.toString(rawAttachmentData).then(function (dataString) {
                          return blobBufferUtil.createBlobBuffer(data.oldCollection._crypter._decryptValue(dataString), attachment.content_type);
                        });

                      case 8:
                        rawAttachmentData = _context3.sent;

                      case 9:
                        newAttachments[attachmentId] = {
                          digest: attachment.digest,
                          length: attachment.length,
                          revpos: attachment.revpos,
                          content_type: attachment.content_type,
                          stub: false,
                          // set this to false because now we have the full data
                          data: rawAttachmentData
                        };

                      case 10:
                      case "end":
                        return _context3.stop();
                    }
                  }
                }, _callee3);
              }));

              return function (_x4) {
                return _ref6.apply(this, arguments);
              };
            }()));

          case 6:
            /**
             * Hooks mutate the input
             * instead of returning stuff
             */
            data.docData._attachments = newAttachments;

          case 7:
          case "end":
            return _context4.stop();
        }
      }
    }, _callee4);
  }));
  return _preMigrateDocument.apply(this, arguments);
}

export function postMigrateDocument(_x3) {
  return _postMigrateDocument.apply(this, arguments);
}

function _postMigrateDocument() {
  _postMigrateDocument = _asyncToGenerator( /*#__PURE__*/_regeneratorRuntime.mark(function _callee5(action) {
    return _regeneratorRuntime.wrap(function _callee5$(_context5) {
      while (1) {
        switch (_context5.prev = _context5.next) {
          case 0:
            return _context5.abrupt("return");

          case 1:
          case "end":
            return _context5.stop();
        }
      }
    }, _callee5);
  }));
  return _postMigrateDocument.apply(this, arguments);
}

export var rxdb = true;
export var prototypes = {
  RxDocument: function RxDocument(proto) {
    proto.putAttachment = putAttachment;
    proto.getAttachment = getAttachment;
    proto.allAttachments = allAttachments;
    Object.defineProperty(proto, 'allAttachments$', {
      get: function allAttachments$() {
        var _this4 = this;

        return this._dataSync$.pipe(map(function (data) {
          if (!data['_attachments']) return {};
          return data['_attachments'];
        }), map(function (attachmentsData) {
          return Object.entries(attachmentsData);
        }), map(function (entries) {
          return entries.map(function (_ref4) {
            var id = _ref4[0],
                attachmentData = _ref4[1];
            return fromPouchDocument(id, attachmentData, _this4);
          });
        }));
      }
    });
  }
};
export var overwritable = {};
export var hooks = {
  preMigrateDocument: preMigrateDocument,
  postMigrateDocument: postMigrateDocument
};
export var RxDBAttachmentsPlugin = {
  name: 'attachments',
  rxdb: rxdb,
  prototypes: prototypes,
  overwritable: overwritable,
  hooks: hooks
};
//# sourceMappingURL=attachments.js.map