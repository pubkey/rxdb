import _asyncToGenerator from "@babel/runtime/helpers/asyncToGenerator";
import _regeneratorRuntime from "@babel/runtime/regenerator";
import { Subject } from 'rxjs';
import { newRxError } from '../../rx-error';
import { getPrimaryFieldOfPrimaryKey } from '../../rx-schema';
import { getEventKey, OPEN_POUCHDB_STORAGE_INSTANCES, pouchChangeRowToChangeEvent, POUCHDB_DESIGN_PREFIX, POUCHDB_LOCAL_PREFIX, pouchDocumentDataToRxDocumentData, pouchSwapIdToPrimary, pouchSwapPrimaryToId, primarySwapPouchDbQuerySelector, rxDocumentDataToPouchDocumentData, writeAttachmentsToAttachments } from './pouchdb-helper';
import { filterInMemoryFields, massageSelector } from 'pouchdb-selector-core';
import { flatClone, getFromMapOrThrow, getHeightOfRevision, PROMISE_RESOLVE_VOID } from '../../util';
import { getCustomEventEmitterByPouch } from './custom-events-plugin';
import { getSchemaByObjectPath } from '../../rx-schema-helper';
export var RxStorageInstancePouch = /*#__PURE__*/function () {
  function RxStorageInstancePouch(databaseName, collectionName, schema, internals, options) {
    var _this = this;

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
      var _ref = _asyncToGenerator( /*#__PURE__*/_regeneratorRuntime.mark(function _callee4(ev) {
        var writeDocsById, writeMap;
        return _regeneratorRuntime.wrap(function _callee4$(_context4) {
          while (1) {
            switch (_context4.prev = _context4.next) {
              case 0:
                if (!(ev.writeOptions.hasOwnProperty('new_edits') && !ev.writeOptions.new_edits)) {
                  _context4.next = 4;
                  break;
                }

                _context4.next = 3;
                return Promise.all(ev.writeDocs.map( /*#__PURE__*/function () {
                  var _ref2 = _asyncToGenerator( /*#__PURE__*/_regeneratorRuntime.mark(function _callee(writeDoc) {
                    var id, previousDoc, event;
                    return _regeneratorRuntime.wrap(function _callee$(_context) {
                      while (1) {
                        switch (_context.prev = _context.next) {
                          case 0:
                            id = writeDoc._id;
                            writeDoc = pouchDocumentDataToRxDocumentData(_this.primaryPath, writeDoc);
                            _context.next = 4;
                            return writeAttachmentsToAttachments(writeDoc._attachments);

                          case 4:
                            writeDoc._attachments = _context.sent;
                            previousDoc = ev.previousDocs.get(id);

                            if (previousDoc) {
                              previousDoc = pouchDocumentDataToRxDocumentData(_this.primaryPath, previousDoc);
                            }

                            if (!(previousDoc && getHeightOfRevision(previousDoc._rev) > getHeightOfRevision(writeDoc._rev))) {
                              _context.next = 9;
                              break;
                            }

                            return _context.abrupt("return");

                          case 9:
                            if (!(!previousDoc && writeDoc._deleted)) {
                              _context.next = 11;
                              break;
                            }

                            return _context.abrupt("return");

                          case 11:
                            if (!(previousDoc && previousDoc._deleted && writeDoc._deleted)) {
                              _context.next = 13;
                              break;
                            }

                            return _context.abrupt("return");

                          case 13:
                            if (!((!previousDoc || previousDoc._deleted) && !writeDoc._deleted)) {
                              _context.next = 17;
                              break;
                            }

                            // was insert
                            event = {
                              operation: 'INSERT',
                              doc: writeDoc,
                              id: id,
                              previous: null
                            };
                            _context.next = 27;
                            break;

                          case 17:
                            if (!(writeDoc._deleted && previousDoc && !previousDoc._deleted)) {
                              _context.next = 22;
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
                            _context.next = 27;
                            break;

                          case 22:
                            if (!previousDoc) {
                              _context.next = 26;
                              break;
                            }

                            // was update
                            event = {
                              operation: 'UPDATE',
                              doc: writeDoc,
                              id: id,
                              previous: previousDoc
                            };
                            _context.next = 27;
                            break;

                          case 26:
                            throw newRxError('SNH', {
                              args: {
                                writeDoc: writeDoc
                              }
                            });

                          case 27:
                            _this.addEventToChangeStream(event, ev.startTime, ev.endTime);

                          case 28:
                          case "end":
                            return _context.stop();
                        }
                      }
                    }, _callee);
                  }));

                  return function (_x2) {
                    return _ref2.apply(this, arguments);
                  };
                }()));

              case 3:
                return _context4.abrupt("return");

              case 4:
                if (ev.writeOptions.custom) {
                  _context4.next = 10;
                  break;
                }

                writeDocsById = new Map();
                ev.writeDocs.forEach(function (writeDoc) {
                  return writeDocsById.set(writeDoc._id, writeDoc);
                });
                _context4.next = 9;
                return Promise.all(ev.writeResult.map( /*#__PURE__*/function () {
                  var _ref3 = _asyncToGenerator( /*#__PURE__*/_regeneratorRuntime.mark(function _callee2(resultRow) {
                    var id, writeDoc, event;
                    return _regeneratorRuntime.wrap(function _callee2$(_context2) {
                      while (1) {
                        switch (_context2.prev = _context2.next) {
                          case 0:
                            id = resultRow.id;

                            if (!(id.startsWith(POUCHDB_DESIGN_PREFIX) || id.startsWith(POUCHDB_LOCAL_PREFIX))) {
                              _context2.next = 3;
                              break;
                            }

                            return _context2.abrupt("return");

                          case 3:
                            writeDoc = getFromMapOrThrow(writeDocsById, resultRow.id);
                            _context2.next = 6;
                            return writeAttachmentsToAttachments(writeDoc._attachments);

                          case 6:
                            writeDoc._attachments = _context2.sent;
                            writeDoc = flatClone(writeDoc);
                            writeDoc._rev = resultRow.rev;
                            event = pouchChangeRowToChangeEvent(_this.primaryPath, writeDoc);

                            _this.addEventToChangeStream(event);

                          case 11:
                          case "end":
                            return _context2.stop();
                        }
                      }
                    }, _callee2);
                  }));

                  return function (_x3) {
                    return _ref3.apply(this, arguments);
                  };
                }()));

              case 9:
                return _context4.abrupt("return");

              case 10:
                writeMap = ev.writeOptions.custom.writeRowById;
                _context4.next = 13;
                return Promise.all(ev.writeResult.map( /*#__PURE__*/function () {
                  var _ref4 = _asyncToGenerator( /*#__PURE__*/_regeneratorRuntime.mark(function _callee3(resultRow) {
                    var id, writeRow, newDoc, event, previousDoc;
                    return _regeneratorRuntime.wrap(function _callee3$(_context3) {
                      while (1) {
                        switch (_context3.prev = _context3.next) {
                          case 0:
                            if (!resultRow.error) {
                              _context3.next = 2;
                              break;
                            }

                            return _context3.abrupt("return");

                          case 2:
                            id = resultRow.id;
                            writeRow = getFromMapOrThrow(writeMap, id);
                            newDoc = pouchDocumentDataToRxDocumentData(_this.primaryPath, writeRow.document);
                            _context3.next = 7;
                            return writeAttachmentsToAttachments(newDoc._attachments);

                          case 7:
                            newDoc._attachments = _context3.sent;
                            newDoc._rev = resultRow.rev;

                            if (!(!writeRow.previous || writeRow.previous._deleted)) {
                              _context3.next = 13;
                              break;
                            }

                            // was insert
                            event = {
                              operation: 'INSERT',
                              doc: newDoc,
                              id: id,
                              previous: null
                            };
                            _context3.next = 23;
                            break;

                          case 13:
                            if (!writeRow.document._deleted) {
                              _context3.next = 22;
                              break;
                            }

                            // was delete
                            // we need to add the new revision to the previous doc
                            // so that the eventkey is calculated correctly.
                            // Is this a hack? idk.
                            previousDoc = pouchDocumentDataToRxDocumentData(_this.primaryPath, writeRow.previous);
                            _context3.next = 17;
                            return writeAttachmentsToAttachments(previousDoc._attachments);

                          case 17:
                            previousDoc._attachments = _context3.sent;
                            previousDoc._rev = resultRow.rev;
                            event = {
                              operation: 'DELETE',
                              doc: null,
                              id: resultRow.id,
                              previous: previousDoc
                            };
                            _context3.next = 23;
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
                              _this.addEventToChangeStream(event, ev.startTime, ev.endTime);
                            }

                          case 24:
                          case "end":
                            return _context3.stop();
                        }
                      }
                    }, _callee3);
                  }));

                  return function (_x4) {
                    return _ref4.apply(this, arguments);
                  };
                }()));

              case 13:
              case "end":
                return _context4.stop();
            }
          }
        }, _callee4);
      }));

      return function (_x) {
        return _ref.apply(this, arguments);
      };
    }());
    this.subs.push(eventSub);
  }

  var _proto = RxStorageInstancePouch.prototype;

  _proto.addEventToChangeStream = function addEventToChangeStream(change, startTime, endTime) {
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

  _proto.close = function close() {
    this.subs.forEach(function (sub) {
      return sub.unsubscribe();
    });
    OPEN_POUCHDB_STORAGE_INSTANCES["delete"](this); // TODO this did not work because a closed pouchdb cannot be recreated in the same process run
    // await this.internals.pouch.close();

    return PROMISE_RESOLVE_VOID;
  };

  _proto.remove = /*#__PURE__*/function () {
    var _remove = _asyncToGenerator( /*#__PURE__*/_regeneratorRuntime.mark(function _callee5() {
      return _regeneratorRuntime.wrap(function _callee5$(_context5) {
        while (1) {
          switch (_context5.prev = _context5.next) {
            case 0:
              this.subs.forEach(function (sub) {
                return sub.unsubscribe();
              });
              OPEN_POUCHDB_STORAGE_INSTANCES["delete"](this);
              _context5.next = 4;
              return this.internals.pouch.destroy();

            case 4:
            case "end":
              return _context5.stop();
          }
        }
      }, _callee5, this);
    }));

    function remove() {
      return _remove.apply(this, arguments);
    }

    return remove;
  }();

  _proto.getSortComparator = function getSortComparator(query) {
    var _ref5,
        _this2 = this;

    var primaryPath = getPrimaryFieldOfPrimaryKey(this.schema.primaryKey);
    var sortOptions = query.sort ? query.sort : [(_ref5 = {}, _ref5[primaryPath] = 'asc', _ref5)];
    var inMemoryFields = Object.keys(query.selector);

    var fun = function fun(a, b) {
      /**
       * Sorting on two documents with the same primary is not allowed
       * because it might end up in a non-deterministic result.
       */
      if (a[primaryPath] === b[primaryPath]) {
        throw newRxError('SNH', {
          args: {
            a: a,
            b: b
          },
          primaryPath: primaryPath
        });
      } // TODO use createFieldSorter
      // TODO make a performance test


      var rows = [a, b].map(function (doc) {
        return {
          doc: pouchSwapPrimaryToId(_this2.primaryPath, doc)
        };
      });
      var sortedRows = filterInMemoryFields(rows, {
        selector: {},
        sort: sortOptions
      }, inMemoryFields);

      if (sortedRows.length !== 2) {
        throw newRxError('SNH', {
          query: query,
          primaryPath: _this2.primaryPath,
          args: {
            rows: rows,
            sortedRows: sortedRows
          }
        });
      }

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

  _proto.getQueryMatcher = function getQueryMatcher(query) {
    var _this3 = this;

    var massagedSelector = massageSelector(query.selector);

    var fun = function fun(doc) {
      var cloned = pouchSwapPrimaryToId(_this3.primaryPath, doc);
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

  _proto.prepareQuery = function prepareQuery(mutateableQuery) {
    var _this4 = this;

    var primaryKey = getPrimaryFieldOfPrimaryKey(this.schema.primaryKey);
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
          var schemaObj = getSchemaByObjectPath(_this4.schema, key);

          if (!schemaObj) {
            throw newRxError('QU5', {
              query: query,
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


    Object.entries(query.selector).forEach(function (_ref6) {
      var k = _ref6[0],
          v = _ref6[1];

      if (typeof v === 'object' && v !== null && !Array.isArray(v) && Object.keys(v).length === 0) {
        delete query.selector[k];
      }
    });
    query.selector = primarySwapPouchDbQuerySelector(query.selector, this.primaryPath);
    /**
     * To ensure a deterministic sorting,
     * we have to ensure the primary key is always part
     * of the sort query.
     * TODO This should be done but will not work with pouchdb
     * because it will throw
     * 'Cannot sort on field(s) "key" when using the default index'
     * So we likely have to modify the indexes so that this works. 
     */

    /*
    if (!mutateableQuery.sort) {
        mutateableQuery.sort = [{ [this.primaryPath]: 'asc' }] as any;
    } else {
        const isPrimaryInSort = mutateableQuery.sort
            .find(p => firstPropertyNameOfObject(p) === this.primaryPath);
        if (!isPrimaryInSort) {
            mutateableQuery.sort.push({ [this.primaryPath]: 'asc' } as any);
        }
    }
    */

    return query;
  };

  _proto.bulkAddRevisions = /*#__PURE__*/function () {
    var _bulkAddRevisions = _asyncToGenerator( /*#__PURE__*/_regeneratorRuntime.mark(function _callee6(documents) {
      var _this5 = this;

      var writeData;
      return _regeneratorRuntime.wrap(function _callee6$(_context6) {
        while (1) {
          switch (_context6.prev = _context6.next) {
            case 0:
              if (!(documents.length === 0)) {
                _context6.next = 2;
                break;
              }

              throw newRxError('P3', {
                args: {
                  documents: documents
                }
              });

            case 2:
              writeData = documents.map(function (doc) {
                return rxDocumentDataToPouchDocumentData(_this5.primaryPath, doc);
              }); // we do not need the response here because pouchdb returns an empty array on new_edits: false

              _context6.next = 5;
              return this.internals.pouch.bulkDocs(writeData, {
                new_edits: false,
                set_new_edit_as_latest_revision: true
              });

            case 5:
            case "end":
              return _context6.stop();
          }
        }
      }, _callee6, this);
    }));

    function bulkAddRevisions(_x5) {
      return _bulkAddRevisions.apply(this, arguments);
    }

    return bulkAddRevisions;
  }();

  _proto.bulkWrite = /*#__PURE__*/function () {
    var _bulkWrite = _asyncToGenerator( /*#__PURE__*/_regeneratorRuntime.mark(function _callee8(documentWrites) {
      var _this6 = this;

      var writeRowById, insertDocs, pouchResult, ret;
      return _regeneratorRuntime.wrap(function _callee8$(_context8) {
        while (1) {
          switch (_context8.prev = _context8.next) {
            case 0:
              if (!(documentWrites.length === 0)) {
                _context8.next = 2;
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
                var primary = writeData.document[_this6.primaryPath];
                writeRowById.set(primary, writeData);
                var storeDocumentData = rxDocumentDataToPouchDocumentData(_this6.primaryPath, writeData.document); // if previous document exists, we have to send the previous revision to pouchdb.

                if (writeData.previous) {
                  storeDocumentData._rev = writeData.previous._rev;
                }

                return storeDocumentData;
              });
              _context8.next = 6;
              return this.internals.pouch.bulkDocs(insertDocs, {
                custom: {
                  writeRowById: writeRowById
                }
              });

            case 6:
              pouchResult = _context8.sent;
              ret = {
                success: new Map(),
                error: new Map()
              };
              _context8.next = 10;
              return Promise.all(pouchResult.map( /*#__PURE__*/function () {
                var _ref7 = _asyncToGenerator( /*#__PURE__*/_regeneratorRuntime.mark(function _callee7(resultRow) {
                  var writeRow, err, pushObj;
                  return _regeneratorRuntime.wrap(function _callee7$(_context7) {
                    while (1) {
                      switch (_context7.prev = _context7.next) {
                        case 0:
                          writeRow = getFromMapOrThrow(writeRowById, resultRow.id);

                          if (!resultRow.error) {
                            _context7.next = 6;
                            break;
                          }

                          err = {
                            isError: true,
                            status: 409,
                            documentId: resultRow.id,
                            writeRow: writeRow
                          };
                          ret.error.set(resultRow.id, err);
                          _context7.next = 18;
                          break;

                        case 6:
                          pushObj = flatClone(writeRow.document);
                          pushObj = pouchSwapIdToPrimary(_this6.primaryPath, pushObj);
                          pushObj._rev = resultRow.rev; // replace the inserted attachments with their diggest

                          // replace the inserted attachments with their diggest
                          pushObj._attachments = {};

                          if (writeRow.document._attachments) {
                            _context7.next = 14;
                            break;
                          }

                          writeRow.document._attachments = {};
                          _context7.next = 17;
                          break;

                        case 14:
                          _context7.next = 16;
                          return writeAttachmentsToAttachments(writeRow.document._attachments);

                        case 16:
                          pushObj._attachments = _context7.sent;

                        case 17:
                          ret.success.set(resultRow.id, pushObj);

                        case 18:
                        case "end":
                          return _context7.stop();
                      }
                    }
                  }, _callee7);
                }));

                return function (_x7) {
                  return _ref7.apply(this, arguments);
                };
              }()));

            case 10:
              return _context8.abrupt("return", ret);

            case 11:
            case "end":
              return _context8.stop();
          }
        }
      }, _callee8, this);
    }));

    function bulkWrite(_x6) {
      return _bulkWrite.apply(this, arguments);
    }

    return bulkWrite;
  }();

  _proto.query = /*#__PURE__*/function () {
    var _query = _asyncToGenerator( /*#__PURE__*/_regeneratorRuntime.mark(function _callee9(preparedQuery) {
      var _this7 = this;

      var findResult, ret;
      return _regeneratorRuntime.wrap(function _callee9$(_context9) {
        while (1) {
          switch (_context9.prev = _context9.next) {
            case 0:
              _context9.next = 2;
              return this.internals.pouch.find(preparedQuery);

            case 2:
              findResult = _context9.sent;
              ret = {
                documents: findResult.docs.map(function (pouchDoc) {
                  var useDoc = pouchDocumentDataToRxDocumentData(_this7.primaryPath, pouchDoc);
                  return useDoc;
                })
              };
              return _context9.abrupt("return", ret);

            case 5:
            case "end":
              return _context9.stop();
          }
        }
      }, _callee9, this);
    }));

    function query(_x8) {
      return _query.apply(this, arguments);
    }

    return query;
  }();

  _proto.getAttachmentData = /*#__PURE__*/function () {
    var _getAttachmentData = _asyncToGenerator( /*#__PURE__*/_regeneratorRuntime.mark(function _callee10(documentId, attachmentId) {
      var attachmentData;
      return _regeneratorRuntime.wrap(function _callee10$(_context10) {
        while (1) {
          switch (_context10.prev = _context10.next) {
            case 0:
              _context10.next = 2;
              return this.internals.pouch.getAttachment(documentId, attachmentId);

            case 2:
              attachmentData = _context10.sent;
              return _context10.abrupt("return", attachmentData);

            case 4:
            case "end":
              return _context10.stop();
          }
        }
      }, _callee10, this);
    }));

    function getAttachmentData(_x9, _x10) {
      return _getAttachmentData.apply(this, arguments);
    }

    return getAttachmentData;
  }();

  _proto.findDocumentsById = /*#__PURE__*/function () {
    var _findDocumentsById = _asyncToGenerator( /*#__PURE__*/_regeneratorRuntime.mark(function _callee12(ids, deleted) {
      var _this8 = this;

      var viaChanges, retDocs, pouchResult, ret;
      return _regeneratorRuntime.wrap(function _callee12$(_context12) {
        while (1) {
          switch (_context12.prev = _context12.next) {
            case 0:
              if (!deleted) {
                _context12.next = 8;
                break;
              }

              _context12.next = 3;
              return this.internals.pouch.changes({
                live: false,
                since: 0,
                doc_ids: ids,
                style: 'all_docs'
              });

            case 3:
              viaChanges = _context12.sent;
              retDocs = new Map();
              _context12.next = 7;
              return Promise.all(viaChanges.results.map( /*#__PURE__*/function () {
                var _ref8 = _asyncToGenerator( /*#__PURE__*/_regeneratorRuntime.mark(function _callee11(result) {
                  var firstDoc, useFirstDoc;
                  return _regeneratorRuntime.wrap(function _callee11$(_context11) {
                    while (1) {
                      switch (_context11.prev = _context11.next) {
                        case 0:
                          _context11.next = 2;
                          return _this8.internals.pouch.get(result.id, {
                            rev: result.changes[0].rev,
                            deleted: 'ok',
                            style: 'all_docs'
                          });

                        case 2:
                          firstDoc = _context11.sent;
                          useFirstDoc = pouchDocumentDataToRxDocumentData(_this8.primaryPath, firstDoc);
                          retDocs.set(result.id, useFirstDoc);

                        case 5:
                        case "end":
                          return _context11.stop();
                      }
                    }
                  }, _callee11);
                }));

                return function (_x13) {
                  return _ref8.apply(this, arguments);
                };
              }()));

            case 7:
              return _context12.abrupt("return", retDocs);

            case 8:
              _context12.next = 10;
              return this.internals.pouch.allDocs({
                include_docs: true,
                keys: ids
              });

            case 10:
              pouchResult = _context12.sent;
              ret = new Map();
              pouchResult.rows.filter(function (row) {
                return !!row.doc;
              }).forEach(function (row) {
                var docData = row.doc;
                docData = pouchDocumentDataToRxDocumentData(_this8.primaryPath, docData);
                ret.set(row.id, docData);
              });
              return _context12.abrupt("return", ret);

            case 14:
            case "end":
              return _context12.stop();
          }
        }
      }, _callee12, this);
    }));

    function findDocumentsById(_x11, _x12) {
      return _findDocumentsById.apply(this, arguments);
    }

    return findDocumentsById;
  }();

  _proto.changeStream = function changeStream() {
    return this.changes$.asObservable();
  };

  _proto.getChangedDocuments = /*#__PURE__*/function () {
    var _getChangedDocuments = _asyncToGenerator( /*#__PURE__*/_regeneratorRuntime.mark(function _callee13(options) {
      var pouchChangesOpts, pouchResults, changedDocuments, lastSequence;
      return _regeneratorRuntime.wrap(function _callee13$(_context13) {
        while (1) {
          switch (_context13.prev = _context13.next) {
            case 0:
              pouchChangesOpts = {
                live: false,
                limit: options.limit,
                include_docs: false,
                since: options.sinceSequence,
                descending: options.direction === 'before' ? true : false
              };
              _context13.next = 3;
              return this.internals.pouch.changes(pouchChangesOpts);

            case 3:
              pouchResults = _context13.sent;

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
              return _context13.abrupt("return", {
                changedDocuments: changedDocuments,
                lastSequence: lastSequence
              });

            case 7:
            case "end":
              return _context13.stop();
          }
        }
      }, _callee13, this);
    }));

    function getChangedDocuments(_x14) {
      return _getChangedDocuments.apply(this, arguments);
    }

    return getChangedDocuments;
  }();

  return RxStorageInstancePouch;
}();
//# sourceMappingURL=rx-storage-instance-pouch.js.map