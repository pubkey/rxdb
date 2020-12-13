"use strict";

var _interopRequireDefault = require("@babel/runtime/helpers/interopRequireDefault");

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.fromPouchDocument = fromPouchDocument;
exports.putAttachment = putAttachment;
exports.getAttachment = getAttachment;
exports.allAttachments = allAttachments;
exports.preMigrateDocument = preMigrateDocument;
exports.postMigrateDocument = postMigrateDocument;
exports.RxDBAttachmentsPlugin = exports.hooks = exports.overwritable = exports.prototypes = exports.rxdb = exports.RxAttachment = exports.blobBufferUtil = void 0;

var _regenerator = _interopRequireDefault(require("@babel/runtime/regenerator"));

var _asyncToGenerator2 = _interopRequireDefault(require("@babel/runtime/helpers/asyncToGenerator"));

var _operators = require("rxjs/operators");

var _rxChangeEvent = require("./../rx-change-event");

var _util = require("./../util");

var _rxError = require("../rx-error");

var _pouchDb = require("../pouch-db");

function ensureSchemaSupportsAttachments(doc) {
  var schemaJson = doc.collection.schema.jsonSchema;

  if (!schemaJson.attachments) {
    throw (0, _rxError.newRxError)('AT1', {
      link: 'https://pubkey.github.io/rxdb/rx-attachment.html'
    });
  }
}

function resyncRxDocument(doc) {
  var startTime = (0, _util.now)();
  return doc.collection.pouch.get(doc.primary).then(function (docDataFromPouch) {
    var data = doc.collection._handleFromPouch(docDataFromPouch);

    var endTime = (0, _util.now)();
    var changeEvent = (0, _rxChangeEvent.createUpdateEvent)(doc.collection, data, null, startTime, endTime, doc);
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
  return !!doc.collection.schema.jsonSchema.attachments.encrypted;
}

function putAttachment(_x) {
  return _putAttachment.apply(this, arguments);
}
/**
 * get an attachment of the document by its id
 */


function _putAttachment() {
  _putAttachment = (0, _asyncToGenerator2["default"])( /*#__PURE__*/_regenerator["default"].mark(function _callee2(_ref3) {
    var _this5 = this;

    var id,
        data,
        _ref3$type,
        type,
        skipIfSame,
        blobBuffer,
        _args2 = arguments;

    return _regenerator["default"].wrap(function _callee2$(_context2) {
      while (1) {
        switch (_context2.prev = _context2.next) {
          case 0:
            id = _ref3.id, data = _ref3.data, _ref3$type = _ref3.type, type = _ref3$type === void 0 ? 'text/plain' : _ref3$type;
            skipIfSame = _args2.length > 1 && _args2[1] !== undefined ? _args2[1] : false;
            ensureSchemaSupportsAttachments(this);

            if (shouldEncrypt(this)) {
              data = this.collection._crypter._encryptValue(data);
            }

            blobBuffer = blobBufferUtil.createBlobBuffer(data, type);
            this._atomicQueue = this._atomicQueue.then( /*#__PURE__*/(0, _asyncToGenerator2["default"])( /*#__PURE__*/_regenerator["default"].mark(function _callee() {
              var currentMeta, newHash;
              return _regenerator["default"].wrap(function _callee$(_context) {
                while (1) {
                  switch (_context.prev = _context.next) {
                    case 0:
                      if (!(skipIfSame && _this5._data._attachments && _this5._data._attachments[id])) {
                        _context.next = 7;
                        break;
                      }

                      currentMeta = _this5._data._attachments[id];
                      _context.next = 4;
                      return (0, _pouchDb.pouchAttachmentBinaryHash)(data);

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
  var _this3 = this;

  ensureSchemaSupportsAttachments(this);

  var docData = this._dataSync$.getValue(); // if there are no attachments, the field is missing


  if (!docData._attachments) return [];
  return Object.keys(docData._attachments).map(function (id) {
    return fromPouchDocument(id, docData._attachments[id], _this3);
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
        var _this4 = this;

        return this._dataSync$.pipe((0, _operators.map)(function (data) {
          if (!data['_attachments']) return {};
          return data['_attachments'];
        }), (0, _operators.map)(function (attachmentsData) {
          return Object.entries(attachmentsData);
        }), (0, _operators.map)(function (entries) {
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