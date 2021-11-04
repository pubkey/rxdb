import _asyncToGenerator from "@babel/runtime/helpers/asyncToGenerator";
import _regeneratorRuntime from "@babel/runtime/regenerator";
import { Subject } from 'rxjs';
import { newRxError } from '../../rx-error';
import { flatClone, getFromMapOrThrow, now, PROMISE_RESOLVE_VOID } from '../../util';
import { getEventKey, OPEN_POUCHDB_STORAGE_INSTANCES, POUCHDB_LOCAL_PREFIX, pouchStripLocalFlagFromPrimary } from './pouchdb-helper';
export var RxStorageKeyObjectInstancePouch = /*#__PURE__*/function () {
  function RxStorageKeyObjectInstancePouch(databaseName, collectionName, internals, options) {
    this.changes$ = new Subject();
    this.databaseName = databaseName;
    this.collectionName = collectionName;
    this.internals = internals;
    this.options = options;
    OPEN_POUCHDB_STORAGE_INSTANCES.add(this);
  }

  var _proto = RxStorageKeyObjectInstancePouch.prototype;

  _proto.close = function close() {
    OPEN_POUCHDB_STORAGE_INSTANCES["delete"](this); // TODO this did not work because a closed pouchdb cannot be recreated in the same process run
    // await this.internals.pouch.close();

    return PROMISE_RESOLVE_VOID;
  };

  _proto.remove = /*#__PURE__*/function () {
    var _remove = _asyncToGenerator( /*#__PURE__*/_regeneratorRuntime.mark(function _callee() {
      return _regeneratorRuntime.wrap(function _callee$(_context) {
        while (1) {
          switch (_context.prev = _context.next) {
            case 0:
              OPEN_POUCHDB_STORAGE_INSTANCES["delete"](this);
              _context.next = 3;
              return this.internals.pouch.destroy();

            case 3:
            case "end":
              return _context.stop();
          }
        }
      }, _callee, this);
    }));

    function remove() {
      return _remove.apply(this, arguments);
    }

    return remove;
  }();

  _proto.bulkWrite = /*#__PURE__*/function () {
    var _bulkWrite = _asyncToGenerator( /*#__PURE__*/_regeneratorRuntime.mark(function _callee2(documentWrites) {
      var _this = this;

      var writeRowById, insertDocs, startTime, pouchResult, endTime, ret;
      return _regeneratorRuntime.wrap(function _callee2$(_context2) {
        while (1) {
          switch (_context2.prev = _context2.next) {
            case 0:
              if (!(documentWrites.length === 0)) {
                _context2.next = 2;
                break;
              }

              throw newRxError('P2', {
                args: {
                  documentWrites: documentWrites
                }
              });

            case 2:
              writeRowById = new Map();
              insertDocs = documentWrites.map(function (writeRow) {
                writeRowById.set(writeRow.document._id, writeRow);
                var storeDocumentData = flatClone(writeRow.document);
                /**
                 * add local prefix
                 * Local documents always have _id as primary
                 */

                storeDocumentData._id = POUCHDB_LOCAL_PREFIX + storeDocumentData._id; // if previous document exists, we have to send the previous revision to pouchdb.

                if (writeRow.previous) {
                  storeDocumentData._rev = writeRow.previous._rev;
                }

                return storeDocumentData;
              });
              startTime = now();
              _context2.next = 7;
              return this.internals.pouch.bulkDocs(insertDocs);

            case 7:
              pouchResult = _context2.sent;
              endTime = now();
              ret = {
                success: new Map(),
                error: new Map()
              };
              pouchResult.forEach(function (resultRow) {
                resultRow.id = pouchStripLocalFlagFromPrimary(resultRow.id);
                var writeRow = getFromMapOrThrow(writeRowById, resultRow.id);

                if (resultRow.error) {
                  var err = {
                    isError: true,
                    status: 409,
                    documentId: resultRow.id,
                    writeRow: writeRow
                  };
                  ret.error.set(resultRow.id, err);
                } else {
                  var pushObj = flatClone(writeRow.document);
                  pushObj._rev = resultRow.rev; // local document cannot have attachments

                  pushObj._attachments = {};
                  ret.success.set(resultRow.id, pushObj);
                  /**
                   * Emit a write event to the changestream.
                   * We do this here and not by observing the internal pouchdb changes
                   * because here we have the previous document data and do
                   * not have to fill previous with 'UNKNOWN'.
                   */

                  var event;

                  if (!writeRow.previous) {
                    // was insert
                    event = {
                      operation: 'INSERT',
                      doc: pushObj,
                      id: resultRow.id,
                      previous: null
                    };
                  } else if (writeRow.document._deleted) {
                    // was delete
                    // we need to add the new revision to the previous doc
                    // so that the eventkey is calculated correctly.
                    // Is this a hack? idk.
                    var previousDoc = flatClone(writeRow.previous);
                    previousDoc._rev = resultRow.rev;
                    event = {
                      operation: 'DELETE',
                      doc: null,
                      id: resultRow.id,
                      previous: previousDoc
                    };
                  } else {
                    // was update
                    event = {
                      operation: 'UPDATE',
                      doc: pushObj,
                      id: resultRow.id,
                      previous: writeRow.previous
                    };
                  }

                  if (writeRow.document._deleted && (!writeRow.previous || writeRow.previous._deleted)) {
                    /**
                     * A deleted document was newly added to the storage engine,
                     * do not emit an event.
                     */
                  } else {
                    var doc = event.operation === 'DELETE' ? event.previous : event.doc;
                    var eventId = getEventKey(true, doc._id, doc._rev ? doc._rev : '');
                    var storageChangeEvent = {
                      eventId: eventId,
                      documentId: resultRow.id,
                      change: event,
                      startTime: startTime,
                      endTime: endTime
                    };

                    _this.changes$.next(storageChangeEvent);
                  }
                }
              });
              return _context2.abrupt("return", ret);

            case 12:
            case "end":
              return _context2.stop();
          }
        }
      }, _callee2, this);
    }));

    function bulkWrite(_x) {
      return _bulkWrite.apply(this, arguments);
    }

    return bulkWrite;
  }();

  _proto.findLocalDocumentsById = /*#__PURE__*/function () {
    var _findLocalDocumentsById = _asyncToGenerator( /*#__PURE__*/_regeneratorRuntime.mark(function _callee4(ids) {
      var _this2 = this;

      var ret;
      return _regeneratorRuntime.wrap(function _callee4$(_context4) {
        while (1) {
          switch (_context4.prev = _context4.next) {
            case 0:
              ret = new Map();
              /**
               * Pouchdb is not able to bulk-request local documents
               * with the pouch.allDocs() method.
               * so we need to get each by a single call.
               * TODO create an issue at the pouchdb repo
               */

              _context4.next = 3;
              return Promise.all(ids.map( /*#__PURE__*/function () {
                var _ref = _asyncToGenerator( /*#__PURE__*/_regeneratorRuntime.mark(function _callee3(id) {
                  var prefixedId, docData;
                  return _regeneratorRuntime.wrap(function _callee3$(_context3) {
                    while (1) {
                      switch (_context3.prev = _context3.next) {
                        case 0:
                          prefixedId = POUCHDB_LOCAL_PREFIX + id;
                          _context3.prev = 1;
                          _context3.next = 4;
                          return _this2.internals.pouch.get(prefixedId);

                        case 4:
                          docData = _context3.sent;
                          docData._id = id;
                          ret.set(id, docData);
                          _context3.next = 11;
                          break;

                        case 9:
                          _context3.prev = 9;
                          _context3.t0 = _context3["catch"](1);

                        case 11:
                        case "end":
                          return _context3.stop();
                      }
                    }
                  }, _callee3, null, [[1, 9]]);
                }));

                return function (_x3) {
                  return _ref.apply(this, arguments);
                };
              }()));

            case 3:
              return _context4.abrupt("return", ret);

            case 4:
            case "end":
              return _context4.stop();
          }
        }
      }, _callee4);
    }));

    function findLocalDocumentsById(_x2) {
      return _findLocalDocumentsById.apply(this, arguments);
    }

    return findLocalDocumentsById;
  }();

  _proto.changeStream = function changeStream() {
    return this.changes$.asObservable();
  };

  return RxStorageKeyObjectInstancePouch;
}();
//# sourceMappingURL=rx-storage-key-object-instance-pouch.js.map