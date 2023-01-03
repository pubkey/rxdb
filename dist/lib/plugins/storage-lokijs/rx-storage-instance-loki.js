"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.RxStorageInstanceLoki = void 0;
exports.createLokiLocalState = createLokiLocalState;
exports.createLokiStorageInstance = createLokiStorageInstance;
var _rxjs = require("rxjs");
var _utils = require("../utils");
var _rxError = require("../../rx-error");
var _lokijsHelper = require("./lokijs-helper");
var _rxSchemaHelper = require("../../rx-schema-helper");
var _rxStorageHelper = require("../../rx-storage-helper");
var _rxStorageMultiinstance = require("../../rx-storage-multiinstance");
var instanceId = (0, _utils.now)();
var RxStorageInstanceLoki = /*#__PURE__*/function () {
  function RxStorageInstanceLoki(databaseInstanceToken, storage, databaseName, collectionName, schema, internals, options, databaseSettings) {
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
      this.internals.leaderElector.awaitLeadership().then(() => {
        // this instance is leader now, so it has to reply to queries from other instances
        (0, _utils.ensureNotFalsy)(this.internals.leaderElector).broadcastChannel.addEventListener('message', msg => (0, _lokijsHelper.handleRemoteRequest)(copiedSelf, msg));
      });
    }
  }
  var _proto = RxStorageInstanceLoki.prototype;
  _proto.bulkWrite = async function bulkWrite(documentWrites, context) {
    if (documentWrites.length === 0) {
      throw (0, _rxError.newRxError)('P2', {
        args: {
          documentWrites
        }
      });
    }
    var localState = await (0, _lokijsHelper.mustUseLocalState)(this);
    if (!localState) {
      return (0, _lokijsHelper.requestRemoteInstance)(this, 'bulkWrite', [documentWrites]);
    }
    var ret = {
      success: {},
      error: {}
    };
    var docsInDb = new Map();
    var docsInDbWithLokiKey = new Map();
    documentWrites.forEach(writeRow => {
      var id = writeRow.document[this.primaryPath];
      var documentInDb = localState.collection.by(this.primaryPath, id);
      if (documentInDb) {
        docsInDbWithLokiKey.set(id, documentInDb);
        docsInDb.set(id, (0, _lokijsHelper.stripLokiKey)(documentInDb));
      }
    });
    var categorized = (0, _rxStorageHelper.categorizeBulkWriteRows)(this, this.primaryPath, docsInDb, documentWrites, context);
    ret.error = categorized.errors;
    categorized.bulkInsertDocs.forEach(writeRow => {
      var docId = writeRow.document[this.primaryPath];
      localState.collection.insert((0, _utils.flatClone)(writeRow.document));
      ret.success[docId] = writeRow.document;
    });
    categorized.bulkUpdateDocs.forEach(writeRow => {
      var docId = writeRow.document[this.primaryPath];
      var documentInDbWithLokiKey = (0, _utils.getFromMapOrThrow)(docsInDbWithLokiKey, docId);
      var writeDoc = Object.assign({}, writeRow.document, {
        $loki: documentInDbWithLokiKey.$loki
      });
      localState.collection.update(writeDoc);
      ret.success[docId] = writeRow.document;
    });
    localState.databaseState.saveQueue.addWrite();
    if (categorized.eventBulk.events.length > 0) {
      var lastState = (0, _rxStorageHelper.getNewestOfDocumentStates)(this.primaryPath, Object.values(ret.success));
      categorized.eventBulk.checkpoint = {
        id: lastState[this.primaryPath],
        lwt: lastState._meta.lwt
      };
      this.changes$.next(categorized.eventBulk);
    }
    return ret;
  };
  _proto.findDocumentsById = async function findDocumentsById(ids, deleted) {
    var localState = await (0, _lokijsHelper.mustUseLocalState)(this);
    if (!localState) {
      return (0, _lokijsHelper.requestRemoteInstance)(this, 'findDocumentsById', [ids, deleted]);
    }
    var ret = {};
    ids.forEach(id => {
      var documentInDb = localState.collection.by(this.primaryPath, id);
      if (documentInDb && (!documentInDb._deleted || deleted)) {
        ret[id] = (0, _lokijsHelper.stripLokiKey)(documentInDb);
      }
    });
    return ret;
  };
  _proto.query = async function query(preparedQuery) {
    var localState = await (0, _lokijsHelper.mustUseLocalState)(this);
    if (!localState) {
      return (0, _lokijsHelper.requestRemoteInstance)(this, 'query', [preparedQuery]);
    }
    var query = localState.collection.chain().find(preparedQuery.selector);
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
    var foundDocuments = query.data().map(lokiDoc => (0, _lokijsHelper.stripLokiKey)(lokiDoc));
    return {
      documents: foundDocuments
    };
  };
  _proto.count = async function count(preparedQuery) {
    var result = await this.query(preparedQuery);
    return {
      count: result.documents.length,
      mode: 'fast'
    };
  };
  _proto.getAttachmentData = function getAttachmentData(_documentId, _attachmentId) {
    throw new Error('Attachments are not implemented in the lokijs RxStorage. Make a pull request.');
  };
  _proto.getChangedDocumentsSince = async function getChangedDocumentsSince(limit, checkpoint) {
    var localState = await (0, _lokijsHelper.mustUseLocalState)(this);
    if (!localState) {
      return (0, _lokijsHelper.requestRemoteInstance)(this, 'getChangedDocumentsSince', [limit, checkpoint]);
    }
    var sinceLwt = checkpoint ? checkpoint.lwt : _utils.RX_META_LWT_MINIMUM;
    var query = localState.collection.chain().find({
      '_meta.lwt': {
        $gte: sinceLwt
      }
    }).sort((0, _utils.getSortDocumentsByLastWriteTimeComparator)(this.primaryPath));
    var changedDocs = query.data();
    var first = changedDocs[0];
    if (checkpoint && first && first[this.primaryPath] === checkpoint.id && first._meta.lwt === checkpoint.lwt) {
      changedDocs.shift();
    }
    changedDocs = changedDocs.slice(0, limit);
    var lastDoc = (0, _utils.lastOfArray)(changedDocs);
    return {
      documents: changedDocs.map(docData => (0, _lokijsHelper.stripLokiKey)(docData)),
      checkpoint: lastDoc ? {
        id: lastDoc[this.primaryPath],
        lwt: lastDoc._meta.lwt
      } : checkpoint ? checkpoint : {
        id: '',
        lwt: 0
      }
    };
  };
  _proto.changeStream = function changeStream() {
    return this.changes$.asObservable();
  };
  _proto.cleanup = async function cleanup(minimumDeletedTime) {
    var localState = await (0, _lokijsHelper.mustUseLocalState)(this);
    if (!localState) {
      return (0, _lokijsHelper.requestRemoteInstance)(this, 'cleanup', [minimumDeletedTime]);
    }
    var deleteAmountPerRun = 10;
    var maxDeletionTime = (0, _utils.now)() - minimumDeletedTime;
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
  };
  _proto.close = async function close() {
    if (this.closed) {
      return Promise.reject(new Error('already closed'));
    }
    this.closed = true;
    this.changes$.complete();
    _lokijsHelper.OPEN_LOKIJS_STORAGE_INSTANCES.delete(this);
    if (this.internals.localState) {
      var localState = await this.internals.localState;
      var dbState = await (0, _lokijsHelper.getLokiDatabase)(this.databaseName, this.databaseSettings);
      await dbState.saveQueue.run();
      await (0, _lokijsHelper.closeLokiCollections)(this.databaseName, [localState.collection]);
    }
  };
  _proto.remove = async function remove() {
    var localState = await (0, _lokijsHelper.mustUseLocalState)(this);
    if (!localState) {
      return (0, _lokijsHelper.requestRemoteInstance)(this, 'remove', []);
    }
    localState.databaseState.database.removeCollection(localState.collection.name);
    await localState.databaseState.saveQueue.run();
    return this.close();
  };
  _proto.conflictResultionTasks = function conflictResultionTasks() {
    return new _rxjs.Subject();
  };
  _proto.resolveConflictResultionTask = async function resolveConflictResultionTask(_taskSolution) {};
  return RxStorageInstanceLoki;
}();
exports.RxStorageInstanceLoki = RxStorageInstanceLoki;
async function createLokiLocalState(params, databaseSettings) {
  if (!params.options) {
    params.options = {};
  }
  var databaseState = await (0, _lokijsHelper.getLokiDatabase)(params.databaseName, databaseSettings);

  /**
   * Construct loki indexes from RxJsonSchema indexes.
   * TODO what about compound indexes? Are they possible in lokijs?
   */
  var indices = [];
  if (params.schema.indexes) {
    params.schema.indexes.forEach(idx => {
      if (!(0, _utils.isMaybeReadonlyArray)(idx)) {
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
    databaseState,
    collection
  };
  return ret;
}
async function createLokiStorageInstance(storage, params, databaseSettings) {
  var internals = {};
  var broadcastChannelRefObject = {};
  if (params.multiInstance) {
    var leaderElector = (0, _lokijsHelper.getLokiLeaderElector)(params.databaseInstanceToken, broadcastChannelRefObject, params.databaseName);
    internals.leaderElector = leaderElector;
  } else {
    // optimisation shortcut, directly create db is non multi instance.
    internals.localState = createLokiLocalState(params, databaseSettings);
    await internals.localState;
  }
  var instance = new RxStorageInstanceLoki(params.databaseInstanceToken, storage, params.databaseName, params.collectionName, params.schema, internals, params.options, databaseSettings);
  (0, _rxStorageMultiinstance.addRxStorageMultiInstanceSupport)(_lokijsHelper.RX_STORAGE_NAME_LOKIJS, params, instance, internals.leaderElector ? internals.leaderElector.broadcastChannel : undefined);
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
    (0, _utils.ensureNotFalsy)(internals.leaderElector).awaitLeadership().then(() => {
      if (!instance.closed) {
        (0, _lokijsHelper.mustUseLocalState)(instance);
      }
    });
  }
  return instance;
}
//# sourceMappingURL=rx-storage-instance-loki.js.map