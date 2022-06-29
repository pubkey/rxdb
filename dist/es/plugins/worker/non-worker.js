import { Subject } from 'rxjs';
import { spawn, Worker, Thread } from 'threads';
import { getFromMapOrThrow } from '../../util';
export var removeWorkerRef = function removeWorkerRef(instance) {
  try {
    var workerState = getFromMapOrThrow(WORKER_BY_INSTANCE, instance.storage);
    workerState.refs["delete"](instance);

    var _temp2 = function () {
      if (workerState.refs.size === 0) {
        WORKER_BY_INSTANCE["delete"](instance.storage);
        return Promise.resolve(workerState.workerPromise.then(function (worker) {
          return Thread.terminate(worker);
        })).then(function () {});
      }
    }();

    return Promise.resolve(_temp2 && _temp2.then ? _temp2.then(function () {}) : void 0);
  } catch (e) {
    return Promise.reject(e);
  }
};

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
    try {
      var _this2 = this;

      var workerState = WORKER_BY_INSTANCE.get(_this2);

      if (!workerState) {
        workerState = {
          workerPromise: spawn(new Worker(_this2.settings.workerInput)),
          refs: new Set()
        };
        WORKER_BY_INSTANCE.set(_this2, workerState);
      }

      return Promise.resolve(workerState.workerPromise).then(function (worker) {
        return Promise.resolve(worker.createStorageInstance(params)).then(function (instanceId) {
          var instance = new RxStorageInstanceWorker(_this2, params.databaseName, params.collectionName, params.schema, {
            rxStorage: _this2,
            instanceId: instanceId,
            worker: worker
          }, params.options);
          workerState.refs.add(instance);
          return instance;
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
  function RxStorageInstanceWorker(storage, databaseName, collectionName, schema, internals, options) {
    var _this3 = this;

    this.changes$ = new Subject();
    this.subs = [];
    this.closed = false;
    this.storage = storage;
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

  _proto2.getChangedDocumentsSince = function getChangedDocumentsSince(limit, checkpoint) {
    try {
      var _this5 = this;

      return Promise.resolve(_this5.internals.worker.getChangedDocumentsSince(_this5.internals.instanceId, limit, checkpoint));
    } catch (e) {
      return Promise.reject(e);
    }
  };

  _proto2.changeStream = function changeStream() {
    return this.changes$.asObservable();
  };

  _proto2.cleanup = function cleanup(minDeletedTime) {
    return this.internals.worker.cleanup(this.internals.instanceId, minDeletedTime);
  };

  _proto2.close = function close() {
    try {
      var _this7 = this;

      if (_this7.closed) {
        return Promise.resolve();
      }

      _this7.closed = true;

      _this7.subs.forEach(function (sub) {
        return sub.unsubscribe();
      });

      return Promise.resolve(_this7.internals.worker.close(_this7.internals.instanceId)).then(function () {
        return Promise.resolve(removeWorkerRef(_this7)).then(function () {});
      });
    } catch (e) {
      return Promise.reject(e);
    }
  };

  _proto2.remove = function remove() {
    try {
      var _this9 = this;

      return Promise.resolve(_this9.internals.worker.remove(_this9.internals.instanceId)).then(function () {
        _this9.closed = true;
        return Promise.resolve(removeWorkerRef(_this9)).then(function () {});
      });
    } catch (e) {
      return Promise.reject(e);
    }
  };

  return RxStorageInstanceWorker;
}();
export function getRxStorageWorker(settings) {
  var storage = new RxStorageWorker(settings, settings.statics);
  return storage;
}
//# sourceMappingURL=non-worker.js.map