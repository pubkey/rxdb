import _asyncToGenerator from "@babel/runtime/helpers/asyncToGenerator";
import _regeneratorRuntime from "@babel/runtime/regenerator";
import { wasRevisionfromPullReplication, GRAPHQL_REPLICATION_PLUGIN_IDENT } from './helper';
import { findLocalDocument, writeSingleLocal } from '../../rx-storage-helper';
import { flatClone } from '../../util';
import { newRxError } from '../../rx-error';
import { runPluginHooks } from '../../hooks';
/**
 * when the replication starts,
 * we need a way to find out where it ended the last time.
 *
 * For push-replication, we use the storageInstance-sequence:
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
  return GRAPHQL_REPLICATION_PLUGIN_IDENT + '-push-checkpoint-' + endpointHash;
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
            return collection.database.lockedRun(function () {
              return findLocalDocument(collection.localDocumentsStore, pushSequenceId(endpointHash));
            });

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
  _setLastPushSequence = _asyncToGenerator( /*#__PURE__*/_regeneratorRuntime.mark(function _callee2(collection, endpointHash, sequence) {
    var _id, doc, res, newDoc, _res;

    return _regeneratorRuntime.wrap(function _callee2$(_context2) {
      while (1) {
        switch (_context2.prev = _context2.next) {
          case 0:
            _id = pushSequenceId(endpointHash);
            _context2.next = 3;
            return collection.database.lockedRun(function () {
              return findLocalDocument(collection.localDocumentsStore, _id);
            });

          case 3:
            doc = _context2.sent;

            if (doc) {
              _context2.next = 11;
              break;
            }

            _context2.next = 7;
            return collection.database.lockedRun(function () {
              return writeSingleLocal(collection.localDocumentsStore, {
                document: {
                  _id: _id,
                  value: sequence,
                  _attachments: {}
                }
              });
            });

          case 7:
            res = _context2.sent;
            return _context2.abrupt("return", res);

          case 11:
            newDoc = flatClone(doc);
            newDoc.value = sequence;
            _context2.next = 15;
            return collection.database.lockedRun(function () {
              return writeSingleLocal(collection.localDocumentsStore, {
                previous: doc,
                document: {
                  _id: _id,
                  value: sequence,
                  _attachments: {}
                }
              });
            });

          case 15:
            _res = _context2.sent;
            return _context2.abrupt("return", _res);

          case 17:
          case "end":
            return _context2.stop();
        }
      }
    }, _callee2);
  }));
  return _setLastPushSequence.apply(this, arguments);
}

export function getChangesSinceLastPushSequence(_x6, _x7) {
  return _getChangesSinceLastPushSequence.apply(this, arguments);
} //
// things for pull-checkpoint
//

function _getChangesSinceLastPushSequence() {
  _getChangesSinceLastPushSequence = _asyncToGenerator( /*#__PURE__*/_regeneratorRuntime.mark(function _callee3(collection, endpointHash) {
    var batchSize,
        lastPushSequence,
        retry,
        lastSequence,
        changedDocs,
        _loop,
        _ret,
        _args4 = arguments;

    return _regeneratorRuntime.wrap(function _callee3$(_context4) {
      while (1) {
        switch (_context4.prev = _context4.next) {
          case 0:
            batchSize = _args4.length > 2 && _args4[2] !== undefined ? _args4[2] : 10;
            _context4.next = 3;
            return getLastPushSequence(collection, endpointHash);

          case 3:
            lastPushSequence = _context4.sent;
            retry = true;
            lastSequence = lastPushSequence;
            changedDocs = new Map();
            /**
             * it can happen that all docs in the batch
             * do not have to be replicated.
             * Then we have to continue grapping the feed
             * until we reach the end of it
             */

            _loop = /*#__PURE__*/_regeneratorRuntime.mark(function _loop() {
              var changesResults, plainDocs, docs;
              return _regeneratorRuntime.wrap(function _loop$(_context3) {
                while (1) {
                  switch (_context3.prev = _context3.next) {
                    case 0:
                      _context3.next = 2;
                      return collection.database.lockedRun(function () {
                        return collection.storageInstance.getChangedDocuments({
                          sinceSequence: lastPushSequence,
                          limit: batchSize,
                          direction: 'after'
                        });
                      });

                    case 2:
                      changesResults = _context3.sent;
                      lastSequence = changesResults.lastSequence; // optimisation shortcut, do not proceed if there are no changed documents

                      if (!(changesResults.changedDocuments.length === 0)) {
                        _context3.next = 7;
                        break;
                      }

                      retry = false;
                      return _context3.abrupt("return", "continue");

                    case 7:
                      _context3.next = 9;
                      return collection.database.lockedRun(function () {
                        return collection.storageInstance.findDocumentsById(changesResults.changedDocuments.map(function (row) {
                          return row.id;
                        }), true);
                      });

                    case 9:
                      plainDocs = _context3.sent;
                      docs = new Map();
                      Object.entries(plainDocs).forEach(function (_ref) {
                        var docId = _ref[0],
                            docData = _ref[1];
                        var hookParams = {
                          collection: collection,
                          doc: docData
                        };
                        runPluginHooks('postReadFromInstance', hookParams);
                        docs.set(docId, hookParams.doc);
                      });
                      changesResults.changedDocuments.forEach(function (row) {
                        var id = row.id;

                        if (changedDocs.has(id)) {
                          return;
                        }

                        var changedDoc = docs.get(id);

                        if (!changedDoc) {
                          throw newRxError('SNH', {
                            args: {
                              docs: docs
                            }
                          });
                        }
                        /**
                         * filter out changes with revisions resulting from the pull-stream
                         * so that they will not be upstreamed again
                         */


                        if (wasRevisionfromPullReplication(endpointHash, changedDoc._rev)) {
                          return false;
                        }

                        changedDocs.set(id, {
                          id: id,
                          doc: changedDoc,
                          sequence: row.sequence
                        });
                      });

                      if (changedDocs.size < batchSize && changesResults.changedDocuments.length === batchSize) {
                        // no pushable docs found but also not reached the end -> re-run
                        lastPushSequence = lastSequence;
                        retry = true;
                      } else {
                        retry = false;
                      }

                    case 14:
                    case "end":
                      return _context3.stop();
                  }
                }
              }, _loop);
            });

          case 8:
            if (!retry) {
              _context4.next = 15;
              break;
            }

            return _context4.delegateYield(_loop(), "t0", 10);

          case 10:
            _ret = _context4.t0;

            if (!(_ret === "continue")) {
              _context4.next = 13;
              break;
            }

            return _context4.abrupt("continue", 8);

          case 13:
            _context4.next = 8;
            break;

          case 15:
            return _context4.abrupt("return", {
              changedDocs: changedDocs,
              lastSequence: lastSequence
            });

          case 16:
          case "end":
            return _context4.stop();
        }
      }
    }, _callee3);
  }));
  return _getChangesSinceLastPushSequence.apply(this, arguments);
}

