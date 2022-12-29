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
var _rxjs = require("rxjs");
var _util = require("../../util");
var _rxError = require("../../rx-error");
var _lokijsHelper = require("./lokijs-helper");
var _rxSchemaHelper = require("../../rx-schema-helper");
var _rxStorageHelper = require("../../rx-storage-helper");
var _rxStorageMultiinstance = require("../../rx-storage-multiinstance");
var instanceId = (0, _util.now)();
var RxStorageInstanceLoki = /*#__PURE__*/function () {
  function RxStorageInstanceLoki(databaseInstanceToken, storage, databaseName, collectionName, schema, internals, options, databaseSettings) {
    var _this = this;
    this.changes$ = new _rxjs.Subject();
    this.instanceId = instanceId++;
    this.closed = false;
    this.databaseInstanceToken = databaseInstanceToken;
    this.storage = storage;
    this.databaseName = databaseName;
    this.collectionName = collectionName;
    this.schema = schema;
    this.internals = internals;
    this.options = options;
    this.databaseSettings = databaseSettings;
    this.primaryPath = (0, _rxSchemaHelper.getPrimaryFieldOfPrimaryKey)(this.schema.primaryKey);
    _lokijsHelper.OPEN_LOKIJS_STORAGE_INSTANCES.add(this);
    if (this.internals.leaderElector) {
      /**
       * To run handleRemoteRequest(),
       * the instance will call its own methods.
       * But these methods could have already been swapped out by a RxStorageWrapper
       * so we must store the original methods here and use them instead.
       */
      var copiedSelf = {
        bulkWrite: this.bulkWrite.bind(this),
        changeStream: this.changeStream.bind(this),
        cleanup: this.cleanup.bind(this),
        close: this.close.bind(this),
        query: this.query.bind(this),
        count: this.count.bind(this),
        findDocumentsById: this.findDocumentsById.bind(this),
        collectionName: this.collectionName,
        databaseName: this.databaseName,
        conflictResultionTasks: this.conflictResultionTasks.bind(this),
        getAttachmentData: this.getAttachmentData.bind(this),
        getChangedDocumentsSince: this.getChangedDocumentsSince.bind(this),
        internals: this.internals,
        options: this.options,
        remove: this.remove.bind(this),
        resolveConflictResultionTask: this.resolveConflictResultionTask.bind(this),
        schema: this.schema
      };
      this.internals.leaderElector.awaitLeadership().then(function () {
        // this instance is leader now, so it has to reply to queries from other instances
        (0, _util.ensureNotFalsy)(_this.internals.leaderElector).broadcastChannel.addEventListener('message', function (msg) {
          return (0, _lokijsHelper.handleRemoteRequest)(copiedSelf, msg);
        });
      });
    }
  }
  var _proto = RxStorageInstanceLoki.prototype;
  _proto.bulkWrite = /*#__PURE__*/function () {
    var _bulkWrite = (0, _asyncToGenerator2["default"])( /*#__PURE__*/_regenerator["default"].mark(function _callee(documentWrites, context) {
      var _this2 = this;
      var localState, ret, docsInDb, docsInDbWithLokiKey, categorized, lastState;
      return _regenerator["default"].wrap(function _callee$(_context) {
        while (1) switch (_context.prev = _context.next) {
          case 0:
            if (!(documentWrites.length === 0)) {
              _context.next = 2;
              break;
            }
            throw (0, _rxError.newRxError)('P2', {
              args: {
                documentWrites: documentWrites
              }
            });
          case 2:
            _context.next = 4;
            return (0, _lokijsHelper.mustUseLocalState)(this);
          case 4:
            localState = _context.sent;
            if (localState) {
              _context.next = 7;
              break;
            }
            return _context.abrupt("return", (0, _lokijsHelper.requestRemoteInstance)(this, 'bulkWrite', [documentWrites]));
          case 7:
            ret = {
              success: {},
              error: {}
            };
            docsInDb = new Map();
            docsInDbWithLokiKey = new Map();
            documentWrites.forEach(function (writeRow) {
              var id = writeRow.document[_this2.primaryPath];
              var documentInDb = localState.collection.by(_this2.primaryPath, id);
              if (documentInDb) {
                docsInDbWithLokiKey.set(id, documentInDb);
                docsInDb.set(id, (0, _lokijsHelper.stripLokiKey)(documentInDb));
              }
            });
            categorized = (0, _rxStorageHelper.categorizeBulkWriteRows)(this, this.primaryPath, docsInDb, documentWrites, context);
            ret.error = categorized.errors;
            categorized.bulkInsertDocs.forEach(function (writeRow) {
              var docId = writeRow.document[_this2.primaryPath];
              localState.collection.insert((0, _util.flatClone)(writeRow.document));
              ret.success[docId] = writeRow.document;
            });
            categorized.bulkUpdateDocs.forEach(function (writeRow) {
              var docId = writeRow.document[_this2.primaryPath];
              var documentInDbWithLokiKey = (0, _util.getFromMapOrThrow)(docsInDbWithLokiKey, docId);
              var writeDoc = Object.assign({}, writeRow.document, {
                $loki: documentInDbWithLokiKey.$loki
              });
              localState.collection.update(writeDoc);
              ret.success[docId] = writeRow.document;
            });
            localState.databaseState.saveQueue.addWrite();
            if (categorized.eventBulk.events.length > 0) {
              lastState = (0, _rxStorageHelper.getNewestOfDocumentStates)(this.primaryPath, Object.values(ret.success));
              categorized.eventBulk.checkpoint = {
                id: lastState[this.primaryPath],
                lwt: lastState._meta.lwt
              };
              this.changes$.next(categorized.eventBulk);
            }
            return _context.abrupt("return", ret);
          case 18:
          case "end":
            return _context.stop();
        }
      }, _callee, this);
    }));
    function bulkWrite(_x, _x2) {
      return _bulkWrite.apply(this, arguments);
    }
    return bulkWrite;
  }();
  _proto.findDocumentsById = /*#__PURE__*/function () {
    var _findDocumentsById = (0, _asyncToGenerator2["default"])( /*#__PURE__*/_regenerator["default"].mark(function _callee2(ids, deleted) {
      var _this3 = this;
      var localState, ret;
      return _regenerator["default"].wrap(function _callee2$(_context2) {
        while (1) switch (_context2.prev = _context2.next) {
          case 0:
            _context2.next = 2;
            return (0, _lokijsHelper.mustUseLocalState)(this);
          case 2:
            localState = _context2.sent;
            if (localState) {
              _context2.next = 5;
              break;
            }
            return _context2.abrupt("return", (0, _lokijsHelper.requestRemoteInstance)(this, 'findDocumentsById', [ids, deleted]));
          case 5:
            ret = {};
            ids.forEach(function (id) {
              var documentInDb = localState.collection.by(_this3.primaryPath, id);
              if (documentInDb && (!documentInDb._deleted || deleted)) {
                ret[id] = (0, _lokijsHelper.stripLokiKey)(documentInDb);
              }
            });
            return _context2.abrupt("return", ret);
          case 8:
          case "end":
            return _context2.stop();
        }
      }, _callee2, this);
    }));
    function findDocumentsById(_x3, _x4) {
      return _findDocumentsById.apply(this, arguments);
    }
    return findDocumentsById;
  }();
  _proto.query = /*#__PURE__*/function () {
    var _query = (0, _asyncToGenerator2["default"])( /*#__PURE__*/_regenerator["default"].mark(function _callee3(preparedQuery) {
      var localState, query, foundDocuments;
      return _regenerator["default"].wrap(function _callee3$(_context3) {
        while (1) switch (_context3.prev = _context3.next) {
          case 0:
            _context3.next = 2;
            return (0, _lokijsHelper.mustUseLocalState)(this);
          case 2:
            localState = _context3.sent;
            if (localState) {
              _context3.next = 5;
              break;
            }
            return _context3.abrupt("return", (0, _lokijsHelper.requestRemoteInstance)(this, 'query', [preparedQuery]));
          case 5:
            query = localState.collection.chain().find(preparedQuery.selector);
            if (preparedQuery.sort) {
              query = query.sort((0, _lokijsHelper.getLokiSortComparator)(this.schema, preparedQuery));
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
            return _context3.abrupt("return", {
              documents: foundDocuments
            });
          case 11:
          case "end":
            return _context3.stop();
        }
      }, _callee3, this);
    }));
    function query(_x5) {
      return _query.apply(this, arguments);
    }
    return query;
  }();
  _proto.count = /*#__PURE__*/function () {
    var _count = (0, _asyncToGenerator2["default"])( /*#__PURE__*/_regenerator["default"].mark(function _callee4(preparedQuery) {
      var result;
      return _regenerator["default"].wrap(function _callee4$(_context4) {
        while (1) switch (_context4.prev = _context4.next) {
          case 0:
            _context4.next = 2;
            return this.query(preparedQuery);
          case 2:
            result = _context4.sent;
            return _context4.abrupt("return", {
              count: result.documents.length,
              mode: 'fast'
            });
          case 4:
          case "end":
            return _context4.stop();
        }
      }, _callee4, this);
    }));
    function count(_x6) {
      return _count.apply(this, arguments);
    }
    return count;
  }();
  _proto.getAttachmentData = function getAttachmentData(_documentId, _attachmentId) {
    throw new Error('Attachments are not implemented in the lokijs RxStorage. Make a pull request.');
  };
  _proto.getChangedDocumentsSince = /*#__PURE__*/function () {
    var _getChangedDocumentsSince = (0, _asyncToGenerator2["default"])( /*#__PURE__*/_regenerator["default"].mark(function _callee5(limit, checkpoint) {
      var localState, sinceLwt, query, changedDocs, first, lastDoc;
      return _regenerator["default"].wrap(function _callee5$(_context5) {
        while (1) switch (_context5.prev = _context5.next) {
          case 0:
            _context5.next = 2;
            return (0, _lokijsHelper.mustUseLocalState)(this);
          case 2:
            localState = _context5.sent;
            if (localState) {
              _context5.next = 5;
              break;
            }
            return _context5.abrupt("return", (0, _lokijsHelper.requestRemoteInstance)(this, 'getChangedDocumentsSince', [limit, checkpoint]));
          case 5:
            sinceLwt = checkpoint ? checkpoint.lwt : _util.RX_META_LWT_MINIMUM;
            query = localState.collection.chain().find({
              '_meta.lwt': {
                $gte: sinceLwt
              }
            }).sort((0, _util.getSortDocumentsByLastWriteTimeComparator)(this.primaryPath));
            changedDocs = query.data();
            first = changedDocs[0];
            if (checkpoint && first && first[this.primaryPath] === checkpoint.id && first._meta.lwt === checkpoint.lwt) {
              changedDocs.shift();
            }
            changedDocs = changedDocs.slice(0, limit);
            lastDoc = (0, _util.lastOfArray)(changedDocs);
            return _context5.abrupt("return", {
              documents: changedDocs.map(function (docData) {
                return (0, _lokijsHelper.stripLokiKey)(docData);
              }),
              checkpoint: lastDoc ? {
                id: lastDoc[this.primaryPath],
                lwt: lastDoc._meta.lwt
              } : checkpoint ? checkpoint : {
                id: '',
                lwt: 0
              }
            });
          case 13:
          case "end":
            return _context5.stop();
        }
      }, _callee5, this);
    }));
    function getChangedDocumentsSince(_x7, _x8) {
      return _getChangedDocumentsSince.apply(this, arguments);
    }
    return getChangedDocumentsSince;
  }();
  _proto.changeStream = function changeStream() {
    return this.changes$.asObservable();
  };
  _proto.cleanup = /*#__PURE__*/function () {
    var _cleanup = (0, _asyncToGenerator2["default"])( /*#__PURE__*/_regenerator["default"].mark(function _callee6(minimumDeletedTime) {
      var localState, deleteAmountPerRun, maxDeletionTime, query, foundDocuments;
      return _regenerator["default"].wrap(function _callee6$(_context6) {
        while (1) switch (_context6.prev = _context6.next) {
          case 0:
            _context6.next = 2;
            return (0, _lokijsHelper.mustUseLocalState)(this);
          case 2:
            localState = _context6.sent;
            if (localState) {
              _context6.next = 5;
              break;
            }
            return _context6.abrupt("return", (0, _lokijsHelper.requestRemoteInstance)(this, 'cleanup', [minimumDeletedTime]));
          case 5:
            deleteAmountPerRun = 10;
            maxDeletionTime = (0, _util.now)() - minimumDeletedTime;
            query = localState.collection.chain().find({
              _deleted: true,
              '_meta.lwt': {
                $lt: maxDeletionTime
              }
            }).limit(deleteAmountPerRun);
            foundDocuments = query.data();
            if (foundDocuments.length > 0) {
              localState.collection.remove(foundDocuments);
              localState.databaseState.saveQueue.addWrite();
            }
            return _context6.abrupt("return", foundDocuments.length !== deleteAmountPerRun);
          case 11:
          case "end":
            return _context6.stop();
        }
      }, _callee6, this);
    }));
    function cleanup(_x9) {
      return _cleanup.apply(this, arguments);
    }
    return cleanup;
  }();
  _proto.close = /*#__PURE__*/function () {
    var _close = (0, _asyncToGenerator2["default"])( /*#__PURE__*/_regenerator["default"].mark(function _callee7() {
      var localState, dbState;
      return _regenerator["default"].wrap(function _callee7$(_context7) {
        while (1) switch (_context7.prev = _context7.next) {
          case 0:
            if (!this.closed) {
              _context7.next = 2;
              break;
            }
            return _context7.abrupt("return", Promise.reject(new Error('already closed')));
          case 2:
            this.closed = true;
            this.changes$.complete();
            _lokijsHelper.OPEN_LOKIJS_STORAGE_INSTANCES["delete"](this);
            if (!this.internals.localState) {
              _context7.next = 16;
              break;
            }
            _context7.next = 8;
            return this.internals.localState;
          case 8:
            localState = _context7.sent;
            _context7.next = 11;
            return (0, _lokijsHelper.getLokiDatabase)(this.databaseName, this.databaseSettings);
          case 11:
            dbState = _context7.sent;
            _context7.next = 14;
            return dbState.saveQueue.run();
          case 14:
            _context7.next = 16;
            return (0, _lokijsHelper.closeLokiCollections)(this.databaseName, [localState.collection]);
          case 16:
          case "end":
            return _context7.stop();
        }
      }, _callee7, this);
    }));
    function close() {
      return _close.apply(this, arguments);
    }
    return close;
  }();
  _proto.remove = /*#__PURE__*/function () {
    var _remove = (0, _asyncToGenerator2["default"])( /*#__PURE__*/_regenerator["default"].mark(function _callee8() {
      var localState;
      return _regenerator["default"].wrap(function _callee8$(_context8) {
        while (1) switch (_context8.prev = _context8.next) {
          case 0:
            _context8.next = 2;
            return (0, _lokijsHelper.mustUseLocalState)(this);
          case 2:
            localState = _context8.sent;
            if (localState) {
              _context8.next = 5;
              break;
            }
            return _context8.abrupt("return", (0, _lokijsHelper.requestRemoteInstance)(this, 'remove', []));
          case 5:
            localState.databaseState.database.removeCollection(localState.collection.name);
            _context8.next = 8;
            return localState.databaseState.saveQueue.run();
          case 8:
            return _context8.abrupt("return", this.close());
          case 9:
          case "end":
            return _context8.stop();
        }
      }, _callee8, this);
    }));
    function remove() {
      return _remove.apply(this, arguments);
    }
    return remove;
  }();
  _proto.conflictResultionTasks = function conflictResultionTasks() {
    return new _rxjs.Subject();
  };
  _proto.resolveConflictResultionTask = /*#__PURE__*/function () {
    var _resolveConflictResultionTask = (0, _asyncToGenerator2["default"])( /*#__PURE__*/_regenerator["default"].mark(function _callee9(_taskSolution) {
      return _regenerator["default"].wrap(function _callee9$(_context9) {
        while (1) switch (_context9.prev = _context9.next) {
          case 0:
          case "end":
            return _context9.stop();
        }
      }, _callee9);
    }));
    function resolveConflictResultionTask(_x10) {
      return _resolveConflictResultionTask.apply(this, arguments);
    }
    return resolveConflictResultionTask;
  }();
  return RxStorageInstanceLoki;
}();
exports.RxStorageInstanceLoki = RxStorageInstanceLoki;
function createLokiLocalState(_x11, _x12) {
  return _createLokiLocalState.apply(this, arguments);
}
function _createLokiLocalState() {
  _createLokiLocalState = (0, _asyncToGenerator2["default"])( /*#__PURE__*/_regenerator["default"].mark(function _callee10(params, databaseSettings) {
    var databaseState, indices, primaryKey, lokiCollectionName, collectionOptions, collection, ret;
    return _regenerator["default"].wrap(function _callee10$(_context10) {
      while (1) switch (_context10.prev = _context10.next) {
        case 0:
          if (!params.options) {
            params.options = {};
          }
          _context10.next = 3;
          return (0, _lokijsHelper.getLokiDatabase)(params.databaseName, databaseSettings);
        case 3:
          databaseState = _context10.sent;
          /**
           * Construct loki indexes from RxJsonSchema indexes.
           * TODO what about compound indexes? Are they possible in lokijs?
           */
          indices = [];
          if (params.schema.indexes) {
            params.schema.indexes.forEach(function (idx) {
              if (!(0, _util.isMaybeReadonlyArray)(idx)) {
                indices.push(idx);
              }
            });
          }
          /**
           * LokiJS has no concept of custom primary key, they use a number-id that is generated.
           * To be able to query fast by primary key, we always add an index to the primary.
           */
          primaryKey = (0, _rxSchemaHelper.getPrimaryFieldOfPrimaryKey)(params.schema.primaryKey);
          indices.push(primaryKey);
          lokiCollectionName = params.collectionName + '-' + params.schema.version;
          collectionOptions = Object.assign({}, lokiCollectionName, {
            indices: indices,
            unique: [primaryKey]
          }, _lokijsHelper.LOKIJS_COLLECTION_DEFAULT_OPTIONS);
          collection = databaseState.database.addCollection(lokiCollectionName, collectionOptions);
          databaseState.collections[params.collectionName] = collection;
          ret = {
            databaseState: databaseState,
            collection: collection
          };
          return _context10.abrupt("return", ret);
        case 14:
        case "end":
          return _context10.stop();
      }
    }, _callee10);
  }));
  return _createLokiLocalState.apply(this, arguments);
}
function createLokiStorageInstance(_x13, _x14, _x15) {
  return _createLokiStorageInstance.apply(this, arguments);
}
function _createLokiStorageInstance() {
  _createLokiStorageInstance = (0, _asyncToGenerator2["default"])( /*#__PURE__*/_regenerator["default"].mark(function _callee11(storage, params, databaseSettings) {
    var internals, broadcastChannelRefObject, leaderElector, instance, closeBefore, removeBefore;
    return _regenerator["default"].wrap(function _callee11$(_context11) {
      while (1) switch (_context11.prev = _context11.next) {
        case 0:
          internals = {};
          broadcastChannelRefObject = {};
          if (!params.multiInstance) {
            _context11.next = 7;
            break;
          }
          leaderElector = (0, _lokijsHelper.getLokiLeaderElector)(params.databaseInstanceToken, broadcastChannelRefObject, params.databaseName);
          internals.leaderElector = leaderElector;
          _context11.next = 10;
          break;
        case 7:
          // optimisation shortcut, directly create db is non multi instance.
          internals.localState = createLokiLocalState(params, databaseSettings);
          _context11.next = 10;
          return internals.localState;
        case 10:
          instance = new RxStorageInstanceLoki(params.databaseInstanceToken, storage, params.databaseName, params.collectionName, params.schema, internals, params.options, databaseSettings);
          (0, _rxStorageMultiinstance.addRxStorageMultiInstanceSupport)(_lokijsHelper.RX_STORAGE_NAME_LOKIJS, params, instance, internals.leaderElector ? internals.leaderElector.broadcastChannel : undefined);
          if (params.multiInstance) {
            /**
             * Clean up the broadcast-channel reference on close()
             */
            closeBefore = instance.close.bind(instance);
            instance.close = function () {
              (0, _rxStorageMultiinstance.removeBroadcastChannelReference)(params.databaseInstanceToken, broadcastChannelRefObject);
              return closeBefore();
            };
            removeBefore = instance.remove.bind(instance);
            instance.remove = function () {
              (0, _rxStorageMultiinstance.removeBroadcastChannelReference)(params.databaseInstanceToken, broadcastChannelRefObject);
              return removeBefore();
            };

            /**
             * Directly create the localState when/if the db becomes leader.
             */
            (0, _util.ensureNotFalsy)(internals.leaderElector).awaitLeadership().then(function () {
              if (!instance.closed) {
                (0, _lokijsHelper.mustUseLocalState)(instance);
              }
            });
          }
          return _context11.abrupt("return", instance);
        case 14:
        case "end":
          return _context11.stop();
      }
    }, _callee11);
  }));
  return _createLokiStorageInstance.apply(this, arguments);
}
//# sourceMappingURL=rx-storage-instance-loki.js.map