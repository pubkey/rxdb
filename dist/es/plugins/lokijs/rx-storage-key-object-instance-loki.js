import _asyncToGenerator from "@babel/runtime/helpers/asyncToGenerator";
import _regeneratorRuntime from "@babel/runtime/regenerator";
import { Subject } from 'rxjs';
import { newRxError } from '../../rx-error';
import { createRevision, ensureNotFalsy, flatClone, now, parseRevision, promiseWait, randomCouchString } from '../../util';
import { CHANGES_COLLECTION_SUFFIX, closeLokiCollections, getLokiDatabase, getLokiEventKey, getLokiLeaderElector, LOKIJS_COLLECTION_DEFAULT_OPTIONS, LOKI_KEY_OBJECT_BROADCAST_CHANNEL_MESSAGE_TYPE, OPEN_LOKIJS_STORAGE_INSTANCES, removeLokiLeaderElectorReference, stripLokiKey } from './lokijs-helper';
var instanceId = 1;
export var RxStorageKeyObjectInstanceLoki = /*#__PURE__*/function () {
  function RxStorageKeyObjectInstanceLoki(storage, databaseName, collectionName, internals, options, databaseSettings) {
    var _this = this;

    this.changes$ = new Subject();
    this.instanceId = instanceId++;
    this.closed = false;
    this.storage = storage;
    this.databaseName = databaseName;
    this.collectionName = collectionName;
    this.internals = internals;
    this.options = options;
    this.databaseSettings = databaseSettings;
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
                    if (!(msg.type === LOKI_KEY_OBJECT_BROADCAST_CHANNEL_MESSAGE_TYPE && msg.requestId && msg.databaseName === _this.databaseName && msg.collectionName === _this.collectionName && !msg.response)) {
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
                    isError = true;
                    result = _context.t0;

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

  var _proto = RxStorageKeyObjectInstanceLoki.prototype;

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
              this.internals.localState = createLokiKeyValueLocalState({
                databaseName: this.databaseName,
                collectionName: this.collectionName,
                options: this.options,
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
                  if (msg.type === LOKI_KEY_OBJECT_BROADCAST_CHANNEL_MESSAGE_TYPE && msg.response === true && msg.requestId === requestId) {
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
                type: LOKI_KEY_OBJECT_BROADCAST_CHANNEL_MESSAGE_TYPE,
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
  }();

  _proto.bulkWrite = /*#__PURE__*/function () {
    var _bulkWrite = _asyncToGenerator( /*#__PURE__*/_regeneratorRuntime.mark(function _callee4(documentWrites) {
      var localState, startTime, ret, writeRowById, eventBulk;
      return _regeneratorRuntime.wrap(function _callee4$(_context4) {
        while (1) {
          switch (_context4.prev = _context4.next) {
            case 0:
              if (!(documentWrites.length === 0)) {
                _context4.next = 2;
                break;
              }

              throw newRxError('P2', {
                args: {
                  documentWrites: documentWrites
                }
              });

            case 2:
              _context4.next = 4;
              return this.mustUseLocalState();

            case 4:
              localState = _context4.sent;

              if (localState) {
                _context4.next = 7;
                break;
              }

              return _context4.abrupt("return", this.requestRemoteInstance('bulkWrite', [documentWrites]));

            case 7:
              startTime = now();
              _context4.next = 10;
              return promiseWait(0);

            case 10:
              ret = {
                success: {},
                error: {}
              };
              writeRowById = new Map();
              eventBulk = {
                id: randomCouchString(10),
                events: []
              };
              documentWrites.forEach(function (writeRow) {
                var id = writeRow.document._id;
                writeRowById.set(id, writeRow);
                var writeDoc = flatClone(writeRow.document);
                var docInDb = localState.collection.by('_id', id);
                var previous = writeRow.previous ? writeRow.previous : localState.collection.by('_id', id);
                var newRevHeight = previous ? parseRevision(previous._rev).height + 1 : 1;
                var newRevision = newRevHeight + '-' + createRevision(writeRow.document);
                writeDoc._rev = newRevision;

                if (docInDb) {
                  if (!writeRow.previous || docInDb._rev !== writeRow.previous._rev) {
                    // conflict error
                    var err = {
                      isError: true,
                      status: 409,
                      documentId: id,
                      writeRow: writeRow
                    };
                    ret.error[id] = err;
                    return;
                  } else {
                    var toLoki = flatClone(writeDoc);
                    toLoki.$loki = docInDb.$loki;
                    localState.collection.update(toLoki);
                  }
                } else {
                  localState.collection.insert(flatClone(writeDoc));
                }

                ret.success[id] = stripLokiKey(writeDoc);
                var endTime = now();
                var event;

                if (!writeRow.previous) {
                  // was insert
                  event = {
                    operation: 'INSERT',
                    doc: writeDoc,
                    id: id,
                    previous: null
                  };
                } else if (writeRow.document._deleted) {
                  // was delete
                  // we need to add the new revision to the previous doc
                  // so that the eventkey is calculated correctly.
                  // Is this a hack? idk.
                  var previousDoc = flatClone(writeRow.previous);
                  previousDoc._rev = newRevision;
                  event = {
                    operation: 'DELETE',
                    doc: null,
                    id: id,
                    previous: previousDoc
                  };
                } else {
                  // was update
                  event = {
                    operation: 'UPDATE',
                    doc: writeDoc,
                    id: id,
                    previous: writeRow.previous
                  };
                }

                if (writeRow.document._deleted && (!writeRow.previous || writeRow.previous._deleted)) {
                  /**
                   * An already deleted document was added to the storage engine,
                   * do not emit an event because it does not affect anything.
                   */
                } else {
                  var doc = event.operation === 'DELETE' ? event.previous : event.doc;
                  var eventId = getLokiEventKey(true, doc._id, doc._rev ? doc._rev : '');
                  var storageChangeEvent = {
                    eventId: eventId,
                    documentId: id,
                    change: event,
                    startTime: startTime,
                    endTime: endTime
                  };
                  eventBulk.events.push(storageChangeEvent);
                }
              });
              localState.databaseState.saveQueue.addWrite();
              this.changes$.next(eventBulk);
              return _context4.abrupt("return", ret);

            case 17:
            case "end":
              return _context4.stop();
          }
        }
      }, _callee4, this);
    }));

    function bulkWrite(_x4) {
      return _bulkWrite.apply(this, arguments);
    }

    return bulkWrite;
  }();

  _proto.findLocalDocumentsById = /*#__PURE__*/function () {
    var _findLocalDocumentsById = _asyncToGenerator( /*#__PURE__*/_regeneratorRuntime.mark(function _callee5(ids) {
      var localState, ret;
      return _regeneratorRuntime.wrap(function _callee5$(_context5) {
        while (1) {
          switch (_context5.prev = _context5.next) {
            case 0:
              _context5.next = 2;
              return this.mustUseLocalState();

            case 2:
              localState = _context5.sent;

              if (localState) {
                _context5.next = 5;
                break;
              }

              return _context5.abrupt("return", this.requestRemoteInstance('findLocalDocumentsById', [ids]));

            case 5:
              _context5.next = 7;
              return promiseWait(0);

            case 7:
              ret = {};
              ids.forEach(function (id) {
                var documentInDb = localState.collection.by('_id', id);

                if (documentInDb && !documentInDb._deleted) {
                  ret[id] = stripLokiKey(documentInDb);
                }
              });
              return _context5.abrupt("return", ret);

            case 10:
            case "end":
              return _context5.stop();
          }
        }
      }, _callee5, this);
    }));

    function findLocalDocumentsById(_x5) {
      return _findLocalDocumentsById.apply(this, arguments);
    }

    return findLocalDocumentsById;
  }();

  _proto.changeStream = function changeStream() {
    return this.changes$.asObservable();
  };

  _proto.close = /*#__PURE__*/function () {
    var _close = _asyncToGenerator( /*#__PURE__*/_regeneratorRuntime.mark(function _callee6() {
      var localState;
      return _regeneratorRuntime.wrap(function _callee6$(_context6) {
        while (1) {
          switch (_context6.prev = _context6.next) {
            case 0:
              this.closed = true;
              this.changes$.complete();
              OPEN_LOKIJS_STORAGE_INSTANCES["delete"](this);

              if (!this.internals.localState) {
                _context6.next = 9;
                break;
              }

              _context6.next = 6;
              return this.getLocalState();

            case 6:
              localState = _context6.sent;
              _context6.next = 9;
              return closeLokiCollections(this.databaseName, [ensureNotFalsy(localState.collection), ensureNotFalsy(localState.changesCollection)]);

            case 9:
              removeLokiLeaderElectorReference(this.storage, this.databaseName);

            case 10:
            case "end":
              return _context6.stop();
          }
        }
      }, _callee6, this);
    }));

    function close() {
      return _close.apply(this, arguments);
    }

    return close;
  }();

  _proto.remove = /*#__PURE__*/function () {
    var _remove = _asyncToGenerator( /*#__PURE__*/_regeneratorRuntime.mark(function _callee7() {
      var localState;
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

              return _context7.abrupt("return", this.requestRemoteInstance('remove', []));

            case 5:
              localState.databaseState.database.removeCollection(localState.collection.name);
              localState.databaseState.database.removeCollection(localState.changesCollection.name);
              this.close();

            case 8:
            case "end":
              return _context7.stop();
          }
        }
      }, _callee7, this);
    }));

    function remove() {
      return _remove.apply(this, arguments);
    }

    return remove;
  }();

  return RxStorageKeyObjectInstanceLoki;
}();
export function createLokiKeyValueLocalState(_x6, _x7) {
  return _createLokiKeyValueLocalState.apply(this, arguments);
}

