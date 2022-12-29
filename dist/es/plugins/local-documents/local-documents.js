import _asyncToGenerator from "@babel/runtime/helpers/asyncToGenerator";
import _regeneratorRuntime from "@babel/runtime/regenerator";
import { getDefaultRevision, getDefaultRxDocumentMeta } from '../../util';
import { filter, map, startWith, mergeMap } from 'rxjs/operators';
import { getLocalDocStateByParent } from './local-documents-helper';
import { getSingleDocument, writeSingle } from '../../rx-storage-helper';

/**
 * save the local-document-data
 * throws if already exists
 */
export function insertLocal(_x, _x2) {
  return _insertLocal.apply(this, arguments);
}

/**
 * save the local-document-data
 * overwrites existing if exists
 */
function _insertLocal() {
  _insertLocal = _asyncToGenerator( /*#__PURE__*/_regeneratorRuntime.mark(function _callee3(id, data) {
    var state, docData;
    return _regeneratorRuntime.wrap(function _callee3$(_context3) {
      while (1) switch (_context3.prev = _context3.next) {
        case 0:
          _context3.next = 2;
          return getLocalDocStateByParent(this);
        case 2:
          state = _context3.sent;
          // create new one
          docData = {
            id: id,
            data: data,
            _deleted: false,
            _meta: getDefaultRxDocumentMeta(),
            _rev: getDefaultRevision(),
            _attachments: {}
          };
          return _context3.abrupt("return", writeSingle(state.storageInstance, {
            document: docData
          }, 'local-document-insert').then(function (newDocData) {
            return state.docCache.getCachedRxDocument(newDocData);
          }));
        case 5:
        case "end":
          return _context3.stop();
      }
    }, _callee3, this);
  }));
  return _insertLocal.apply(this, arguments);
}
export function upsertLocal(id, data) {
  var _this = this;
  return this.getLocal(id).then(function (existing) {
    if (!existing) {
      // create new one
      var docPromise = _this.insertLocal(id, data);
      return docPromise;
    } else {
      // update existing
      return existing.incrementalModify(function () {
        return data;
      });
    }
  });
}
export function getLocal(_x3) {
  return _getLocal.apply(this, arguments);
}
function _getLocal() {
  _getLocal = _asyncToGenerator( /*#__PURE__*/_regeneratorRuntime.mark(function _callee4(id) {
    var state, docCache, found;
    return _regeneratorRuntime.wrap(function _callee4$(_context4) {
      while (1) switch (_context4.prev = _context4.next) {
        case 0:
          _context4.next = 2;
          return getLocalDocStateByParent(this);
        case 2:
          state = _context4.sent;
          docCache = state.docCache; // check in doc-cache
          found = docCache.getLatestDocumentDataIfExists(id);
          if (!found) {
            _context4.next = 7;
            break;
          }
          return _context4.abrupt("return", Promise.resolve(docCache.getCachedRxDocument(found)));
        case 7:
          return _context4.abrupt("return", getSingleDocument(state.storageInstance, id).then(function (docData) {
            if (!docData) {
              return null;
            }
            return state.docCache.getCachedRxDocument(docData);
          }));
        case 8:
        case "end":
          return _context4.stop();
      }
    }, _callee4, this);
  }));
  return _getLocal.apply(this, arguments);
}
export function getLocal$(id) {
  var _this2 = this;
  return this.$.pipe(startWith(null), mergeMap( /*#__PURE__*/function () {
    var _ref = _asyncToGenerator( /*#__PURE__*/_regeneratorRuntime.mark(function _callee(cE) {
      var doc;
      return _regeneratorRuntime.wrap(function _callee$(_context) {
        while (1) switch (_context.prev = _context.next) {
          case 0:
            if (!cE) {
              _context.next = 4;
              break;
            }
            return _context.abrupt("return", {
              changeEvent: cE
            });
          case 4:
            _context.next = 6;
            return _this2.getLocal(id);
          case 6:
            doc = _context.sent;
            return _context.abrupt("return", {
              doc: doc
            });
          case 8:
          case "end":
            return _context.stop();
        }
      }, _callee);
    }));
    return function (_x4) {
      return _ref.apply(this, arguments);
    };
  }()), mergeMap( /*#__PURE__*/function () {
    var _ref2 = _asyncToGenerator( /*#__PURE__*/_regeneratorRuntime.mark(function _callee2(changeEventOrDoc) {
      var cE, doc;
      return _regeneratorRuntime.wrap(function _callee2$(_context2) {
        while (1) switch (_context2.prev = _context2.next) {
          case 0:
            if (!changeEventOrDoc.changeEvent) {
              _context2.next = 12;
              break;
            }
            cE = changeEventOrDoc.changeEvent;
            if (!(!cE.isLocal || cE.documentId !== id)) {
              _context2.next = 6;
              break;
            }
            return _context2.abrupt("return", {
              use: false
            });
          case 6:
            _context2.next = 8;
            return _this2.getLocal(id);
          case 8:
            doc = _context2.sent;
            return _context2.abrupt("return", {
              use: true,
              doc: doc
            });
          case 10:
            _context2.next = 13;
            break;
          case 12:
            return _context2.abrupt("return", {
              use: true,
              doc: changeEventOrDoc.doc
            });
          case 13:
          case "end":
            return _context2.stop();
        }
      }, _callee2);
    }));
    return function (_x5) {
      return _ref2.apply(this, arguments);
    };
  }()), filter(function (filterFlagged) {
    return filterFlagged.use;
  }), map(function (filterFlagged) {
    return filterFlagged.doc;
  }));
}
//# sourceMappingURL=local-documents.js.map