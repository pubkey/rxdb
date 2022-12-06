"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.RxStorageMessageChannel = exports.RxStorageInstanceMessageChannel = void 0;
exports.exposeRxStorageMessageChannel = exposeRxStorageMessageChannel;
exports.getRxStorageMessageChannel = getRxStorageMessageChannel;
var _rxjs = require("rxjs");
var _util = require("./util");
function _catch(body, recover) {
  try {
    var result = body();
  } catch (e) {
    return recover(e);
  }
  if (result && result.then) {
    return result.then(void 0, recover);
  }
  return result;
}
/**
 * This file contains helpers
 * that are in use when the RxStorage run in another JavaScript process,
 * like electron ipcMain/Renderer, WebWorker and so on
 * where we communicate with the main process with the MessageChannel API.
 */
var RxStorageMessageChannel = /*#__PURE__*/function () {
  function RxStorageMessageChannel(settings) {
    this.messageChannelByPort = new WeakMap();
    this.requestIdSeed = (0, _util.randomCouchString)(10);
    this.lastRequestId = 0;
    this.settings = settings;
    this.name = settings.name;
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
      var waitForOkPromise = (0, _rxjs.firstValueFrom)(_this2.settings.messages$.pipe((0, _rxjs.filter)(function (msg) {
        return msg.answerTo === requestId;
      })));
      _this2.settings.send({
        isCreate: true,
        requestId: requestId,
        params: params
      });
      return Promise.resolve(waitForOkPromise).then(function (waitForOkResult) {
        if (waitForOkResult.error) {
          throw new Error('could not create instance ' + waitForOkResult.error.toString());
        }
        return new RxStorageInstanceMessageChannel(_this2, params.databaseName, params.collectionName, params.schema, {
          params: params,
          connectionId: (0, _util.ensureNotFalsy)(waitForOkResult.connectionId)
        }, params.options);
      });
    } catch (e) {
      return Promise.reject(e);
    }
  };
  return RxStorageMessageChannel;
}();
exports.RxStorageMessageChannel = RxStorageMessageChannel;
var RxStorageInstanceMessageChannel = /*#__PURE__*/function () {
  function RxStorageInstanceMessageChannel(storage, databaseName, collectionName, schema, internals, options) {
    var _this3 = this;
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
    this.messages$ = this.storage.settings.messages$.pipe((0, _rxjs.filter)(function (msg) {
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
      var responsePromise = (0, _rxjs.firstValueFrom)(_this5.messages$.pipe((0, _rxjs.filter)(function (msg) {
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
        return Promise.resolve(_util.PROMISE_RESOLVE_VOID);
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
      return Promise.resolve(_this9.requestRemote('remove', [])).then(function () {
        return _this9.close();
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
      var _this11 = this;
      return Promise.resolve(_this11.requestRemote('resolveConflictResultionTask', [taskSolution])).then(function () {});
    } catch (e) {
      return Promise.reject(e);
    }
  };
  return RxStorageInstanceMessageChannel;
}();
exports.RxStorageInstanceMessageChannel = RxStorageInstanceMessageChannel;
function getRxStorageMessageChannel(settings) {
  return new RxStorageMessageChannel(settings);
}

/**
 * Run this on the 'remote' part,
 * so that RxStorageMessageChannel can connect to it.
 */
function exposeRxStorageMessageChannel(settings) {
  var instanceByFullName = new Map();
  var stateByPort = new Map();
  settings.messages$.pipe((0, _rxjs.filter)(function (msg) {
    return !!msg.isCreate;
  })).subscribe(function (plainMsg) {
    try {
      var _temp4 = function _temp4(_result2) {
        if (_exit2) return _result2;
        state.connectionIds.add(connectionId);
        var subs = [];
        /**
         * Automatically subscribe to the streams$
         * because we always need them.
         */
        subs.push(state.storageInstance.changeStream().subscribe(function (changes) {
          var message = {
            connectionId: connectionId,
            answerTo: 'changestream',
            method: 'changeStream',
            "return": changes
          };
          settings.send(message);
        }));
        subs.push(state.storageInstance.conflictResultionTasks().subscribe(function (conflicts) {
          var message = {
            connectionId: connectionId,
            answerTo: 'conflictResultionTasks',
            method: 'conflictResultionTasks',
            "return": conflicts
          };
          settings.send(message);
        }));
        subs.push(settings.messages$.pipe((0, _rxjs.filter)(function (subMsg) {
          return subMsg.connectionId === connectionId;
        })).subscribe(function (plainMessage) {
          try {
            var message = plainMessage;
            var result;
            return Promise.resolve(_catch(function () {
              var _ref;
              /**
               * On calls to 'close()',
               * we only close the main instance if there are no other
               * ports connected.
               */
              if (message.method === 'close' && (0, _util.ensureNotFalsy)(state).connectionIds.size > 1) {
                var closeBreakResponse = {
                  connectionId: connectionId,
                  answerTo: message.requestId,
                  method: message.method,
                  "return": null
                };
                settings.send(closeBreakResponse);
                (0, _util.ensureNotFalsy)(state).connectionIds["delete"](connectionId);
                subs.forEach(function (sub) {
                  return sub.unsubscribe();
                });
                return;
              }
              return Promise.resolve((_ref = (0, _util.ensureNotFalsy)(state).storageInstance)[message.method].apply(_ref, message.params)).then(function (_message$method) {
                result = _message$method;
                if (message.method === 'close' || message.method === 'remove') {
                  subs.forEach(function (sub) {
                    return sub.unsubscribe();
                  });
                  (0, _util.ensureNotFalsy)(state).connectionIds["delete"](connectionId);
                  instanceByFullName["delete"](fullName);
                  /**
                   * TODO how to notify the other ports on remove() ?
                   */
                }

                var response = {
                  connectionId: connectionId,
                  answerTo: message.requestId,
                  method: message.method,
                  "return": result
                };
                settings.send(response);
              });
            }, function (err) {
              var errorResponse = {
                connectionId: connectionId,
                answerTo: message.requestId,
                method: message.method,
                error: err.toString()
              };
              settings.send(errorResponse);
            }));
          } catch (e) {
            return Promise.reject(e);
          }
        }));
        settings.send({
          answerTo: _msg.requestId,
          connectionId: connectionId,
          method: 'createRxStorageInstance'
        });
      };
      var _exit2 = false;
      var _msg = plainMsg;
      var connectionId = (0, _util.randomCouchString)(10);
      var _params = _msg.params;
      /**
       * We de-duplicate the storage instances.
       * This makes sense in many environments like
       * electron where on main process contains the storage
       * for multiple renderer processes. Same goes for SharedWorkers etc.
       */
      var fullName = [_params.databaseName, _params.collectionName, _params.schema.version].join('|');
      var state = instanceByFullName.get(fullName);
      var _temp5 = function () {
        if (!state) {
          var _temp6 = _catch(function () {
            return Promise.resolve(settings.storage.createStorageInstance(_params)).then(function (newRxStorageInstance) {
              state = {
                storageInstance: newRxStorageInstance,
                connectionIds: new Set(),
                params: _params
              };
              instanceByFullName.set(fullName, state);
            });
          }, function (err) {
            settings.send({
              answerTo: _msg.requestId,
              connectionId: connectionId,
              method: 'createRxStorageInstance',
              error: err.toString()
            });
            _exit2 = true;
          });
          if (_temp6 && _temp6.then) return _temp6.then(function () {});
        }
      }();
      return Promise.resolve(_temp5 && _temp5.then ? _temp5.then(_temp4) : _temp4(_temp5));
    } catch (e) {
      return Promise.reject(e);
    }
  });
  return {
    instanceByFullName: instanceByFullName,
    stateByPort: stateByPort
  };
}
//# sourceMappingURL=rx-storage-message-channel.js.map