function _createLokiKeyValueLocalState() {
  _createLokiKeyValueLocalState = _asyncToGenerator( /*#__PURE__*/_regeneratorRuntime.mark(function _callee8(params, databaseSettings) {
    var databaseState, collectionOptions, collection, changesCollectionName, changesCollectionOptions, changesCollection;
    return _regeneratorRuntime.wrap(function _callee8$(_context8) {
      while (1) {
        switch (_context8.prev = _context8.next) {
          case 0:
            if (!params.options) {
              params.options = {};
            }

            _context8.next = 3;
            return getLokiDatabase(params.databaseName, databaseSettings);

          case 3:
            databaseState = _context8.sent;
            collectionOptions = Object.assign({}, params.options.collection, {
              indices: [],
              unique: ['_id']
            }, LOKIJS_COLLECTION_DEFAULT_OPTIONS);
            collection = databaseState.database.addCollection(params.collectionName, collectionOptions);
            databaseState.collections[params.collectionName] = collection;
            changesCollectionName = params.collectionName + CHANGES_COLLECTION_SUFFIX;
            changesCollectionOptions = Object.assign({
              unique: ['eventId'],
              indices: ['sequence']
            }, LOKIJS_COLLECTION_DEFAULT_OPTIONS);
            changesCollection = databaseState.database.addCollection(changesCollectionName, changesCollectionOptions);
            databaseState.collections[changesCollectionName] = collection;
            return _context8.abrupt("return", {
              changesCollection: changesCollection,
              collection: collection,
              databaseState: databaseState
            });

          case 12:
          case "end":
            return _context8.stop();
        }
      }
    }, _callee8);
  }));
  return _createLokiKeyValueLocalState.apply(this, arguments);
}

