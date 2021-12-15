import _asyncToGenerator from "@babel/runtime/helpers/asyncToGenerator";
import _regeneratorRuntime from "@babel/runtime/regenerator";
import { Subject } from 'rxjs';
import { promiseWait, createRevision, getHeightOfRevision, parseRevision, lastOfArray, flatClone, now, ensureNotFalsy, randomCouchString } from '../../util';
import { newRxError } from '../../rx-error';
import { getPrimaryFieldOfPrimaryKey } from '../../rx-schema';
import { LOKI_BROADCAST_CHANNEL_MESSAGE_TYPE, CHANGES_COLLECTION_SUFFIX, closeLokiCollections, getLokiDatabase, getLokiEventKey, OPEN_LOKIJS_STORAGE_INSTANCES, LOKIJS_COLLECTION_DEFAULT_OPTIONS, stripLokiKey, getLokiSortComparator, getLokiLeaderElector, removeLokiLeaderElectorReference } from './lokijs-helper';
var instanceId = now();
export var RxStorageInstanceLoki = /*#__PURE__*/function () {
  function RxStorageInstanceLoki(storage, databaseName, collectionName, schema, internals, options, databaseSettings) {
    var _this = this;

    this.changes$ = new Subject();
    this.lastChangefeedSequence = 0;
    this.instanceId = instanceId++;
    this.closed = false;
    this.storage = storage;
    this.databaseName = databaseName;
    this.collectionName = collectionName;
    this.schema = schema;
    this.internals = internals;
    this.options = options;
    this.databaseSettings = databaseSettings;
    this.primaryPath = getPrimaryFieldOfPrimaryKey(this.schema.primaryKey);
    OPEN_LOKIJS_STORAGE_INSTANCES.add(this);

    if (this.internals.leaderElector) {
      this.internals.leaderElector.awaitLeadership().then(function () {
        // this instance is leader now, so it has to reply to queries from other instances
        ensureNotFalsy(_this.internals.leaderElector).broadcastChannel.addEventListener('message', /*#__PURE__*/function () {
          var _ref = _asyncToGenerator( /*#__PURE__*/_regeneratorRuntime.mark(function _callee(msg) {
            var operation, params, result, isError, _ref2, response;

            return _regeneratorRuntime.wrap(function _callee$(_context) {
              while (1) {
                switch (_context.prev = _context.next) {
                  case 0:
                    if (!(msg.type === LOKI_BROADCAST_CHANNEL_MESSAGE_TYPE && msg.requestId && msg.databaseName === _this.databaseName && msg.collectionName === _this.collectionName && !msg.response)) {
                      _context.next = 16;
                      break;
                    }

                    operation = msg.operation;
                    params = msg.params;
                    isError = false;
                    _context.prev = 4;
                    _context.next = 7;
                    return (_ref2 = _this)[operation].apply(_ref2, params);

                  case 7:
                    result = _context.sent;
                    _context.next = 14;
                    break;

                  case 10:
                    _context.prev = 10;
                    _context.t0 = _context["catch"](4);
                    result = _context.t0;
                    isError = true;

                  case 14:
                    response = {
                      response: true,
                      requestId: msg.requestId,
                      databaseName: _this.databaseName,
                      collectionName: _this.collectionName,
                      result: result,
                      isError: isError,
                      type: msg.type
                    };
                    ensureNotFalsy(_this.internals.leaderElector).broadcastChannel.postMessage(response);

                  case 16:
                  case "end":
                    return _context.stop();
                }
              }
            }, _callee, null, [[4, 10]]);
          }));

          return function (_x) {
            return _ref.apply(this, arguments);
          };
        }());
      });
    }
  }

  var _proto = RxStorageInstanceLoki.prototype;

  _proto.getLocalState = function getLocalState() {
    var ret = ensureNotFalsy(this.internals.localState);
    return ret;
  }
  /**
   * If the local state must be used, that one is returned.
   * Returns false if a remote instance must be used.
   */
  ;

  _proto.mustUseLocalState =
  /*#__PURE__*/
  function () {
    var _mustUseLocalState = _asyncToGenerator( /*#__PURE__*/_regeneratorRuntime.mark(function _callee2() {
      var leaderElector;
      return _regeneratorRuntime.wrap(function _callee2$(_context2) {
        while (1) {
          switch (_context2.prev = _context2.next) {
            case 0:
              if (!this.closed) {
                _context2.next = 2;
                break;
              }

              return _context2.abrupt("return", false);

            case 2:
              if (!this.internals.localState) {
                _context2.next = 4;
                break;
              }

              return _context2.abrupt("return", this.internals.localState);

            case 4:
              leaderElector = ensureNotFalsy(this.internals.leaderElector);

            case 5:
              if (leaderElector.hasLeader) {
                _context2.next = 12;
                break;
              }

              _context2.next = 8;
              return leaderElector.applyOnce();

            case 8:
              _context2.next = 10;
              return promiseWait(0);

            case 10:
              _context2.next = 5;
              break;

            case 12:
              if (!this.internals.localState) {
                _context2.next = 14;
                break;
              }

              return _context2.abrupt("return", this.internals.localState);

            case 14:
              if (!(leaderElector.isLeader && !this.internals.localState)) {
                _context2.next = 19;
                break;
              }

              // own is leader, use local instance
              this.internals.localState = createLokiLocalState({
                databaseName: this.databaseName,
                collectionName: this.collectionName,
                options: this.options,
                schema: this.schema,
                multiInstance: this.internals.leaderElector ? true : false
              }, this.databaseSettings);
              return _context2.abrupt("return", this.getLocalState());

            case 19:
              return _context2.abrupt("return", false);

            case 20:
            case "end":
              return _context2.stop();
          }
        }
      }, _callee2, this);
    }));

    function mustUseLocalState() {
      return _mustUseLocalState.apply(this, arguments);
    }

    return mustUseLocalState;
  }();

  _proto.requestRemoteInstance = /*#__PURE__*/function () {
    var _requestRemoteInstance = _asyncToGenerator( /*#__PURE__*/_regeneratorRuntime.mark(function _callee3(operation, params) {
      var broadcastChannel, requestId, responsePromise, result;
      return _regeneratorRuntime.wrap(function _callee3$(_context3) {
        while (1) {
          switch (_context3.prev = _context3.next) {
            case 0:
              broadcastChannel = ensureNotFalsy(this.internals.leaderElector).broadcastChannel;
              requestId = randomCouchString(12);
              responsePromise = new Promise(function (res, rej) {
                var listener = function listener(msg) {
                  if (msg.type === LOKI_BROADCAST_CHANNEL_MESSAGE_TYPE && msg.response === true && msg.requestId === requestId) {
                    if (msg.isError) {
                      broadcastChannel.removeEventListener('message', listener);
                      rej(msg.result);
                    } else {
                      broadcastChannel.removeEventListener('message', listener);
                      res(msg.result);
                    }
                  }
                };

                broadcastChannel.addEventListener('message', listener);
              });
              broadcastChannel.postMessage({
                response: false,
                type: LOKI_BROADCAST_CHANNEL_MESSAGE_TYPE,
                operation: operation,
                params: params,
                requestId: requestId,
                databaseName: this.databaseName,
                collectionName: this.collectionName
              });
              _context3.next = 6;
              return responsePromise;

            case 6:
              result = _context3.sent;
              return _context3.abrupt("return", result);

            case 8:
            case "end":
              return _context3.stop();
          }
        }
      }, _callee3, this);
    }));

    function requestRemoteInstance(_x2, _x3) {
      return _requestRemoteInstance.apply(this, arguments);
    }

    return requestRemoteInstance;
  }()
  /**
   * Adds an entry to the changes feed
   * that can be queried to check which documents have been
   * changed since sequence X.
   */
  ;

  _proto.addChangeDocumentMeta =
  /*#__PURE__*/
  function () {
    var _addChangeDocumentMeta = _asyncToGenerator( /*#__PURE__*/_regeneratorRuntime.mark(function _callee4(id) {
      var localState, lastDoc, nextFeedSequence;
      return _regeneratorRuntime.wrap(function _callee4$(_context4) {
        while (1) {
          switch (_context4.prev = _context4.next) {
            case 0:
              _context4.next = 2;
              return this.getLocalState();

            case 2:
              localState = _context4.sent;

              if (!this.lastChangefeedSequence) {
                lastDoc = localState.changesCollection.chain().simplesort('sequence', true).limit(1).data()[0];

                if (lastDoc) {
                  this.lastChangefeedSequence = lastDoc.sequence;
                }
              }

              nextFeedSequence = this.lastChangefeedSequence + 1;
              localState.changesCollection.insert({
                id: id,
                sequence: nextFeedSequence
              });
              this.lastChangefeedSequence = nextFeedSequence;

            case 7:
            case "end":
              return _context4.stop();
          }
        }
      }, _callee4, this);
    }));

    function addChangeDocumentMeta(_x4) {
      return _addChangeDocumentMeta.apply(this, arguments);
    }

    return addChangeDocumentMeta;
  }();

  _proto.bulkWrite = /*#__PURE__*/function () {
    var _bulkWrite = _asyncToGenerator( /*#__PURE__*/_regeneratorRuntime.mark(function _callee5(documentWrites) {
      var _this2 = this;

      var localState, ret, eventBulk;
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
              _context5.next = 4;
              return this.mustUseLocalState();

            case 4:
              localState = _context5.sent;

              if (localState) {
                _context5.next = 7;
                break;
              }

              return _context5.abrupt("return", this.requestRemoteInstance('bulkWrite', [documentWrites]));

            case 7:
              _context5.next = 9;
              return promiseWait(0);

            case 9:
              ret = {
                success: {},
                error: {}
              };
              eventBulk = {
                id: randomCouchString(10),
                events: []
              };
              documentWrites.forEach(function (writeRow) {
                var startTime = now();
                var id = writeRow.document[_this2.primaryPath];
                var documentInDb = localState.collection.by(_this2.primaryPath, id);

                if (!documentInDb) {
                  // insert new document
                  var newRevision = '1-' + createRevision(writeRow.document);
                  /**
                   * It is possible to insert already deleted documents,
                   * this can happen on replication.
                   */

                  var insertedIsDeleted = writeRow.document._deleted ? true : false;
                  var writeDoc = Object.assign({}, writeRow.document, {
                    _rev: newRevision,
                    _deleted: insertedIsDeleted,
                    // TODO attachments are currently not working with lokijs
                    _attachments: {}
                  });
                  var insertData = flatClone(writeDoc);
                  insertData.$lastWriteAt = startTime;
                  localState.collection.insert(insertData);

                  if (!insertedIsDeleted) {
                    _this2.addChangeDocumentMeta(id);

                    eventBulk.events.push({
                      eventId: getLokiEventKey(false, id, newRevision),
                      documentId: id,
                      change: {
                        doc: writeDoc,
                        id: id,
                        operation: 'INSERT',
                        previous: null
                      },
                      startTime: startTime,
                      endTime: now()
                    });
                  }

                  ret.success[id] = writeDoc;
                } else {
                  // update existing document
                  var revInDb = documentInDb._rev; // inserting a deleted document is possible
                  // without sending the previous data.

                  if (!writeRow.previous && documentInDb._deleted) {
                    writeRow.previous = documentInDb;
                  }

                  if (!writeRow.previous && !documentInDb._deleted || !!writeRow.previous && revInDb !== writeRow.previous._rev) {
                    // conflict error
                    var err = {
                      isError: true,
                      status: 409,
                      documentId: id,
                      writeRow: writeRow
                    };
                    ret.error[id] = err;
                  } else {
                    var newRevHeight = getHeightOfRevision(revInDb) + 1;

                    var _newRevision = newRevHeight + '-' + createRevision(writeRow.document);

                    var isDeleted = !!writeRow.document._deleted;

                    var _writeDoc = Object.assign({}, writeRow.document, {
                      $loki: documentInDb.$loki,
                      $lastWriteAt: startTime,
                      _rev: _newRevision,
                      _deleted: isDeleted,
                      // TODO attachments are currently not working with lokijs
                      _attachments: {}
                    });

                    localState.collection.update(_writeDoc);

                    _this2.addChangeDocumentMeta(id);

                    var change = null;

                    if (writeRow.previous && writeRow.previous._deleted && !_writeDoc._deleted) {
                      change = {
                        id: id,
                        operation: 'INSERT',
                        previous: null,
                        doc: stripLokiKey(_writeDoc)
                      };
                    } else if (writeRow.previous && !writeRow.previous._deleted && !_writeDoc._deleted) {
                      change = {
                        id: id,
                        operation: 'UPDATE',
                        previous: writeRow.previous,
                        doc: stripLokiKey(_writeDoc)
                      };
                    } else if (writeRow.previous && !writeRow.previous._deleted && _writeDoc._deleted) {
                      /**
                       * On delete, we send the 'new' rev in the previous property,
                       * to have the equal behavior as pouchdb.
                       */
                      var previous = flatClone(writeRow.previous);
                      previous._rev = _newRevision;
                      change = {
                        id: id,
                        operation: 'DELETE',
                        previous: previous,
                        doc: null
                      };
                    }

                    if (!change) {
                      throw newRxError('SNH', {
                        args: {
                          writeRow: writeRow
                        }
                      });
                    }

                    eventBulk.events.push({
                      eventId: getLokiEventKey(false, id, _newRevision),
                      documentId: id,
                      change: change,
                      startTime: startTime,
                      endTime: now()
                    });
                    ret.success[id] = stripLokiKey(_writeDoc);
                  }
                }
              });
              localState.databaseState.saveQueue.addWrite();
              this.changes$.next(eventBulk);
              return _context5.abrupt("return", ret);

            case 15:
            case "end":
              return _context5.stop();
          }
        }
      }, _callee5, this);
    }));

    function bulkWrite(_x5) {
      return _bulkWrite.apply(this, arguments);
    }

    return bulkWrite;
  }();

  _proto.bulkAddRevisions = /*#__PURE__*/function () {
    var _bulkAddRevisions = _asyncToGenerator( /*#__PURE__*/_regeneratorRuntime.mark(function _callee6(documents) {
      var _this3 = this;

      var localState, eventBulk;
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
              _context6.next = 4;
              return this.mustUseLocalState();

            case 4:
              localState = _context6.sent;

              if (localState) {
                _context6.next = 7;
                break;
              }

              return _context6.abrupt("return", this.requestRemoteInstance('bulkAddRevisions', [documents]));

            case 7:
              _context6.next = 9;
              return promiseWait(0);

            case 9:
              eventBulk = {
                id: randomCouchString(10),
                events: []
              };
              documents.forEach(function (docData) {
                var startTime = now();
                var id = docData[_this3.primaryPath];
                var documentInDb = localState.collection.by(_this3.primaryPath, id);

                if (!documentInDb) {
                  // document not here, so we can directly insert
                  var insertData = flatClone(docData);
                  insertData.$lastWriteAt = startTime;
                  localState.collection.insert(insertData);
                  eventBulk.events.push({
                    documentId: id,
                    eventId: getLokiEventKey(false, id, docData._rev),
                    change: {
                      doc: docData,
                      id: id,
                      operation: 'INSERT',
                      previous: null
                    },
                    startTime: startTime,
                    endTime: now()
                  });

                  _this3.addChangeDocumentMeta(id);
                } else {
                  var newWriteRevision = parseRevision(docData._rev);
                  var oldRevision = parseRevision(documentInDb._rev);
                  var mustUpdate = false;

                  if (newWriteRevision.height !== oldRevision.height) {
                    // height not equal, compare base on height
                    if (newWriteRevision.height > oldRevision.height) {
                      mustUpdate = true;
                    }
                  } else if (newWriteRevision.hash > oldRevision.hash) {
                    // equal height but new write has the 'winning' hash
                    mustUpdate = true;
                  }

                  if (mustUpdate) {
                    var storeAtLoki = flatClone(docData);
                    storeAtLoki.$loki = documentInDb.$loki;
                    storeAtLoki.$lastWriteAt = startTime;
                    localState.collection.update(storeAtLoki);
                    var change = null;

                    if (documentInDb._deleted && !docData._deleted) {
                      change = {
                        id: id,
                        operation: 'INSERT',
                        previous: null,
                        doc: docData
                      };
                    } else if (!documentInDb._deleted && !docData._deleted) {
                      change = {
                        id: id,
                        operation: 'UPDATE',
                        previous: stripLokiKey(documentInDb),
                        doc: docData
                      };
                    } else if (!documentInDb._deleted && docData._deleted) {
                      change = {
                        id: id,
                        operation: 'DELETE',
                        previous: stripLokiKey(documentInDb),
                        doc: null
                      };
                    } else if (documentInDb._deleted && docData._deleted) {
                      change = null;
                    }

                    if (change) {
                      eventBulk.events.push({
                        documentId: id,
                        eventId: getLokiEventKey(false, id, docData._rev),
                        change: change,
                        startTime: startTime,
                        endTime: now()
                      });

                      _this3.addChangeDocumentMeta(id);
                    }
                  }
                }
              });
              localState.databaseState.saveQueue.addWrite();
              this.changes$.next(eventBulk);

            case 13:
            case "end":
              return _context6.stop();
          }
        }
      }, _callee6, this);
    }));

    function bulkAddRevisions(_x6) {
      return _bulkAddRevisions.apply(this, arguments);
    }

    return bulkAddRevisions;
  }();

  _proto.findDocumentsById = /*#__PURE__*/function () {
    var _findDocumentsById = _asyncToGenerator( /*#__PURE__*/_regeneratorRuntime.mark(function _callee7(ids, deleted) {
      var _this4 = this;

      var localState, ret;
      return _regeneratorRuntime.wrap(function _callee7$(_context7) {
        while (1) {
          switch (_context7.prev = _context7.next) {
            case 0:
              _context7.next = 2;
              return this.mustUseLocalState();

            case 2:
              localState = _context7.sent;

              if (localState) {
                _context7.next = 5;
                break;
              }

              return _context7.abrupt("return", this.requestRemoteInstance('findDocumentsById', [ids, deleted]));

            case 5:
              ret = {};
              ids.forEach(function (id) {
                var documentInDb = localState.collection.by(_this4.primaryPath, id);

                if (documentInDb && (!documentInDb._deleted || deleted)) {
                  ret[id] = stripLokiKey(documentInDb);
                }
              });
              return _context7.abrupt("return", ret);

            case 8:
            case "end":
              return _context7.stop();
          }
        }
      }, _callee7, this);
    }));

    function findDocumentsById(_x7, _x8) {
      return _findDocumentsById.apply(this, arguments);
    }

    return findDocumentsById;
  }();

  _proto.query = /*#__PURE__*/function () {
    var _query = _asyncToGenerator( /*#__PURE__*/_regeneratorRuntime.mark(function _callee8(preparedQuery) {
      var localState, query, foundDocuments;
      return _regeneratorRuntime.wrap(function _callee8$(_context8) {
        while (1) {
          switch (_context8.prev = _context8.next) {
            case 0:
              _context8.next = 2;
              return this.mustUseLocalState();

            case 2:
              localState = _context8.sent;

              if (localState) {
                _context8.next = 5;
                break;
              }

              return _context8.abrupt("return", this.requestRemoteInstance('query', [preparedQuery]));

            case 5:
              query = localState.collection.chain().find(preparedQuery.selector);

              if (preparedQuery.sort) {
                query = query.sort(getLokiSortComparator(this.schema, preparedQuery));
              }
              /**
               * Offset must be used before limit in LokiJS
               * @link https://github.com/techfort/LokiJS/issues/570
               */


              if (preparedQuery.skip) {
                query = query.offset(preparedQuery.skip);
              }

              if (preparedQuery.limit) {
                query = query.limit(preparedQuery.limit);
              }

              foundDocuments = query.data().map(function (lokiDoc) {
                return stripLokiKey(lokiDoc);
              });
              return _context8.abrupt("return", {
                documents: foundDocuments
              });

            case 11:
            case "end":
              return _context8.stop();
          }
        }
      }, _callee8, this);
    }));

    function query(_x9) {
      return _query.apply(this, arguments);
    }

    return query;
  }();

  _proto.getAttachmentData = function getAttachmentData(_documentId, _attachmentId) {
    throw new Error('Attachments are not implemented in the lokijs RxStorage. Make a pull request.');
  };

  _proto.getChangedDocuments = /*#__PURE__*/function () {
    var _getChangedDocuments = _asyncToGenerator( /*#__PURE__*/_regeneratorRuntime.mark(function _callee9(options) {
      var _sequence;

      var localState, desc, operator, query, changedDocuments, useForLastSequence, ret;
      return _regeneratorRuntime.wrap(function _callee9$(_context9) {
        while (1) {
          switch (_context9.prev = _context9.next) {
            case 0:
              _context9.next = 2;
              return this.mustUseLocalState();

            case 2:
              localState = _context9.sent;

              if (localState) {
                _context9.next = 5;
                break;
              }

              return _context9.abrupt("return", this.requestRemoteInstance('getChangedDocuments', [options]));

            case 5:
              desc = options.direction === 'before';
              operator = options.direction === 'after' ? '$gt' : '$lt';
              query = localState.changesCollection.chain().find({
                sequence: (_sequence = {}, _sequence[operator] = options.sinceSequence, _sequence)
              }).simplesort('sequence', desc);

              if (options.limit) {
                query = query.limit(options.limit);
              }

              changedDocuments = query.data().map(function (result) {
                return {
                  id: result.id,
                  sequence: result.sequence
                };
              });
              useForLastSequence = !desc ? lastOfArray(changedDocuments) : changedDocuments[0];
              ret = {
                changedDocuments: changedDocuments,
                lastSequence: useForLastSequence ? useForLastSequence.sequence : options.sinceSequence
              };
              return _context9.abrupt("return", ret);

            case 13:
            case "end":
              return _context9.stop();
          }
        }
      }, _callee9, this);
    }));

    function getChangedDocuments(_x10) {
      return _getChangedDocuments.apply(this, arguments);
    }

    return getChangedDocuments;
  }();

  _proto.changeStream = function changeStream() {
    return this.changes$.asObservable();
  };

  _proto.close = /*#__PURE__*/function () {
    var _close = _asyncToGenerator( /*#__PURE__*/_regeneratorRuntime.mark(function _callee10() {
      var localState, dbState;
      return _regeneratorRuntime.wrap(function _callee10$(_context10) {
        while (1) {
          switch (_context10.prev = _context10.next) {
            case 0:
              this.closed = true;
              this.changes$.complete();
              OPEN_LOKIJS_STORAGE_INSTANCES["delete"](this);

              if (!this.internals.localState) {
                _context10.next = 14;
                break;
              }

              _context10.next = 6;
              return this.internals.localState;

            case 6:
              localState = _context10.sent;
              _context10.next = 9;
              return getLokiDatabase(this.databaseName, this.databaseSettings);

            case 9:
              dbState = _context10.sent;
              _context10.next = 12;
              return dbState.saveQueue.run();

            case 12:
              _context10.next = 14;
              return closeLokiCollections(this.databaseName, [localState.collection, localState.changesCollection]);

            case 14:
              removeLokiLeaderElectorReference(this.storage, this.databaseName);

            case 15:
            case "end":
              return _context10.stop();
          }
        }
      }, _callee10, this);
    }));

    function close() {
      return _close.apply(this, arguments);
    }

    return close;
  }();

  _proto.remove = /*#__PURE__*/function () {
    var _remove = _asyncToGenerator( /*#__PURE__*/_regeneratorRuntime.mark(function _callee11() {
      var localState;
      return _regeneratorRuntime.wrap(function _callee11$(_context11) {
        while (1) {
          switch (_context11.prev = _context11.next) {
            case 0:
              _context11.next = 2;
              return this.mustUseLocalState();

            case 2:
              localState = _context11.sent;

              if (localState) {
                _context11.next = 5;
                break;
              }

              return _context11.abrupt("return", this.requestRemoteInstance('remove', []));

            case 5:
              localState.databaseState.database.removeCollection(this.collectionName);
              localState.databaseState.database.removeCollection(localState.changesCollection.name);
              this.close();

            case 8:
            case "end":
              return _context11.stop();
          }
        }
      }, _callee11, this);
    }));

    function remove() {
      return _remove.apply(this, arguments);
    }

    return remove;
  }();

  return RxStorageInstanceLoki;
}();
export function createLokiLocalState(_x11, _x12) {
  return _createLokiLocalState.apply(this, arguments);
}

