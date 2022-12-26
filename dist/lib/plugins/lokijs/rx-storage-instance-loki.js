"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.createLokiStorageInstance = exports.createLokiLocalState = exports.RxStorageInstanceLoki = void 0;
var _rxjs = require("rxjs");
var _util = require("../../util");
var _rxError = require("../../rx-error");
var _lokijsHelper = require("./lokijs-helper");
var _rxSchemaHelper = require("../../rx-schema-helper");
var _rxStorageHelper = require("../../rx-storage-helper");
var _rxStorageMultiinstance = require("../../rx-storage-multiinstance");
var createLokiStorageInstance = function createLokiStorageInstance(storage, params, databaseSettings) {
  try {
    var _temp3 = function _temp3() {
      var instance = new RxStorageInstanceLoki(params.databaseInstanceToken, storage, params.databaseName, params.collectionName, params.schema, _internals, params.options, databaseSettings);
      (0, _rxStorageMultiinstance.addRxStorageMultiInstanceSupport)(_lokijsHelper.RX_STORAGE_NAME_LOKIJS, params, instance, _internals.leaderElector ? _internals.leaderElector.broadcastChannel : undefined);
      if (params.multiInstance) {
        /**
         * Clean up the broadcast-channel reference on close()
         */
        var closeBefore = instance.close.bind(instance);
        instance.close = function () {
          (0, _rxStorageMultiinstance.removeBroadcastChannelReference)(params.databaseInstanceToken, broadcastChannelRefObject);
          return closeBefore();
        };
        var removeBefore = instance.remove.bind(instance);
        instance.remove = function () {
          (0, _rxStorageMultiinstance.removeBroadcastChannelReference)(params.databaseInstanceToken, broadcastChannelRefObject);
          return removeBefore();
        };

        /**
         * Directly create the localState when/if the db becomes leader.
         */
        (0, _util.ensureNotFalsy)(_internals.leaderElector).awaitLeadership().then(function () {
          if (!instance.closed) {
            (0, _lokijsHelper.mustUseLocalState)(instance);
          }
        });
      }
      return instance;
    };
    var _internals = {};
    var broadcastChannelRefObject = {};
    var _temp2 = function () {
      if (params.multiInstance) {
        var leaderElector = (0, _lokijsHelper.getLokiLeaderElector)(params.databaseInstanceToken, broadcastChannelRefObject, params.databaseName);
        _internals.leaderElector = leaderElector;
      } else {
        // optimisation shortcut, directly create db is non multi instance.
        _internals.localState = createLokiLocalState(params, databaseSettings);
        return Promise.resolve(_internals.localState).then(function () {});
      }
    }();
    return Promise.resolve(_temp2 && _temp2.then ? _temp2.then(_temp3) : _temp3(_temp2));
  } catch (e) {
    return Promise.reject(e);
  }
};
exports.createLokiStorageInstance = createLokiStorageInstance;
var createLokiLocalState = function createLokiLocalState(params, databaseSettings) {
  try {
    if (!params.options) {
      params.options = {};
    }
    return Promise.resolve((0, _lokijsHelper.getLokiDatabase)(params.databaseName, databaseSettings)).then(function (databaseState) {
      /**
       * Construct loki indexes from RxJsonSchema indexes.
       * TODO what about compound indexes? Are they possible in lokijs?
       */
      var indices = [];
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
      var primaryKey = (0, _rxSchemaHelper.getPrimaryFieldOfPrimaryKey)(params.schema.primaryKey);
      indices.push(primaryKey);
      var lokiCollectionName = params.collectionName + '-' + params.schema.version;
      var collectionOptions = Object.assign({}, lokiCollectionName, {
        indices: indices,
        unique: [primaryKey]
      }, _lokijsHelper.LOKIJS_COLLECTION_DEFAULT_OPTIONS);
      var collection = databaseState.database.addCollection(lokiCollectionName, collectionOptions);
      databaseState.collections[params.collectionName] = collection;
      var ret = {
        databaseState: databaseState,
        collection: collection
      };
      return ret;
    });
  } catch (e) {
    return Promise.reject(e);
  }
};
exports.createLokiLocalState = createLokiLocalState;
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
  _proto.bulkWrite = function bulkWrite(documentWrites, context) {
    try {
      var _this2 = this;
      if (documentWrites.length === 0) {
        throw (0, _rxError.newRxError)('P2', {
          args: {
            documentWrites: documentWrites
          }
        });
      }
      return Promise.resolve((0, _lokijsHelper.mustUseLocalState)(_this2)).then(function (localState) {
        if (!localState) {
          return (0, _lokijsHelper.requestRemoteInstance)(_this2, 'bulkWrite', [documentWrites]);
        }
        var ret = {
          success: {},
          error: {}
        };
        var docsInDb = new Map();
        var docsInDbWithLokiKey = new Map();
        documentWrites.forEach(function (writeRow) {
          var id = writeRow.document[_this2.primaryPath];
          var documentInDb = localState.collection.by(_this2.primaryPath, id);
          if (documentInDb) {
            docsInDbWithLokiKey.set(id, documentInDb);
            docsInDb.set(id, (0, _lokijsHelper.stripLokiKey)(documentInDb));
          }
        });
        var categorized = (0, _rxStorageHelper.categorizeBulkWriteRows)(_this2, _this2.primaryPath, docsInDb, documentWrites, context);
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
          var lastState = (0, _rxStorageHelper.getNewestOfDocumentStates)(_this2.primaryPath, Object.values(ret.success));
          categorized.eventBulk.checkpoint = {
            id: lastState[_this2.primaryPath],
            lwt: lastState._meta.lwt
          };
          _this2.changes$.next(categorized.eventBulk);
        }
        return ret;
      });
    } catch (e) {
      return Promise.reject(e);
    }
  };
  _proto.findDocumentsById = function findDocumentsById(ids, deleted) {
    try {
      var _this3 = this;
      return Promise.resolve((0, _lokijsHelper.mustUseLocalState)(_this3)).then(function (localState) {
        if (!localState) {
          return (0, _lokijsHelper.requestRemoteInstance)(_this3, 'findDocumentsById', [ids, deleted]);
        }
        var ret = {};
        ids.forEach(function (id) {
          var documentInDb = localState.collection.by(_this3.primaryPath, id);
          if (documentInDb && (!documentInDb._deleted || deleted)) {
            ret[id] = (0, _lokijsHelper.stripLokiKey)(documentInDb);
          }
        });
        return ret;
      });
    } catch (e) {
      return Promise.reject(e);
    }
  };
  _proto.query = function query(preparedQuery) {
    try {
      var _this4 = this;
      return Promise.resolve((0, _lokijsHelper.mustUseLocalState)(_this4)).then(function (localState) {
        if (!localState) {
          return (0, _lokijsHelper.requestRemoteInstance)(_this4, 'query', [preparedQuery]);
        }
        var query = localState.collection.chain().find(preparedQuery.selector);
        if (preparedQuery.sort) {
          query = query.sort((0, _lokijsHelper.getLokiSortComparator)(_this4.schema, preparedQuery));
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
        var foundDocuments = query.data().map(function (lokiDoc) {
          return (0, _lokijsHelper.stripLokiKey)(lokiDoc);
        });
        return {
          documents: foundDocuments
        };
      });
    } catch (e) {
      return Promise.reject(e);
    }
  };
  _proto.count = function count(preparedQuery) {
    try {
      var _this5 = this;
      return Promise.resolve(_this5.query(preparedQuery)).then(function (result) {
        return {
          count: result.documents.length,
          mode: 'fast'
        };
      });
    } catch (e) {
      return Promise.reject(e);
    }
  };
  _proto.getAttachmentData = function getAttachmentData(_documentId, _attachmentId) {
    throw new Error('Attachments are not implemented in the lokijs RxStorage. Make a pull request.');
  };
  _proto.getChangedDocumentsSince = function getChangedDocumentsSince(limit, checkpoint) {
    try {
      var _this6 = this;
      return Promise.resolve((0, _lokijsHelper.mustUseLocalState)(_this6)).then(function (localState) {
        if (!localState) {
          return (0, _lokijsHelper.requestRemoteInstance)(_this6, 'getChangedDocumentsSince', [limit, checkpoint]);
        }
        var sinceLwt = checkpoint ? checkpoint.lwt : _util.RX_META_LWT_MINIMUM;
        var query = localState.collection.chain().find({
          '_meta.lwt': {
            $gte: sinceLwt
          }
        }).sort((0, _util.getSortDocumentsByLastWriteTimeComparator)(_this6.primaryPath));
        var changedDocs = query.data();
        var first = changedDocs[0];
        if (checkpoint && first && first[_this6.primaryPath] === checkpoint.id && first._meta.lwt === checkpoint.lwt) {
          changedDocs.shift();
        }
        changedDocs = changedDocs.slice(0, limit);
        var lastDoc = (0, _util.lastOfArray)(changedDocs);
        return {
          documents: changedDocs.map(function (docData) {
            return (0, _lokijsHelper.stripLokiKey)(docData);
          }),
          checkpoint: lastDoc ? {
            id: lastDoc[_this6.primaryPath],
            lwt: lastDoc._meta.lwt
          } : checkpoint ? checkpoint : {
            id: '',
            lwt: 0
          }
        };
      });
    } catch (e) {
      return Promise.reject(e);
    }
  };
  _proto.changeStream = function changeStream() {
    return this.changes$.asObservable();
  };
  _proto.cleanup = function cleanup(minimumDeletedTime) {
    try {
      var _this7 = this;
      return Promise.resolve((0, _lokijsHelper.mustUseLocalState)(_this7)).then(function (localState) {
        if (!localState) {
          return (0, _lokijsHelper.requestRemoteInstance)(_this7, 'cleanup', [minimumDeletedTime]);
        }
        var deleteAmountPerRun = 10;
        var maxDeletionTime = (0, _util.now)() - minimumDeletedTime;
        var query = localState.collection.chain().find({
          _deleted: true,
          '_meta.lwt': {
            $lt: maxDeletionTime
          }
        }).limit(deleteAmountPerRun);
        var foundDocuments = query.data();
        if (foundDocuments.length > 0) {
          localState.collection.remove(foundDocuments);
          localState.databaseState.saveQueue.addWrite();
        }
        return foundDocuments.length !== deleteAmountPerRun;
      });
    } catch (e) {
      return Promise.reject(e);
    }
  };
  _proto.close = function close() {
    try {
      var _this8 = this;
      if (_this8.closed) {
        return Promise.reject(new Error('already closed'));
      }
      _this8.closed = true;
      _this8.changes$.complete();
      _lokijsHelper.OPEN_LOKIJS_STORAGE_INSTANCES["delete"](_this8);
      var _temp = function () {
        if (_this8.internals.localState) {
          return Promise.resolve(_this8.internals.localState).then(function (localState) {
            return Promise.resolve((0, _lokijsHelper.getLokiDatabase)(_this8.databaseName, _this8.databaseSettings)).then(function (dbState) {
              return Promise.resolve(dbState.saveQueue.run()).then(function () {
                return Promise.resolve((0, _lokijsHelper.closeLokiCollections)(_this8.databaseName, [localState.collection])).then(function () {});
              });
            });
          });
        }
      }();
      return Promise.resolve(_temp && _temp.then ? _temp.then(function () {}) : void 0);
    } catch (e) {
      return Promise.reject(e);
    }
  };
  _proto.remove = function remove() {
    try {
      var _this9 = this;
      return Promise.resolve((0, _lokijsHelper.mustUseLocalState)(_this9)).then(function (localState) {
        if (!localState) {
          return (0, _lokijsHelper.requestRemoteInstance)(_this9, 'remove', []);
        }
        localState.databaseState.database.removeCollection(localState.collection.name);
        return Promise.resolve(localState.databaseState.saveQueue.run()).then(function () {
          return _this9.close();
        });
      });
    } catch (e) {
      return Promise.reject(e);
    }
  };
  _proto.conflictResultionTasks = function conflictResultionTasks() {
    return new _rxjs.Subject();
  };
  _proto.resolveConflictResultionTask = function resolveConflictResultionTask(_taskSolution) {
    return Promise.resolve();
  };
  return RxStorageInstanceLoki;
}();
exports.RxStorageInstanceLoki = RxStorageInstanceLoki;
//# sourceMappingURL=rx-storage-instance-loki.js.map