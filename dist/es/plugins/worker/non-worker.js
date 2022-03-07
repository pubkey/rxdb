import { Subject } from 'rxjs';
import { spawn, Worker } from 'threads';

/**
 * We have no way to detect if a worker is no longer needed.
 * Instead we reuse open workers so that creating many databases,
 * does not flood the OS by opening many threads.
 */
var WORKER_BY_INPUT = new Map();
export var RxStorageWorker = /*#__PURE__*/function () {
  function RxStorageWorker(settings, statics) {
    this.name = 'worker';
    this.settings = settings;
    this.statics = statics;
    var workerInput = this.settings.workerInput;
    var workerPromise = WORKER_BY_INPUT.get(workerInput);

    if (!workerPromise) {
      workerPromise = spawn(new Worker(this.settings.workerInput));
      WORKER_BY_INPUT.set(workerInput, workerPromise);
    }

    this.workerPromise = workerPromise;
  }

  var _proto = RxStorageWorker.prototype;

  _proto.createStorageInstance = function createStorageInstance(params) {
    try {
      var _this2 = this;

      return Promise.resolve(_this2.workerPromise).then(function (worker) {
        return Promise.resolve(worker.createStorageInstance(params)).then(function (instanceId) {
          return new RxStorageInstanceWorker(params.databaseName, params.collectionName, params.schema, {
            rxStorage: _this2,
            instanceId: instanceId,
            worker: worker
          }, params.options);
        });
      });
    } catch (e) {
      return Promise.reject(e);
    }
  };

  return RxStorageWorker;
}();
export var RxStorageInstanceWorker = /*#__PURE__*/function () {
  /**
   * threads.js uses observable-fns instead of rxjs
   * so we have to transform it.
   */
  function RxStorageInstanceWorker(databaseName, collectionName, schema, internals, options) {
    var _this3 = this;

    this.changes$ = new Subject();
    this.subs = [];
    this.databaseName = databaseName;
    this.collectionName = collectionName;
    this.schema = schema;
    this.internals = internals;
    this.options = options;
    this.subs.push(this.internals.worker.changeStream(this.internals.instanceId).subscribe(function (ev) {
      return _this3.changes$.next(ev);
    }));
  }

  var _proto2 = RxStorageInstanceWorker.prototype;

  _proto2.bulkWrite = function bulkWrite(documentWrites) {
    return this.internals.worker.bulkWrite(this.internals.instanceId, documentWrites);
  };

  _proto2.findDocumentsById = function findDocumentsById(ids, deleted) {
    return this.internals.worker.findDocumentsById(this.internals.instanceId, ids, deleted);
  };

  _proto2.query = function query(preparedQuery) {
    return this.internals.worker.query(this.internals.instanceId, preparedQuery);
  };

  _proto2.getAttachmentData = function getAttachmentData(documentId, attachmentId) {
    return this.internals.worker.getAttachmentData(this.internals.instanceId, documentId, attachmentId);
  };

  _proto2.getChangedDocuments = function getChangedDocuments(options) {
    return this.internals.worker.getChangedDocuments(this.internals.instanceId, options);
  };

  _proto2.changeStream = function changeStream() {
    return this.changes$.asObservable();
  };

  _proto2.close = function close() {
    this.subs.forEach(function (sub) {
      return sub.unsubscribe();
    });
    return this.internals.worker.close(this.internals.instanceId);
  };

  _proto2.remove = function remove() {
    return this.internals.worker.remove(this.internals.instanceId);
  };

  return RxStorageInstanceWorker;
}();
export function getRxStorageWorker(settings) {
  var storage = new RxStorageWorker(settings, settings.statics);
  return storage;
}
//# sourceMappingURL=non-worker.js.map