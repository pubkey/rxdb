import { Subject } from 'rxjs';
import { spawn, Worker, Thread } from 'threads';
import { ensureNotFalsy, getFromMapOrThrow } from '../../plugins/utils';
/**
 * We have no way to detect if a worker is no longer needed.
 * So we create the worker process on the first RxStorageInstance
 * and have to close it again of no more RxStorageInstances are non-closed.
 */
var WORKER_BY_INSTANCE = new Map();
export var RxStorageWorker = /*#__PURE__*/function () {
  function RxStorageWorker(settings, statics) {
    this.name = 'worker';
    this.settings = settings;
    this.statics = statics;
  }
  var _proto = RxStorageWorker.prototype;
  _proto.createStorageInstance = function createStorageInstance(params) {
    var workerState = WORKER_BY_INSTANCE.get(this);
    if (!workerState) {
      workerState = {
        workerPromise: spawn(new Worker(this.settings.workerInput)),
        refs: new Set()
      };
      WORKER_BY_INSTANCE.set(this, workerState);
    }
    return workerState.workerPromise.then(worker => {
      return worker.createStorageInstance(params).then(instanceId => {
        var instance = new RxStorageInstanceWorker(this, params.databaseName, params.collectionName, params.schema, {
          rxStorage: this,
          instanceId,
          worker
        }, params.options);
        ensureNotFalsy(workerState).refs.add(instance);
        return instance;
      });
    });
  };
  return RxStorageWorker;
}();
export var RxStorageInstanceWorker = /*#__PURE__*/function () {
  /**
   * threads.js uses observable-fns instead of rxjs
   * so we have to transform it.
   */

  function RxStorageInstanceWorker(storage, databaseName, collectionName, schema, internals, options) {
    this.changes$ = new Subject();
    this.conflicts$ = new Subject();
    this.subs = [];
    this.closed = false;
    this.storage = storage;
    this.databaseName = databaseName;
    this.collectionName = collectionName;
    this.schema = schema;
    this.internals = internals;
    this.options = options;
    this.subs.push(this.internals.worker.changeStream(this.internals.instanceId).subscribe(ev => this.changes$.next(ev)));
    this.subs.push(this.internals.worker.conflictResultionTasks(this.internals.instanceId).subscribe(ev => this.conflicts$.next(ev)));
  }
  var _proto2 = RxStorageInstanceWorker.prototype;
  _proto2.bulkWrite = function bulkWrite(documentWrites, context) {
    return this.internals.worker.bulkWrite(this.internals.instanceId, documentWrites, context);
  };
  _proto2.findDocumentsById = function findDocumentsById(ids, deleted) {
    return this.internals.worker.findDocumentsById(this.internals.instanceId, ids, deleted);
  };
  _proto2.query = function query(preparedQuery) {
    return this.internals.worker.query(this.internals.instanceId, preparedQuery);
  };
  _proto2.count = function count(preparedQuery) {
    return this.internals.worker.count(this.internals.instanceId, preparedQuery);
  };
  _proto2.getAttachmentData = function getAttachmentData(documentId, attachmentId) {
    return this.internals.worker.getAttachmentData(this.internals.instanceId, documentId, attachmentId);
  };
  _proto2.getChangedDocumentsSince = function getChangedDocumentsSince(limit, checkpoint) {
    return this.internals.worker.getChangedDocumentsSince(this.internals.instanceId, limit, checkpoint);
  };
  _proto2.changeStream = function changeStream() {
    return this.changes$.asObservable();
  };
  _proto2.cleanup = function cleanup(minDeletedTime) {
    return this.internals.worker.cleanup(this.internals.instanceId, minDeletedTime);
  };
  _proto2.close = async function close() {
    if (this.closed) {
      return Promise.reject(new Error('already closed'));
    }
    this.closed = true;
    this.subs.forEach(sub => sub.unsubscribe());
    await this.internals.worker.close(this.internals.instanceId);
    await removeWorkerRef(this);
  };
  _proto2.remove = async function remove() {
    await this.internals.worker.remove(this.internals.instanceId);
    this.closed = true;
    await removeWorkerRef(this);
  };
  _proto2.conflictResultionTasks = function conflictResultionTasks() {
    return this.conflicts$;
  };
  _proto2.resolveConflictResultionTask = async function resolveConflictResultionTask(taskSolution) {
    await this.internals.worker.resolveConflictResultionTask(this.internals.instanceId, taskSolution);
  };
  return RxStorageInstanceWorker;
}();
export function getRxStorageWorker(settings) {
  var storage = new RxStorageWorker(settings, settings.statics);
  return storage;
}

/**
 * TODO we have a bug.
 * When the exact same RxStorage opens and closes
 * many RxStorage instances, then it might happen
 * that some calls to createStorageInstance() time out,
 * because the worker thread is in the closing state.
 */
export async function removeWorkerRef(instance) {
  var workerState = getFromMapOrThrow(WORKER_BY_INSTANCE, instance.storage);
  workerState.refs.delete(instance);
  if (workerState.refs.size === 0) {
    WORKER_BY_INSTANCE.delete(instance.storage);
    await workerState.workerPromise.then(worker => Thread.terminate(worker));
  }
}
//# sourceMappingURL=non-worker.js.map