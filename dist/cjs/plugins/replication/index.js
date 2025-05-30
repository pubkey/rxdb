"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.RxReplicationState = exports.REPLICATION_STATE_BY_COLLECTION = void 0;
exports.replicateRxCollection = replicateRxCollection;
exports.startReplicationOnLeaderShip = startReplicationOnLeaderShip;
var _rxjs = require("rxjs");
var _index = require("../leader-election/index.js");
var _index2 = require("../../plugins/utils/index.js");
var _index3 = require("../../replication-protocol/index.js");
var _rxError = require("../../rx-error.js");
var _replicationHelper = require("./replication-helper.js");
var _rxDatabaseInternalStore = require("../../rx-database-internal-store.js");
var _plugin = require("../../plugin.js");
var _rxStorageHelper = require("../../rx-storage-helper.js");
var _overwritable = require("../../overwritable.js");
var _hooks = require("../../hooks.js");
/**
 * This plugin contains the primitives to create
 * a RxDB client-server replication.
 * It is used in the other replication plugins
 * but also can be used as standalone with a custom replication handler.
 */

var REPLICATION_STATE_BY_COLLECTION = exports.REPLICATION_STATE_BY_COLLECTION = new WeakMap();
var RxReplicationState = exports.RxReplicationState = /*#__PURE__*/function () {
  /**
   * start/pause/cancel/remove must never run
   * in parallel to avoid a wide range of bugs.
   */

  function RxReplicationState(
  /**
   * The identifier, used to flag revisions
   * and to identify which documents state came from the remote.
   */
  replicationIdentifier, collection, deletedField, pull, push, live, retryTime, autoStart, toggleOnDocumentVisible) {
    this.subs = [];
    this.subjects = {
      received: new _rxjs.Subject(),
      // all documents that are received from the endpoint
      sent: new _rxjs.Subject(),
      // all documents that are send to the endpoint
      error: new _rxjs.Subject(),
      // all errors that are received from the endpoint, emits new Error() objects
      canceled: new _rxjs.BehaviorSubject(false),
      // true when the replication was canceled
      active: new _rxjs.BehaviorSubject(false) // true when something is running, false when not
    };
    this.received$ = this.subjects.received.asObservable();
    this.sent$ = this.subjects.sent.asObservable();
    this.error$ = this.subjects.error.asObservable();
    this.canceled$ = this.subjects.canceled.asObservable();
    this.active$ = this.subjects.active.asObservable();
    this.wasStarted = false;
    this.startQueue = _index2.PROMISE_RESOLVE_VOID;
    this.onCancel = [];
    this.callOnStart = undefined;
    this.remoteEvents$ = new _rxjs.Subject();
    this.replicationIdentifier = replicationIdentifier;
    this.collection = collection;
    this.deletedField = deletedField;
    this.pull = pull;
    this.push = push;
    this.live = live;
    this.retryTime = retryTime;
    this.autoStart = autoStart;
    this.toggleOnDocumentVisible = toggleOnDocumentVisible;
    this.metaInfoPromise = (async () => {
      var metaInstanceCollectionName = 'rx-replication-meta-' + (await collection.database.hashFunction([this.collection.name, this.replicationIdentifier].join('-')));
      var metaInstanceSchema = (0, _index3.getRxReplicationMetaInstanceSchema)(this.collection.schema.jsonSchema, (0, _rxStorageHelper.hasEncryption)(this.collection.schema.jsonSchema));
      return {
        collectionName: metaInstanceCollectionName,
        schema: metaInstanceSchema
      };
    })();
    var replicationStates = (0, _index2.getFromMapOrCreate)(REPLICATION_STATE_BY_COLLECTION, collection, () => []);
    replicationStates.push(this);

    // stop the replication when the collection gets closed
    this.collection.onClose.push(() => this.cancel());

    // create getters for the observables
    Object.keys(this.subjects).forEach(key => {
      Object.defineProperty(this, key + '$', {
        get: function () {
          return this.subjects[key].asObservable();
        }
      });
    });
    var startPromise = new Promise(res => {
      this.callOnStart = res;
    });
    this.startPromise = startPromise;
  }
  var _proto = RxReplicationState.prototype;
  _proto.start = function start() {
    this.startQueue = this.startQueue.then(() => {
      return this._start();
    });
    return this.startQueue;
  };
  _proto._start = async function _start() {
    if (this.isStopped()) {
      return;
    }
    if (this.internalReplicationState) {
      this.internalReplicationState.events.paused.next(false);
    }

    /**
     * If started after a pause,
     * just re-sync once and continue.
     */
    if (this.wasStarted) {
      this.reSync();
      return;
    }
    this.wasStarted = true;
    if (!this.toggleOnDocumentVisible) {
      (0, _replicationHelper.preventHibernateBrowserTab)(this);
    }

    // fill in defaults for pull & push
    var pullModifier = this.pull && this.pull.modifier ? this.pull.modifier : _replicationHelper.DEFAULT_MODIFIER;
    var pushModifier = this.push && this.push.modifier ? this.push.modifier : _replicationHelper.DEFAULT_MODIFIER;
    var database = this.collection.database;
    var metaInfo = await this.metaInfoPromise;
    var [metaInstance] = await Promise.all([this.collection.database.storage.createStorageInstance({
      databaseName: database.name,
      collectionName: metaInfo.collectionName,
      databaseInstanceToken: database.token,
      multiInstance: database.multiInstance,
      options: {},
      schema: metaInfo.schema,
      password: database.password,
      devMode: _overwritable.overwritable.isDevMode()
    }), (0, _rxDatabaseInternalStore.addConnectedStorageToCollection)(this.collection, metaInfo.collectionName, metaInfo.schema)]);
    this.metaInstance = metaInstance;
    this.internalReplicationState = (0, _index3.replicateRxStorageInstance)({
      pushBatchSize: this.push && this.push.batchSize ? this.push.batchSize : 100,
      pullBatchSize: this.pull && this.pull.batchSize ? this.pull.batchSize : 100,
      initialCheckpoint: {
        upstream: this.push ? this.push.initialCheckpoint : undefined,
        downstream: this.pull ? this.pull.initialCheckpoint : undefined
      },
      forkInstance: this.collection.storageInstance,
      metaInstance: this.metaInstance,
      hashFunction: database.hashFunction,
      identifier: 'rxdbreplication' + this.replicationIdentifier,
      conflictHandler: this.collection.conflictHandler,
      replicationHandler: {
        masterChangeStream$: this.remoteEvents$.asObservable().pipe((0, _rxjs.filter)(_v => !!this.pull), (0, _rxjs.mergeMap)(async ev => {
          if (ev === 'RESYNC') {
            return ev;
          }
          var useEv = (0, _index2.flatClone)(ev);
          useEv.documents = (0, _replicationHelper.handlePulledDocuments)(this.collection, this.deletedField, useEv.documents);
          useEv.documents = await Promise.all(useEv.documents.map(d => pullModifier(d)));
          return useEv;
        })),
        masterChangesSince: async (checkpoint, batchSize) => {
          if (!this.pull) {
            return {
              checkpoint: null,
              documents: []
            };
          }
          /**
           * Retries must be done here in the replication primitives plugin,
           * because the replication protocol itself has no
           * error handling.
           */
          var done = false;
          var result = {};
          while (!done && !this.isStoppedOrPaused()) {
            try {
              result = await this.pull.handler(checkpoint, batchSize);
              done = true;
            } catch (err) {
              var emitError = (0, _rxError.newRxError)('RC_PULL', {
                checkpoint,
                errors: (0, _index2.toArray)(err).map(er => (0, _index2.errorToPlainJson)(er)),
                direction: 'pull'
              });
              this.subjects.error.next(emitError);
              await (0, _replicationHelper.awaitRetry)(this.collection, (0, _index2.ensureNotFalsy)(this.retryTime));
            }
          }
          if (this.isStoppedOrPaused()) {
            return {
              checkpoint: null,
              documents: []
            };
          }
          var useResult = (0, _index2.flatClone)(result);
          useResult.documents = (0, _replicationHelper.handlePulledDocuments)(this.collection, this.deletedField, useResult.documents);
          useResult.documents = await Promise.all(useResult.documents.map(d => pullModifier(d)));
          return useResult;
        },
        masterWrite: async rows => {
          if (!this.push) {
            return [];
          }
          var done = false;
          await (0, _hooks.runAsyncPluginHooks)('preReplicationMasterWrite', {
            rows,
            collection: this.collection
          });
          var useRowsOrNull = await Promise.all(rows.map(async row => {
            row.newDocumentState = await pushModifier(row.newDocumentState);
            if (row.newDocumentState === null) {
              return null;
            }
            if (row.assumedMasterState) {
              row.assumedMasterState = await pushModifier(row.assumedMasterState);
            }
            if (this.deletedField !== '_deleted') {
              row.newDocumentState = (0, _replicationHelper.swapDefaultDeletedTodeletedField)(this.deletedField, row.newDocumentState);
              if (row.assumedMasterState) {
                row.assumedMasterState = (0, _replicationHelper.swapDefaultDeletedTodeletedField)(this.deletedField, row.assumedMasterState);
              }
            }
            return row;
          }));
          var useRows = useRowsOrNull.filter(_index2.arrayFilterNotEmpty);
          var result = null;

          // In case all the rows have been filtered and nothing has to be sent
          if (useRows.length === 0) {
            done = true;
            result = [];
          }
          while (!done && !this.isStoppedOrPaused()) {
            try {
              result = await this.push.handler(useRows);
              /**
               * It is a common problem that people have wrongly behaving backend
               * that do not return an array with the conflicts on push requests.
               * So we run this check here to make it easier to debug.
               * @link https://github.com/pubkey/rxdb/issues/4103
               */
              if (!Array.isArray(result)) {
                throw (0, _rxError.newRxError)('RC_PUSH_NO_AR', {
                  pushRows: rows,
                  direction: 'push',
                  args: {
                    result
                  }
                });
              }
              done = true;
            } catch (err) {
              var emitError = err.rxdb ? err : (0, _rxError.newRxError)('RC_PUSH', {
                pushRows: rows,
                errors: (0, _index2.toArray)(err).map(er => (0, _index2.errorToPlainJson)(er)),
                direction: 'push'
              });
              this.subjects.error.next(emitError);
              await (0, _replicationHelper.awaitRetry)(this.collection, (0, _index2.ensureNotFalsy)(this.retryTime));
            }
          }
          if (this.isStoppedOrPaused()) {
            return [];
          }
          await (0, _hooks.runAsyncPluginHooks)('preReplicationMasterWriteDocumentsHandle', {
            result,
            collection: this.collection
          });
          var conflicts = (0, _replicationHelper.handlePulledDocuments)(this.collection, this.deletedField, (0, _index2.ensureNotFalsy)(result));
          return conflicts;
        }
      }
    });
    this.subs.push(this.internalReplicationState.events.error.subscribe(err => {
      this.subjects.error.next(err);
    }), this.internalReplicationState.events.processed.down.subscribe(row => this.subjects.received.next(row.document)), this.internalReplicationState.events.processed.up.subscribe(writeToMasterRow => {
      this.subjects.sent.next(writeToMasterRow.newDocumentState);
    }), (0, _rxjs.combineLatest)([this.internalReplicationState.events.active.down, this.internalReplicationState.events.active.up]).subscribe(([down, up]) => {
      var isActive = down || up;
      this.subjects.active.next(isActive);
    }));
    if (this.pull && this.pull.stream$ && this.live) {
      this.subs.push(this.pull.stream$.subscribe({
        next: ev => {
          if (!this.isStoppedOrPaused()) {
            this.remoteEvents$.next(ev);
          }
        },
        error: err => {
          this.subjects.error.next(err);
        }
      }));
    }

    /**
     * Non-live replications run once
     * and then automatically get canceled.
     */
    if (!this.live) {
      await (0, _index3.awaitRxStorageReplicationFirstInSync)(this.internalReplicationState);
      await (0, _index3.awaitRxStorageReplicationInSync)(this.internalReplicationState);
      await this._cancel();
    }
    this.callOnStart();
  };
  _proto.pause = function pause() {
    this.startQueue = this.startQueue.then(() => {
      (0, _index2.ensureNotFalsy)(this.internalReplicationState).events.paused.next(true);
    });
    return this.startQueue;
  };
  _proto.isPaused = function isPaused() {
    return !!(this.internalReplicationState && this.internalReplicationState.events.paused.getValue());
  };
  _proto.isStopped = function isStopped() {
    return !!this.subjects.canceled.getValue();
  };
  _proto.isStoppedOrPaused = function isStoppedOrPaused() {
    return this.isPaused() || this.isStopped();
  };
  _proto.awaitInitialReplication = async function awaitInitialReplication() {
    await this.startPromise;
    return (0, _index3.awaitRxStorageReplicationFirstInSync)((0, _index2.ensureNotFalsy)(this.internalReplicationState));
  }

  /**
   * Returns a promise that resolves when:
   * - All local data is replicated with the remote
   * - No replication cycle is running or in retry-state
   *
   * WARNING: USing this function directly in a multi-tab browser application
   * is dangerous because only the leading instance will ever be replicated,
   * so this promise will not resolve in the other tabs.
   * For multi-tab support you should set and observe a flag in a local document.
   */;
  _proto.awaitInSync = async function awaitInSync() {
    await this.startPromise;
    await (0, _index3.awaitRxStorageReplicationFirstInSync)((0, _index2.ensureNotFalsy)(this.internalReplicationState));

    /**
     * To reduce the amount of re-renders and make testing
     * and to make the whole behavior more predictable,
     * we await these things multiple times.
     * For example the state might be in sync already and at the
     * exact same time a pull.stream$ event comes in and we want to catch
     * that in the same call to awaitInSync() instead of resolving
     * while actually the state is not in sync.
     */
    var t = 2;
    while (t > 0) {
      t--;

      /**
       * Often awaitInSync() is called directly after a document write,
       * like in the unit tests.
       * So we first have to await the idleness to ensure that all RxChangeEvents
       * are processed already.
       */
      await this.collection.database.requestIdlePromise();
      await (0, _index3.awaitRxStorageReplicationInSync)((0, _index2.ensureNotFalsy)(this.internalReplicationState));
    }
    return true;
  };
  _proto.reSync = function reSync() {
    this.remoteEvents$.next('RESYNC');
  };
  _proto.emitEvent = function emitEvent(ev) {
    this.remoteEvents$.next(ev);
  };
  _proto.cancel = async function cancel() {
    this.startQueue = this.startQueue.catch(() => {}).then(async () => {
      await this._cancel();
    });
    await this.startQueue;
  };
  _proto._cancel = async function _cancel(doNotClose = false) {
    if (this.isStopped()) {
      return _index2.PROMISE_RESOLVE_FALSE;
    }
    var promises = this.onCancel.map(fn => (0, _index2.toPromise)(fn()));
    if (this.internalReplicationState) {
      await (0, _index3.cancelRxStorageReplication)(this.internalReplicationState);
    }
    if (this.metaInstance && !doNotClose) {
      promises.push((0, _index2.ensureNotFalsy)(this.internalReplicationState).checkpointQueue.then(() => (0, _index2.ensureNotFalsy)(this.metaInstance).close()));
    }
    this.subs.forEach(sub => sub.unsubscribe());
    this.subjects.canceled.next(true);
    this.subjects.active.complete();
    this.subjects.canceled.complete();
    this.subjects.error.complete();
    this.subjects.received.complete();
    this.subjects.sent.complete();
    return Promise.all(promises);
  };
  _proto.remove = async function remove() {
    this.startQueue = this.startQueue.then(async () => {
      var metaInfo = await this.metaInfoPromise;
      await this._cancel(true);
      await (0, _index2.ensureNotFalsy)(this.internalReplicationState).checkpointQueue.then(() => (0, _index2.ensureNotFalsy)(this.metaInstance).remove());
      await (0, _rxDatabaseInternalStore.removeConnectedStorageFromCollection)(this.collection, metaInfo.collectionName, metaInfo.schema);
    });
    return this.startQueue;
  };
  return RxReplicationState;
}();
function replicateRxCollection({
  replicationIdentifier,
  collection,
  deletedField = '_deleted',
  pull,
  push,
  live = true,
  retryTime = 1000 * 5,
  waitForLeadership = true,
  autoStart = true,
  toggleOnDocumentVisible = false
}) {
  (0, _plugin.addRxPlugin)(_index.RxDBLeaderElectionPlugin);

  /**
   * It is a common error to forget to add these config
   * objects. So we check here because it makes no sense
   * to start a replication with neither push nor pull.
   */
  if (!pull && !push) {
    throw (0, _rxError.newRxError)('UT3', {
      collection: collection.name,
      args: {
        replicationIdentifier
      }
    });
  }
  var replicationState = new RxReplicationState(replicationIdentifier, collection, deletedField, pull, push, live, retryTime, autoStart, toggleOnDocumentVisible);
  if (toggleOnDocumentVisible && typeof document !== 'undefined' && typeof document.addEventListener === 'function' && typeof document.visibilityState === 'string') {
    var handler = () => {
      if (replicationState.isStopped()) {
        return;
      }
      var isVisible = document.visibilityState === 'visible';
      if (isVisible) {
        replicationState.start();
      } else {
        /**
         * Only pause if not the current leader.
         * If no tab is visible, the elected leader should still continue
         * the replication.
         */
        if (!collection.database.isLeader()) {
          replicationState.pause();
        }
      }
    };
    document.addEventListener('visibilitychange', handler);
    replicationState.onCancel.push(() => document.removeEventListener('visibilitychange', handler));
  }
  startReplicationOnLeaderShip(waitForLeadership, replicationState);
  return replicationState;
}
function startReplicationOnLeaderShip(waitForLeadership, replicationState) {
  /**
   * Always await this Promise to ensure that the current instance
   * is leader when waitForLeadership=true
   */
  var mustWaitForLeadership = waitForLeadership && replicationState.collection.database.multiInstance;
  var waitTillRun = mustWaitForLeadership ? replicationState.collection.database.waitForLeadership() : _index2.PROMISE_RESOLVE_TRUE;
  return waitTillRun.then(() => {
    if (replicationState.isStopped()) {
      return;
    }
    if (replicationState.autoStart) {
      replicationState.start();
    }
  });
}
//# sourceMappingURL=index.js.map