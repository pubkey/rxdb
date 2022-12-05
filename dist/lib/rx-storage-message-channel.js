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
    this.settings = settings;
    this.name = settings.name;
    this.statics = settings.statics;
  }
  var _proto = RxStorageMessageChannel.prototype;
  _proto.createStorageInstance = function createStorageInstance(params) {
    try {
      var _this2 = this;
      var messageChannel = new MessageChannel();
      _this2.messageChannelByPort.set(messageChannel.port1, messageChannel);
      _this2.messageChannelByPort.set(messageChannel.port2, messageChannel);
      var _port = messageChannel.port1;
      var messages$ = new _rxjs.Subject();
      var waitForOkPromise = (0, _rxjs.firstValueFrom)(messages$);
      _port.onmessage = function (msg) {
        messages$.next(msg.data);
      };
      _this2.settings.createRemoteStorage(messageChannel.port2, params);
      return Promise.resolve(waitForOkPromise).then(function (waitForOkResult) {
        if (waitForOkResult.error) {
          throw new Error('could not create instance ' + waitForOkResult.error.toString());
        }
        return new RxStorageInstanceMessageChannel(_this2, params.databaseName, params.collectionName, params.schema, {
          params: params,
          port: _port,
          messages$: messages$
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
    this.lastRequestId = 0;
    this.requestIdSeed = (0, _util.randomCouchString)(19);
    this.storage = storage;
    this.databaseName = databaseName;
    this.collectionName = collectionName;
    this.schema = schema;
    this.internals = internals;
    this.options = options;
    this.subs.push(internals.messages$.subscribe(function (msg) {
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
      var requestIdNr = _this5.lastRequestId++;
      var requestId = _this5.requestIdSeed + '|' + requestIdNr;
      var responsePromise = (0, _rxjs.firstValueFrom)(_this5.internals.messages$.pipe((0, _rxjs.filter)(function (msg) {
        return msg.answerTo === requestId;
      })));
      var message = {
        instanceId: _this5.internals.params.databaseInstanceToken,
        requestId: requestId,
        method: methodName,
        params: params
      };
      _this5.internals.port.postMessage(message);
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
      return Promise.resolve(_this7.requestRemote('close', [])).then(function () {
        _this7.internals.port.close();
      });
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

  /**
   * Create new RxStorageInstances
   * on request.
   */
  settings.onCreateRemoteStorage$.subscribe(function (data) {
    try {
      var _temp4 = function _temp4(_result2) {
        if (_exit2) return _result2;
        _port2.postMessage({
          key: 'ok'
        });
        var subs = [];
        stateByPort.set(_port2, {
          state: state,
          subs: subs
        });

        /**
         * Automatically subscribe to the streams$
         * because we always need them.
         */
        subs.push(state.storageInstance.changeStream().subscribe(function (changes) {
          var message = {
            instanceId: _params.databaseInstanceToken,
            answerTo: 'changestream',
            method: 'changeStream',
            "return": changes
          };
          _port2.postMessage(message);
        }));
        subs.push(state.storageInstance.conflictResultionTasks().subscribe(function (conflicts) {
          var message = {
            instanceId: _params.databaseInstanceToken,
            answerTo: 'conflictResultionTasks',
            method: 'conflictResultionTasks',
            "return": conflicts
          };
          _port2.postMessage(message);
        }));
        _port2.onmessage = function (plainMessage) {
          try {
            var message = plainMessage.data;
            var result;
            return Promise.resolve(_catch(function () {
              var _ref;
              /**
               * On calls to 'close()',
               * we only close the main instance if there are no other
               * ports connected.
               */
              if (message.method === 'close' && (0, _util.ensureNotFalsy)(state).ports.length > 1) {
                var closeBreakResponse = {
                  instanceId: _params.databaseInstanceToken,
                  answerTo: message.requestId,
                  method: message.method,
                  "return": null
                };
                _port2.postMessage(closeBreakResponse);
                return;
              }
              return Promise.resolve((_ref = (0, _util.ensureNotFalsy)(state).storageInstance)[message.method].apply(_ref, message.params)).then(function (_message$method) {
                result = _message$method;
                if (message.method === 'close' || message.method === 'remove') {
                  subs.forEach(function (sub) {
                    return sub.unsubscribe();
                  });
                  (0, _util.ensureNotFalsy)(state).ports = (0, _util.ensureNotFalsy)(state).ports.filter(function (p) {
                    return p !== _port2;
                  });
                  instanceByFullName["delete"](fullName);
                  stateByPort["delete"](_port2);
                  /**
                   * TODO how to notify the other ports on remove() ?
                   */
                }

                var response = {
                  instanceId: _params.databaseInstanceToken,
                  answerTo: message.requestId,
                  method: message.method,
                  "return": result
                };
                _port2.postMessage(response);
              });
            }, function (err) {
              var errorResponse = {
                instanceId: _params.databaseInstanceToken,
                answerTo: message.requestId,
                method: message.method,
                error: err.toString()
              };
              _port2.postMessage(errorResponse);
            }));
          } catch (e) {
            return Promise.reject(e);
          }
        };
      };
      var _exit2 = false;
      var _params = data.params;
      var _port2 = data.port;
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
                ports: [_port2],
                params: _params
              };
              instanceByFullName.set(fullName, state);
            });
          }, function () {
            _port2.postMessage({
              key: 'error',
              error: 'could not call createStorageInstance'
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