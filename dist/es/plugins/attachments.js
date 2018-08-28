import _regeneratorRuntime from "@babel/runtime/regenerator";
import _asyncToGenerator from "@babel/runtime/helpers/asyncToGenerator";
import { map } from 'rxjs/operators';
import RxChangeEvent from './../rx-change-event';
import { nextTick, isElectronRenderer } from './../util';
import RxError from '../rx-error';

function ensureSchemaSupportsAttachments(doc) {
  var schemaJson = doc.collection.schema.jsonID;

  if (!schemaJson.attachments) {
    throw RxError.newRxError('AT1', {
      link: 'https://pubkey.github.io/rxdb/rx-attachment.html'
    });
  }
}

function resyncRxDocument(doc) {
  return doc.collection.pouch.get(doc.primary).then(function (docData) {
    var data = doc.collection._handleFromPouch(docData);

    var changeEvent = RxChangeEvent.create('UPDATE', doc.collection.database, doc.collection, doc, data);
    doc.$emit(changeEvent);
  });
}

export var blobBufferUtil = {
  /**
   * depending if we are on node or browser,
   * we have to use Buffer(node) or Blob(browser)
   * @param  {string} data
   * @param  {string} type
   * @return {Blob|Buffer}
   */
  createBlobBuffer: function createBlobBuffer(data, type) {
    var blobBuffer;

    if (isElectronRenderer) {
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
      return nextTick().then(function () {
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
      reader.readAsText(blobBuffer);
    });
  }
};

var _assignMethodsToAttachment = function _assignMethodsToAttachment(attachment) {
  Object.entries(attachment.doc.collection._attachments).forEach(function (_ref) {
    var funName = _ref[0],
        fun = _ref[1];
    return attachment.__defineGetter__(funName, function () {
      return fun.bind(attachment);
    });
  });
};
/**
 * an RxAttachment is basically just the attachment-stub
 * wrapped so that you can access the attachment-data
 */


export var RxAttachment =
/*#__PURE__*/
function () {
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

  _proto.remove =
  /*#__PURE__*/
  function () {
    var _remove = _asyncToGenerator(
    /*#__PURE__*/
    _regeneratorRuntime.mark(function _callee() {
      return _regeneratorRuntime.wrap(function _callee$(_context) {
        while (1) {
          switch (_context.prev = _context.next) {
            case 0:
              _context.next = 2;
              return this.doc.collection.pouch.removeAttachment(this.doc.primary, this.id, this.doc._data._rev);

            case 2:
              _context.next = 4;
              return resyncRxDocument(this.doc);

            case 4:
            case "end":
              return _context.stop();
          }
        }
      }, _callee, this);
    }));

    return function remove() {
      return _remove.apply(this, arguments);
    };
  }();
  /**
   * returns the data for the attachment
   * @return {Promise<Buffer|Blob>}
   */


  _proto.getData =
  /*#__PURE__*/
  function () {
    var _getData = _asyncToGenerator(
    /*#__PURE__*/
    _regeneratorRuntime.mark(function _callee2() {
      var data, dataString;
      return _regeneratorRuntime.wrap(function _callee2$(_context2) {
        while (1) {
          switch (_context2.prev = _context2.next) {
            case 0:
              _context2.next = 2;
              return this.doc.collection.pouch.getAttachment(this.doc.primary, this.id);

            case 2:
              data = _context2.sent;

              if (!shouldEncrypt(this.doc)) {
                _context2.next = 8;
                break;
              }

              _context2.next = 6;
              return blobBufferUtil.toString(data);

            case 6:
              dataString = _context2.sent;
              data = blobBufferUtil.createBlobBuffer(this.doc.collection._crypter._decryptValue(dataString), this.type);

            case 8:
              return _context2.abrupt("return", data);

            case 9:
            case "end":
              return _context2.stop();
          }
        }
      }, _callee2, this);
    }));

    return function getData() {
      return _getData.apply(this, arguments);
    };
  }();

  _proto.getStringData =
  /*#__PURE__*/
  function () {
    var _getStringData = _asyncToGenerator(
    /*#__PURE__*/
    _regeneratorRuntime.mark(function _callee3() {
      var bufferBlob;
      return _regeneratorRuntime.wrap(function _callee3$(_context3) {
        while (1) {
          switch (_context3.prev = _context3.next) {
            case 0:
              _context3.next = 2;
              return this.getData();

            case 2:
              bufferBlob = _context3.sent;
              _context3.next = 5;
              return blobBufferUtil.toString(bufferBlob);

            case 5:
              return _context3.abrupt("return", _context3.sent);

            case 6:
            case "end":
              return _context3.stop();
          }
        }
      }, _callee3, this);
    }));

    return function getStringData() {
      return _getStringData.apply(this, arguments);
    };
  }();

  return RxAttachment;
}();

RxAttachment.fromPouchDocument = function (id, pouchDocAttachment, rxDocument) {
  return new RxAttachment({
    doc: rxDocument,
    id: id,
    type: pouchDocAttachment.content_type,
    length: pouchDocAttachment.length,
    digest: pouchDocAttachment.digest,
    rev: pouchDocAttachment.revpos
  });
};

function shouldEncrypt(doc) {
  return !!doc.collection.schema.jsonID.attachments.encrypted;
}
/**
 * @return {Promise}
 */


export function putAttachment(_ref3) {
  var _this = this;

  var id = _ref3.id,
      data = _ref3.data,
      _ref3$type = _ref3.type,
      type = _ref3$type === void 0 ? 'text/plain' : _ref3$type;
  ensureSchemaSupportsAttachments(this);
  if (shouldEncrypt(this)) data = this.collection._crypter._encryptValue(data);
  var blobBuffer = blobBufferUtil.createBlobBuffer(data, type);
  this._atomicQueue = this._atomicQueue.then(function () {
    return _this.collection.pouch.putAttachment(_this.primary, id, _this._data._rev, blobBuffer, type);
  }).then(function () {
    return _this.collection.pouch.get(_this.primary);
  }).then(function (docData) {
    var attachmentData = docData._attachments[id];
    var attachment = RxAttachment.fromPouchDocument(id, attachmentData, _this);
    _this._data._rev = docData._rev;
    _this._data._attachments = docData._attachments;
    return resyncRxDocument(_this).then(function () {
      return attachment;
    });
  });
  return this._atomicQueue;
}
/**
 * get an attachment of the document by its id
 * @param  {string} id
 * @return {RxAttachment}
 */

export function getAttachment(id) {
  ensureSchemaSupportsAttachments(this);

  var docData = this._dataSync$.getValue();

  if (!docData._attachments || !docData._attachments[id]) return null;
  var attachmentData = docData._attachments[id];
  var attachment = RxAttachment.fromPouchDocument(id, attachmentData, this);
  return attachment;
}
/**
 * returns all attachments of the document
 * @return {RxAttachment[]}
 */

export function allAttachments() {
  var _this2 = this;

  ensureSchemaSupportsAttachments(this);

  var docData = this._dataSync$.getValue();

  return Object.keys(docData._attachments).map(function (id) {
    return RxAttachment.fromPouchDocument(id, docData._attachments[id], _this2);
  });
}
export function preMigrateDocument(action) {
  delete action.migrated._attachments;
  return action;
}
export function postMigrateDocument(_x) {
  return _postMigrateDocument.apply(this, arguments);
}

function _postMigrateDocument() {
  _postMigrateDocument = _asyncToGenerator(
  /*#__PURE__*/
  _regeneratorRuntime.mark(function _callee4(action) {
    var primaryPath, attachments, id, stubData, primary, data, res;
    return _regeneratorRuntime.wrap(function _callee4$(_context4) {
      while (1) {
        switch (_context4.prev = _context4.next) {
          case 0:
            primaryPath = action.oldCollection.schema.primaryPath;
            attachments = action.doc._attachments;

            if (attachments) {
              _context4.next = 4;
              break;
            }

            return _context4.abrupt("return", action);

          case 4:
            _context4.t0 = _regeneratorRuntime.keys(attachments);

          case 5:
            if ((_context4.t1 = _context4.t0()).done) {
              _context4.next = 21;
              break;
            }

            id = _context4.t1.value;
            stubData = attachments[id];
            primary = action.doc[primaryPath];
            _context4.next = 11;
            return action.oldCollection.pouchdb.getAttachment(primary, id);

          case 11:
            data = _context4.sent;
            _context4.next = 14;
            return blobBufferUtil.toString(data);

          case 14:
            data = _context4.sent;
            _context4.next = 17;
            return action.newestCollection.pouch.putAttachment(primary, id, action.res.rev, blobBufferUtil.createBlobBuffer(data, stubData.content_type), stubData.content_type);

          case 17:
            res = _context4.sent;
            action.res = res;
            _context4.next = 5;
            break;

          case 21:
          case "end":
            return _context4.stop();
        }
      }
    }, _callee4, this);
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
          if (!data._attachments) return {};
          return data._attachments;
        }), map(function (attachmentsData) {
          return Object.entries(attachmentsData);
        }), map(function (entries) {
          return entries.map(function (_ref4) {
            var id = _ref4[0],
                attachmentData = _ref4[1];
            return RxAttachment.fromPouchDocument(id, attachmentData, _this3);
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
export default {
  rxdb: rxdb,
  prototypes: prototypes,
  overwritable: overwritable,
  hooks: hooks,
  blobBufferUtil: blobBufferUtil
};