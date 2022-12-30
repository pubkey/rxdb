"use strict";

var _interopRequireDefault = require("@babel/runtime/helpers/interopRequireDefault");
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
var _regenerator = _interopRequireDefault(require("@babel/runtime/regenerator"));
var _asyncToGenerator2 = _interopRequireDefault(require("@babel/runtime/helpers/asyncToGenerator"));
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
    var _this = this;
    return this.doc.collection.incrementalWriteQueue.addWrite(this.doc._data, function (docWriteData) {
      delete docWriteData._attachments[_this.id];
      return docWriteData;
    }).then(function () {});
  }

  /**
   * returns the data for the attachment
   */;
  _proto.getData =
  /*#__PURE__*/
  function () {
    var _getData = (0, _asyncToGenerator2["default"])( /*#__PURE__*/_regenerator["default"].mark(function _callee() {
      var plainDataBase64, ret;
      return _regenerator["default"].wrap(function _callee$(_context) {
        while (1) switch (_context.prev = _context.next) {
          case 0:
            _context.next = 2;
            return this.doc.collection.storageInstance.getAttachmentData(this.doc.primary, this.id);
          case 2:
            plainDataBase64 = _context.sent;
            _context.next = 5;
            return _utils.blobBufferUtil.createBlobBufferFromBase64(plainDataBase64, this.type);
          case 5:
            ret = _context.sent;
            return _context.abrupt("return", ret);
          case 7:
          case "end":
            return _context.stop();
        }
      }, _callee, this);
    }));
    function getData() {
      return _getData.apply(this, arguments);
    }
    return getData;
  }();
  _proto.getStringData = /*#__PURE__*/function () {
    var _getStringData = (0, _asyncToGenerator2["default"])( /*#__PURE__*/_regenerator["default"].mark(function _callee2() {
      var data, asString;
      return _regenerator["default"].wrap(function _callee2$(_context2) {
        while (1) switch (_context2.prev = _context2.next) {
          case 0:
            _context2.next = 2;
            return this.getData();
          case 2:
            data = _context2.sent;
            _context2.next = 5;
            return _utils.blobBufferUtil.toString(data);
          case 5:
            asString = _context2.sent;
            return _context2.abrupt("return", asString);
          case 7:
          case "end":
            return _context2.stop();
        }
      }, _callee2, this);
    }));
    function getStringData() {
      return _getStringData.apply(this, arguments);
    }
    return getStringData;
  }();
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
function putAttachment(_x) {
  return _putAttachment.apply(this, arguments);
}
/**
 * get an attachment of the document by its id
 */
function _putAttachment() {
  _putAttachment = (0, _asyncToGenerator2["default"])( /*#__PURE__*/_regenerator["default"].mark(function _callee3(attachmentData) {
    var _this4 = this;
    var dataSize, dataString, id, type, data;
    return _regenerator["default"].wrap(function _callee3$(_context3) {
      while (1) switch (_context3.prev = _context3.next) {
        case 0:
          ensureSchemaSupportsAttachments(this);
          dataSize = _utils.blobBufferUtil.size(attachmentData.data);
          _context3.next = 4;
          return _utils.blobBufferUtil.toBase64String(attachmentData.data);
        case 4:
          dataString = _context3.sent;
          id = attachmentData.id;
          type = attachmentData.type;
          data = dataString;
          return _context3.abrupt("return", this.collection.incrementalWriteQueue.addWrite(this._data, function (docWriteData) {
            docWriteData._attachments = (0, _utils.flatClone)(docWriteData._attachments);
            docWriteData._attachments[id] = {
              length: dataSize,
              type: type,
              data: data
            };
            return docWriteData;
          }).then(function (writeResult) {
            var newDocument = _this4.collection._docCache.getCachedRxDocument(writeResult);
            var attachmentDataOfId = writeResult._attachments[id];
            var attachment = fromStorageInstanceResult(id, attachmentDataOfId, newDocument);
            return attachment;
          }));
        case 9:
        case "end":
          return _context3.stop();
      }
    }, _callee3, this);
  }));
  return _putAttachment.apply(this, arguments);
}
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
  var _this2 = this;
  ensureSchemaSupportsAttachments(this);
  var docData = this._data;

  // if there are no attachments, the field is missing
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
  _preMigrateDocument = (0, _asyncToGenerator2["default"])( /*#__PURE__*/_regenerator["default"].mark(function _callee5(data) {
    var attachments, newAttachments;
    return _regenerator["default"].wrap(function _callee5$(_context5) {
      while (1) switch (_context5.prev = _context5.next) {
        case 0:
          attachments = data.docData._attachments;
          if (!attachments) {
            _context5.next = 6;
            break;
          }
          newAttachments = {};
          _context5.next = 5;
          return Promise.all(Object.keys(attachments).map( /*#__PURE__*/function () {
            var _ref4 = (0, _asyncToGenerator2["default"])( /*#__PURE__*/_regenerator["default"].mark(function _callee4(attachmentId) {
              var attachment, docPrimary, rawAttachmentData;
              return _regenerator["default"].wrap(function _callee4$(_context4) {
                while (1) switch (_context4.prev = _context4.next) {
                  case 0:
                    attachment = attachments[attachmentId];
                    docPrimary = data.docData[data.oldCollection.schema.primaryPath];
                    _context4.next = 4;
                    return data.oldCollection.storageInstance.getAttachmentData(docPrimary, attachmentId);
                  case 4:
                    rawAttachmentData = _context4.sent;
                    newAttachments[attachmentId] = {
                      length: attachment.length,
                      type: attachment.type,
                      data: rawAttachmentData
                    };
                  case 6:
                  case "end":
                    return _context4.stop();
                }
              }, _callee4);
            }));
            return function (_x3) {
              return _ref4.apply(this, arguments);
            };
          }()));
        case 5:
          /**
           * Hooks mutate the input
           * instead of returning stuff
           */
          data.docData._attachments = newAttachments;
        case 6:
        case "end":
          return _context5.stop();
      }
    }, _callee5);
  }));
  return _preMigrateDocument.apply(this, arguments);
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
    RxDocument: function RxDocument(proto) {
      proto.putAttachment = putAttachment;
      proto.getAttachment = getAttachment;
      proto.allAttachments = allAttachments;
      Object.defineProperty(proto, 'allAttachments$', {
        get: function allAttachments$() {
          var _this3 = this;
          return this.$.pipe((0, _operators.map)(function (data) {
            return Object.entries(data._attachments);
          }), (0, _operators.map)(function (entries) {
            return entries.map(function (_ref3) {
              var id = _ref3[0],
                attachmentData = _ref3[1];
              return fromStorageInstanceResult(id, attachmentData, _this3);
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