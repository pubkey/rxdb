"use strict";

var _interopRequireDefault = require("@babel/runtime/helpers/interopRequireDefault");

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.RxStorageWorker = exports.RxStorageKeyObjectInstanceWorker = exports.RxStorageInstanceWorker = void 0;
exports.getRxStorageWorker = getRxStorageWorker;

var _regenerator = _interopRequireDefault(require("@babel/runtime/regenerator"));

var _asyncToGenerator2 = _interopRequireDefault(require("@babel/runtime/helpers/asyncToGenerator"));

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

  _proto.hash = function hash(data) {
    return this.statics.hash(data);
  };

  _proto.prepareQuery = function prepareQuery(schema, mutateableQuery) {
    return this.statics.prepareQuery(schema, mutateableQuery);
  };

  _proto.getQueryMatcher = function getQueryMatcher(schema, query) {
    return this.statics.getQueryMatcher(schema, query);
  };

  _proto.getSortComparator = function getSortComparator(schema, query) {
    return this.statics.getSortComparator(schema, query);
  };

  _proto.createStorageInstance = /*#__PURE__*/function () {
    var _createStorageInstance = (0, _asyncToGenerator2["default"])( /*#__PURE__*/_regenerator["default"].mark(function _callee(params) {
      var worker, instanceId;
      return _regenerator["default"].wrap(function _callee$(_context) {
        while (1) {
          switch (_context.prev = _context.next) {
            case 0:
              _context.next = 2;
              return this.workerPromise;

            case 2:
              worker = _context.sent;
              _context.next = 5;
              return worker.createStorageInstance(params);

            case 5:
              instanceId = _context.sent;
              return _context.abrupt("return", new RxStorageInstanceWorker(params.databaseName, params.collectionName, params.schema, {
                rxStorage: this,
                instanceId: instanceId,
                worker: worker
              }, params.options));

            case 7:
            case "end":
              return _context.stop();
          }
        }
      }, _callee, this);
    }));

    function createStorageInstance(_x) {
      return _createStorageInstance.apply(this, arguments);
    }

    return createStorageInstance;
  }();

  _proto.createKeyObjectStorageInstance = /*#__PURE__*/function () {
    var _createKeyObjectStorageInstance = (0, _asyncToGenerator2["default"])( /*#__PURE__*/_regenerator["default"].mark(function _callee2(params) {
      var worker, instanceId;
      return _regenerator["default"].wrap(function _callee2$(_context2) {
        while (1) {
          switch (_context2.prev = _context2.next) {
            case 0:
              _context2.next = 2;
              return this.workerPromise;

            case 2:
              worker = _context2.sent;
              _context2.next = 5;
              return worker.createKeyObjectStorageInstance(params);

            case 5:
              instanceId = _context2.sent;
              return _context2.abrupt("return", new RxStorageKeyObjectInstanceWorker(params.databaseName, params.collectionName, {
                rxStorage: this,
                worker: worker,
                instanceId: instanceId
              }, params.options));

            case 7:
            case "end":
              return _context2.stop();
          }
        }
      }, _callee2, this);
    }));

    function createKeyObjectStorageInstance(_x2) {
      return _createKeyObjectStorageInstance.apply(this, arguments);
    }

    return createKeyObjectStorageInstance;
  }();

  return RxStorageWorker;
}();

exports.RxStorageWorker = RxStorageWorker;

var RxStorageInstanceWorker = /*#__PURE__*/function () {
  /**
   * threads.js uses observable-fns instead of rxjs
   * so we have to transform it.
   */
  function RxStorageInstanceWorker(databaseName, collectionName, schema, internals, options) {
    var _this = this;

    this.changes$ = new _rxjs.Subject();
    this.subs = [];
    this.databaseName = databaseName;
    this.collectionName = collectionName;
    this.schema = schema;
    this.internals = internals;
    this.options = options;
    this.subs.push(this.internals.worker.changeStream(this.internals.instanceId).subscribe(function (ev) {
      return _this.changes$.next(ev);
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
    var _this2 = this;

    this.changes$ = new _rxjs.Subject();
    this.subs = [];
    this.databaseName = databaseName;
    this.collectionName = collectionName;
    this.internals = internals;
    this.options = options;
    this.subs.push(this.internals.worker.changeStream(this.internals.instanceId).subscribe(function (ev) {
      return _this2.changes$.next(ev);
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

function getRxStorageWorker(statics, settings) {
  var storage = new RxStorageWorker(settings, statics);
  return storage;
}
//# sourceMappingURL=non-worker.js.map