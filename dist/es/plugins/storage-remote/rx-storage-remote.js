import { ensureNotFalsy } from 'event-reduce-js';
import { firstValueFrom, filter, Subject } from 'rxjs';
import { PROMISE_RESOLVE_VOID, randomCouchString } from '../../util';
export var RxStorageMessageChannel = /*#__PURE__*/function () {
  function RxStorageMessageChannel(settings) {
    this.name = 'remote';
    this.messageChannelByPort = new WeakMap();
    this.requestIdSeed = randomCouchString(10);
    this.lastRequestId = 0;
    this.settings = settings;
    this.statics = settings.statics;
  }
  var _proto = RxStorageMessageChannel.prototype;
  _proto.getRequestId = function getRequestId() {
    var newId = this.lastRequestId++;
    return this.requestIdSeed + '|' + newId;
  };
  _proto.createStorageInstance = function createStorageInstance(params) {
    try {
      var _this2 = this;
      var requestId = _this2.getRequestId();
      var waitForOkPromise = firstValueFrom(_this2.settings.messages$.pipe(filter(function (msg) {
        return msg.answerTo === requestId;
      })));
      _this2.settings.send({
        connectionId: _this2.getRequestId(),
        method: 'create',
        requestId: requestId,
        params: params
      });
      return Promise.resolve(waitForOkPromise).then(function (waitForOkResult) {
        if (waitForOkResult.error) {
          throw new Error('could not create instance ' + waitForOkResult.error.toString());
        }
        return new RxStorageInstanceMessageChannel(_this2, params.databaseName, params.collectionName, params.schema, {
          params: params,
          connectionId: ensureNotFalsy(waitForOkResult.connectionId)
        }, params.options);
      });
    } catch (e) {
      return Promise.reject(e);
    }
  };
  return RxStorageMessageChannel;
}();
export var RxStorageInstanceMessageChannel = /*#__PURE__*/function () {
  function RxStorageInstanceMessageChannel(storage, databaseName, collectionName, schema, internals, options) {
    var _this3 = this;
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
    this.messages$ = this.storage.settings.messages$.pipe(filter(function (msg) {
      return msg.connectionId === _this3.internals.connectionId;
    }));
    this.subs.push(this.messages$.subscribe(function (msg) {
      if (msg.method === 'changeStream') {
        _this3.changes$.next(msg["return"]);
      }
      if (msg.method === 'conflictResultionTasks') {
        _this3.conflicts$.next(msg["return"]);
      }
    }));
  }
  var _proto2 = RxStorageInstanceMessageChannel.prototype;
  _proto2.requestRemote = function requestRemote(methodName, params) {
    try {
      var _this5 = this;
      var requestId = _this5.storage.getRequestId();
      var responsePromise = firstValueFrom(_this5.messages$.pipe(filter(function (msg) {
        return msg.answerTo === requestId;
      })));
      var message = {
        connectionId: _this5.internals.connectionId,
        requestId: requestId,
        method: methodName,
        params: params
      };
      _this5.storage.settings.send(message);
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
    return this.requestRemote('bulkWrite', [documentWrites, context]);
  };
  _proto2.findDocumentsById = function findDocumentsById(ids, deleted) {
    return this.requestRemote('findDocumentsById', [ids, deleted]);
  };
  _proto2.query = function query(preparedQuery) {
    return this.requestRemote('query', [preparedQuery]);
  };
  _proto2.count = function count(preparedQuery) {
    return this.requestRemote('count', [preparedQuery]);
  };
  _proto2.getAttachmentData = function getAttachmentData(documentId, attachmentId) {
    return this.requestRemote('getAttachmentData', [documentId, attachmentId]);
  };
  _proto2.getChangedDocumentsSince = function getChangedDocumentsSince(limit, checkpoint) {
    return this.requestRemote('getChangedDocumentsSince', [limit, checkpoint]);
  };
  _proto2.changeStream = function changeStream() {
    return this.changes$.asObservable();
  };
  _proto2.cleanup = function cleanup(minDeletedTime) {
    return this.requestRemote('cleanup', [minDeletedTime]);
  };
  _proto2.close = function close() {
    try {
      var _this7 = this;
      if (_this7.closed) {
        return Promise.resolve(PROMISE_RESOLVE_VOID);
      }
      _this7.closed = true;
      _this7.subs.forEach(function (sub) {
        return sub.unsubscribe();
      });
      _this7.changes$.complete();
      return Promise.resolve(_this7.requestRemote('close', [])).then(function () {});
    } catch (e) {
      return Promise.reject(e);
    }
  };
  _proto2.remove = function remove() {
    try {
      var _this9 = this;
      return Promise.resolve(_this9.requestRemote('remove', [])).then(function () {});
    } catch (e) {
      return Promise.reject(e);
    }
  };
  _proto2.conflictResultionTasks = function conflictResultionTasks() {
    return this.conflicts$;
  };
  _proto2.resolveConflictResultionTask = function resolveConflictResultionTask(taskSolution) {
    try {
      var _this11 = this;
      return Promise.resolve(_this11.requestRemote('resolveConflictResultionTask', [taskSolution])).then(function () {});
    } catch (e) {
      return Promise.reject(e);
    }
  };
  return RxStorageInstanceMessageChannel;
}();
export function getRxStorageRemote(settings) {
  return new RxStorageMessageChannel(settings);
}
//# sourceMappingURL=rx-storage-remote.js.map