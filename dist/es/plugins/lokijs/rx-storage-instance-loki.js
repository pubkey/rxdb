import { Subject } from 'rxjs';
import { flatClone, now, ensureNotFalsy, isMaybeReadonlyArray, getFromMapOrThrow, getSortDocumentsByLastWriteTimeComparator, RX_META_LWT_MINIMUM, lastOfArray } from '../../util';
import { newRxError } from '../../rx-error';
import { closeLokiCollections, getLokiDatabase, OPEN_LOKIJS_STORAGE_INSTANCES, LOKIJS_COLLECTION_DEFAULT_OPTIONS, stripLokiKey, getLokiSortComparator, getLokiLeaderElector, requestRemoteInstance, mustUseLocalState, handleRemoteRequest, RX_STORAGE_NAME_LOKIJS } from './lokijs-helper';
import { getPrimaryFieldOfPrimaryKey } from '../../rx-schema-helper';
import { categorizeBulkWriteRows, getNewestOfDocumentStates } from '../../rx-storage-helper';
import { addRxStorageMultiInstanceSupport, removeBroadcastChannelReference } from '../../rx-storage-multiinstance';
export var createLokiStorageInstance = function createLokiStorageInstance(storage, params, databaseSettings) {
  try {
    var _temp5 = function _temp5() {
      var instance = new RxStorageInstanceLoki(params.databaseInstanceToken, storage, params.databaseName, params.collectionName, params.schema, _internals, params.options, databaseSettings);
      addRxStorageMultiInstanceSupport(RX_STORAGE_NAME_LOKIJS, params, instance, _internals.leaderElector ? _internals.leaderElector.broadcastChannel : undefined);
      if (params.multiInstance) {
        /**
         * Clean up the broadcast-channel reference on close()
         */
        var closeBefore = instance.close.bind(instance);
        instance.close = function () {
          removeBroadcastChannelReference(params.databaseInstanceToken, broadcastChannelRefObject);
          return closeBefore();
        };
        var removeBefore = instance.remove.bind(instance);
        instance.remove = function () {
          removeBroadcastChannelReference(params.databaseInstanceToken, broadcastChannelRefObject);
          return removeBefore();
        };

        /**
         * Directly create the localState when/if the db becomes leader.
         */
        ensureNotFalsy(_internals.leaderElector).awaitLeadership().then(function () {
          if (!instance.closed) {
            mustUseLocalState(instance);
          }
        });
      }
      return instance;
    };
    var _internals = {};
    var broadcastChannelRefObject = {};
    var _temp6 = function () {
      if (params.multiInstance) {
        var leaderElector = getLokiLeaderElector(params.databaseInstanceToken, broadcastChannelRefObject, params.databaseName);
        _internals.leaderElector = leaderElector;
      } else {
        // optimisation shortcut, directly create db is non multi instance.
        _internals.localState = createLokiLocalState(params, databaseSettings);
        return Promise.resolve(_internals.localState).then(function () {});
      }
    }();
    return Promise.resolve(_temp6 && _temp6.then ? _temp6.then(_temp5) : _temp5(_temp6));
  } catch (e) {
    return Promise.reject(e);
  }
};
export var createLokiLocalState = function createLokiLocalState(params, databaseSettings) {
  try {
    if (!params.options) {
      params.options = {};
    }
    return Promise.resolve(getLokiDatabase(params.databaseName, databaseSettings)).then(function (databaseState) {
      /**
       * Construct loki indexes from RxJsonSchema indexes.
       * TODO what about compound indexes? Are they possible in lokijs?
       */
      var indices = [];
      if (params.schema.indexes) {
        params.schema.indexes.forEach(function (idx) {
          if (!isMaybeReadonlyArray(idx)) {
            indices.push(idx);
          }
        });
      }
      /**
       * LokiJS has no concept of custom primary key, they use a number-id that is generated.
       * To be able to query fast by primary key, we always add an index to the primary.
       */
      var primaryKey = getPrimaryFieldOfPrimaryKey(params.schema.primaryKey);
      indices.push(primaryKey);
      var lokiCollectionName = params.collectionName + '-' + params.schema.version;
      var collectionOptions = Object.assign({}, lokiCollectionName, {
        indices: indices,
        unique: [primaryKey]
      }, LOKIJS_COLLECTION_DEFAULT_OPTIONS);
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
var instanceId = now();
export var RxStorageInstanceLoki = /*#__PURE__*/function () {
  function RxStorageInstanceLoki(databaseInstanceToken, storage, databaseName, collectionName, schema, internals, options, databaseSettings) {
    var _this = this;
    this.changes$ = new Subject();
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
    this.primaryPath = getPrimaryFieldOfPrimaryKey(this.schema.primaryKey);
    OPEN_LOKIJS_STORAGE_INSTANCES.add(this);
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
        ensureNotFalsy(_this.internals.leaderElector).broadcastChannel.addEventListener('message', function (msg) {
          return handleRemoteRequest(copiedSelf, msg);
        });
      });
    }
  }
  var _proto = RxStorageInstanceLoki.prototype;
  _proto.bulkWrite = function bulkWrite(documentWrites, context) {
    try {
      var _this3 = this;
      if (documentWrites.length === 0) {
        throw newRxError('P2', {
          args: {
            documentWrites: documentWrites
          }
        });
      }
      return Promise.resolve(mustUseLocalState(_this3)).then(function (localState) {
        if (!localState) {
          return requestRemoteInstance(_this3, 'bulkWrite', [documentWrites]);
        }
        var ret = {
          success: {},
          error: {}
        };
        var docsInDb = new Map();
        var docsInDbWithLokiKey = new Map();
        documentWrites.forEach(function (writeRow) {
          var id = writeRow.document[_this3.primaryPath];
          var documentInDb = localState.collection.by(_this3.primaryPath, id);
          if (documentInDb) {
            docsInDbWithLokiKey.set(id, documentInDb);
            docsInDb.set(id, stripLokiKey(documentInDb));
          }
        });
        var categorized = categorizeBulkWriteRows(_this3, _this3.primaryPath, docsInDb, documentWrites, context);
        ret.error = categorized.errors;
        categorized.bulkInsertDocs.forEach(function (writeRow) {
          var docId = writeRow.document[_this3.primaryPath];
          localState.collection.insert(flatClone(writeRow.document));
          ret.success[docId] = writeRow.document;
        });
        categorized.bulkUpdateDocs.forEach(function (writeRow) {
          var docId = writeRow.document[_this3.primaryPath];
          var documentInDbWithLokiKey = getFromMapOrThrow(docsInDbWithLokiKey, docId);
          var writeDoc = Object.assign({}, writeRow.document, {
            $loki: documentInDbWithLokiKey.$loki
          });
          localState.collection.update(writeDoc);
          ret.success[docId] = writeRow.document;
        });
        localState.databaseState.saveQueue.addWrite();
        if (categorized.eventBulk.events.length > 0) {
          var lastState = getNewestOfDocumentStates(_this3.primaryPath, Object.values(ret.success));
          categorized.eventBulk.checkpoint = {
            id: lastState[_this3.primaryPath],
            lwt: lastState._meta.lwt
          };
          _this3.changes$.next(categorized.eventBulk);
        }
        return ret;
      });
    } catch (e) {
      return Promise.reject(e);
    }
  };
  _proto.findDocumentsById = function findDocumentsById(ids, deleted) {
    try {
      var _this5 = this;
      return Promise.resolve(mustUseLocalState(_this5)).then(function (localState) {
        if (!localState) {
          return requestRemoteInstance(_this5, 'findDocumentsById', [ids, deleted]);
        }
        var ret = {};
        ids.forEach(function (id) {
          var documentInDb = localState.collection.by(_this5.primaryPath, id);
          if (documentInDb && (!documentInDb._deleted || deleted)) {
            ret[id] = stripLokiKey(documentInDb);
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
      var _this7 = this;
      return Promise.resolve(mustUseLocalState(_this7)).then(function (localState) {
        if (!localState) {
          return requestRemoteInstance(_this7, 'query', [preparedQuery]);
        }
        var query = localState.collection.chain().find(preparedQuery.selector);
        if (preparedQuery.sort) {
          query = query.sort(getLokiSortComparator(_this7.schema, preparedQuery));
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
          return stripLokiKey(lokiDoc);
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
      var _this9 = this;
      return Promise.resolve(_this9.query(preparedQuery)).then(function (result) {
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
      var _this11 = this;
      return Promise.resolve(mustUseLocalState(_this11)).then(function (localState) {
        if (!localState) {
          return requestRemoteInstance(_this11, 'getChangedDocumentsSince', [limit, checkpoint]);
        }
        var sinceLwt = checkpoint ? checkpoint.lwt : RX_META_LWT_MINIMUM;
        var query = localState.collection.chain().find({
          '_meta.lwt': {
            $gte: sinceLwt
          }
        }).sort(getSortDocumentsByLastWriteTimeComparator(_this11.primaryPath));
        var changedDocs = query.data();
        var first = changedDocs[0];
        if (checkpoint && first && first[_this11.primaryPath] === checkpoint.id && first._meta.lwt === checkpoint.lwt) {
          changedDocs.shift();
        }
        changedDocs = changedDocs.slice(0, limit);
        var lastDoc = lastOfArray(changedDocs);
        return {
          documents: changedDocs.map(function (docData) {
            return stripLokiKey(docData);
          }),
          checkpoint: lastDoc ? {
            id: lastDoc[_this11.primaryPath],
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
      var _this13 = this;
      return Promise.resolve(mustUseLocalState(_this13)).then(function (localState) {
        if (!localState) {
          return requestRemoteInstance(_this13, 'cleanup', [minimumDeletedTime]);
        }
        var deleteAmountPerRun = 10;
        var maxDeletionTime = now() - minimumDeletedTime;
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
      var _this15 = this;
      if (_this15.closed) {
        return Promise.reject(new Error('already closed'));
      }
      _this15.closed = true;
      _this15.changes$.complete();
      OPEN_LOKIJS_STORAGE_INSTANCES["delete"](_this15);
      var _temp2 = function () {
        if (_this15.internals.localState) {
          return Promise.resolve(_this15.internals.localState).then(function (localState) {
            return Promise.resolve(getLokiDatabase(_this15.databaseName, _this15.databaseSettings)).then(function (dbState) {
              return Promise.resolve(dbState.saveQueue.run()).then(function () {
                return Promise.resolve(closeLokiCollections(_this15.databaseName, [localState.collection])).then(function () {});
              });
            });
          });
        }
      }();
      return Promise.resolve(_temp2 && _temp2.then ? _temp2.then(function () {}) : void 0);
    } catch (e) {
      return Promise.reject(e);
    }
  };
  _proto.remove = function remove() {
    try {
      var _this17 = this;
      return Promise.resolve(mustUseLocalState(_this17)).then(function (localState) {
        if (!localState) {
          return requestRemoteInstance(_this17, 'remove', []);
        }
        localState.databaseState.database.removeCollection(localState.collection.name);
        return Promise.resolve(localState.databaseState.saveQueue.run()).then(function () {
          return _this17.close();
        });
      });
    } catch (e) {
      return Promise.reject(e);
    }
  };
  _proto.conflictResultionTasks = function conflictResultionTasks() {
    return new Subject();
  };
  _proto.resolveConflictResultionTask = function resolveConflictResultionTask(_taskSolution) {
    return Promise.resolve();
  };
  return RxStorageInstanceLoki;
}();
//# sourceMappingURL=rx-storage-instance-loki.js.map