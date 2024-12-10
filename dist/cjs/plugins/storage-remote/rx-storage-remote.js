"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.RxStorageRemote = exports.RxStorageInstanceRemote = void 0;
exports.getRxStorageRemote = getRxStorageRemote;
var _rxjs = require("rxjs");
var _index = require("../../plugins/utils/index.js");
var _messageChannelCache = require("./message-channel-cache.js");
var RxStorageRemote = exports.RxStorageRemote = /*#__PURE__*/function () {
  function RxStorageRemote(settings) {
    this.name = 'remote';
    this.rxdbVersion = _index.RXDB_VERSION;
    this.seed = (0, _index.randomToken)(10);
    this.lastRequestId = 0;
    this.settings = settings;
    if (settings.mode === 'one') {
      this.messageChannelIfOneMode = (0, _messageChannelCache.getMessageChannel)(settings, [], true);
    }
  }
  var _proto = RxStorageRemote.prototype;
  _proto.getRequestId = function getRequestId() {
    var newId = this.lastRequestId++;
    return this.seed + '|' + newId;
  };
  _proto.createStorageInstance = async function createStorageInstance(params) {
    var connectionId = 'c|' + this.getRequestId();
    var cacheKeys = ['mode-' + this.settings.mode];
    switch (this.settings.mode) {
      case 'collection':
        cacheKeys.push('collection-' + params.collectionName);
      // eslint-disable-next-line no-fallthrough
      case 'database':
        cacheKeys.push('database-' + params.databaseName);
      // eslint-disable-next-line no-fallthrough
      case 'storage':
        cacheKeys.push('seed-' + this.seed);
    }
    var messageChannel = await (this.messageChannelIfOneMode ? this.messageChannelIfOneMode : (0, _messageChannelCache.getMessageChannel)(this.settings, cacheKeys));
    var requestId = this.getRequestId();
    var waitForOkPromise = (0, _rxjs.firstValueFrom)(messageChannel.messages$.pipe((0, _rxjs.filter)(msg => msg.answerTo === requestId)));
    messageChannel.send({
      connectionId,
      method: 'create',
      version: _index.RXDB_VERSION,
      requestId,
      params
    });
    var waitForOkResult = await waitForOkPromise;
    if (waitForOkResult.error) {
      await (0, _messageChannelCache.closeMessageChannel)(messageChannel);
      throw new Error('could not create instance ' + JSON.stringify(waitForOkResult.error));
    }
    return new RxStorageInstanceRemote(this, params.databaseName, params.collectionName, params.schema, {
      params,
      connectionId,
      messageChannel
    }, params.options);
  };
  _proto.customRequest = async function customRequest(data) {
    var messageChannel = await this.settings.messageChannelCreator();
    var requestId = this.getRequestId();
    var connectionId = 'custom|request|' + requestId;
    var waitForAnswerPromise = (0, _rxjs.firstValueFrom)(messageChannel.messages$.pipe((0, _rxjs.filter)(msg => msg.answerTo === requestId)));
    messageChannel.send({
      connectionId,
      method: 'custom',
      version: _index.RXDB_VERSION,
      requestId,
      params: data
    });
    var response = await waitForAnswerPromise;
    if (response.error) {
      await messageChannel.close();
      throw new Error('could not run customRequest(): ' + JSON.stringify({
        data,
        error: response.error
      }));
    } else {
      await messageChannel.close();
      return response.return;
    }
  };
  return RxStorageRemote;
}();
/**
 * Because postMessage() can be very slow on complex objects,
 * and some RxStorage implementations do need a JSON-string internally
 * anyway, it is allowed to transfer a string instead of an object
 * which must then be JSON.parse()-ed before RxDB can use it.
 * @link https://surma.dev/things/is-postmessage-slow/
 */
function getMessageReturn(msg) {
  if (msg.method === 'getAttachmentData') {
    return msg.return;
  } else {
    if (typeof msg.return === 'string') {
      return JSON.parse(msg.return);
    } else {
      return msg.return;
    }
  }
}
var RxStorageInstanceRemote = exports.RxStorageInstanceRemote = /*#__PURE__*/function () {
  function RxStorageInstanceRemote(storage, databaseName, collectionName, schema, internals, options) {
    this.changes$ = new _rxjs.Subject();
    this.subs = [];
    this.storage = storage;
    this.databaseName = databaseName;
    this.collectionName = collectionName;
    this.schema = schema;
    this.internals = internals;
    this.options = options;
    this.messages$ = this.internals.messageChannel.messages$.pipe((0, _rxjs.filter)(msg => msg.connectionId === this.internals.connectionId));
    this.subs.push(this.messages$.subscribe(msg => {
      if (msg.method === 'changeStream') {
        this.changes$.next(getMessageReturn(msg));
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
      version: _index.RXDB_VERSION,
      method: methodName,
      params
    };
    this.internals.messageChannel.send(message);
    var response = await responsePromise;
    if (response.error) {
      throw new Error('could not requestRemote: ' + JSON.stringify({
        methodName,
        params,
        error: response.error
      }, null, 4));
    } else {
      return getMessageReturn(response);
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
  _proto2.getAttachmentData = function getAttachmentData(documentId, attachmentId, digest) {
    return this.requestRemote('getAttachmentData', [documentId, attachmentId, digest]);
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
      return this.closed;
    }
    this.closed = (async () => {
      this.subs.forEach(sub => sub.unsubscribe());
      this.changes$.complete();
      await this.requestRemote('close', []);
      await (0, _messageChannelCache.closeMessageChannel)(this.internals.messageChannel);
    })();
    return this.closed;
  };
  _proto2.remove = async function remove() {
    if (this.closed) {
      throw new Error('already closed');
    }
    this.closed = (async () => {
      await this.requestRemote('remove', []);
      await (0, _messageChannelCache.closeMessageChannel)(this.internals.messageChannel);
    })();
    return this.closed;
  };
  return RxStorageInstanceRemote;
}();
function getRxStorageRemote(settings) {
  var withDefaults = Object.assign({
    mode: 'storage'
  }, settings);
  return new RxStorageRemote(withDefaults);
}
//# sourceMappingURL=rx-storage-remote.js.map