var pullLastDocumentId = function pullLastDocumentId(endpointHash) {
  return GRAPHQL_REPLICATION_PLUGIN_IDENT + '-pull-checkpoint-' + endpointHash;
};

export function getLastPullDocument(_x8, _x9) {
  return _getLastPullDocument.apply(this, arguments);
}

function _getLastPullDocument() {
  _getLastPullDocument = _asyncToGenerator( /*#__PURE__*/_regeneratorRuntime.mark(function _callee4(collection, endpointHash) {
    var localDoc;
    return _regeneratorRuntime.wrap(function _callee4$(_context5) {
      while (1) {
        switch (_context5.prev = _context5.next) {
          case 0:
            _context5.next = 2;
            return collection.database.lockedRun(function () {
              return findLocalDocument(collection.localDocumentsStore, pullLastDocumentId(endpointHash));
            });

          case 2:
            localDoc = _context5.sent;

            if (localDoc) {
              _context5.next = 7;
              break;
            }

            return _context5.abrupt("return", null);

          case 7:
            return _context5.abrupt("return", localDoc.doc);

          case 8:
          case "end":
            return _context5.stop();
        }
      }
    }, _callee4);
  }));
  return _getLastPullDocument.apply(this, arguments);
}

export function setLastPullDocument(_x10, _x11, _x12) {
  return _setLastPullDocument.apply(this, arguments);
}

function _setLastPullDocument() {
  _setLastPullDocument = _asyncToGenerator( /*#__PURE__*/_regeneratorRuntime.mark(function _callee5(collection, endpointHash, doc) {
    var _id, localDoc, newDoc;

    return _regeneratorRuntime.wrap(function _callee5$(_context6) {
      while (1) {
        switch (_context6.prev = _context6.next) {
          case 0:
            _id = pullLastDocumentId(endpointHash);
            _context6.next = 3;
            return collection.database.lockedRun(function () {
              return findLocalDocument(collection.localDocumentsStore, _id);
            });

          case 3:
            localDoc = _context6.sent;

            if (localDoc) {
              _context6.next = 8;
              break;
            }

            return _context6.abrupt("return", collection.database.lockedRun(function () {
              return writeSingleLocal(collection.localDocumentsStore, {
                document: {
                  _id: _id,
                  doc: doc,
                  _attachments: {}
                }
              });
            }));

          case 8:
            newDoc = flatClone(localDoc);
            newDoc.doc = doc;
            return _context6.abrupt("return", collection.database.lockedRun(function () {
              return writeSingleLocal(collection.localDocumentsStore, {
                previous: localDoc,
                document: newDoc
              });
            }));

          case 11:
          case "end":
            return _context6.stop();
        }
      }
    }, _callee5);
  }));
  return _setLastPullDocument.apply(this, arguments);
}
//# sourceMappingURL=crawling-checkpoint.js.map