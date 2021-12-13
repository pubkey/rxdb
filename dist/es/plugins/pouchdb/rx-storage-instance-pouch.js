import _asyncToGenerator from "@babel/runtime/helpers/asyncToGenerator";
import _regeneratorRuntime from "@babel/runtime/regenerator";
import { ObliviousSet } from 'oblivious-set';
import { Subject } from 'rxjs';
import { newRxError } from '../../rx-error';
import { getPrimaryFieldOfPrimaryKey } from '../../rx-schema';
import { OPEN_POUCHDB_STORAGE_INSTANCES, POUCHDB_DESIGN_PREFIX, pouchDocumentDataToRxDocumentData, pouchSwapIdToPrimary, rxDocumentDataToPouchDocumentData, writeAttachmentsToAttachments } from './pouchdb-helper';
import { flatClone, getFromMapOrThrow, PROMISE_RESOLVE_VOID } from '../../util';
import { getCustomEventEmitterByPouch } from './custom-events-plugin';
var lastId = 0;
export var RxStorageInstancePouch = /*#__PURE__*/function () {
  function RxStorageInstancePouch(databaseName, collectionName, schema, internals, options) {
    var _this = this;

    this.id = lastId++;
    this.changes$ = new Subject();
    this.subs = [];
    this.databaseName = databaseName;
    this.collectionName = collectionName;
    this.schema = schema;
    this.internals = internals;
    this.options = options;
    OPEN_POUCHDB_STORAGE_INSTANCES.add(this);
    this.primaryPath = getPrimaryFieldOfPrimaryKey(this.schema.primaryKey);
    /**
     * Instead of listening to pouch.changes,
     * we have overwritten pouchdbs bulkDocs()
     * and create our own event stream, this will work more relyable
     * and does not mix up with write events from other sources.
     */

    var emitter = getCustomEventEmitterByPouch(this.internals.pouch);
    /**
     * Contains all eventIds that of emitted events,
     * used because multi-instance pouchdbs often will reemit the same
     * event on the other browser tab so we have to de-duplicate them.
     */

    var emittedEventBulkIds = new ObliviousSet(60 * 1000);
    var eventSub = emitter.subject.subscribe( /*#__PURE__*/function () {
      var _ref = _asyncToGenerator( /*#__PURE__*/_regeneratorRuntime.mark(function _callee(ev) {
        return _regeneratorRuntime.wrap(function _callee$(_context) {
          while (1) {
            switch (_context.prev = _context.next) {
              case 0:
                if (!(ev.events.length === 0 || emittedEventBulkIds.has(ev.id))) {
                  _context.next = 2;
                  break;
                }

                return _context.abrupt("return");

              case 2:
                emittedEventBulkIds.add(ev.id); // rewrite primaryPath of all events

                ev.events.forEach(function (event) {
                  if (event.change.doc) {
                    event.change.doc = pouchSwapIdToPrimary(_this.primaryPath, event.change.doc);
                  }

                  if (event.change.previous) {
                    event.change.previous = pouchSwapIdToPrimary(_this.primaryPath, event.change.previous);
                  }
                });

                _this.changes$.next(ev);

              case 5:
              case "end":
                return _context.stop();
            }
          }
        }, _callee);
      }));

      return function (_x) {
        return _ref.apply(this, arguments);
      };
    }());
    this.subs.push(eventSub);
  }

  var _proto = RxStorageInstancePouch.prototype;

  _proto.close = function close() {
    this.subs.forEach(function (sub) {
      return sub.unsubscribe();
    });
    OPEN_POUCHDB_STORAGE_INSTANCES["delete"](this); // TODO this did not work because a closed pouchdb cannot be recreated in the same process run
    // await this.internals.pouch.close();

    return PROMISE_RESOLVE_VOID;
  };

  _proto.remove = /*#__PURE__*/function () {
    var _remove = _asyncToGenerator( /*#__PURE__*/_regeneratorRuntime.mark(function _callee2() {
      return _regeneratorRuntime.wrap(function _callee2$(_context2) {
        while (1) {
          switch (_context2.prev = _context2.next) {
            case 0:
              this.subs.forEach(function (sub) {
                return sub.unsubscribe();
              });
              OPEN_POUCHDB_STORAGE_INSTANCES["delete"](this);
              _context2.next = 4;
              return this.internals.pouch.destroy();

            case 4:
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
  }();

  _proto.bulkAddRevisions = /*#__PURE__*/function () {
    var _bulkAddRevisions = _asyncToGenerator( /*#__PURE__*/_regeneratorRuntime.mark(function _callee3(documents) {
      var _this2 = this;

      var writeData;
      return _regeneratorRuntime.wrap(function _callee3$(_context3) {
        while (1) {
          switch (_context3.prev = _context3.next) {
            case 0:
              if (!(documents.length === 0)) {
                _context3.next = 2;
                break;
              }

              throw newRxError('P3', {
                args: {
                  documents: documents
                }
              });

            case 2:
              writeData = documents.map(function (doc) {
                return rxDocumentDataToPouchDocumentData(_this2.primaryPath, doc);
              }); // we do not need the response here because pouchdb returns an empty array on new_edits: false

              _context3.next = 5;
              return this.internals.pouch.bulkDocs(writeData, {
                new_edits: false,
                set_new_edit_as_latest_revision: true
              });

            case 5:
            case "end":
              return _context3.stop();
          }
        }
      }, _callee3, this);
    }));

    function bulkAddRevisions(_x2) {
      return _bulkAddRevisions.apply(this, arguments);
    }

    return bulkAddRevisions;
  }();

  _proto.bulkWrite = /*#__PURE__*/function () {
    var _bulkWrite = _asyncToGenerator( /*#__PURE__*/_regeneratorRuntime.mark(function _callee5(documentWrites) {
      var _this3 = this;

      var writeRowById, insertDocs, pouchResult, ret;
      return _regeneratorRuntime.wrap(function _callee5$(_context5) {
        while (1) {
          switch (_context5.prev = _context5.next) {
            case 0:
              if (!(documentWrites.length === 0)) {
                _context5.next = 2;
                break;
              }

              throw newRxError('P2', {
                args: {
                  documentWrites: documentWrites
                }
              });

            case 2:
              writeRowById = new Map();
              insertDocs = documentWrites.map(function (writeData) {
                var primary = writeData.document[_this3.primaryPath];
                writeRowById.set(primary, writeData);
                var storeDocumentData = rxDocumentDataToPouchDocumentData(_this3.primaryPath, writeData.document); // if previous document exists, we have to send the previous revision to pouchdb.

                if (writeData.previous) {
                  storeDocumentData._rev = writeData.previous._rev;
                }

                return storeDocumentData;
              });
              _context5.next = 6;
              return this.internals.pouch.bulkDocs(insertDocs, {
                custom: {
                  primaryPath: this.primaryPath,
                  writeRowById: writeRowById
                }
              });

            case 6:
              pouchResult = _context5.sent;
              ret = {
                success: {},
                error: {}
              };
              _context5.next = 10;
              return Promise.all(pouchResult.map( /*#__PURE__*/function () {
                var _ref2 = _asyncToGenerator( /*#__PURE__*/_regeneratorRuntime.mark(function _callee4(resultRow) {
                  var writeRow, err, pushObj;
                  return _regeneratorRuntime.wrap(function _callee4$(_context4) {
                    while (1) {
                      switch (_context4.prev = _context4.next) {
                        case 0:
                          writeRow = getFromMapOrThrow(writeRowById, resultRow.id);

                          if (!resultRow.error) {
                            _context4.next = 6;
                            break;
                          }

                          err = {
                            isError: true,
                            status: 409,
                            documentId: resultRow.id,
                            writeRow: writeRow
                          };
                          ret.error[resultRow.id] = err;
                          _context4.next = 18;
                          break;

                        case 6:
                          pushObj = flatClone(writeRow.document);
                          pushObj = pouchSwapIdToPrimary(_this3.primaryPath, pushObj);
                          pushObj._rev = resultRow.rev; // replace the inserted attachments with their diggest

                          // replace the inserted attachments with their diggest
                          pushObj._attachments = {};

                          if (writeRow.document._attachments) {
                            _context4.next = 14;
                            break;
                          }

                          writeRow.document._attachments = {};
                          _context4.next = 17;
                          break;

                        case 14:
                          _context4.next = 16;
                          return writeAttachmentsToAttachments(writeRow.document._attachments);

                        case 16:
                          pushObj._attachments = _context4.sent;

                        case 17:
                          ret.success[resultRow.id] = pushObj;

                        case 18:
                        case "end":
                          return _context4.stop();
                      }
                    }
                  }, _callee4);
                }));

                return function (_x4) {
                  return _ref2.apply(this, arguments);
                };
              }()));

            case 10:
              return _context5.abrupt("return", ret);

            case 11:
            case "end":
              return _context5.stop();
          }
        }
      }, _callee5, this);
    }));

    function bulkWrite(_x3) {
      return _bulkWrite.apply(this, arguments);
    }

    return bulkWrite;
  }();

  _proto.query = /*#__PURE__*/function () {
    var _query = _asyncToGenerator( /*#__PURE__*/_regeneratorRuntime.mark(function _callee6(preparedQuery) {
      var _this4 = this;

      var findResult, ret;
      return _regeneratorRuntime.wrap(function _callee6$(_context6) {
        while (1) {
          switch (_context6.prev = _context6.next) {
            case 0:
              _context6.next = 2;
              return this.internals.pouch.find(preparedQuery);

            case 2:
              findResult = _context6.sent;
              ret = {
                documents: findResult.docs.map(function (pouchDoc) {
                  var useDoc = pouchDocumentDataToRxDocumentData(_this4.primaryPath, pouchDoc);
                  return useDoc;
                })
              };
              return _context6.abrupt("return", ret);

            case 5:
            case "end":
              return _context6.stop();
          }
        }
      }, _callee6, this);
    }));

    function query(_x5) {
      return _query.apply(this, arguments);
    }

    return query;
  }();

  _proto.getAttachmentData = /*#__PURE__*/function () {
    var _getAttachmentData = _asyncToGenerator( /*#__PURE__*/_regeneratorRuntime.mark(function _callee7(documentId, attachmentId) {
      var attachmentData;
      return _regeneratorRuntime.wrap(function _callee7$(_context7) {
        while (1) {
          switch (_context7.prev = _context7.next) {
            case 0:
              _context7.next = 2;
              return this.internals.pouch.getAttachment(documentId, attachmentId);

            case 2:
              attachmentData = _context7.sent;
              return _context7.abrupt("return", attachmentData);

            case 4:
            case "end":
              return _context7.stop();
          }
        }
      }, _callee7, this);
    }));

    function getAttachmentData(_x6, _x7) {
      return _getAttachmentData.apply(this, arguments);
    }

    return getAttachmentData;
  }();

  _proto.findDocumentsById = /*#__PURE__*/function () {
    var _findDocumentsById = _asyncToGenerator( /*#__PURE__*/_regeneratorRuntime.mark(function _callee9(ids, deleted) {
      var _this5 = this;

      var viaChanges, retDocs, pouchResult, ret;
      return _regeneratorRuntime.wrap(function _callee9$(_context9) {
        while (1) {
          switch (_context9.prev = _context9.next) {
            case 0:
              if (!deleted) {
                _context9.next = 8;
                break;
              }

              _context9.next = 3;
              return this.internals.pouch.changes({
                live: false,
                since: 0,
                doc_ids: ids,
                style: 'all_docs'
              });

            case 3:
              viaChanges = _context9.sent;
              retDocs = {};
              _context9.next = 7;
              return Promise.all(viaChanges.results.map( /*#__PURE__*/function () {
                var _ref3 = _asyncToGenerator( /*#__PURE__*/_regeneratorRuntime.mark(function _callee8(result) {
                  var firstDoc, useFirstDoc;
                  return _regeneratorRuntime.wrap(function _callee8$(_context8) {
                    while (1) {
                      switch (_context8.prev = _context8.next) {
                        case 0:
                          _context8.next = 2;
                          return _this5.internals.pouch.get(result.id, {
                            rev: result.changes[0].rev,
                            deleted: 'ok',
                            style: 'all_docs'
                          });

                        case 2:
                          firstDoc = _context8.sent;
                          useFirstDoc = pouchDocumentDataToRxDocumentData(_this5.primaryPath, firstDoc);
                          retDocs[result.id] = useFirstDoc;

                        case 5:
                        case "end":
                          return _context8.stop();
                      }
                    }
                  }, _callee8);
                }));

                return function (_x10) {
                  return _ref3.apply(this, arguments);
                };
              }()));

            case 7:
              return _context9.abrupt("return", retDocs);

            case 8:
              _context9.next = 10;
              return this.internals.pouch.allDocs({
                include_docs: true,
                keys: ids
              });

            case 10:
              pouchResult = _context9.sent;
              ret = {};
              pouchResult.rows.filter(function (row) {
                return !!row.doc;
              }).forEach(function (row) {
                var docData = row.doc;
                docData = pouchDocumentDataToRxDocumentData(_this5.primaryPath, docData);
                ret[row.id] = docData;
              });
              return _context9.abrupt("return", ret);

            case 14:
            case "end":
              return _context9.stop();
          }
        }
      }, _callee9, this);
    }));

    function findDocumentsById(_x8, _x9) {
      return _findDocumentsById.apply(this, arguments);
    }

    return findDocumentsById;
  }();

  _proto.changeStream = function changeStream() {
    return this.changes$.asObservable();
  };

  _proto.getChangedDocuments = /*#__PURE__*/function () {
    var _getChangedDocuments = _asyncToGenerator( /*#__PURE__*/_regeneratorRuntime.mark(function _callee10(options) {
      var pouchChangesOpts, pouchResults, changedDocuments, lastSequence;
      return _regeneratorRuntime.wrap(function _callee10$(_context10) {
        while (1) {
          switch (_context10.prev = _context10.next) {
            case 0:
              pouchChangesOpts = {
                live: false,
                limit: options.limit,
                include_docs: false,
                since: options.sinceSequence,
                descending: options.direction === 'before' ? true : false
              };
              _context10.next = 3;
              return this.internals.pouch.changes(pouchChangesOpts);

            case 3:
              pouchResults = _context10.sent;

              /**
               * TODO stripping the internal docs
               * results in having a non-full result set that maybe no longer
               * reaches the options.limit. We should fill up again
               * to ensure pagination works correctly.
               */
              changedDocuments = pouchResults.results.filter(function (row) {
                return !row.id.startsWith(POUCHDB_DESIGN_PREFIX);
              }).map(function (row) {
                return {
                  id: row.id,
                  sequence: row.seq
                };
              });
              lastSequence = pouchResults.last_seq;
              return _context10.abrupt("return", {
                changedDocuments: changedDocuments,
                lastSequence: lastSequence
              });

            case 7:
            case "end":
              return _context10.stop();
          }
        }
      }, _callee10, this);
    }));

    function getChangedDocuments(_x11) {
      return _getChangedDocuments.apply(this, arguments);
    }

    return getChangedDocuments;
  }();

  return RxStorageInstancePouch;
}();
//# sourceMappingURL=rx-storage-instance-pouch.js.map