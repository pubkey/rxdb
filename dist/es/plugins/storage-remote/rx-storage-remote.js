import { firstValueFrom, filter, Subject } from 'rxjs';
import { randomCouchString } from '../../plugins/utils';
import { closeMessageChannel, getMessageChannel } from './message-channel-cache';
import { ensureRxStorageInstanceParamsAreCorrect } from '../../rx-storage-helper';
export var RxStorageRemote = /*#__PURE__*/function () {
  function RxStorageRemote(settings) {
    this.name = 'remote';
    this.seed = randomCouchString(10);
    this.lastRequestId = 0;
    this.settings = settings;
    this.statics = settings.statics;
    if (settings.mode === 'one') {
      this.messageChannelIfOneMode = getMessageChannel(settings, [], true);
    }
  }
  var _proto = RxStorageRemote.prototype;
  _proto.getRequestId = function getRequestId() {
    var newId = this.lastRequestId++;
    return this.seed + '|' + newId;
  };
  _proto.createStorageInstance = async function createStorageInstance(params) {
    ensureRxStorageInstanceParamsAreCorrect(params);
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
    var messageChannel = await (this.messageChannelIfOneMode ? this.messageChannelIfOneMode : getMessageChannel(this.settings, cacheKeys));
    var requestId = this.getRequestId();
    var waitForOkPromise = firstValueFrom(messageChannel.messages$.pipe(filter(msg => msg.answerTo === requestId)));
    messageChannel.send({
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
      connectionId,
      messageChannel
    }, params.options);
  };
  _proto.customRequest = async function customRequest(data) {
    var messageChannel = await this.settings.messageChannelCreator();
    var requestId = this.getRequestId();
    var connectionId = 'custom|request|' + requestId;
    var waitForAnswerPromise = firstValueFrom(messageChannel.messages$.pipe(filter(msg => msg.answerTo === requestId)));
    messageChannel.send({
      connectionId,
      method: 'custom',
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
export var RxStorageInstanceRemote = /*#__PURE__*/function () {
  function RxStorageInstanceRemote(storage, databaseName, collectionName, schema, internals, options) {
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
    this.messages$ = this.internals.messageChannel.messages$.pipe(filter(msg => msg.connectionId === this.internals.connectionId));
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
    var responsePromise = firstValueFrom(this.messages$.pipe(filter(msg => msg.answerTo === requestId)));
    var message = {
      connectionId: this.internals.connectionId,
      requestId,
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
    await closeMessageChannel(this.internals.messageChannel);
  };
  _proto2.remove = async function remove() {
    this.closed = true;
    await this.requestRemote('remove', []);
    await closeMessageChannel(this.internals.messageChannel);
  };
  _proto2.conflictResultionTasks = function conflictResultionTasks() {
    return this.conflicts$;
  };
  _proto2.resolveConflictResultionTask = async function resolveConflictResultionTask(taskSolution) {
    await this.requestRemote('resolveConflictResultionTask', [taskSolution]);
  };
  return RxStorageInstanceRemote;
}();
export function getRxStorageRemote(settings) {
  var withDefaults = Object.assign({
    mode: 'storage'
  }, settings);
  return new RxStorageRemote(withDefaults);
}
//# sourceMappingURL=rx-storage-remote.js.map