/**
 * This plugin contains the primitives to create
 * a RxDB client-server replication.
 * It is used in the other replication plugins
 * but also can be used as standalone with a custom replication handler.
 */

import { BehaviorSubject, combineLatest, mergeMap, Subject } from 'rxjs';
import { RxDBLeaderElectionPlugin } from '../leader-election';
import { ensureNotFalsy, errorToPlainJson, fastUnsecureHash, flatClone, PROMISE_RESOLVE_FALSE, PROMISE_RESOLVE_TRUE, toArray } from '../../plugins/utils';
import { awaitRxStorageReplicationFirstInSync, awaitRxStorageReplicationInSync, cancelRxStorageReplication, replicateRxStorageInstance, RX_REPLICATION_META_INSTANCE_SCHEMA } from '../../replication-protocol';
import { newRxError } from '../../rx-error';
import { awaitRetry, DEFAULT_MODIFIER, swapDefaultDeletedTodeletedField, handlePulledDocuments } from './replication-helper';
import { addConnectedStorageToCollection } from '../../rx-database-internal-store';
import { addRxPlugin } from '../../plugin';
export var REPLICATION_STATE_BY_COLLECTION = new WeakMap();
export var RxReplicationState = /*#__PURE__*/function () {
  function RxReplicationState(
  /**
   * hash of the identifier, used to flag revisions
   * and to identify which documents state came from the remote.
   */
  replicationIdentifierHash, collection, deletedField, pull, push, live, retryTime, autoStart) {
    this.subs = [];
    this.subjects = {
      received: new Subject(),
      // all documents that are received from the endpoint
      send: new Subject(),
      // all documents that are send to the endpoint
      error: new Subject(),
      // all errors that are received from the endpoint, emits new Error() objects
      canceled: new BehaviorSubject(false),
      // true when the replication was canceled
      active: new BehaviorSubject(false),
      // true when something is running, false when not
      initialReplicationComplete: new BehaviorSubject(false) // true the initial replication-cycle is over
    };
    this.received$ = this.subjects.received.asObservable();
    this.send$ = this.subjects.send.asObservable();
    this.error$ = this.subjects.error.asObservable();
    this.canceled$ = this.subjects.canceled.asObservable();
    this.active$ = this.subjects.active.asObservable();
    this.callOnStart = undefined;
    this.remoteEvents$ = new Subject();
    this.replicationIdentifierHash = replicationIdentifierHash;
    this.collection = collection;
    this.deletedField = deletedField;
    this.pull = pull;
    this.push = push;
    this.live = live;
    this.retryTime = retryTime;
    this.autoStart = autoStart;
    var replicationStates = REPLICATION_STATE_BY_COLLECTION.get(collection);
    if (!replicationStates) {
      replicationStates = [];
      REPLICATION_STATE_BY_COLLECTION.set(collection, replicationStates);
    }
    replicationStates.push(this);

    // stop the replication when the collection gets destroyed
    this.collection.onDestroy.push(() => this.cancel());

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
  _proto.start = async function start() {
    if (this.isStopped()) {
      return;
    }

    // fill in defaults for pull & push
    var pullModifier = this.pull && this.pull.modifier ? this.pull.modifier : DEFAULT_MODIFIER;
    var pushModifier = this.push && this.push.modifier ? this.push.modifier : DEFAULT_MODIFIER;
    var database = this.collection.database;
    var metaInstanceCollectionName = this.collection.name + '-rx-replication-' + this.replicationIdentifierHash;
    var [metaInstance] = await Promise.all([this.collection.database.storage.createStorageInstance({
      databaseName: database.name,
      collectionName: metaInstanceCollectionName,
      databaseInstanceToken: database.token,
      multiInstance: database.multiInstance,
      // TODO is this always false?
      options: {},
      schema: RX_REPLICATION_META_INSTANCE_SCHEMA
    }), addConnectedStorageToCollection(this.collection, metaInstanceCollectionName, RX_REPLICATION_META_INSTANCE_SCHEMA)]);
    this.metaInstance = metaInstance;
    this.internalReplicationState = replicateRxStorageInstance({
      pushBatchSize: this.push && this.push.batchSize ? this.push.batchSize : 100,
      pullBatchSize: this.pull && this.pull.batchSize ? this.pull.batchSize : 100,
      forkInstance: this.collection.storageInstance,
      metaInstance: this.metaInstance,
      hashFunction: database.hashFunction,
      identifier: 'rxdbreplication' + this.replicationIdentifierHash,
      conflictHandler: this.collection.conflictHandler,
      replicationHandler: {
        masterChangeStream$: this.remoteEvents$.asObservable().pipe(mergeMap(async ev => {
          if (ev === 'RESYNC') {
            return ev;
          }
          var useEv = flatClone(ev);
          useEv.documents = handlePulledDocuments(this.collection, this.deletedField, useEv.documents);
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
          while (!done && !this.isStopped()) {
            try {
              result = await this.pull.handler(checkpoint, batchSize);
              done = true;
            } catch (err) {
              var emitError = newRxError('RC_PULL', {
                checkpoint,
                errors: toArray(err).map(er => errorToPlainJson(er)),
                direction: 'pull'
              });
              this.subjects.error.next(emitError);
              await awaitRetry(this.collection, ensureNotFalsy(this.retryTime));
            }
          }
          if (this.isStopped()) {
            return {
              checkpoint: null,
              documents: []
            };
          }
          var useResult = flatClone(result);
          useResult.documents = handlePulledDocuments(this.collection, this.deletedField, useResult.documents);
          useResult.documents = await Promise.all(useResult.documents.map(d => pullModifier(d)));
          return useResult;
        },
        masterWrite: async rows => {
          if (!this.push) {
            return [];
          }
          var done = false;
          var useRows = await Promise.all(rows.map(async row => {
            row.newDocumentState = await pushModifier(row.newDocumentState);
            if (row.assumedMasterState) {
              row.assumedMasterState = await pushModifier(row.assumedMasterState);
            }
            if (this.deletedField !== '_deleted') {
              row.newDocumentState = swapDefaultDeletedTodeletedField(this.deletedField, row.newDocumentState);
              if (row.assumedMasterState) {
                row.assumedMasterState = swapDefaultDeletedTodeletedField(this.deletedField, row.assumedMasterState);
              }
            }
            return row;
          }));
          var result = null;
          while (!done && !this.isStopped()) {
            try {
              result = await this.push.handler(useRows);
              /**
               * It is a common problem that people have wrongly behaving backend
               * that do not return an array with the conflicts on push requests.
               * So we run this check here to make it easier to debug.
               * @link https://github.com/pubkey/rxdb/issues/4103
               */
              if (!Array.isArray(result)) {
                throw newRxError('RC_PUSH_NO_AR', {
                  pushRows: rows,
                  direction: 'push',
                  args: {
                    result
                  }
                });
              }
              done = true;
            } catch (err) {
              var emitError = err.rxdb ? err : newRxError('RC_PUSH', {
                pushRows: rows,
                errors: toArray(err).map(er => errorToPlainJson(er)),
                direction: 'push'
              });
              this.subjects.error.next(emitError);
              await awaitRetry(this.collection, ensureNotFalsy(this.retryTime));
            }
          }
          if (this.isStopped()) {
            return [];
          }
          var conflicts = handlePulledDocuments(this.collection, this.deletedField, ensureNotFalsy(result));
          return conflicts;
        }
      }
    });
    this.subs.push(this.internalReplicationState.events.error.subscribe(err => {
      this.subjects.error.next(err);
    }), this.internalReplicationState.events.processed.down.subscribe(row => this.subjects.received.next(row.document)), this.internalReplicationState.events.processed.up.subscribe(writeToMasterRow => {
      this.subjects.send.next(writeToMasterRow.newDocumentState);
    }), combineLatest([this.internalReplicationState.events.active.down, this.internalReplicationState.events.active.up]).subscribe(([down, up]) => {
      var isActive = down || up;
      this.subjects.active.next(isActive);
    }));
    if (this.pull && this.pull.stream$ && this.live) {
      this.subs.push(this.pull.stream$.subscribe({
        next: ev => {
          this.remoteEvents$.next(ev);
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
      await awaitRxStorageReplicationFirstInSync(this.internalReplicationState);
      await awaitRxStorageReplicationInSync(this.internalReplicationState);
      await this.cancel();
    }
    this.callOnStart();
  };
  _proto.isStopped = function isStopped() {
    if (this.subjects.canceled.getValue()) {
      return true;
    }
    return false;
  };
  _proto.awaitInitialReplication = async function awaitInitialReplication() {
    await this.startPromise;
    return awaitRxStorageReplicationFirstInSync(ensureNotFalsy(this.internalReplicationState));
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
    await awaitRxStorageReplicationFirstInSync(ensureNotFalsy(this.internalReplicationState));

    /**
     * Often awaitInSync() is called directly after a document write,
     * like in the unit tests.
     * So we first have to await the idleness to ensure that all RxChangeEvents
     * are processed already.
     */
    await this.collection.database.requestIdlePromise();
    await awaitRxStorageReplicationInSync(ensureNotFalsy(this.internalReplicationState));
    return true;
  };
  _proto.reSync = function reSync() {
    this.remoteEvents$.next('RESYNC');
  };
  _proto.emitEvent = function emitEvent(ev) {
    this.remoteEvents$.next(ev);
  };
  _proto.cancel = function cancel() {
    if (this.isStopped()) {
      return PROMISE_RESOLVE_FALSE;
    }
    var promises = [];
    if (this.internalReplicationState) {
      cancelRxStorageReplication(this.internalReplicationState);
    }
    if (this.metaInstance) {
      promises.push(ensureNotFalsy(this.internalReplicationState).checkpointQueue.then(() => ensureNotFalsy(this.metaInstance).close()));
    }
    this.subs.forEach(sub => sub.unsubscribe());
    this.subjects.canceled.next(true);
    this.subjects.active.complete();
    this.subjects.canceled.complete();
    this.subjects.error.complete();
    this.subjects.received.complete();
    this.subjects.send.complete();
    return Promise.all(promises);
  };
  return RxReplicationState;
}();
export function replicateRxCollection({
  replicationIdentifier,
  collection,
  deletedField = '_deleted',
  pull,
  push,
  live = true,
  retryTime = 1000 * 5,
  waitForLeadership = true,
  autoStart = true
}) {
  addRxPlugin(RxDBLeaderElectionPlugin);
  var replicationIdentifierHash = fastUnsecureHash([collection.database.name, collection.name, replicationIdentifier].join('|'));
  var replicationState = new RxReplicationState(replicationIdentifierHash, collection, deletedField, pull, push, live, retryTime, autoStart);
  startReplicationOnLeaderShip(waitForLeadership, replicationState);
  return replicationState;
}
export function startReplicationOnLeaderShip(waitForLeadership, replicationState) {
  /**
   * Always await this Promise to ensure that the current instance
   * is leader when waitForLeadership=true
   */
  var mustWaitForLeadership = waitForLeadership && replicationState.collection.database.multiInstance;
  var waitTillRun = mustWaitForLeadership ? replicationState.collection.database.waitForLeadership() : PROMISE_RESOLVE_TRUE;
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