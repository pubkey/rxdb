"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.RxStorageWorker = exports.RxStorageKeyObjectInstanceWorker = exports.RxStorageInstanceWorker = void 0;
exports.getRxStorageWorker = getRxStorageWorker;

var _rxjs = require("rxjs");

var _threads = require("threads");

/**
 * We have no way to detect if a worker is no longer needed.
 * Instead we reuse open workers so that creating many databases,
 * does not flood the OS by opening many threads.
 */
var WORKER_BY_INPUT = new Map();

var RxStorageWorker = /*#__PURE__*/function () {
  function RxStorageWorker(settings, statics) {
    this.name = 'worker';
    this.settings = settings;
    this.statics = statics;
    var workerInput = this.settings.workerInput;
    var workerPromise = WORKER_BY_INPUT.get(workerInput);

    if (!workerPromise) {
      workerPromise = (0, _threads.spawn)(new _threads.Worker(this.settings.workerInput));
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

  _proto.createKeyObjectStorageInstance = function createKeyObjectStorageInstance(params) {
    try {
      var _this4 = this;

      return Promise.resolve(_this4.workerPromise).then(function (worker) {
        return Promise.resolve(worker.createKeyObjectStorageInstance(params)).then(function (instanceId) {
          return new RxStorageKeyObjectInstanceWorker(params.databaseName, params.collectionName, {
            rxStorage: _this4,
            worker: worker,
            instanceId: instanceId
          }, params.options);
        });
      });
    } catch (e) {
      return Promise.reject(e);
    }
  };

  return RxStorageWorker;
}();

exports.RxStorageWorker = RxStorageWorker;

var RxStorageInstanceWorker = /*#__PURE__*/function () {
  /**
   * threads.js uses observable-fns instead of rxjs
   * so we have to transform it.
   */
  function RxStorageInstanceWorker(databaseName, collectionName, schema, internals, options) {
    var _this5 = this;

    this.changes$ = new _rxjs.Subject();
    this.subs = [];
    this.databaseName = databaseName;
    this.collectionName = collectionName;
    this.schema = schema;
    this.internals = internals;
    this.options = options;
    this.subs.push(this.internals.worker.changeStream(this.internals.instanceId).subscribe(function (ev) {
      return _this5.changes$.next(ev);
    }));
  }

  var _proto2 = RxStorageInstanceWorker.prototype;

  _proto2.bulkWrite = function bulkWrite(documentWrites) {
    return this.internals.worker.bulkWrite(this.internals.instanceId, documentWrites);
  };

  _proto2.bulkAddRevisions = function bulkAddRevisions(documents) {
    return this.internals.worker.bulkAddRevisions(this.internals.instanceId, documents);
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

exports.RxStorageInstanceWorker = RxStorageInstanceWorker;

var RxStorageKeyObjectInstanceWorker = /*#__PURE__*/function () {
  /**
   * threads.js uses observable-fns instead of rxjs
   * so we have to transform it.
   */
  function RxStorageKeyObjectInstanceWorker(databaseName, collectionName, internals, options) {
    var _this6 = this;

    this.changes$ = new _rxjs.Subject();
    this.subs = [];
    this.databaseName = databaseName;
    this.collectionName = collectionName;
    this.internals = internals;
    this.options = options;
    this.subs.push(this.internals.worker.changeStream(this.internals.instanceId).subscribe(function (ev) {
      return _this6.changes$.next(ev);
    }));
  }

  var _proto3 = RxStorageKeyObjectInstanceWorker.prototype;

  _proto3.bulkWrite = function bulkWrite(documentWrites) {
    return this.internals.worker.bulkWriteLocal(this.internals.instanceId, documentWrites);
  };

  _proto3.findLocalDocumentsById = function findLocalDocumentsById(ids) {
    return this.internals.worker.findLocalDocumentsById(this.internals.instanceId, ids);
  };

  _proto3.changeStream = function changeStream() {
    return this.changes$.asObservable();
  };

  _proto3.close = function close() {
    this.subs.forEach(function (sub) {
      return sub.unsubscribe();
    });
    return this.internals.worker.close(this.internals.instanceId);
  };

  _proto3.remove = function remove() {
    return this.internals.worker.remove(this.internals.instanceId);
  };

  return RxStorageKeyObjectInstanceWorker;
}();

exports.RxStorageKeyObjectInstanceWorker = RxStorageKeyObjectInstanceWorker;

function getRxStorageWorker(settings) {
  var storage = new RxStorageWorker(settings, settings.statics);
  return storage;
}
//# sourceMappingURL=non-worker.js.map