function _createLokiLocalState() {
  _createLokiLocalState = _asyncToGenerator( /*#__PURE__*/_regeneratorRuntime.mark(function _callee12(params, databaseSettings) {
    var databaseState, indices, primaryKey, collectionOptions, collection, changesCollectionName, changesCollectionOptions, changesCollection, ret;
    return _regeneratorRuntime.wrap(function _callee12$(_context12) {
      while (1) {
        switch (_context12.prev = _context12.next) {
          case 0:
            if (!params.options) {
              params.options = {};
            }

            _context12.next = 3;
            return getLokiDatabase(params.databaseName, databaseSettings);

          case 3:
            databaseState = _context12.sent;

            /**
             * Construct loki indexes from RxJsonSchema indexes.
             * TODO what about compound indexes? Are they possible in lokijs?
             */
            indices = [];

            if (params.schema.indexes) {
              params.schema.indexes.forEach(function (idx) {
                if (!Array.isArray(idx)) {
                  indices.push(idx);
                }
              });
            }
            /**
             * LokiJS has no concept of custom primary key, they use a number-id that is generated.
             * To be able to query fast by primary key, we always add an index to the primary.
             */


            primaryKey = getPrimaryFieldOfPrimaryKey(params.schema.primaryKey);
            indices.push(primaryKey);
            /**
             * TODO disable stuff we do not need from CollectionOptions
             */

            collectionOptions = Object.assign({}, params.options.collection, {
              indices: indices,
              unique: [primaryKey]
            }, LOKIJS_COLLECTION_DEFAULT_OPTIONS);
            collection = databaseState.database.addCollection(params.collectionName, collectionOptions);
            databaseState.collections[params.collectionName] = collection;
            changesCollectionName = params.collectionName + CHANGES_COLLECTION_SUFFIX;
            changesCollectionOptions = Object.assign({
              unique: ['eventId'],
              indices: ['sequence']
            }, LOKIJS_COLLECTION_DEFAULT_OPTIONS);
            changesCollection = databaseState.database.addCollection(changesCollectionName, changesCollectionOptions);
            databaseState.collections[params.collectionName] = changesCollection;
            ret = {
              databaseState: databaseState,
              collection: collection,
              changesCollection: changesCollection
            };
            return _context12.abrupt("return", ret);

          case 17:
          case "end":
            return _context12.stop();
        }
      }
    }, _callee12);
  }));
  return _createLokiLocalState.apply(this, arguments);
}

