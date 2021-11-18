"use strict";

var _interopRequireDefault = require("@babel/runtime/helpers/interopRequireDefault");

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.RxStorageInstanceLoki = void 0;
exports.createLokiLocalState = createLokiLocalState;
exports.createLokiStorageInstance = createLokiStorageInstance;

var _regenerator = _interopRequireDefault(require("@babel/runtime/regenerator"));

var _asyncToGenerator2 = _interopRequireDefault(require("@babel/runtime/helpers/asyncToGenerator"));

var _lokijs = _interopRequireDefault(require("lokijs"));

var _rxjs = require("rxjs");

var _util = require("../../util");

var _rxError = require("../../rx-error");

var _rxSchema = require("../../rx-schema");

var _lokijsHelper = require("./lokijs-helper");

var _leaderElection = require("../leader-election");

var instanceId = 1;

var RxStorageInstanceLoki = /*#__PURE__*/function () {
  function RxStorageInstanceLoki(databaseName, collectionName, schema, internals, options, databaseSettings, idleQueue, broadcastChannel) {
    var _this = this;

    this.changes$ = new _rxjs.Subject();
    this.lastChangefeedSequence = 0;
    this.instanceId = instanceId++;
    this.closed = false;
    this.databaseName = databaseName;
    this.collectionName = collectionName;
    this.schema = schema;
    this.internals = internals;
    this.options = options;
    this.databaseSettings = databaseSettings;
    this.idleQueue = idleQueue;
    this.broadcastChannel = broadcastChannel;
    this.primaryPath = (0, _rxSchema.getPrimaryFieldOfPrimaryKey)(this.schema.primaryKey);

    _lokijsHelper.OPEN_LOKIJS_STORAGE_INSTANCES.add(this);

    if (broadcastChannel) {
      this.leaderElector = (0, _leaderElection.getLeaderElectorByBroadcastChannel)(broadcastChannel);
      this.leaderElector.awaitLeadership().then(function () {
        // this instance is leader now, so it has to reply to queries from other instances
        (0, _util.ensureNotFalsy)(_this.broadcastChannel).addEventListener('message', /*#__PURE__*/function () {
          var _ref = (0, _asyncToGenerator2["default"])( /*#__PURE__*/_regenerator["default"].mark(function _callee(msg) {
            var operation, params, result, isError, _ref2, response;

            return _regenerator["default"].wrap(function _callee$(_context) {
              while (1) {
                switch (_context.prev = _context.next) {
                  case 0:
                    if (!(msg.type === _lokijsHelper.LOKI_BROADCAST_CHANNEL_MESSAGE_TYPE && msg.requestId && msg.databaseName === _this.databaseName && msg.collectionName === _this.collectionName && !msg.response)) {
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
                    (0, _util.ensureNotFalsy)(_this.broadcastChannel).postMessage(response);

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
    var ret = (0, _util.ensureNotFalsy)(this.internals.localState);
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
    var _mustUseLocalState = (0, _asyncToGenerator2["default"])( /*#__PURE__*/_regenerator["default"].mark(function _callee2() {
      var leaderElector;
      return _regenerator["default"].wrap(function _callee2$(_context2) {
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
              leaderElector = (0, _util.ensureNotFalsy)(this.leaderElector);

            case 5:
              if (leaderElector.hasLeader) {
                _context2.next = 12;
                break;
              }

              _context2.next = 8;
              return leaderElector.applyOnce();

            case 8:
              _context2.next = 10;
              return (0, _util.promiseWait)(0);

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
                idleQueue: this.idleQueue,
                broadcastChannel: this.broadcastChannel
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
    var _requestRemoteInstance = (0, _asyncToGenerator2["default"])( /*#__PURE__*/_regenerator["default"].mark(function _callee3(operation, params) {
      var broadcastChannel, requestId, responsePromise, result;
      return _regenerator["default"].wrap(function _callee3$(_context3) {
        while (1) {
          switch (_context3.prev = _context3.next) {
            case 0:
              broadcastChannel = (0, _util.ensureNotFalsy)(this.broadcastChannel);
              requestId = (0, _util.randomCouchString)(12);
              responsePromise = new Promise(function (res, rej) {
                var listener = function listener(msg) {
                  if (msg.type === _lokijsHelper.LOKI_BROADCAST_CHANNEL_MESSAGE_TYPE && msg.response === true && msg.requestId === requestId) {
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
                type: _lokijsHelper.LOKI_BROADCAST_CHANNEL_MESSAGE_TYPE,
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
    var _addChangeDocumentMeta = (0, _asyncToGenerator2["default"])( /*#__PURE__*/_regenerator["default"].mark(function _callee4(id) {
      var localState, lastDoc, nextFeedSequence;
      return _regenerator["default"].wrap(function _callee4$(_context4) {
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

  _proto.prepareQuery = function prepareQuery(mutateableQuery) {
    var _this2 = this;

    if (Object.keys(mutateableQuery.selector).length > 0) {
      mutateableQuery.selector = {
        $and: [{
          _deleted: false
        }, mutateableQuery.selector]
      };
    } else {
      mutateableQuery.selector = {
        _deleted: false
      };
    }
    /**
     * To ensure a deterministic sorting,
     * we have to ensure the primary key is always part
     * of the sort query.
     */


    if (!mutateableQuery.sort) {
      var _ref3;

      mutateableQuery.sort = [(_ref3 = {}, _ref3[this.primaryPath] = 'asc', _ref3)];
    } else {
      var isPrimaryInSort = mutateableQuery.sort.find(function (p) {
        return (0, _util.firstPropertyNameOfObject)(p) === _this2.primaryPath;
      });

      if (!isPrimaryInSort) {
        var _mutateableQuery$sort;

        mutateableQuery.sort.push((_mutateableQuery$sort = {}, _mutateableQuery$sort[this.primaryPath] = 'asc', _mutateableQuery$sort));
      }
    }

    return mutateableQuery;
  };

  _proto.getSortComparator = function getSortComparator(query) {
    var _ref4;

    // TODO if no sort is given, use sort by primary.
    // This should be done inside of RxDB and not in the storage implementations.
    var sortOptions = query.sort ? query.sort : [(_ref4 = {}, _ref4[this.primaryPath] = 'asc', _ref4)];

    var fun = function fun(a, b) {
      var compareResult = 0; // 1 | -1

      sortOptions.find(function (sortPart) {
        var fieldName = Object.keys(sortPart)[0];
        var direction = Object.values(sortPart)[0];
        var directionMultiplier = direction === 'asc' ? 1 : -1;
        var valueA = a[fieldName];
        var valueB = b[fieldName];

        if (valueA === valueB) {
          return false;
        } else {
          if (valueA > valueB) {
            compareResult = 1 * directionMultiplier;
            return true;
          } else {
            compareResult = -1 * directionMultiplier;
            return true;
          }
        }
      });
      /**
       * Two different objects should never have the same sort position.
       * We ensure this by having the unique primaryKey in the sort params
       * at this.prepareQuery()
       */

      if (!compareResult) {
        throw (0, _rxError.newRxError)('SNH', {
          args: {
            query: query,
            a: a,
            b: b
          }
        });
      }

      return compareResult;
    };

    return fun;
  }
  /**
   * Returns a function that determines if a document matches a query selector.
   * It is important to have the exact same logix as lokijs uses, to be sure
   * that the event-reduce algorithm works correct.
   * But LokisJS does not export such a function, the query logic is deep inside of
   * the Resultset prototype.
   * Because I am lazy, I do not copy paste and maintain that code.
   * Instead we create a fake Resultset and apply the prototype method Resultset.prototype.find(),
   * same with Collection.
   */
  ;

  _proto.getQueryMatcher = function getQueryMatcher(query) {
    var fun = function fun(doc) {
      var docWithResetDeleted = (0, _util.flatClone)(doc);
      docWithResetDeleted._deleted = !!docWithResetDeleted._deleted;
      var fakeCollection = {
        data: [docWithResetDeleted],
        binaryIndices: {}
      };
      Object.setPrototypeOf(fakeCollection, _lokijs["default"].Collection.prototype);
      var fakeResultSet = {
        collection: fakeCollection
      };
      Object.setPrototypeOf(fakeResultSet, _lokijs["default"].Resultset.prototype);
      fakeResultSet.find(query.selector, true);
      var ret = fakeResultSet.filteredrows.length > 0;
      return ret;
    };

    return fun;
  };

  _proto.bulkWrite = /*#__PURE__*/function () {
    var _bulkWrite = (0, _asyncToGenerator2["default"])( /*#__PURE__*/_regenerator["default"].mark(function _callee5(documentWrites) {
      var _this3 = this;

      var localState, ret;
      return _regenerator["default"].wrap(function _callee5$(_context5) {
        while (1) {
          switch (_context5.prev = _context5.next) {
            case 0:
              if (!(documentWrites.length === 0)) {
                _context5.next = 2;
                break;
              }

              throw (0, _rxError.newRxError)('P2', {
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
              return (0, _util.promiseWait)(0);

            case 9:
              ret = {
                success: new Map(),
                error: new Map()
              };
              documentWrites.forEach(function (writeRow) {
                var startTime = (0, _util.now)();
                var id = writeRow.document[_this3.primaryPath];
                var documentInDb = localState.collection.by(_this3.primaryPath, id);

                if (!documentInDb) {
                  // insert new document
                  var newRevision = '1-' + (0, _util.createRevision)(writeRow.document);
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
                  localState.collection.insert((0, _util.flatClone)(writeDoc));

                  if (!insertedIsDeleted) {
                    _this3.addChangeDocumentMeta(id);

                    _this3.changes$.next({
                      eventId: (0, _lokijsHelper.getLokiEventKey)(false, id, newRevision),
                      documentId: id,
                      change: {
                        doc: writeDoc,
                        id: id,
                        operation: 'INSERT',
                        previous: null
                      },
                      startTime: startTime,
                      endTime: (0, _util.now)()
                    });
                  }

                  ret.success.set(id, writeDoc);
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
                    ret.error.set(id, err);
                  } else {
                    var newRevHeight = (0, _util.getHeightOfRevision)(revInDb) + 1;

                    var _newRevision = newRevHeight + '-' + (0, _util.createRevision)(writeRow.document);

                    var isDeleted = !!writeRow.document._deleted;

                    var _writeDoc = Object.assign({}, writeRow.document, {
                      $loki: documentInDb.$loki,
                      _rev: _newRevision,
                      _deleted: isDeleted,
                      // TODO attachments are currently not working with lokijs
                      _attachments: {}
                    });

                    localState.collection.update(_writeDoc);

                    _this3.addChangeDocumentMeta(id);

                    var change = null;

                    if (writeRow.previous && writeRow.previous._deleted && !_writeDoc._deleted) {
                      change = {
                        id: id,
                        operation: 'INSERT',
                        previous: null,
                        doc: (0, _lokijsHelper.stripLokiKey)(_writeDoc)
                      };
                    } else if (writeRow.previous && !writeRow.previous._deleted && !_writeDoc._deleted) {
                      change = {
                        id: id,
                        operation: 'UPDATE',
                        previous: writeRow.previous,
                        doc: (0, _lokijsHelper.stripLokiKey)(_writeDoc)
                      };
                    } else if (writeRow.previous && !writeRow.previous._deleted && _writeDoc._deleted) {
                      /**
                       * On delete, we send the 'new' rev in the previous property,
                       * to have the equal behavior as pouchdb.
                       */
                      var previous = (0, _util.flatClone)(writeRow.previous);
                      previous._rev = _newRevision;
                      change = {
                        id: id,
                        operation: 'DELETE',
                        previous: previous,
                        doc: null
                      };
                    }

                    if (!change) {
                      throw (0, _rxError.newRxError)('SNH', {
                        args: {
                          writeRow: writeRow
                        }
                      });
                    }

                    _this3.changes$.next({
                      eventId: (0, _lokijsHelper.getLokiEventKey)(false, id, _newRevision),
                      documentId: id,
                      change: change,
                      startTime: startTime,
                      endTime: (0, _util.now)()
                    });

                    ret.success.set(id, (0, _lokijsHelper.stripLokiKey)(_writeDoc));
                  }
                }
              });
              localState.databaseState.saveQueue.addWrite();
              return _context5.abrupt("return", ret);

            case 13:
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
    var _bulkAddRevisions = (0, _asyncToGenerator2["default"])( /*#__PURE__*/_regenerator["default"].mark(function _callee6(documents) {
      var _this4 = this;

      var localState;
      return _regenerator["default"].wrap(function _callee6$(_context6) {
        while (1) {
          switch (_context6.prev = _context6.next) {
            case 0:
              if (!(documents.length === 0)) {
                _context6.next = 2;
                break;
              }

              throw (0, _rxError.newRxError)('P3', {
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
              return (0, _util.promiseWait)(0);

            case 9:
              documents.forEach(function (docData) {
                var startTime = (0, _util.now)();
                var id = docData[_this4.primaryPath];
                var documentInDb = localState.collection.by(_this4.primaryPath, id);

                if (!documentInDb) {
                  // document not here, so we can directly insert
                  localState.collection.insert((0, _util.flatClone)(docData));

                  _this4.changes$.next({
                    documentId: id,
                    eventId: (0, _lokijsHelper.getLokiEventKey)(false, id, docData._rev),
                    change: {
                      doc: docData,
                      id: id,
                      operation: 'INSERT',
                      previous: null
                    },
                    startTime: startTime,
                    endTime: (0, _util.now)()
                  });

                  _this4.addChangeDocumentMeta(id);
                } else {
                  var newWriteRevision = (0, _util.parseRevision)(docData._rev);
                  var oldRevision = (0, _util.parseRevision)(documentInDb._rev);
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
                    var storeAtLoki = (0, _util.flatClone)(docData);
                    storeAtLoki.$loki = documentInDb.$loki;
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
                        previous: (0, _lokijsHelper.stripLokiKey)(documentInDb),
                        doc: docData
                      };
                    } else if (!documentInDb._deleted && docData._deleted) {
                      change = {
                        id: id,
                        operation: 'DELETE',
                        previous: (0, _lokijsHelper.stripLokiKey)(documentInDb),
                        doc: null
                      };
                    } else if (documentInDb._deleted && docData._deleted) {
                      change = null;
                    }

                    if (change) {
                      _this4.changes$.next({
                        documentId: id,
                        eventId: (0, _lokijsHelper.getLokiEventKey)(false, id, docData._rev),
                        change: change,
                        startTime: startTime,
                        endTime: (0, _util.now)()
                      });

                      _this4.addChangeDocumentMeta(id);
                    }
                  }
                }
              });
              localState.databaseState.saveQueue.addWrite();

            case 11:
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
    var _findDocumentsById = (0, _asyncToGenerator2["default"])( /*#__PURE__*/_regenerator["default"].mark(function _callee7(ids, deleted) {
      var _this5 = this;

      var localState, ret;
      return _regenerator["default"].wrap(function _callee7$(_context7) {
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
              ret = new Map();
              ids.forEach(function (id) {
                var documentInDb = localState.collection.by(_this5.primaryPath, id);

                if (documentInDb && (!documentInDb._deleted || deleted)) {
                  ret.set(id, (0, _lokijsHelper.stripLokiKey)(documentInDb));
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
    var _query = (0, _asyncToGenerator2["default"])( /*#__PURE__*/_regenerator["default"].mark(function _callee8(preparedQuery) {
      var localState, query, foundDocuments;
      return _regenerator["default"].wrap(function _callee8$(_context8) {
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
                query = query.sort(this.getSortComparator(preparedQuery));
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
                return (0, _lokijsHelper.stripLokiKey)(lokiDoc);
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
    var _getChangedDocuments = (0, _asyncToGenerator2["default"])( /*#__PURE__*/_regenerator["default"].mark(function _callee9(options) {
      var _sequence;

      var localState, desc, operator, query, changedDocuments, useForLastSequence, ret;
      return _regenerator["default"].wrap(function _callee9$(_context9) {
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
              useForLastSequence = !desc ? (0, _util.lastOfArray)(changedDocuments) : changedDocuments[0];
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
    var _close = (0, _asyncToGenerator2["default"])( /*#__PURE__*/_regenerator["default"].mark(function _callee10() {
      var localState, dbState;
      return _regenerator["default"].wrap(function _callee10$(_context10) {
        while (1) {
          switch (_context10.prev = _context10.next) {
            case 0:
              this.closed = true;
              this.changes$.complete();

              _lokijsHelper.OPEN_LOKIJS_STORAGE_INSTANCES["delete"](this);

              if (!this.internals.localState) {
                _context10.next = 14;
                break;
              }

              _context10.next = 6;
              return this.internals.localState;

            case 6:
              localState = _context10.sent;
              _context10.next = 9;
              return (0, _lokijsHelper.getLokiDatabase)(this.databaseName, this.databaseSettings, this.idleQueue);

            case 9:
              dbState = _context10.sent;
              _context10.next = 12;
              return dbState.saveQueue.run();

            case 12:
              _context10.next = 14;
              return (0, _lokijsHelper.closeLokiCollections)(this.databaseName, [localState.collection, localState.changesCollection]);

            case 14:
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
    var _remove = (0, _asyncToGenerator2["default"])( /*#__PURE__*/_regenerator["default"].mark(function _callee11() {
      var localState;
      return _regenerator["default"].wrap(function _callee11$(_context11) {
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
              this.closed = true;

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

exports.RxStorageInstanceLoki = RxStorageInstanceLoki;

function createLokiLocalState(_x11, _x12) {
  return _createLokiLocalState.apply(this, arguments);
}

function _createLokiLocalState() {
  _createLokiLocalState = (0, _asyncToGenerator2["default"])( /*#__PURE__*/_regenerator["default"].mark(function _callee12(params, databaseSettings) {
    var databaseState, indices, primaryKey, collectionOptions, collection, changesCollectionName, changesCollectionOptions, changesCollection, ret;
    return _regenerator["default"].wrap(function _callee12$(_context12) {
      while (1) {
        switch (_context12.prev = _context12.next) {
          case 0:
            if (!params.options) {
              params.options = {};
            }

            _context12.next = 3;
            return (0, _lokijsHelper.getLokiDatabase)(params.databaseName, databaseSettings, params.idleQueue);

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


            primaryKey = (0, _rxSchema.getPrimaryFieldOfPrimaryKey)(params.schema.primaryKey);
            indices.push(primaryKey);
            /**
             * TODO disable stuff we do not need from CollectionOptions
             */

            collectionOptions = Object.assign({}, params.options.collection, {
              indices: indices,
              unique: [primaryKey]
            }, _lokijsHelper.LOKIJS_COLLECTION_DEFAULT_OPTIONS);
            collection = databaseState.database.addCollection(params.collectionName, collectionOptions);
            databaseState.collections[params.collectionName] = collection;
            changesCollectionName = params.collectionName + _lokijsHelper.CHANGES_COLLECTION_SUFFIX;
            changesCollectionOptions = Object.assign({
              unique: ['eventId'],
              indices: ['sequence']
            }, _lokijsHelper.LOKIJS_COLLECTION_DEFAULT_OPTIONS);
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

function createLokiStorageInstance(_x13, _x14) {
  return _createLokiStorageInstance.apply(this, arguments);
}

function _createLokiStorageInstance() {
  _createLokiStorageInstance = (0, _asyncToGenerator2["default"])( /*#__PURE__*/_regenerator["default"].mark(function _callee13(params, databaseSettings) {
    var internals, instance, leaderElector;
    return _regenerator["default"].wrap(function _callee13$(_context13) {
      while (1) {
        switch (_context13.prev = _context13.next) {
          case 0:
            internals = {}; // optimisation shortcut, directly create db is non multi instance.

            if (params.broadcastChannel) {
              _context13.next = 5;
              break;
            }

            internals.localState = createLokiLocalState(params, databaseSettings);
            _context13.next = 5;
            return internals.localState;

          case 5:
            instance = new RxStorageInstanceLoki(params.databaseName, params.collectionName, params.schema, internals, params.options, databaseSettings, params.idleQueue, params.broadcastChannel);
            /**
             * Directly create the localState if the db becomes leader.
             */

            if (params.broadcastChannel) {
              leaderElector = (0, _leaderElection.getLeaderElectorByBroadcastChannel)(params.broadcastChannel);
              leaderElector.awaitLeadership().then(function () {
                return instance.mustUseLocalState();
              });
            }

            return _context13.abrupt("return", instance);

          case 8:
          case "end":
            return _context13.stop();
        }
      }
    }, _callee13);
  }));
  return _createLokiStorageInstance.apply(this, arguments);
}
//# sourceMappingURL=rx-storage-instance-loki.js.map