export function createLokiKeyObjectStorageInstance(_x8, _x9, _x10) {
  return _createLokiKeyObjectStorageInstance.apply(this, arguments);
}

function _createLokiKeyObjectStorageInstance() {
  _createLokiKeyObjectStorageInstance = _asyncToGenerator( /*#__PURE__*/_regeneratorRuntime.mark(function _callee9(storage, params, databaseSettings) {
    var internals, leaderElector, instance;
    return _regeneratorRuntime.wrap(function _callee9$(_context9) {
      while (1) {
        switch (_context9.prev = _context9.next) {
          case 0:
            internals = {};

            if (!params.multiInstance) {
              _context9.next = 6;
              break;
            }

            leaderElector = getLokiLeaderElector(storage, params.databaseName);
            internals.leaderElector = leaderElector;
            _context9.next = 9;
            break;

          case 6:
            // optimisation shortcut, directly create db is non multi instance.
            internals.localState = createLokiKeyValueLocalState(params, databaseSettings);
            _context9.next = 9;
            return internals.localState;

          case 9:
            instance = new RxStorageKeyObjectInstanceLoki(storage, params.databaseName, params.collectionName, internals, params.options, databaseSettings);
            /**
             * Directly create the localState if the db becomes leader.
             */

            if (params.multiInstance) {
              ensureNotFalsy(internals.leaderElector).awaitLeadership().then(function () {
                return instance.mustUseLocalState();
              });
            }

            return _context9.abrupt("return", instance);

          case 12:
          case "end":
            return _context9.stop();
        }
      }
    }, _callee9);
  }));
  return _createLokiKeyObjectStorageInstance.apply(this, arguments);
}
//# sourceMappingURL=rx-storage-key-object-instance-loki.js.map