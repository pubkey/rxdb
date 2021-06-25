import _asyncToGenerator from "@babel/runtime/helpers/asyncToGenerator";
import _regeneratorRuntime from "@babel/runtime/regenerator";
import { map } from 'rxjs/operators';
import { blobBufferUtil, flatClone } from './../util';
import { newRxError } from '../rx-error';
import { writeSingle } from '../rx-storage-helper';
import { _handleToStorageInstance } from '../rx-collection-helper';

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

  _proto.remove = /*#__PURE__*/function () {
    var _remove = _asyncToGenerator( /*#__PURE__*/_regeneratorRuntime.mark(function _callee2() {
      var _this = this;

      return _regeneratorRuntime.wrap(function _callee2$(_context2) {
        while (1) {
          switch (_context2.prev = _context2.next) {
            case 0:
              this.doc._atomicQueue = this.doc._atomicQueue.then( /*#__PURE__*/_asyncToGenerator( /*#__PURE__*/_regeneratorRuntime.mark(function _callee() {
                var docWriteData, writeResult, newData;
                return _regeneratorRuntime.wrap(function _callee$(_context) {
                  while (1) {
                    switch (_context.prev = _context.next) {
                      case 0:
                        docWriteData = flatClone(_this.doc._data);
                        docWriteData._attachments = flatClone(docWriteData._attachments);
                        delete docWriteData._attachments[_this.id];
                        _context.next = 5;
                        return writeSingle(_this.doc.collection.storageInstance, {
                          previous: _handleToStorageInstance(_this.doc.collection, flatClone(_this.doc._data)),
                          document: _handleToStorageInstance(_this.doc.collection, docWriteData)
                        });

                      case 5:
                        writeResult = _context.sent;
                        newData = flatClone(_this.doc._data);
                        newData._rev = writeResult._rev;
                        newData._attachments = writeResult._attachments;

                        _this.doc._dataSync$.next(newData);

                      case 10:
                      case "end":
                        return _context.stop();
                    }
                  }
                }, _callee);
              })));
              return _context2.abrupt("return", this.doc._atomicQueue);

            case 2:
            case "end":
              return _context2.stop();
          }
        }
      }, _callee2, this);
    }));

    function remove() {
      return _remove.apply(this, arguments);
    }

    return remove;
  }()
  /**
   * returns the data for the attachment
   */
  ;

  _proto.getData =
  /*#__PURE__*/
  function () {
    var _getData = _asyncToGenerator( /*#__PURE__*/_regeneratorRuntime.mark(function _callee3() {
      var plainData, dataString, ret;
      return _regeneratorRuntime.wrap(function _callee3$(_context3) {
        while (1) {
          switch (_context3.prev = _context3.next) {
            case 0:
              _context3.next = 2;
              return this.doc.collection.storageInstance.getAttachmentData(this.doc.primary, this.id);

            case 2:
              plainData = _context3.sent;

              if (!shouldEncrypt(this.doc.collection.schema)) {
                _context3.next = 11;
                break;
              }

              _context3.next = 6;
              return blobBufferUtil.toString(plainData);

            case 6:
              dataString = _context3.sent;
              ret = blobBufferUtil.createBlobBuffer(this.doc.collection._crypter._decryptString(dataString), this.type);
              return _context3.abrupt("return", ret);

            case 11:
              return _context3.abrupt("return", plainData);

            case 12:
            case "end":
              return _context3.stop();
          }
        }
      }, _callee3, this);
    }));

    function getData() {
      return _getData.apply(this, arguments);
    }

    return getData;
  }();

  _proto.getStringData = function getStringData() {
    return this.getData().then(function (bufferBlob) {
      return blobBufferUtil.toString(bufferBlob);
    });
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
  _putAttachment = _asyncToGenerator( /*#__PURE__*/_regeneratorRuntime.mark(function _callee5(_ref4) {
    var _this4 = this;

    var id,
        data,
        _ref4$type,
        type,
        skipIfSame,
        dataString,
        encrypted,
        _args5 = arguments;

    return _regeneratorRuntime.wrap(function _callee5$(_context5) {
      while (1) {
        switch (_context5.prev = _context5.next) {
          case 0:
            id = _ref4.id, data = _ref4.data, _ref4$type = _ref4.type, type = _ref4$type === void 0 ? 'text/plain' : _ref4$type;
            skipIfSame = _args5.length > 1 && _args5[1] !== undefined ? _args5[1] : true;
            ensureSchemaSupportsAttachments(this);
            /**
             * Then encryption plugin is only able to encrypt strings,
             * so unpack as string first.
             */

            if (!shouldEncrypt(this.collection.schema)) {
              _context5.next = 9;
              break;
            }

            _context5.next = 6;
            return blobBufferUtil.toString(data);

          case 6:
            dataString = _context5.sent;
            encrypted = this.collection._crypter._encryptString(dataString);
            data = blobBufferUtil.createBlobBuffer(encrypted, 'text/plain');

          case 9:
            this._atomicQueue = this._atomicQueue.then( /*#__PURE__*/_asyncToGenerator( /*#__PURE__*/_regeneratorRuntime.mark(function _callee4() {
              var currentMeta, newHash, docWriteData, writeRow, writeResult, attachmentData, attachment, newData;
              return _regeneratorRuntime.wrap(function _callee4$(_context4) {
                while (1) {
                  switch (_context4.prev = _context4.next) {
                    case 0:
                      if (!(skipIfSame && _this4._data._attachments && _this4._data._attachments[id])) {
                        _context4.next = 7;
                        break;
                      }

                      currentMeta = _this4._data._attachments[id];
                      _context4.next = 4;
                      return _this4.collection.database.storage.hash(data);

                    case 4:
                      newHash = _context4.sent;

                      if (!(currentMeta.type === type && currentMeta.digest === newHash)) {
                        _context4.next = 7;
                        break;
                      }

                      return _context4.abrupt("return", _this4.getAttachment(id));

                    case 7:
                      docWriteData = flatClone(_this4._data);
                      docWriteData._attachments = flatClone(docWriteData._attachments);
                      docWriteData._attachments[id] = {
                        type: type,
                        data: data
                      };
                      writeRow = {
                        previous: _handleToStorageInstance(_this4.collection, flatClone(_this4._data)),
                        document: _handleToStorageInstance(_this4.collection, flatClone(docWriteData))
                      };
                      _context4.next = 13;
                      return writeSingle(_this4.collection.storageInstance, writeRow);

                    case 13:
                      writeResult = _context4.sent;
                      attachmentData = writeResult._attachments[id];
                      attachment = fromStorageInstanceResult(id, attachmentData, _this4);
                      newData = flatClone(_this4._data);
                      newData._rev = writeResult._rev;
                      newData._attachments = writeResult._attachments;

                      _this4._dataSync$.next(newData);

                      return _context4.abrupt("return", attachment);

                    case 21:
                    case "end":
                      return _context4.stop();
                  }
                }
              }, _callee4);
            })));
            return _context5.abrupt("return", this._atomicQueue);

          case 11:
          case "end":
            return _context5.stop();
        }
      }
    }, _callee5, this);
  }));
  return _putAttachment.apply(this, arguments);
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
  var _this2 = this;

  ensureSchemaSupportsAttachments(this);

  var docData = this._dataSync$.getValue(); // if there are no attachments, the field is missing


  if (!docData._attachments) {
    return [];
  }

  return Object.keys(docData._attachments).map(function (id) {
    return fromStorageInstanceResult(id, docData._attachments[id], _this2);
  });
}
export function preMigrateDocument(_x2) {
  return _preMigrateDocument.apply(this, arguments);
}

