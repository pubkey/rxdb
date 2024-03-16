import { Subject } from 'rxjs';
import { flatClone, now, ensureNotFalsy, isMaybeReadonlyArray, getFromMapOrThrow, hasDeepProperty } from "../utils/index.js";
import { newRxError } from "../../rx-error.js";
import { closeLokiCollections, getLokiDatabase, OPEN_LOKIJS_STORAGE_INSTANCES, LOKIJS_COLLECTION_DEFAULT_OPTIONS, stripLokiKey, getLokiSortComparator, getLokiLeaderElector, requestRemoteInstance, mustUseLocalState, handleRemoteRequest, RX_STORAGE_NAME_LOKIJS, transformRegexToRegExp } from "./lokijs-helper.js";
import { getPrimaryFieldOfPrimaryKey } from "../../rx-schema-helper.js";
import { categorizeBulkWriteRows } from "../../rx-storage-helper.js";
import { addRxStorageMultiInstanceSupport, removeBroadcastChannelReference } from "../../rx-storage-multiinstance.js";
import { getQueryMatcher } from "../../rx-query-helper.js";
var instanceId = now();
export var RxStorageInstanceLoki = /*#__PURE__*/function () {
  function RxStorageInstanceLoki(databaseInstanceToken, storage, databaseName, collectionName, schema, internals, options, databaseSettings) {
    this.changes$ = new Subject();
    this.instanceId = instanceId++;
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
        internals: this.internals,
        options: this.options,
        remove: this.remove.bind(this),
        resolveConflictResultionTask: this.resolveConflictResultionTask.bind(this),
        schema: this.schema
      };
      this.internals.leaderElector.awaitLeadership().then(() => {
        // this instance is leader now, so it has to reply to queries from other instances
        ensureNotFalsy(this.internals.leaderElector).broadcastChannel.addEventListener('message', msg => handleRemoteRequest(copiedSelf, msg));
      }).catch(() => {});
    }
  }
  var _proto = RxStorageInstanceLoki.prototype;
  _proto.bulkWrite = async function bulkWrite(documentWrites, context) {
    if (documentWrites.length === 0) {
      throw newRxError('P2', {
        args: {
          documentWrites
        }
      });
    }
    var localState = await mustUseLocalState(this);
    if (!localState) {
      return requestRemoteInstance(this, 'bulkWrite', [documentWrites]);
    }
    var ret = {
      success: [],
      error: []
    };
    var docsInDb = new Map();
    var docsInDbWithLokiKey = new Map();
    documentWrites.forEach(writeRow => {
      var id = writeRow.document[this.primaryPath];
      var documentInDb = localState.collection.by(this.primaryPath, id);
      if (documentInDb) {
        docsInDbWithLokiKey.set(id, documentInDb);
        docsInDb.set(id, stripLokiKey(documentInDb));
      }
    });
    var categorized = categorizeBulkWriteRows(this, this.primaryPath, docsInDb, documentWrites, context);
    ret.error = categorized.errors;
    categorized.bulkInsertDocs.forEach(writeRow => {
      localState.collection.insert(flatClone(writeRow.document));
      ret.success.push(writeRow.document);
    });
    categorized.bulkUpdateDocs.forEach(writeRow => {
      var docId = writeRow.document[this.primaryPath];
      var documentInDbWithLokiKey = getFromMapOrThrow(docsInDbWithLokiKey, docId);
      var writeDoc = Object.assign({}, writeRow.document, {
        $loki: documentInDbWithLokiKey.$loki
      });
      localState.collection.update(writeDoc);
      ret.success.push(writeRow.document);
    });
    localState.databaseState.saveQueue.addWrite();
    if (categorized.eventBulk.events.length > 0) {
      var lastState = ensureNotFalsy(categorized.newestRow).document;
      categorized.eventBulk.checkpoint = {
        id: lastState[this.primaryPath],
        lwt: lastState._meta.lwt
      };
      categorized.eventBulk.endTime = now();
      this.changes$.next(categorized.eventBulk);
    }
    return ret;
  };
  _proto.findDocumentsById = async function findDocumentsById(ids, deleted) {
    var localState = await mustUseLocalState(this);
    if (!localState) {
      return requestRemoteInstance(this, 'findDocumentsById', [ids, deleted]);
    }
    var ret = [];
    ids.forEach(id => {
      var documentInDb = localState.collection.by(this.primaryPath, id);
      if (documentInDb && (!documentInDb._deleted || deleted)) {
        ret.push(stripLokiKey(documentInDb));
      }
    });
    return ret;
  };
  _proto.query = async function query(preparedQueryOriginal) {
    var localState = await mustUseLocalState(this);
    if (!localState) {
      return requestRemoteInstance(this, 'query', [preparedQueryOriginal]);
    }
    var preparedQuery = ensureNotFalsy(preparedQueryOriginal.query);
    if (preparedQuery.selector) {
      preparedQuery = flatClone(preparedQuery);
      preparedQuery.selector = transformRegexToRegExp(preparedQuery.selector);
    }
    var query = preparedQueryOriginal.query;
    var skip = query.skip ? query.skip : 0;
    var limit = query.limit ? query.limit : Infinity;
    var skipPlusLimit = skip + limit;

    /**
     * LokiJS is not able to give correct results for some
     * operators, so we have to check all documents in that case
     * and laster apply skip and limit manually.
     * @link https://github.com/pubkey/rxdb/issues/5320
     */
    var mustRunMatcher = false;
    if (hasDeepProperty(preparedQuery.selector, '$in')) {
      mustRunMatcher = true;
    }
    var lokiQuery = localState.collection.chain().find(mustRunMatcher ? {} : preparedQuery.selector);
    if (preparedQuery.sort) {
      lokiQuery = lokiQuery.sort(getLokiSortComparator(this.schema, preparedQuery));
    }
    var foundDocuments = lokiQuery.data().map(lokiDoc => stripLokiKey(lokiDoc));

    /**
     * LokiJS returned wrong results on some queries
     * with complex indexes. Therefore we run the query-match
     * over all result docs to patch this bug.
     * TODO create an issue at the LokiJS repository.
     */
    var queryMatcher = getQueryMatcher(this.schema, preparedQuery);
    foundDocuments = foundDocuments.filter(d => queryMatcher(d));

    // always apply offset and limit like this, because
    // sylvieQuery.offset() and sylvieQuery.limit() results were inconsistent
    foundDocuments = foundDocuments.slice(skip, skipPlusLimit);
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
  _proto.getAttachmentData = function getAttachmentData(_documentId, _attachmentId, _digest) {
    throw new Error('Attachments are not implemented in the lokijs RxStorage. Make a pull request.');
  };
  _proto.changeStream = function changeStream() {
    return this.changes$.asObservable();
  };
  _proto.cleanup = async function cleanup(minimumDeletedTime) {
    var localState = await mustUseLocalState(this);
    if (!localState) {
      return requestRemoteInstance(this, 'cleanup', [minimumDeletedTime]);
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
  };
  _proto.close = async function close() {
    if (this.closed) {
      return this.closed;
    }
    this.closed = (async () => {
      this.changes$.complete();
      OPEN_LOKIJS_STORAGE_INSTANCES.delete(this);
      if (this.internals.localState) {
        var localState = await this.internals.localState;
        var dbState = await getLokiDatabase(this.databaseName, this.databaseSettings);
        await dbState.saveQueue.run();
        await closeLokiCollections(this.databaseName, [localState.collection]);
      }
    })();
    return this.closed;
  };
  _proto.remove = async function remove() {
    var localState = await mustUseLocalState(this);
    if (!localState) {
      return requestRemoteInstance(this, 'remove', []);
    }
    localState.databaseState.database.removeCollection(localState.collection.name);
    await localState.databaseState.saveQueue.run();
    return this.close();
  };
  _proto.conflictResultionTasks = function conflictResultionTasks() {
    return new Subject();
  };
  _proto.resolveConflictResultionTask = async function resolveConflictResultionTask(_taskSolution) {};
  return RxStorageInstanceLoki;
}();
export async function createLokiLocalState(params, databaseSettings) {
  if (!params.options) {
    params.options = {};
  }
  var databaseState = await getLokiDatabase(params.databaseName, databaseSettings);

  /**
   * Construct loki indexes from RxJsonSchema indexes.
   * TODO what about compound indexes? Are they possible in lokijs?
   */
  var indices = [];
  if (params.schema.indexes) {
    params.schema.indexes.forEach(idx => {
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
    databaseState,
    collection
  };
  return ret;
}
export async function createLokiStorageInstance(storage, params, databaseSettings) {
  var internals = {};
  var broadcastChannelRefObject = {};
  if (params.multiInstance) {
    var leaderElector = getLokiLeaderElector(params.databaseInstanceToken, broadcastChannelRefObject, params.databaseName);
    internals.leaderElector = leaderElector;
  } else {
    // optimisation shortcut, directly create db is non multi instance.
    internals.localState = createLokiLocalState(params, databaseSettings);
    await internals.localState;
  }
  var instance = new RxStorageInstanceLoki(params.databaseInstanceToken, storage, params.databaseName, params.collectionName, params.schema, internals, params.options, databaseSettings);
  await addRxStorageMultiInstanceSupport(RX_STORAGE_NAME_LOKIJS, params, instance, internals.leaderElector ? internals.leaderElector.broadcastChannel : undefined);
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
    ensureNotFalsy(internals.leaderElector).awaitLeadership().then(() => {
      if (!instance.closed) {
        mustUseLocalState(instance);
      }
    });
  }
  return instance;
}
//# sourceMappingURL=rx-storage-instance-loki.js.map