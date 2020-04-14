import _regeneratorRuntime from "@babel/runtime/regenerator";
import _asyncToGenerator from "@babel/runtime/helpers/asyncToGenerator";
import { LOCAL_PREFIX } from '../../util';
import { PLUGIN_IDENT, getDocFromPouchOrNull, wasRevisionfromPullReplication } from './helper';

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
  return LOCAL_PREFIX + PLUGIN_IDENT + '-push-checkpoint-' + endpointHash;
};
/**
 * @return last sequence checkpoint
 */


export function getLastPushSequence(_x, _x2) {
  return _getLastPushSequence.apply(this, arguments);
}

function _getLastPushSequence() {
  _getLastPushSequence = _asyncToGenerator( /*#__PURE__*/_regeneratorRuntime.mark(function _callee(collection, endpointHash) {
    var doc;
    return _regeneratorRuntime.wrap(function _callee$(_context) {
      while (1) {
        switch (_context.prev = _context.next) {
          case 0:
            _context.next = 2;
            return getDocFromPouchOrNull(collection, pushSequenceId(endpointHash));

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

export function setLastPushSequence(_x3, _x4, _x5) {
  return _setLastPushSequence.apply(this, arguments);
}

function _setLastPushSequence() {
  _setLastPushSequence = _asyncToGenerator( /*#__PURE__*/_regeneratorRuntime.mark(function _callee2(collection, endpointHash, seq) {
    var _id, doc, res;

    return _regeneratorRuntime.wrap(function _callee2$(_context2) {
      while (1) {
        switch (_context2.prev = _context2.next) {
          case 0:
            _id = pushSequenceId(endpointHash);
            _context2.next = 3;
            return getDocFromPouchOrNull(collection, _id);

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

export function getChangesSinceLastPushSequence(_x6, _x7, _x8) {
  return _getChangesSinceLastPushSequence.apply(this, arguments);
} //
// things for pull-checkpoint
//

function _getChangesSinceLastPushSequence() {
  _getChangesSinceLastPushSequence = _asyncToGenerator( /*#__PURE__*/_regeneratorRuntime.mark(function _callee3(collection, endpointHash, lastPulledRevField) {
    var batchSize,
        syncRevisions,
        lastPushSequence,
        retry,
        changes,
        filteredResults,
        useResults,
        docsSearch,
        bulkGetDocs,
        _args3 = arguments;
    return _regeneratorRuntime.wrap(function _callee3$(_context3) {
      while (1) {
        switch (_context3.prev = _context3.next) {
          case 0:
            batchSize = _args3.length > 3 && _args3[3] !== undefined ? _args3[3] : 10;
            syncRevisions = _args3.length > 4 && _args3[4] !== undefined ? _args3[4] : false;
            _context3.next = 4;
            return getLastPushSequence(collection, endpointHash);

          case 4:
            lastPushSequence = _context3.sent;
            retry = true;

          case 6:
            if (!retry) {
              _context3.next = 21;
              break;
            }

            _context3.next = 9;
            return collection.pouch.changes({
              since: lastPushSequence,
              limit: batchSize,
              include_docs: true // style: 'all_docs'

            });

          case 9:
            changes = _context3.sent;
            filteredResults = changes.results.filter(function (change) {
              /**
               * filter out changes with revisions resulting from the pull-stream
               * so that they will not be upstreamed again
               */
              if (wasRevisionfromPullReplication(endpointHash, change.doc._rev)) return false;
              if (change.doc[lastPulledRevField] === change.doc._rev) return false;
              /**
               * filter out internal docs
               * that are used for views or indexes in pouchdb
               */

              if (change.id.startsWith('_design/')) return false;
              return true;
            });
            useResults = filteredResults;

            if (!(filteredResults.length > 0 && syncRevisions)) {
              _context3.next = 18;
              break;
            }

            docsSearch = filteredResults.map(function (result) {
              return {
                id: result.id,
                rev: result.doc._rev
              };
            });
            _context3.next = 16;
            return collection.pouch.bulkGet({
              docs: docsSearch,
              revs: true,
              latest: true
            });

          case 16:
            bulkGetDocs = _context3.sent;
            useResults = bulkGetDocs.results.map(function (result) {
              return {
                id: result.id,
                doc: result.docs[0]['ok'],
                deleted: result.docs[0]['ok']._deleted
              };
            });

          case 18:
            if (useResults.length === 0 && changes.results.length === batchSize) {
              // no pushable docs found but also not reached the end -> re-run
              lastPushSequence = changes.last_seq;
              retry = true;
            } else {
              changes.results = useResults;
              retry = false;
            }

            _context3.next = 6;
            break;

          case 21:
            changes.results.forEach(function (change) {
              change.doc = collection._handleFromPouch(change.doc);
            });
            return _context3.abrupt("return", changes);

          case 23:
          case "end":
            return _context3.stop();
        }
      }
    }, _callee3);
  }));
  return _getChangesSinceLastPushSequence.apply(this, arguments);
}

var pullLastDocumentId = function pullLastDocumentId(endpointHash) {
  return LOCAL_PREFIX + PLUGIN_IDENT + '-pull-checkpoint-' + endpointHash;
};

export function getLastPullDocument(_x9, _x10) {
  return _getLastPullDocument.apply(this, arguments);
}

function _getLastPullDocument() {
  _getLastPullDocument = _asyncToGenerator( /*#__PURE__*/_regeneratorRuntime.mark(function _callee4(collection, endpointHash) {
    var localDoc;
    return _regeneratorRuntime.wrap(function _callee4$(_context4) {
      while (1) {
        switch (_context4.prev = _context4.next) {
          case 0:
            _context4.next = 2;
            return getDocFromPouchOrNull(collection, pullLastDocumentId(endpointHash));

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

export function setLastPullDocument(_x11, _x12, _x13) {
  return _setLastPullDocument.apply(this, arguments);
}

function _setLastPullDocument() {
  _setLastPullDocument = _asyncToGenerator( /*#__PURE__*/_regeneratorRuntime.mark(function _callee5(collection, endpointHash, doc) {
    var _id, localDoc;

    return _regeneratorRuntime.wrap(function _callee5$(_context5) {
      while (1) {
        switch (_context5.prev = _context5.next) {
          case 0:
            _id = pullLastDocumentId(endpointHash);
            _context5.next = 3;
            return getDocFromPouchOrNull(collection, _id);

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