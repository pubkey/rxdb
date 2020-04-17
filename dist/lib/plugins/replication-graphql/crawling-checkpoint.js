"use strict";

var _interopRequireDefault = require("@babel/runtime/helpers/interopRequireDefault");

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.getLastPushSequence = getLastPushSequence;
exports.setLastPushSequence = setLastPushSequence;
exports.getChangesSinceLastPushSequence = getChangesSinceLastPushSequence;
exports.getLastPullDocument = getLastPullDocument;
exports.setLastPullDocument = setLastPullDocument;

var _regenerator = _interopRequireDefault(require("@babel/runtime/regenerator"));

var _asyncToGenerator2 = _interopRequireDefault(require("@babel/runtime/helpers/asyncToGenerator"));

var _util = require("../../util");

var _helper = require("./helper");

/**
 * when the replication starts,
 * we need a way to find out where it ended the last time.
 *
 * For push-replication, we use the pouchdb-sequence:
 * We get the documents newer then the last sequence-id
 * and push them to the server.
 *
 * For pull-replication, we use the last document we got from the server:
 * We send the last document to the queryBuilder()
 * and recieve newer documents sorted in a batch
 */
//
// things for the push-checkpoint
//
var pushSequenceId = function pushSequenceId(endpointHash) {
  return _util.LOCAL_PREFIX + _helper.PLUGIN_IDENT + '-push-checkpoint-' + endpointHash;
};
/**
 * @return last sequence checkpoint
 */


function getLastPushSequence(_x, _x2) {
  return _getLastPushSequence.apply(this, arguments);
}

function _getLastPushSequence() {
  _getLastPushSequence = (0, _asyncToGenerator2["default"])( /*#__PURE__*/_regenerator["default"].mark(function _callee(collection, endpointHash) {
    var doc;
    return _regenerator["default"].wrap(function _callee$(_context) {
      while (1) {
        switch (_context.prev = _context.next) {
          case 0:
            _context.next = 2;
            return (0, _helper.getDocFromPouchOrNull)(collection, pushSequenceId(endpointHash));

          case 2:
            doc = _context.sent;

            if (doc) {
              _context.next = 7;
              break;
            }

            return _context.abrupt("return", 0);

          case 7:
            return _context.abrupt("return", doc.value);

          case 8:
          case "end":
            return _context.stop();
        }
      }
    }, _callee);
  }));
  return _getLastPushSequence.apply(this, arguments);
}

function setLastPushSequence(_x3, _x4, _x5) {
  return _setLastPushSequence.apply(this, arguments);
}

function _setLastPushSequence() {
  _setLastPushSequence = (0, _asyncToGenerator2["default"])( /*#__PURE__*/_regenerator["default"].mark(function _callee2(collection, endpointHash, seq) {
    var _id, doc, res;

    return _regenerator["default"].wrap(function _callee2$(_context2) {
      while (1) {
        switch (_context2.prev = _context2.next) {
          case 0:
            _id = pushSequenceId(endpointHash);
            _context2.next = 3;
            return (0, _helper.getDocFromPouchOrNull)(collection, _id);

          case 3:
            doc = _context2.sent;

            if (!doc) {
              doc = {
                _id: _id,
                value: seq
              };
            } else {
              doc.value = seq;
            }

            _context2.next = 7;
            return collection.pouch.put(doc);

          case 7:
            res = _context2.sent;
            return _context2.abrupt("return", res);

          case 9:
          case "end":
            return _context2.stop();
        }
      }
    }, _callee2);
  }));
  return _setLastPushSequence.apply(this, arguments);
}

function getChangesSinceLastPushSequence(_x6, _x7) {
  return _getChangesSinceLastPushSequence.apply(this, arguments);
} //
// things for pull-checkpoint
//


