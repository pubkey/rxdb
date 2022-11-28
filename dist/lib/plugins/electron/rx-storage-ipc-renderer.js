"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.RxStorageIpcRenderer = exports.RxStorageInstanceIpcRenderer = void 0;
exports.getRxStorageIpcRenderer = getRxStorageIpcRenderer;
var _rxjs = require("rxjs");
var _util = require("../../util");
var _electronHelper = require("./electron-helper");
var RxStorageIpcRenderer = /*#__PURE__*/function () {
  function RxStorageIpcRenderer(settings, statics) {
    this.name = 'ipc-renderer';
    this.settings = settings;
    this.statics = statics;
  }
  var _proto = RxStorageIpcRenderer.prototype;
  _proto.invoke = function invoke(eventName, args) {
    try {
      var _this2 = this;
      return Promise.resolve(_this2.settings.ipcRenderer.invoke([_electronHelper.IPC_RENDERER_KEY_PREFIX, 'invoke', _this2.settings.key, eventName].join('|'), args)).then(function (result) {
        if (result.error) {
          throw new Error(result.error);
        } else {
          return result.value;
        }
      });
    } catch (e) {
      return Promise.reject(e);
    }
  };
  _proto.postMessage = function postMessage(eventName, args) {
    var messageChannel = new MessageChannel();
    this.settings.ipcRenderer.postMessage([_electronHelper.IPC_RENDERER_KEY_PREFIX, 'postMessage', this.settings.key, eventName].join('|'), args, [messageChannel.port2]);
    return messageChannel.port1;
  };
  _proto.createStorageInstance = function createStorageInstance(params) {
    try {
      var _this4 = this;
      var messages$ = new _rxjs.Subject();
      var instanceIdPromise = (0, _rxjs.firstValueFrom)(messages$);
      var channelId = (0, _util.randomCouchString)(10);
      var port = _this4.postMessage('createStorageInstance', Object.assign({}, params, {
        channelId: channelId
      }));
      port.onmessage = function (msg) {
        messages$.next(msg.data);
      };
      return Promise.resolve(instanceIdPromise).then(function (instanceIdResult) {
        if (instanceIdResult.error) {
          throw new Error('could not create instance ' + instanceIdResult.error.toString());
        }
        var instanceId = instanceIdResult["return"];
        return new RxStorageInstanceIpcRenderer(_this4, params.databaseName, params.collectionName, params.schema, {
          channelId: channelId,
          instanceId: instanceId,
          port: port,
          messages$: messages$,
          rxStorage: _this4,
          ipcRenderer: _this4.settings.ipcRenderer
        }, params.options);
      });
    } catch (e) {
      return Promise.reject(e);
    }
  };
  return RxStorageIpcRenderer;
}();
exports.RxStorageIpcRenderer = RxStorageIpcRenderer;
var RxStorageInstanceIpcRenderer = /*#__PURE__*/function () {
  function RxStorageInstanceIpcRenderer(storage, databaseName, collectionName, schema, internals, options) {
    var _this5 = this;
    this.changes$ = new _rxjs.Subject();
    this.conflicts$ = new _rxjs.Subject();
    this.subs = [];
    this.closed = false;
    this.lastRequestId = 0;
    this.requestIdSeed = (0, _util.randomCouchString)(19);
    this.storage = storage;
    this.databaseName = databaseName;
    this.collectionName = collectionName;
    this.schema = schema;
    this.internals = internals;
    this.options = options;
    this.instanceId = internals.instanceId;
    this.subs.push(internals.messages$.subscribe(function (msg) {
      if (msg.method === 'changeStream') {
        _this5.changes$.next(msg["return"]);
      }
      if (msg.method === 'conflictResultionTasks') {
        _this5.conflicts$.next(msg["return"]);
      }
    }));
  }
  var _proto2 = RxStorageInstanceIpcRenderer.prototype;
  _proto2.requestMain = function requestMain(methodName, params) {
    try {
      var _this7 = this;
      var requestIdNr = _this7.lastRequestId++;
      var requestId = _this7.requestIdSeed + '|' + requestIdNr;
      var responsePromise = (0, _rxjs.firstValueFrom)(_this7.internals.messages$.pipe((0, _rxjs.filter)(function (msg) {
        return msg.answerTo === requestId;
      })));
      var message = {
        channelId: _this7.internals.channelId,
        requestId: requestId,
        method: methodName,
        params: params
      };
      _this7.internals.ipcRenderer.send(_electronHelper.IPC_RENDERER_TO_MAIN, message);
      return Promise.resolve(responsePromise).then(function (response) {
        if (response.error) {
          throw new Error(response.error);
        } else {
          return response["return"];
        }
      });
    } catch (e) {
      return Promise.reject(e);
    }
  };
  _proto2.bulkWrite = function bulkWrite(documentWrites, context) {
    return this.requestMain('bulkWrite', [documentWrites, context]);
  };
  _proto2.findDocumentsById = function findDocumentsById(ids, deleted) {
    return this.requestMain('findDocumentsById', [ids, deleted]);
  };
  _proto2.query = function query(preparedQuery) {
    return this.requestMain('query', [preparedQuery]);
  };
  _proto2.count = function count(preparedQuery) {
    return this.requestMain('count', [preparedQuery]);
  };
  _proto2.getAttachmentData = function getAttachmentData(documentId, attachmentId) {
    return this.requestMain('getAttachmentData', [documentId, attachmentId]);
  };
  _proto2.getChangedDocumentsSince = function getChangedDocumentsSince(limit, checkpoint) {
    return this.requestMain('getChangedDocumentsSince', [limit, checkpoint]);
  };
  _proto2.changeStream = function changeStream() {
    return this.changes$.asObservable();
  };
  _proto2.cleanup = function cleanup(minDeletedTime) {
    return this.requestMain('cleanup', [minDeletedTime]);
  };
  _proto2.close = function close() {
    try {
      var _this9 = this;
      if (_this9.closed) {
        return Promise.resolve(_util.PROMISE_RESOLVE_VOID);
      }
      _this9.closed = true;
      _this9.subs.forEach(function (sub) {
        return sub.unsubscribe();
      });
      _this9.changes$.complete();
      return Promise.resolve(_this9.requestMain('close', [])).then(function () {
        _this9.internals.port.close();
      });
    } catch (e) {
      return Promise.reject(e);
    }
  };
  _proto2.remove = function remove() {
    try {
      var _this11 = this;
      return Promise.resolve(_this11.requestMain('remove', [])).then(function () {
        return _this11.close();
      });
    } catch (e) {
      return Promise.reject(e);
    }
  };
  _proto2.conflictResultionTasks = function conflictResultionTasks() {
    return this.conflicts$;
  };
  _proto2.resolveConflictResultionTask = function resolveConflictResultionTask(taskSolution) {
    try {
      var _this13 = this;
      return Promise.resolve(_this13.requestMain('resolveConflictResultionTask', [taskSolution])).then(function () {});
    } catch (e) {
      return Promise.reject(e);
    }
  };
  return RxStorageInstanceIpcRenderer;
}();
exports.RxStorageInstanceIpcRenderer = RxStorageInstanceIpcRenderer;
function getRxStorageIpcRenderer(settings) {
  var storage = new RxStorageIpcRenderer(settings, settings.statics);
  return storage;
}
//# sourceMappingURL=rx-storage-ipc-renderer.js.map