export function createLokiStorageInstance(_x13, _x14, _x15) {
  return _createLokiStorageInstance.apply(this, arguments);
}

function _createLokiStorageInstance() {
  _createLokiStorageInstance = _asyncToGenerator( /*#__PURE__*/_regeneratorRuntime.mark(function _callee13(storage, params, databaseSettings) {
    var internals, leaderElector, instance;
    return _regeneratorRuntime.wrap(function _callee13$(_context13) {
      while (1) {
        switch (_context13.prev = _context13.next) {
          case 0:
            internals = {};

            if (!params.multiInstance) {
              _context13.next = 6;
              break;
            }

            leaderElector = getLokiLeaderElector(storage, params.databaseName);
            internals.leaderElector = leaderElector;
            _context13.next = 9;
            break;

          case 6:
            // optimisation shortcut, directly create db is non multi instance.
            internals.localState = createLokiLocalState(params, databaseSettings);
            _context13.next = 9;
            return internals.localState;

          case 9:
            instance = new RxStorageInstanceLoki(storage, params.databaseName, params.collectionName, params.schema, internals, params.options, databaseSettings);
            /**
             * Directly create the localState if the db becomes leader.
             */

            if (params.multiInstance) {
              ensureNotFalsy(internals.leaderElector).awaitLeadership().then(function () {
                instance.mustUseLocalState();
              });
            }

            return _context13.abrupt("return", instance);

          case 12:
          case "end":
            return _context13.stop();
        }
      }
    }, _callee13);
  }));
  return _createLokiStorageInstance.apply(this, arguments);
}
//# sourceMappingURL=rx-storage-instance-loki.js.map