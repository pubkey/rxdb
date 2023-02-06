"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.RxStorageRemote = exports.RxStorageInstanceRemote = void 0;
exports.getRxStorageRemote = getRxStorageRemote;
var _rxjs = require("rxjs");
var _utils = require("../../plugins/utils");
var RxStorageRemote = /*#__PURE__*/function () {
  function RxStorageRemote(settings) {
    this.name = 'remote';
    this.requestIdSeed = (0, _utils.randomCouchString)(10);
    this.lastRequestId = 0;
    this.settings = settings;
    this.statics = settings.statics;
  }
  var _proto = RxStorageRemote.prototype;
  _proto.getRequestId = function getRequestId() {
    var newId = this.lastRequestId++;
    return this.requestIdSeed + '|' + newId;
  };
  _proto.createStorageInstance = async function createStorageInstance(params) {
    var connectionId = 'c|' + this.getRequestId();
    var requestId = this.getRequestId();
    var waitForOkPromise = (0, _rxjs.firstValueFrom)(this.settings.messages$.pipe((0, _rxjs.filter)(msg => msg.answerTo === requestId)));
    this.settings.send({
      connectionId,
      method: 'create',
      requestId,
      params
    });
    var waitForOkResult = await waitForOkPromise;
    if (waitForOkResult.error) {
      throw new Error('could not create instance ' + JSON.stringify(waitForOkResult.error));
    }
    return new RxStorageInstanceRemote(this, params.databaseName, params.collectionName, params.schema, {
      params,
      connectionId
    }, params.options);
  };
  _proto.customRequest = async function customRequest(data) {
    var connectionId = 'custom|request';
    var requestId = this.getRequestId();
    var waitForAnswerPromise = (0, _rxjs.firstValueFrom)(this.settings.messages$.pipe((0, _rxjs.filter)(msg => msg.answerTo === requestId)));
    this.settings.send({
      connectionId,
      method: 'custom',
      requestId,
      params: data
    });
    var response = await waitForAnswerPromise;
    if (response.error) {
      throw new Error('could not run customRequest(): ' + JSON.stringify({
        data,
        error: response.error
      }));
    } else {
      return response.return;
    }
  };
  return RxStorageRemote;
}();
exports.RxStorageRemote = RxStorageRemote;
var RxStorageInstanceRemote = /*#__PURE__*/function () {
  function RxStorageInstanceRemote(storage, databaseName, collectionName, schema, internals, options) {
    this.changes$ = new _rxjs.Subject();
    this.conflicts$ = new _rxjs.Subject();
    this.subs = [];
    this.closed = false;
    this.storage = storage;
    this.databaseName = databaseName;
    this.collectionName = collectionName;
    this.schema = schema;
    this.internals = internals;
    this.options = options;
    this.messages$ = this.storage.settings.messages$.pipe((0, _rxjs.filter)(msg => msg.connectionId === this.internals.connectionId));
    this.subs.push(this.messages$.subscribe(msg => {
      if (msg.method === 'changeStream') {
        this.changes$.next(msg.return);
      }
      if (msg.method === 'conflictResultionTasks') {
        this.conflicts$.next(msg.return);
      }
    }));
  }
  var _proto2 = RxStorageInstanceRemote.prototype;
  _proto2.requestRemote = async function requestRemote(methodName, params) {
    var requestId = this.storage.getRequestId();
    var responsePromise = (0, _rxjs.firstValueFrom)(this.messages$.pipe((0, _rxjs.filter)(msg => msg.answerTo === requestId)));
    var message = {
      connectionId: this.internals.connectionId,
      requestId,
      method: methodName,
      params
    };
    this.storage.settings.send(message);
    var response = await responsePromise;
    if (response.error) {
      throw new Error('could not requestRemote: ' + JSON.stringify(response.error));
    } else {
      return response.return;
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
  _proto2.close = async function close() {
    if (this.closed) {
      return Promise.reject(new Error('already closed'));
    }
    this.closed = true;
    this.subs.forEach(sub => sub.unsubscribe());
    this.changes$.complete();
    await this.requestRemote('close', []);
  };
  _proto2.remove = async function remove() {
    this.closed = true;
    await this.requestRemote('remove', []);
  };
  _proto2.conflictResultionTasks = function conflictResultionTasks() {
    return this.conflicts$;
  };
  _proto2.resolveConflictResultionTask = async function resolveConflictResultionTask(taskSolution) {
    await this.requestRemote('resolveConflictResultionTask', [taskSolution]);
  };
  return RxStorageInstanceRemote;
}();
exports.RxStorageInstanceRemote = RxStorageInstanceRemote;
function getRxStorageRemote(settings) {
  return new RxStorageRemote(settings);
}
//# sourceMappingURL=rx-storage-remote.js.map