function _preMigrateDocument() {
  _preMigrateDocument = _asyncToGenerator( /*#__PURE__*/_regeneratorRuntime.mark(function _callee7(data) {
    var attachments, mustDecrypt, newAttachments;
    return _regeneratorRuntime.wrap(function _callee7$(_context7) {
      while (1) {
        switch (_context7.prev = _context7.next) {
          case 0:
            attachments = data.docData._attachments;

            if (!attachments) {
              _context7.next = 7;
              break;
            }

            mustDecrypt = !!shouldEncrypt(data.oldCollection.schema);
            newAttachments = {};
            _context7.next = 6;
            return Promise.all(Object.keys(attachments).map( /*#__PURE__*/function () {
              var _ref7 = _asyncToGenerator( /*#__PURE__*/_regeneratorRuntime.mark(function _callee6(attachmentId) {
                var attachment, docPrimary, rawAttachmentData;
                return _regeneratorRuntime.wrap(function _callee6$(_context6) {
                  while (1) {
                    switch (_context6.prev = _context6.next) {
                      case 0:
                        attachment = attachments[attachmentId];
                        docPrimary = data.docData[data.oldCollection.schema.primaryPath];
                        _context6.next = 4;
                        return data.oldCollection.storageInstance.getAttachmentData(docPrimary, attachmentId);

                      case 4:
                        rawAttachmentData = _context6.sent;

                        if (!mustDecrypt) {
                          _context6.next = 9;
                          break;
                        }

                        _context6.next = 8;
                        return blobBufferUtil.toString(rawAttachmentData).then(function (dataString) {
                          return blobBufferUtil.createBlobBuffer(data.oldCollection._crypter._decryptString(dataString), attachment.type);
                        });

                      case 8:
                        rawAttachmentData = _context6.sent;

                      case 9:
                        newAttachments[attachmentId] = {
                          type: attachment.type,
                          data: rawAttachmentData
                        };

                      case 10:
                      case "end":
                        return _context6.stop();
                    }
                  }
                }, _callee6);
              }));

              return function (_x4) {
                return _ref7.apply(this, arguments);
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
            return _context7.stop();
        }
      }
    }, _callee7);
  }));
  return _preMigrateDocument.apply(this, arguments);
}

export function postMigrateDocument(_x3) {
  return _postMigrateDocument.apply(this, arguments);
}

function _postMigrateDocument() {
  _postMigrateDocument = _asyncToGenerator( /*#__PURE__*/_regeneratorRuntime.mark(function _callee8(_action) {
    return _regeneratorRuntime.wrap(function _callee8$(_context8) {
      while (1) {
        switch (_context8.prev = _context8.next) {
          case 0:
            return _context8.abrupt("return");

          case 1:
          case "end":
            return _context8.stop();
        }
      }
    }, _callee8);
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
        var _this3 = this;

        return this._dataSync$.pipe(map(function (data) {
          if (!data['_attachments']) {
            return {};
          }

          return data['_attachments'];
        }), map(function (attachmentsData) {
          return Object.entries(attachmentsData);
        }), map(function (entries) {
          return entries.map(function (_ref5) {
            var id = _ref5[0],
                attachmentData = _ref5[1];
            return fromStorageInstanceResult(id, attachmentData, _this3);
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