function _getChangesSinceLastPushSequence() {
  _getChangesSinceLastPushSequence = (0, _asyncToGenerator2["default"])( /*#__PURE__*/_regenerator["default"].mark(function _callee3(collection, endpointHash) {
    var batchSize,
        lastPushSequence,
        retry,
        changes,
        useResults,
        _args3 = arguments;
    return _regenerator["default"].wrap(function _callee3$(_context3) {
      while (1) {
        switch (_context3.prev = _context3.next) {
          case 0:
            batchSize = _args3.length > 2 && _args3[2] !== undefined ? _args3[2] : 10;
            _context3.next = 3;
            return getLastPushSequence(collection, endpointHash);

          case 3:
            lastPushSequence = _context3.sent;
            retry = true;

          case 5:
            if (!retry) {
              _context3.next = 13;
              break;
            }

            _context3.next = 8;
            return collection.pouch.changes({
              since: lastPushSequence,
              limit: batchSize,
              include_docs: true
            });

          case 8:
            changes = _context3.sent;
            useResults = changes.results.filter(function (change) {
              /**
               * filter out changes with revisions resulting from the pull-stream
               * so that they will not be upstreamed again
               */
              if ((0, _helper.wasRevisionfromPullReplication)(endpointHash, change.doc._rev)) return false;
              /**
               * filter out internal docs
               * that are used for views or indexes in pouchdb
               */

              if (change.id.startsWith('_design/')) return false;
              return true;
            });

            if (useResults.length === 0 && changes.results.length === batchSize) {
              // no pushable docs found but also not reached the end -> re-run
              lastPushSequence = changes.last_seq;
              retry = true;
            } else {
              changes.results = useResults;
              retry = false;
            }

            _context3.next = 5;
            break;

          case 13:
            changes.results.forEach(function (change) {
              change.doc = collection._handleFromPouch(change.doc);
            });
            return _context3.abrupt("return", changes);

          case 15:
          case "end":
            return _context3.stop();
        }
      }
    }, _callee3);
  }));
  return _getChangesSinceLastPushSequence.apply(this, arguments);
}

var pullLastDocumentId = function pullLastDocumentId(endpointHash) {
  return _util.LOCAL_PREFIX + _helper.PLUGIN_IDENT + '-pull-checkpoint-' + endpointHash;
};

function getLastPullDocument(_x8, _x9) {
  return _getLastPullDocument.apply(this, arguments);
}

function _getLastPullDocument() {
  _getLastPullDocument = (0, _asyncToGenerator2["default"])( /*#__PURE__*/_regenerator["default"].mark(function _callee4(collection, endpointHash) {
    var localDoc;
    return _regenerator["default"].wrap(function _callee4$(_context4) {
      while (1) {
        switch (_context4.prev = _context4.next) {
          case 0:
            _context4.next = 2;
            return (0, _helper.getDocFromPouchOrNull)(collection, pullLastDocumentId(endpointHash));

          case 2:
            localDoc = _context4.sent;

            if (localDoc) {
              _context4.next = 7;
              break;
            }

            return _context4.abrupt("return", null);

          case 7:
            return _context4.abrupt("return", localDoc.doc);

          case 8:
          case "end":
            return _context4.stop();
        }
      }
    }, _callee4);
  }));
  return _getLastPullDocument.apply(this, arguments);
}

function setLastPullDocument(_x10, _x11, _x12) {
  return _setLastPullDocument.apply(this, arguments);
}

function _setLastPullDocument() {
  _setLastPullDocument = (0, _asyncToGenerator2["default"])( /*#__PURE__*/_regenerator["default"].mark(function _callee5(collection, endpointHash, doc) {
    var _id, localDoc;

    return _regenerator["default"].wrap(function _callee5$(_context5) {
      while (1) {
        switch (_context5.prev = _context5.next) {
          case 0:
            _id = pullLastDocumentId(endpointHash);
            _context5.next = 3;
            return (0, _helper.getDocFromPouchOrNull)(collection, _id);

          case 3:
            localDoc = _context5.sent;

            if (!localDoc) {
              localDoc = {
                _id: _id,
                doc: doc
              };
            } else {
              localDoc.doc = doc;
            }

            return _context5.abrupt("return", collection.pouch.put(localDoc));

          case 6:
          case "end":
            return _context5.stop();
        }
      }
    }, _callee5);
  }));
  return _setLastPullDocument.apply(this, arguments);
}

//# sourceMappingURL=crawling-checkpoint.js.map