"use strict";

var _interopRequireDefault = require("@babel/runtime/helpers/interopRequireDefault");

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.RxDBAttachmentsPlugin = exports.RxAttachment = void 0;
exports.allAttachments = allAttachments;
exports.fromStorageInstanceResult = fromStorageInstanceResult;
exports.getAttachment = getAttachment;
exports.getAttachmentDataMeta = getAttachmentDataMeta;
exports.overwritable = exports.hooks = void 0;
exports.postMigrateDocument = postMigrateDocument;
exports.preMigrateDocument = preMigrateDocument;
exports.prototypes = void 0;
exports.putAttachment = putAttachment;
exports.rxdb = void 0;

var _regenerator = _interopRequireDefault(require("@babel/runtime/regenerator"));

var _asyncToGenerator2 = _interopRequireDefault(require("@babel/runtime/helpers/asyncToGenerator"));

var _operators = require("rxjs/operators");

var _util = require("./../util");

var _rxError = require("../rx-error");

var _rxStorageHelper = require("../rx-storage-helper");

var _rxCollectionHelper = require("../rx-collection-helper");

function ensureSchemaSupportsAttachments(doc) {
  var schemaJson = doc.collection.schema.jsonSchema;

  if (!schemaJson.attachments) {
    throw (0, _rxError.newRxError)('AT1', {
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

  _proto.remove = /*#__PURE__*/function () {
    var _remove = (0, _asyncToGenerator2["default"])( /*#__PURE__*/_regenerator["default"].mark(function _callee2() {
      var _this = this;

      return _regenerator["default"].wrap(function _callee2$(_context2) {
        while (1) {
          switch (_context2.prev = _context2.next) {
            case 0:
              this.doc._atomicQueue = this.doc._atomicQueue.then( /*#__PURE__*/(0, _asyncToGenerator2["default"])( /*#__PURE__*/_regenerator["default"].mark(function _callee() {
                var docWriteData, writeResult, newData;
                return _regenerator["default"].wrap(function _callee$(_context) {
                  while (1) {
                    switch (_context.prev = _context.next) {
                      case 0:
                        docWriteData = (0, _util.flatClone)(_this.doc._data);
                        docWriteData._attachments = (0, _util.flatClone)(docWriteData._attachments);
                        delete docWriteData._attachments[_this.id];
                        _context.next = 5;
                        return (0, _rxStorageHelper.writeSingle)(_this.doc.collection.storageInstance, {
                          previous: (0, _rxCollectionHelper._handleToStorageInstance)(_this.doc.collection, (0, _util.flatClone)(_this.doc._data)),
                          document: (0, _rxCollectionHelper._handleToStorageInstance)(_this.doc.collection, docWriteData)
                        });

                      case 5:
                        writeResult = _context.sent;
                        newData = (0, _util.flatClone)(_this.doc._data);
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
    var _getData = (0, _asyncToGenerator2["default"])( /*#__PURE__*/_regenerator["default"].mark(function _callee3() {
      var plainData, dataString, ret;
      return _regenerator["default"].wrap(function _callee3$(_context3) {
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
              return _util.blobBufferUtil.toString(plainData);

            case 6:
              dataString = _context3.sent;
              ret = _util.blobBufferUtil.createBlobBuffer(this.doc.collection._crypter._decryptString(dataString), this.type);
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
      return _util.blobBufferUtil.toString(bufferBlob);
    });
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

function shouldEncrypt(schema) {
  return !!(schema.jsonSchema.attachments && schema.jsonSchema.attachments.encrypted);
}

function putAttachment(_x) {
  return _putAttachment.apply(this, arguments);
}
/**
 * get an attachment of the document by its id
 */


function _putAttachment() {
  _putAttachment = (0, _asyncToGenerator2["default"])( /*#__PURE__*/_regenerator["default"].mark(function _callee5(_ref4) {
    var _this4 = this;

    var id,
        data,
        _ref4$type,
        type,
        skipIfSame,
        dataString,
        encrypted,
        _args5 = arguments;

    return _regenerator["default"].wrap(function _callee5$(_context5) {
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
            return _util.blobBufferUtil.toString(data);

          case 6:
            dataString = _context5.sent;
            encrypted = this.collection._crypter._encryptString(dataString);
            data = _util.blobBufferUtil.createBlobBuffer(encrypted, 'text/plain');

          case 9:
            this._atomicQueue = this._atomicQueue.then( /*#__PURE__*/(0, _asyncToGenerator2["default"])( /*#__PURE__*/_regenerator["default"].mark(function _callee4() {
              var currentMeta, newHash, docWriteData, meta, writeRow, writeResult, attachmentData, attachment, newData;
              return _regenerator["default"].wrap(function _callee4$(_context4) {
                while (1) {
                  switch (_context4.prev = _context4.next) {
                    case 0:
                      if (!(skipIfSame && _this4._data._attachments && _this4._data._attachments[id])) {
                        _context4.next = 7;
                        break;
                      }

                      currentMeta = _this4._data._attachments[id];
                      _context4.next = 4;
                      return _this4.collection.database.storage.statics.hash(data);

                    case 4:
                      newHash = _context4.sent;

                      if (!(currentMeta.type === type && currentMeta.digest === newHash)) {
                        _context4.next = 7;
                        break;
                      }

                      return _context4.abrupt("return", _this4.getAttachment(id));

                    case 7:
                      docWriteData = (0, _util.flatClone)(_this4._data);
                      docWriteData._attachments = (0, _util.flatClone)(docWriteData._attachments);
                      _context4.next = 11;
                      return getAttachmentDataMeta(_this4.collection.database.storage.statics, data);

                    case 11:
                      meta = _context4.sent;
                      docWriteData._attachments[id] = {
                        digest: meta.digest,
                        length: meta.length,
                        type: type,
                        data: data
                      };
                      writeRow = {
                        previous: (0, _rxCollectionHelper._handleToStorageInstance)(_this4.collection, (0, _util.flatClone)(_this4._data)),
                        document: (0, _rxCollectionHelper._handleToStorageInstance)(_this4.collection, (0, _util.flatClone)(docWriteData))
                      };
                      _context4.next = 16;
                      return (0, _rxStorageHelper.writeSingle)(_this4.collection.storageInstance, writeRow);

                    case 16:
                      writeResult = _context4.sent;
                      attachmentData = writeResult._attachments[id];
                      attachment = fromStorageInstanceResult(id, attachmentData, _this4);
                      newData = (0, _util.flatClone)(_this4._data);
                      newData._rev = writeResult._rev;
                      newData._attachments = writeResult._attachments;

                      _this4._dataSync$.next(newData);

                      return _context4.abrupt("return", attachment);

                    case 24:
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

function preMigrateDocument(_x2) {
  return _preMigrateDocument.apply(this, arguments);
}

function _preMigrateDocument() {
  _preMigrateDocument = (0, _asyncToGenerator2["default"])( /*#__PURE__*/_regenerator["default"].mark(function _callee7(data) {
    var attachments, mustDecrypt, newAttachments;
    return _regenerator["default"].wrap(function _callee7$(_context7) {
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
              var _ref7 = (0, _asyncToGenerator2["default"])( /*#__PURE__*/_regenerator["default"].mark(function _callee6(attachmentId) {
                var attachment, docPrimary, rawAttachmentData, meta;
                return _regenerator["default"].wrap(function _callee6$(_context6) {
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
                        return _util.blobBufferUtil.toString(rawAttachmentData).then(function (dataString) {
                          return _util.blobBufferUtil.createBlobBuffer(data.oldCollection._crypter._decryptString(dataString), attachment.type);
                        });

                      case 8:
                        rawAttachmentData = _context6.sent;

                      case 9:
                        _context6.next = 11;
                        return getAttachmentDataMeta(data.oldCollection.database.storage.statics, rawAttachmentData);

                      case 11:
                        meta = _context6.sent;
                        newAttachments[attachmentId] = {
                          digest: meta.digest,
                          length: meta.length,
                          type: attachment.type,
                          data: rawAttachmentData
                        };

                      case 13:
                      case "end":
                        return _context6.stop();
                    }
                  }
                }, _callee6);
              }));

              return function (_x6) {
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

function postMigrateDocument(_x3) {
  return _postMigrateDocument.apply(this, arguments);
}

function _postMigrateDocument() {
  _postMigrateDocument = (0, _asyncToGenerator2["default"])( /*#__PURE__*/_regenerator["default"].mark(function _callee8(_action) {
    return _regenerator["default"].wrap(function _callee8$(_context8) {
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

function getAttachmentDataMeta(_x4, _x5) {
  return _getAttachmentDataMeta.apply(this, arguments);
}

function _getAttachmentDataMeta() {
  _getAttachmentDataMeta = (0, _asyncToGenerator2["default"])( /*#__PURE__*/_regenerator["default"].mark(function _callee9(storageStatics, data) {
    var hash, length;
    return _regenerator["default"].wrap(function _callee9$(_context9) {
      while (1) {
        switch (_context9.prev = _context9.next) {
          case 0:
            _context9.next = 2;
            return storageStatics.hash(data);

          case 2:
            hash = _context9.sent;
            length = _util.blobBufferUtil.size(data);
            return _context9.abrupt("return", {
              digest: hash,
              length: length
            });

          case 5:
          case "end":
            return _context9.stop();
        }
      }
    }, _callee9);
  }));
  return _getAttachmentDataMeta.apply(this, arguments);
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
        var _this3 = this;

        return this._dataSync$.pipe((0, _operators.map)(function (data) {
          if (!data['_attachments']) {
            return {};
          }

          return data['_attachments'];
        }), (0, _operators.map)(function (attachmentsData) {
          return Object.entries(attachmentsData);
        }), (0, _operators.map)(function (entries) {
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
exports.prototypes = prototypes;
var overwritable = {};
exports.overwritable = overwritable;
var hooks = {
  preMigrateDocument: preMigrateDocument,
  postMigrateDocument: postMigrateDocument
};
exports.hooks = hooks;
var RxDBAttachmentsPlugin = {
  name: 'attachments',
  rxdb: rxdb,
  prototypes: prototypes,
  overwritable: overwritable,
  hooks: hooks
};
exports.RxDBAttachmentsPlugin = RxDBAttachmentsPlugin;
//# sourceMappingURL=attachments.js.map