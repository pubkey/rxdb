import _asyncToGenerator from "@babel/runtime/helpers/asyncToGenerator";
import _regeneratorRuntime from "@babel/runtime/regenerator";
import { filterInMemoryFields, massageSelector } from 'pouchdb-selector-core';
import { binaryMd5 } from 'pouchdb-md5';
import { flatClone, adapterObject, getFromMapOrThrow, getHeightOfRevision, promiseWait, blobBufferUtil, now } from '../../util';
import { isLevelDown, PouchDB } from './pouch-db';
import { newRxError } from '../../rx-error';
import { Subject } from 'rxjs';
import { getSchemaByObjectPath } from '../../rx-schema-helper';
import { getCustomEventEmitterByPouch } from './custom-events-plugin';
import { getPrimaryFieldOfPrimaryKey } from '../../rx-schema';
/**
 * prefix of local pouchdb documents
 */

export var POUCHDB_LOCAL_PREFIX = '_local/';
/**
 * Pouchdb stores indexes as design documents,
 * we have to filter them out and not return the
 * design documents to the outside.
 */

export var POUCHDB_DESIGN_PREFIX = '_design/';

/**
 * Used to check in tests if all instances have been cleaned up.
 */
export var OPEN_POUCHDB_STORAGE_INSTANCES = new Set();
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

    return Promise.resolve();
  };

  _proto.remove = /*#__PURE__*/function () {
    var _remove = _asyncToGenerator( /*#__PURE__*/_regeneratorRuntime.mark(function _callee() {
      return _regeneratorRuntime.wrap(function _callee$(_context) {
        while (1) {
          switch (_context.prev = _context.next) {
            case 0:
              _context.next = 2;
              return this.internals.pouch.destroy();

            case 2:
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
              _context2.next = 5;
              return this.internals.pouch.bulkDocs(insertDocs);

            case 5:
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

            case 10:
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
export var RxStorageInstancePouch = /*#__PURE__*/function () {
  function RxStorageInstancePouch(databaseName, collectionName, schema, internals, options) {
    var _this3 = this;

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
    this.emittedEventIds = emitter.obliviousSet;
    var eventSub = emitter.subject.subscribe( /*#__PURE__*/function () {
      var _ref2 = _asyncToGenerator( /*#__PURE__*/_regeneratorRuntime.mark(function _callee8(ev) {
        var writeDocsById, writeMap;
        return _regeneratorRuntime.wrap(function _callee8$(_context8) {
          while (1) {
            switch (_context8.prev = _context8.next) {
              case 0:
                if (!(ev.writeOptions.hasOwnProperty('new_edits') && !ev.writeOptions.new_edits)) {
                  _context8.next = 4;
                  break;
                }

                _context8.next = 3;
                return Promise.all(ev.writeDocs.map( /*#__PURE__*/function () {
                  var _ref3 = _asyncToGenerator( /*#__PURE__*/_regeneratorRuntime.mark(function _callee5(writeDoc) {
                    var id, previousDoc, event;
                    return _regeneratorRuntime.wrap(function _callee5$(_context5) {
                      while (1) {
                        switch (_context5.prev = _context5.next) {
                          case 0:
                            id = writeDoc._id;
                            writeDoc = pouchDocumentDataToRxDocumentData(_this3.primaryPath, writeDoc);
                            _context5.next = 4;
                            return writeAttachmentsToAttachments(writeDoc._attachments);

                          case 4:
                            writeDoc._attachments = _context5.sent;
                            previousDoc = ev.previousDocs.get(id);

                            if (previousDoc) {
                              previousDoc = pouchDocumentDataToRxDocumentData(_this3.primaryPath, previousDoc);
                            }

                            if (!(previousDoc && getHeightOfRevision(previousDoc._rev) > getHeightOfRevision(writeDoc._rev))) {
                              _context5.next = 9;
                              break;
                            }

                            return _context5.abrupt("return");

                          case 9:
                            if (!(!previousDoc && writeDoc._deleted)) {
                              _context5.next = 11;
                              break;
                            }

                            return _context5.abrupt("return");

                          case 11:
                            if (!(previousDoc && previousDoc._deleted && writeDoc._deleted)) {
                              _context5.next = 13;
                              break;
                            }

                            return _context5.abrupt("return");

                          case 13:
                            if (!(!previousDoc && !writeDoc._deleted)) {
                              _context5.next = 17;
                              break;
                            }

                            // was insert
                            event = {
                              operation: 'INSERT',
                              doc: writeDoc,
                              id: id,
                              previous: null
                            };
                            _context5.next = 27;
                            break;

                          case 17:
                            if (!(writeDoc._deleted && previousDoc && !previousDoc._deleted)) {
                              _context5.next = 22;
                              break;
                            }

                            // was delete
                            previousDoc._rev = writeDoc._rev;
                            event = {
                              operation: 'DELETE',
                              doc: null,
                              id: id,
                              previous: previousDoc
                            };
                            _context5.next = 27;
                            break;

                          case 22:
                            if (!previousDoc) {
                              _context5.next = 26;
                              break;
                            }

                            // was update
                            event = {
                              operation: 'UPDATE',
                              doc: writeDoc,
                              id: id,
                              previous: previousDoc
                            };
                            _context5.next = 27;
                            break;

                          case 26:
                            throw newRxError('SNH', {
                              args: {
                                writeDoc: writeDoc
                              }
                            });

                          case 27:
                            _this3.addEventToChangeStream(event, ev.startTime, ev.endTime);

                          case 28:
                          case "end":
                            return _context5.stop();
                        }
                      }
                    }, _callee5);
                  }));

                  return function (_x5) {
                    return _ref3.apply(this, arguments);
                  };
                }()));

              case 3:
                return _context8.abrupt("return");

              case 4:
                if (ev.writeOptions.custom) {
                  _context8.next = 10;
                  break;
                }

                writeDocsById = new Map();
                ev.writeDocs.forEach(function (writeDoc) {
                  return writeDocsById.set(writeDoc._id, writeDoc);
                });
                _context8.next = 9;
                return Promise.all(ev.writeResult.map( /*#__PURE__*/function () {
                  var _ref4 = _asyncToGenerator( /*#__PURE__*/_regeneratorRuntime.mark(function _callee6(resultRow) {
                    var id, writeDoc, event;
                    return _regeneratorRuntime.wrap(function _callee6$(_context6) {
                      while (1) {
                        switch (_context6.prev = _context6.next) {
                          case 0:
                            id = resultRow.id;

                            if (!(id.startsWith(POUCHDB_DESIGN_PREFIX) || id.startsWith(POUCHDB_LOCAL_PREFIX))) {
                              _context6.next = 3;
                              break;
                            }

                            return _context6.abrupt("return");

                          case 3:
                            writeDoc = getFromMapOrThrow(writeDocsById, resultRow.id);
                            _context6.next = 6;
                            return writeAttachmentsToAttachments(writeDoc._attachments);

                          case 6:
                            writeDoc._attachments = _context6.sent;
                            event = pouchChangeRowToChangeEvent(_this3.primaryPath, writeDoc);

                            _this3.addEventToChangeStream(event);

                          case 9:
                          case "end":
                            return _context6.stop();
                        }
                      }
                    }, _callee6);
                  }));

                  return function (_x6) {
                    return _ref4.apply(this, arguments);
                  };
                }()));

              case 9:
                return _context8.abrupt("return");

              case 10:
                writeMap = ev.writeOptions.custom.writeRowById;
                _context8.next = 13;
                return Promise.all(ev.writeResult.map( /*#__PURE__*/function () {
                  var _ref5 = _asyncToGenerator( /*#__PURE__*/_regeneratorRuntime.mark(function _callee7(resultRow) {
                    var id, writeRow, newDoc, event, previousDoc;
                    return _regeneratorRuntime.wrap(function _callee7$(_context7) {
                      while (1) {
                        switch (_context7.prev = _context7.next) {
                          case 0:
                            if (!resultRow.error) {
                              _context7.next = 2;
                              break;
                            }

                            return _context7.abrupt("return");

                          case 2:
                            id = resultRow.id;
                            writeRow = getFromMapOrThrow(writeMap, id);
                            newDoc = pouchDocumentDataToRxDocumentData(_this3.primaryPath, writeRow.document);
                            _context7.next = 7;
                            return writeAttachmentsToAttachments(newDoc._attachments);

                          case 7:
                            newDoc._attachments = _context7.sent;
                            newDoc._rev = resultRow.rev;

                            if (writeRow.previous) {
                              _context7.next = 13;
                              break;
                            }

                            // was insert
                            event = {
                              operation: 'INSERT',
                              doc: newDoc,
                              id: id,
                              previous: null
                            };
                            _context7.next = 23;
                            break;

                          case 13:
                            if (!writeRow.document._deleted) {
                              _context7.next = 22;
                              break;
                            }

                            // was delete
                            // we need to add the new revision to the previous doc
                            // so that the eventkey is calculated correctly.
                            // Is this a hack? idk.
                            previousDoc = pouchDocumentDataToRxDocumentData(_this3.primaryPath, writeRow.previous);
                            _context7.next = 17;
                            return writeAttachmentsToAttachments(previousDoc._attachments);

                          case 17:
                            previousDoc._attachments = _context7.sent;
                            previousDoc._rev = resultRow.rev;
                            event = {
                              operation: 'DELETE',
                              doc: null,
                              id: resultRow.id,
                              previous: previousDoc
                            };
                            _context7.next = 23;
                            break;

                          case 22:
                            // was update
                            event = {
                              operation: 'UPDATE',
                              doc: newDoc,
                              id: resultRow.id,
                              previous: writeRow.previous
                            };

                          case 23:
                            if (writeRow.document._deleted && (!writeRow.previous || writeRow.previous._deleted)) {
                              /**
                               * A deleted document was newly added to the storage engine,
                               * do not emit an event.
                               */
                            } else {
                              _this3.addEventToChangeStream(event, ev.startTime, ev.endTime);
                            }

                          case 24:
                          case "end":
                            return _context7.stop();
                        }
                      }
                    }, _callee7);
                  }));

                  return function (_x7) {
                    return _ref5.apply(this, arguments);
                  };
                }()));

              case 13:
              case "end":
                return _context8.stop();
            }
          }
        }, _callee8);
      }));

      return function (_x4) {
        return _ref2.apply(this, arguments);
      };
    }());
    this.subs.push(eventSub);
  }

  var _proto2 = RxStorageInstancePouch.prototype;

  _proto2.addEventToChangeStream = function addEventToChangeStream(change, startTime, endTime) {
    var doc = change.operation === 'DELETE' ? change.previous : change.doc;
    var primaryPath = getPrimaryFieldOfPrimaryKey(this.schema.primaryKey);
    var primary = doc[primaryPath];
    var eventId = getEventKey(false, primary, doc._rev);

    if (this.emittedEventIds.has(eventId)) {
      return;
    }

    this.emittedEventIds.add(eventId);
    var storageChangeEvent = {
      eventId: eventId,
      documentId: primary,
      change: change,
      startTime: startTime,
      endTime: endTime
    };
    this.changes$.next(storageChangeEvent);
  };

  _proto2.close = function close() {
    this.subs.forEach(function (sub) {
      return sub.unsubscribe();
    });
    OPEN_POUCHDB_STORAGE_INSTANCES["delete"](this); // TODO this did not work because a closed pouchdb cannot be recreated in the same process run
    // await this.internals.pouch.close();

    return Promise.resolve();
  };

  _proto2.remove = /*#__PURE__*/function () {
    var _remove2 = _asyncToGenerator( /*#__PURE__*/_regeneratorRuntime.mark(function _callee9() {
      return _regeneratorRuntime.wrap(function _callee9$(_context9) {
        while (1) {
          switch (_context9.prev = _context9.next) {
            case 0:
              _context9.next = 2;
              return this.internals.pouch.destroy();

            case 2:
            case "end":
              return _context9.stop();
          }
        }
      }, _callee9, this);
    }));

    function remove() {
      return _remove2.apply(this, arguments);
    }

    return remove;
  }();

  _proto2.getSortComparator = function getSortComparator(query) {
    var _ref6;

    var primaryKey = this.schema.primaryKey;
    var sortOptions = query.sort ? query.sort : [(_ref6 = {}, _ref6[this.primaryPath] = 'asc', _ref6)];
    var massagedSelector = massageSelector(query.selector);
    var inMemoryFields = Object.keys(query.selector);

    var fun = function fun(a, b) {
      // TODO use createFieldSorter
      // TODO make a performance test
      var rows = [a, b].map(function (doc) {
        // swap primary to _id
        var cloned = flatClone(doc);
        var primaryValue = cloned[primaryKey];
        delete cloned[primaryKey];
        cloned._id = primaryValue;
        return {
          doc: cloned
        };
      });
      var sortedRows = filterInMemoryFields(rows, {
        selector: massagedSelector,
        sort: sortOptions
      }, inMemoryFields);

      if (sortedRows[0].doc._id === rows[0].doc._id) {
        return -1;
      } else {
        return 1;
      }
    };

    return fun;
  }
  /**
   * @link https://github.com/pouchdb/pouchdb/blob/master/packages/node_modules/pouchdb-selector-core/src/matches-selector.js
   */
  ;

  _proto2.getQueryMatcher = function getQueryMatcher(query) {
    var _this4 = this;

    var massagedSelector = massageSelector(query.selector);

    var fun = function fun(doc) {
      var cloned = pouchSwapPrimaryToId(_this4.primaryPath, doc);
      var row = {
        doc: cloned
      };
      var rowsMatched = filterInMemoryFields([row], {
        selector: massagedSelector
      }, Object.keys(query.selector));
      var ret = rowsMatched && rowsMatched.length === 1;
      return ret;
    };

    return fun;
  }
  /**
   * pouchdb has many bugs and strange behaviors
   * this functions takes a normal mango query
   * and transforms it to one that fits for pouchdb
   */
  ;

  _proto2.prepareQuery = function prepareQuery(mutateableQuery) {
    var _this5 = this;

    var primaryKey = this.schema.primaryKey;
    var query = mutateableQuery;
    /**
     * because sort wont work on unused keys we have to workaround
     * so we add the key to the selector if necessary
     * @link https://github.com/nolanlawson/pouchdb-find/issues/204
     */

    if (query.sort) {
      query.sort.forEach(function (sortPart) {
        var key = Object.keys(sortPart)[0];
        var comparisonOperators = ['$gt', '$gte', '$lt', '$lte'];
        var keyUsed = query.selector[key] && Object.keys(query.selector[key]).some(function (op) {
          return comparisonOperators.includes(op);
        }) || false;

        if (!keyUsed) {
          var schemaObj = getSchemaByObjectPath(_this5.schema, key);

          if (!schemaObj) {
            throw newRxError('QU5', {
              key: key
            });
          }

          if (!query.selector[key]) {
            query.selector[key] = {};
          }

          switch (schemaObj.type) {
            case 'number':
            case 'integer':
              // TODO change back to -Infinity when issue resolved
              // @link https://github.com/pouchdb/pouchdb/issues/6454
              // -Infinity does not work since pouchdb 6.2.0
              query.selector[key].$gt = -9999999999999999999999999999;
              break;

            case 'string':
              /**
               * strings need an empty string, see
               * @link https://github.com/pubkey/rxdb/issues/585
               */
              if (typeof query.selector[key] !== 'string') {
                query.selector[key].$gt = '';
              }

              break;

            default:
              query.selector[key].$gt = null;
              break;
          }
        }
      });
    } // regex does not work over the primary key
    // TODO move this to dev mode


    if (query.selector[primaryKey] && query.selector[primaryKey].$regex) {
      throw newRxError('QU4', {
        path: primaryKey,
        query: mutateableQuery
      });
    } // primary-swap sorting


    if (query.sort) {
      var sortArray = query.sort.map(function (part) {
        var _newPart;

        var key = Object.keys(part)[0];
        var direction = Object.values(part)[0];
        var useKey = key === primaryKey ? '_id' : key;
        var newPart = (_newPart = {}, _newPart[useKey] = direction, _newPart);
        return newPart;
      });
      query.sort = sortArray;
    } // strip empty selectors


    Object.entries(query.selector).forEach(function (_ref7) {
      var k = _ref7[0],
          v = _ref7[1];

      if (typeof v === 'object' && v !== null && !Array.isArray(v) && Object.keys(v).length === 0) {
        delete query.selector[k];
      }
    });
    query.selector = primarySwapPouchDbQuerySelector(query.selector, this.primaryPath);
    return query;
  };

  _proto2.bulkAddRevisions = /*#__PURE__*/function () {
    var _bulkAddRevisions = _asyncToGenerator( /*#__PURE__*/_regeneratorRuntime.mark(function _callee10(documents) {
      var _this6 = this;

      var writeData;
      return _regeneratorRuntime.wrap(function _callee10$(_context10) {
        while (1) {
          switch (_context10.prev = _context10.next) {
            case 0:
              writeData = documents.map(function (doc) {
                return pouchSwapPrimaryToId(_this6.primaryPath, doc);
              }); // we do not need the response here because pouchdb returns an empty array on new_edits: false

              _context10.next = 3;
              return this.internals.pouch.bulkDocs(writeData, {
                new_edits: false,
                set_new_edit_as_latest_revision: true
              });

            case 3:
            case "end":
              return _context10.stop();
          }
        }
      }, _callee10, this);
    }));

    function bulkAddRevisions(_x8) {
      return _bulkAddRevisions.apply(this, arguments);
    }

    return bulkAddRevisions;
  }();

  _proto2.bulkWrite = /*#__PURE__*/function () {
    var _bulkWrite2 = _asyncToGenerator( /*#__PURE__*/_regeneratorRuntime.mark(function _callee12(documentWrites) {
      var _this7 = this;

      var writeRowById, insertDocs, pouchResult, ret;
      return _regeneratorRuntime.wrap(function _callee12$(_context12) {
        while (1) {
          switch (_context12.prev = _context12.next) {
            case 0:
              writeRowById = new Map();
              insertDocs = documentWrites.map(function (writeData) {
                var primary = writeData.document[_this7.primaryPath];
                writeRowById.set(primary, writeData);
                var storeDocumentData = rxDocumentDataToPouchDocumentData(_this7.primaryPath, writeData.document); // if previous document exists, we have to send the previous revision to pouchdb.

                if (writeData.previous) {
                  storeDocumentData._rev = writeData.previous._rev;
                }

                return storeDocumentData;
              });
              _context12.next = 4;
              return this.internals.pouch.bulkDocs(insertDocs, {
                custom: {
                  writeRowById: writeRowById
                }
              });

            case 4:
              pouchResult = _context12.sent;
              ret = {
                success: new Map(),
                error: new Map()
              };
              _context12.next = 8;
              return Promise.all(pouchResult.map( /*#__PURE__*/function () {
                var _ref8 = _asyncToGenerator( /*#__PURE__*/_regeneratorRuntime.mark(function _callee11(resultRow) {
                  var writeRow, err, pushObj;
                  return _regeneratorRuntime.wrap(function _callee11$(_context11) {
                    while (1) {
                      switch (_context11.prev = _context11.next) {
                        case 0:
                          writeRow = getFromMapOrThrow(writeRowById, resultRow.id);

                          if (!resultRow.error) {
                            _context11.next = 6;
                            break;
                          }

                          err = {
                            isError: true,
                            status: 409,
                            documentId: resultRow.id,
                            writeRow: writeRow
                          };
                          ret.error.set(resultRow.id, err);
                          _context11.next = 18;
                          break;

                        case 6:
                          pushObj = flatClone(writeRow.document);
                          pushObj = pouchSwapIdToPrimary(_this7.primaryPath, pushObj);
                          pushObj._rev = resultRow.rev; // replace the inserted attachments with their diggest

                          // replace the inserted attachments with their diggest
                          pushObj._attachments = {};

                          if (writeRow.document._attachments) {
                            _context11.next = 14;
                            break;
                          }

                          writeRow.document._attachments = {};
                          _context11.next = 17;
                          break;

                        case 14:
                          _context11.next = 16;
                          return writeAttachmentsToAttachments(writeRow.document._attachments);

                        case 16:
                          pushObj._attachments = _context11.sent;

                        case 17:
                          ret.success.set(resultRow.id, pushObj);

                        case 18:
                        case "end":
                          return _context11.stop();
                      }
                    }
                  }, _callee11);
                }));

                return function (_x10) {
                  return _ref8.apply(this, arguments);
                };
              }()));

            case 8:
              _context12.next = 10;
              return promiseWait(0).then(function () {
                return promiseWait(0);
              });

            case 10:
              return _context12.abrupt("return", ret);

            case 11:
            case "end":
              return _context12.stop();
          }
        }
      }, _callee12, this);
    }));

    function bulkWrite(_x9) {
      return _bulkWrite2.apply(this, arguments);
    }

    return bulkWrite;
  }();

  _proto2.query = /*#__PURE__*/function () {
    var _query = _asyncToGenerator( /*#__PURE__*/_regeneratorRuntime.mark(function _callee13(preparedQuery) {
      var _this8 = this;

      var findResult, ret;
      return _regeneratorRuntime.wrap(function _callee13$(_context13) {
        while (1) {
          switch (_context13.prev = _context13.next) {
            case 0:
              _context13.next = 2;
              return this.internals.pouch.find(preparedQuery);

            case 2:
              findResult = _context13.sent;
              ret = {
                documents: findResult.docs.map(function (pouchDoc) {
                  var useDoc = pouchDocumentDataToRxDocumentData(_this8.primaryPath, pouchDoc);
                  return useDoc;
                })
              };
              return _context13.abrupt("return", ret);

            case 5:
            case "end":
              return _context13.stop();
          }
        }
      }, _callee13, this);
    }));

    function query(_x11) {
      return _query.apply(this, arguments);
    }

    return query;
  }();

  _proto2.getAttachmentData = /*#__PURE__*/function () {
    var _getAttachmentData = _asyncToGenerator( /*#__PURE__*/_regeneratorRuntime.mark(function _callee14(documentId, attachmentId) {
      var attachmentData;
      return _regeneratorRuntime.wrap(function _callee14$(_context14) {
        while (1) {
          switch (_context14.prev = _context14.next) {
            case 0:
              _context14.next = 2;
              return this.internals.pouch.getAttachment(documentId, attachmentId);

            case 2:
              attachmentData = _context14.sent;
              return _context14.abrupt("return", attachmentData);

            case 4:
            case "end":
              return _context14.stop();
          }
        }
      }, _callee14, this);
    }));

    function getAttachmentData(_x12, _x13) {
      return _getAttachmentData.apply(this, arguments);
    }

    return getAttachmentData;
  }();

  _proto2.findDocumentsById = /*#__PURE__*/function () {
    var _findDocumentsById = _asyncToGenerator( /*#__PURE__*/_regeneratorRuntime.mark(function _callee16(ids, deleted) {
      var _this9 = this;

      var viaChanges, retDocs, pouchResult, ret;
      return _regeneratorRuntime.wrap(function _callee16$(_context16) {
        while (1) {
          switch (_context16.prev = _context16.next) {
            case 0:
              if (!deleted) {
                _context16.next = 8;
                break;
              }

              _context16.next = 3;
              return this.internals.pouch.changes({
                live: false,
                since: 0,
                doc_ids: ids,
                style: 'all_docs'
              });

            case 3:
              viaChanges = _context16.sent;
              retDocs = new Map();
              _context16.next = 7;
              return Promise.all(viaChanges.results.map( /*#__PURE__*/function () {
                var _ref9 = _asyncToGenerator( /*#__PURE__*/_regeneratorRuntime.mark(function _callee15(result) {
                  var firstDoc, useFirstDoc;
                  return _regeneratorRuntime.wrap(function _callee15$(_context15) {
                    while (1) {
                      switch (_context15.prev = _context15.next) {
                        case 0:
                          _context15.next = 2;
                          return _this9.internals.pouch.get(result.id, {
                            rev: result.changes[0].rev,
                            deleted: 'ok',
                            style: 'all_docs'
                          });

                        case 2:
                          firstDoc = _context15.sent;
                          useFirstDoc = pouchDocumentDataToRxDocumentData(_this9.primaryPath, firstDoc);
                          retDocs.set(result.id, useFirstDoc);

                        case 5:
                        case "end":
                          return _context15.stop();
                      }
                    }
                  }, _callee15);
                }));

                return function (_x16) {
                  return _ref9.apply(this, arguments);
                };
              }()));

            case 7:
              return _context16.abrupt("return", retDocs);

            case 8:
              _context16.next = 10;
              return this.internals.pouch.allDocs({
                include_docs: true,
                keys: ids
              });

            case 10:
              pouchResult = _context16.sent;
              ret = new Map();
              pouchResult.rows.filter(function (row) {
                return !!row.doc;
              }).forEach(function (row) {
                var docData = row.doc;
                docData = pouchDocumentDataToRxDocumentData(_this9.primaryPath, docData);
                ret.set(row.id, docData);
              });
              return _context16.abrupt("return", ret);

            case 14:
            case "end":
              return _context16.stop();
          }
        }
      }, _callee16, this);
    }));

    function findDocumentsById(_x14, _x15) {
      return _findDocumentsById.apply(this, arguments);
    }

    return findDocumentsById;
  }();

  _proto2.changeStream = function changeStream() {
    return this.changes$.asObservable();
  };

  _proto2.getChangedDocuments = /*#__PURE__*/function () {
    var _getChangedDocuments = _asyncToGenerator( /*#__PURE__*/_regeneratorRuntime.mark(function _callee17(options) {
      var pouchChangesOpts, pouchResults, changedDocuments, lastSequence;
      return _regeneratorRuntime.wrap(function _callee17$(_context17) {
        while (1) {
          switch (_context17.prev = _context17.next) {
            case 0:
              pouchChangesOpts = {
                live: false,
                limit: options.limit,
                include_docs: false,
                since: options.startSequence,
                descending: options.order === 'desc' ? true : false
              };
              _context17.next = 3;
              return this.internals.pouch.changes(pouchChangesOpts);

            case 3:
              pouchResults = _context17.sent;
              changedDocuments = pouchResults.results.filter(function (row) {
                return !row.id.startsWith(POUCHDB_DESIGN_PREFIX);
              }).map(function (row) {
                return {
                  id: row.id,
                  sequence: row.seq
                };
              });
              lastSequence = pouchResults.last_seq;
              return _context17.abrupt("return", {
                changedDocuments: changedDocuments,
                lastSequence: lastSequence
              });

            case 7:
            case "end":
              return _context17.stop();
          }
        }
      }, _callee17, this);
    }));

    function getChangedDocuments(_x17) {
      return _getChangedDocuments.apply(this, arguments);
    }

    return getChangedDocuments;
  }();

  return RxStorageInstancePouch;
}();
export var RxStoragePouch = /*#__PURE__*/function () {
  function RxStoragePouch(adapter) {
    var pouchSettings = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};
    this.name = 'pouchdb';
    this.adapter = adapter;
    this.pouchSettings = pouchSettings;
    checkPouchAdapter(adapter);
  }
  /**
   * create the same diggest as an attachment with that data
   * would have created by pouchdb internally.
   */


  var _proto3 = RxStoragePouch.prototype;

  _proto3.hash = function hash(data) {
    return pouchHash(data);
  };

  _proto3.createPouch = /*#__PURE__*/function () {
    var _createPouch = _asyncToGenerator( /*#__PURE__*/_regeneratorRuntime.mark(function _callee18(location, options) {
      var pouchDbParameters, pouchDBOptions, pouch;
      return _regeneratorRuntime.wrap(function _callee18$(_context18) {
        while (1) {
          switch (_context18.prev = _context18.next) {
            case 0:
              pouchDbParameters = {
                location: location,
                adapter: adapterObject(this.adapter),
                settings: options
              };
              pouchDBOptions = Object.assign({}, pouchDbParameters.adapter, this.pouchSettings, pouchDbParameters.settings);
              pouch = new PouchDB(pouchDbParameters.location, pouchDBOptions);
              /**
               * In the past we found some errors where the PouchDB is not directly useable
               * so we we had to call .info() first to ensure it can be used.
               * I commented this out for now to get faster database/collection creation.
               * We might have to add this again if something fails.
               */
              // await pouch.info();

              return _context18.abrupt("return", pouch);

            case 4:
            case "end":
              return _context18.stop();
          }
        }
      }, _callee18, this);
    }));

    function createPouch(_x18, _x19) {
      return _createPouch.apply(this, arguments);
    }

    return createPouch;
  }();

  _proto3.createStorageInstance = /*#__PURE__*/function () {
    var _createStorageInstance = _asyncToGenerator( /*#__PURE__*/_regeneratorRuntime.mark(function _callee19(params) {
      var pouchLocation, pouch;
      return _regeneratorRuntime.wrap(function _callee19$(_context19) {
        while (1) {
          switch (_context19.prev = _context19.next) {
            case 0:
              pouchLocation = getPouchLocation(params.databaseName, params.collectionName, params.schema.version);
              _context19.next = 3;
              return this.createPouch(pouchLocation, params.options);

            case 3:
              pouch = _context19.sent;
              _context19.next = 6;
              return createIndexesOnPouch(pouch, params.schema);

            case 6:
              return _context19.abrupt("return", new RxStorageInstancePouch(params.databaseName, params.collectionName, params.schema, {
                pouch: pouch
              }, params.options));

            case 7:
            case "end":
              return _context19.stop();
          }
        }
      }, _callee19, this);
    }));

    function createStorageInstance(_x20) {
      return _createStorageInstance.apply(this, arguments);
    }

    return createStorageInstance;
  }();

  _proto3.createKeyObjectStorageInstance = /*#__PURE__*/function () {
    var _createKeyObjectStorageInstance = _asyncToGenerator( /*#__PURE__*/_regeneratorRuntime.mark(function _callee20(databaseName, collectionName, options) {
      var useOptions, pouchLocation, pouch;
      return _regeneratorRuntime.wrap(function _callee20$(_context20) {
        while (1) {
          switch (_context20.prev = _context20.next) {
            case 0:
              useOptions = flatClone(options); // no compaction because this only stores local documents

              useOptions.auto_compaction = false;
              useOptions.revs_limit = 1;
              pouchLocation = getPouchLocation(databaseName, collectionName, 0);
              _context20.next = 6;
              return this.createPouch(pouchLocation, options);

            case 6:
              pouch = _context20.sent;
              return _context20.abrupt("return", new RxStorageKeyObjectInstancePouch(databaseName, collectionName, {
                pouch: pouch
              }, options));

            case 8:
            case "end":
              return _context20.stop();
          }
        }
      }, _callee20, this);
    }));

    function createKeyObjectStorageInstance(_x21, _x22, _x23) {
      return _createKeyObjectStorageInstance.apply(this, arguments);
    }

    return createKeyObjectStorageInstance;
  }();

  return RxStoragePouch;
}();
export function writeAttachmentsToAttachments(_x24) {
  return _writeAttachmentsToAttachments.apply(this, arguments);
}
/**
 * Checks if all is ok with the given adapter,
 * else throws an error.
 */

function _writeAttachmentsToAttachments() {
  _writeAttachmentsToAttachments = _asyncToGenerator( /*#__PURE__*/_regeneratorRuntime.mark(function _callee22(attachments) {
    var ret;
    return _regeneratorRuntime.wrap(function _callee22$(_context22) {
      while (1) {
        switch (_context22.prev = _context22.next) {
          case 0:
            if (attachments) {
              _context22.next = 2;
              break;
            }

            return _context22.abrupt("return", {});

          case 2:
            ret = {};
            _context22.next = 5;
            return Promise.all(Object.entries(attachments).map( /*#__PURE__*/function () {
              var _ref14 = _asyncToGenerator( /*#__PURE__*/_regeneratorRuntime.mark(function _callee21(_ref13) {
                var key, obj, asWrite, hash, asString, length;
                return _regeneratorRuntime.wrap(function _callee21$(_context21) {
                  while (1) {
                    switch (_context21.prev = _context21.next) {
                      case 0:
                        key = _ref13[0], obj = _ref13[1];

                        if (obj.type) {
                          _context21.next = 3;
                          break;
                        }

                        throw newRxError('SNH', {
                          args: obj
                        });

                      case 3:
                        if (!obj.data) {
                          _context21.next = 15;
                          break;
                        }

                        asWrite = obj;
                        _context21.next = 7;
                        return pouchHash(asWrite.data);

                      case 7:
                        hash = _context21.sent;
                        _context21.next = 10;
                        return blobBufferUtil.toString(asWrite.data);

                      case 10:
                        asString = _context21.sent;
                        length = asString.length;
                        ret[key] = {
                          digest: hash,
                          length: length,
                          type: asWrite.type
                        };
                        _context21.next = 16;
                        break;

                      case 15:
                        ret[key] = obj;

                      case 16:
                      case "end":
                        return _context21.stop();
                    }
                  }
                }, _callee21);
              }));

              return function (_x27) {
                return _ref14.apply(this, arguments);
              };
            }()));

          case 5:
            return _context22.abrupt("return", ret);

          case 6:
          case "end":
            return _context22.stop();
        }
      }
    }, _callee22);
  }));
  return _writeAttachmentsToAttachments.apply(this, arguments);
}

export function checkPouchAdapter(adapter) {
  if (typeof adapter === 'string') {
    // TODO make a function hasAdapter()
    if (!PouchDB.adapters || !PouchDB.adapters[adapter]) {
      throw newRxError('DB9', {
        adapter: adapter
      });
    }
  } else {
    isLevelDown(adapter);

    if (!PouchDB.adapters || !PouchDB.adapters.leveldb) {
      throw newRxError('DB10', {
        adapter: adapter
      });
    }
  }
}
export function pouchHash(data) {
  return new Promise(function (res) {
    binaryMd5(data, function (digest) {
      res('md5-' + digest);
    });
  });
}
export function pouchSwapIdToPrimary(primaryKey, docData) {
  if (primaryKey === '_id' || docData[primaryKey]) {
    return docData;
  }

  docData = flatClone(docData);
  docData[primaryKey] = docData._id;
  delete docData._id;
  return docData;
}
export function pouchDocumentDataToRxDocumentData(primaryKey, pouchDoc) {
  var useDoc = pouchSwapIdToPrimary(primaryKey, pouchDoc); // always flat clone becaues we mutate the _attachments property.

  useDoc = flatClone(useDoc);
  delete useDoc._revisions;
  useDoc._attachments = {};

  if (pouchDoc._attachments) {
    Object.entries(pouchDoc._attachments).forEach(function (_ref10) {
      var key = _ref10[0],
          value = _ref10[1];

      if (value.data) {
        useDoc._attachments[key] = {
          data: value.data,
          type: value.type
        };
      } else {
        useDoc._attachments[key] = {
          digest: value.digest,
          // TODO why do we need to access value.type?
          type: value.type ? value.type : value.content_type,
          length: value.length
        };
      }
    });
  }

  return useDoc;
}
export function rxDocumentDataToPouchDocumentData(primaryKey, doc) {
  var pouchDoc = pouchSwapPrimaryToId(primaryKey, doc); // always flat clone becaues we mutate the _attachments property.

  pouchDoc = flatClone(pouchDoc);
  pouchDoc._attachments = {};

  if (doc._attachments) {
    Object.entries(doc._attachments).forEach(function (_ref11) {
      var key = _ref11[0],
          value = _ref11[1];
      var useValue = value;

      if (useValue.data) {
        pouchDoc._attachments[key] = {
          data: useValue.data,
          content_type: useValue.type
        };
      } else {
        pouchDoc._attachments[key] = {
          digest: useValue.digest,
          content_type: useValue.type,
          length: useValue.length,
          stub: true
        };
      }
    });
  }

  return pouchDoc;
}
export function pouchSwapPrimaryToId(primaryKey, docData) {
  if (primaryKey === '_id') {
    return docData;
  }

  var ret = {};
  Object.entries(docData).forEach(function (entry) {
    var newKey = entry[0] === primaryKey ? '_id' : entry[0];
    ret[newKey] = entry[1];
  });
  return ret;
}
/**
 * in:  '_local/foobar'
 * out: 'foobar'
 */

export function pouchStripLocalFlagFromPrimary(str) {
  return str.substring(POUCHDB_LOCAL_PREFIX.length);
}
export function getEventKey(isLocal, primary, revision) {
  // TODO remove this check this should never happen
  if (!primary) {
    throw new Error('primary missing !!');
  }

  var prefix = isLocal ? 'local' : 'non-local';
  var eventKey = prefix + '|' + primary + '|' + revision;
  return eventKey;
}
export function pouchChangeRowToChangeEvent(primaryKey, pouchDoc) {
  if (!pouchDoc) {
    throw newRxError('SNH', {
      args: {
        pouchDoc: pouchDoc
      }
    });
  }

  var id = pouchDoc._id;
  var doc = pouchDocumentDataToRxDocumentData(primaryKey, pouchDoc);
  var revHeight = getHeightOfRevision(doc._rev);

  if (pouchDoc._deleted) {
    return {
      operation: 'DELETE',
      id: id,
      doc: null,
      previous: doc
    };
  } else if (revHeight === 1) {
    return {
      operation: 'INSERT',
      id: id,
      doc: doc,
      previous: null
    };
  } else {
    return {
      operation: 'UPDATE',
      id: id,
      doc: doc,
      previous: 'UNKNOWN'
    };
  }
}
export function pouchChangeRowToChangeStreamEvent(primaryKey, pouchRow) {
  var doc = pouchRow.doc;

  if (!doc) {
    throw newRxError('SNH', {
      args: {
        pouchRow: pouchRow
      }
    });
  }

  var revHeight = getHeightOfRevision(doc._rev);

  if (pouchRow.deleted) {
    var previousDoc = flatClone(pouchDocumentDataToRxDocumentData(primaryKey, pouchRow.doc));
    delete previousDoc._deleted;
    var ev = {
      sequence: pouchRow.seq,
      id: pouchRow.id,
      operation: 'DELETE',
      doc: null,
      previous: previousDoc
    };
    return ev;
  } else if (revHeight === 1) {
    var _ev = {
      sequence: pouchRow.seq,
      id: pouchRow.id,
      operation: 'INSERT',
      doc: pouchDocumentDataToRxDocumentData(primaryKey, pouchRow.doc),
      previous: null
    };
    return _ev;
  } else {
    var _ev2 = {
      sequence: pouchRow.seq,
      id: pouchRow.id,
      operation: 'UPDATE',
      doc: pouchDocumentDataToRxDocumentData(primaryKey, pouchRow.doc),
      previous: 'UNKNOWN'
    };
    return _ev2;
  }
}
/**
 * Runs a primary swap with transform all custom primaryKey occurences
 * into '_id'
 * @recursive
 */

export function primarySwapPouchDbQuerySelector(selector, primaryKey) {
  if (primaryKey === '_id') {
    return selector;
  }

  if (Array.isArray(selector)) {
    return selector.map(function (item) {
      return primarySwapPouchDbQuerySelector(item, primaryKey);
    });
  } else if (typeof selector === 'object') {
    var ret = {};
    Object.entries(selector).forEach(function (_ref12) {
      var k = _ref12[0],
          v = _ref12[1];

      if (k === primaryKey) {
        ret._id = v;
      } else {
        if (k.startsWith('$')) {
          ret[k] = primarySwapPouchDbQuerySelector(v, primaryKey);
        } else {
          ret[k] = v;
        }
      }
    });
    return ret;
  } else {
    return selector;
  }
}
/**
 * Creates the indexes of the schema inside of the pouchdb instance.
 * Will skip indexes that already exist.
 */

export function createIndexesOnPouch(_x25, _x26) {
  return _createIndexesOnPouch.apply(this, arguments);
}
/**
 * returns the pouchdb-database-name
 */

function _createIndexesOnPouch() {
  _createIndexesOnPouch = _asyncToGenerator( /*#__PURE__*/_regeneratorRuntime.mark(function _callee24(pouch, schema) {
    var primaryKey, before, existingIndexes;
    return _regeneratorRuntime.wrap(function _callee24$(_context24) {
      while (1) {
        switch (_context24.prev = _context24.next) {
          case 0:
            if (schema.indexes) {
              _context24.next = 2;
              break;
            }

            return _context24.abrupt("return");

          case 2:
            primaryKey = schema.primaryKey;
            _context24.next = 5;
            return pouch.getIndexes();

          case 5:
            before = _context24.sent;
            existingIndexes = new Set(before.indexes.map(function (idx) {
              return idx.name;
            }));
            _context24.next = 9;
            return Promise.all(schema.indexes.map( /*#__PURE__*/function () {
              var _ref15 = _asyncToGenerator( /*#__PURE__*/_regeneratorRuntime.mark(function _callee23(indexMaybeArray) {
                var indexArray, indexName;
                return _regeneratorRuntime.wrap(function _callee23$(_context23) {
                  while (1) {
                    switch (_context23.prev = _context23.next) {
                      case 0:
                        indexArray = Array.isArray(indexMaybeArray) ? indexMaybeArray : [indexMaybeArray];
                        /**
                         * replace primary key with _id
                         * because that is the enforced primary key on pouchdb.
                         */

                        /**
                         * replace primary key with _id
                         * because that is the enforced primary key on pouchdb.
                         */
                        indexArray = indexArray.map(function (key) {
                          if (key === primaryKey) {
                            return '_id';
                          } else {
                            return key;
                          }
                        });
                        indexName = 'idx-rxdb-index-' + indexArray.join(',');

                        if (!existingIndexes.has(indexName)) {
                          _context23.next = 5;
                          break;
                        }

                        return _context23.abrupt("return");

                      case 5:
                        return _context23.abrupt("return", pouch.createIndex({
                          name: indexName,
                          ddoc: indexName,
                          index: {
                            fields: indexArray
                          }
                        }));

                      case 6:
                      case "end":
                        return _context23.stop();
                    }
                  }
                }, _callee23);
              }));

              return function (_x28) {
                return _ref15.apply(this, arguments);
              };
            }()));

          case 9:
          case "end":
            return _context24.stop();
        }
      }
    }, _callee24);
  }));
  return _createIndexesOnPouch.apply(this, arguments);
}

export function getPouchLocation(dbName, collectionName, schemaVersion) {
  var prefix = dbName + '-rxdb-' + schemaVersion + '-';

  if (!collectionName.includes('/')) {
    return prefix + collectionName;
  } else {
    // if collectionName is a path, we have to prefix the last part only
    var split = collectionName.split('/');
    var last = split.pop();
    var ret = split.join('/');
    ret += '/' + prefix + last;
    return ret;
  }
}
export function getRxStoragePouch(adapter, pouchSettings) {
  if (!adapter) {
    throw new Error('adapter missing');
  }

  var storage = new RxStoragePouch(adapter, pouchSettings);
  return storage;
}
//# sourceMappingURL=rx-storage-pouchdb.js.map