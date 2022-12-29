"use strict";

var _interopRequireDefault = require("@babel/runtime/helpers/interopRequireDefault");
Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.exposeRxStorageRemote = exposeRxStorageRemote;
var _regenerator = _interopRequireDefault(require("@babel/runtime/regenerator"));
var _asyncToGenerator2 = _interopRequireDefault(require("@babel/runtime/helpers/asyncToGenerator"));
var _rxjs = require("rxjs");
var _util = require("../../util");
var _storageRemoteHelpers = require("./storage-remote-helpers");
var _fastDeepEqual = _interopRequireDefault(require("fast-deep-equal"));
/**
 * Run this on the 'remote' part,
 * so that RxStorageMessageChannel can connect to it.
 */
function exposeRxStorageRemote(settings) {
  var instanceByFullName = new Map();
  settings.messages$.pipe((0, _rxjs.filter)(function (msg) {
    return msg.method === 'create';
  })).subscribe( /*#__PURE__*/function () {
    var _ref = (0, _asyncToGenerator2["default"])( /*#__PURE__*/_regenerator["default"].mark(function _callee2(msg) {
      var connectionId, params, fullName, state, newRxStorageInstance, subs;
      return _regenerator["default"].wrap(function _callee2$(_context2) {
        while (1) switch (_context2.prev = _context2.next) {
          case 0:
            connectionId = msg.connectionId;
            /**
             * Do an isArray check here
             * for runtime check types to ensure we have
             * instance creation params and not method input params.
             */
            if (!Array.isArray(msg.params)) {
              _context2.next = 3;
              break;
            }
            return _context2.abrupt("return");
          case 3:
            params = msg.params;
            /**
             * We de-duplicate the storage instances.
             * This makes sense in many environments like
             * electron where on main process contains the storage
             * for multiple renderer processes. Same goes for SharedWorkers etc.
             */
            fullName = [params.databaseName, params.collectionName, params.schema.version].join('|');
            state = instanceByFullName.get(fullName);
            if (state) {
              _context2.next = 21;
              break;
            }
            _context2.prev = 7;
            _context2.next = 10;
            return settings.storage.createStorageInstance(params);
          case 10:
            newRxStorageInstance = _context2.sent;
            state = {
              storageInstance: newRxStorageInstance,
              connectionIds: new Set(),
              params: params
            };
            instanceByFullName.set(fullName, state);
            _context2.next = 19;
            break;
          case 15:
            _context2.prev = 15;
            _context2.t0 = _context2["catch"](7);
            settings.send((0, _storageRemoteHelpers.createErrorAnswer)(msg, _context2.t0));
            return _context2.abrupt("return");
          case 19:
            _context2.next = 22;
            break;
          case 21:
            // if instance already existed, ensure that the schema is equal
            if (!(0, _fastDeepEqual["default"])(params.schema, state.params.schema)) {
              settings.send((0, _storageRemoteHelpers.createErrorAnswer)(msg, new Error('Remote storage: schema not equal to existing storage')));
            }
          case 22:
            state.connectionIds.add(msg.connectionId);
            subs = [];
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
            })).subscribe( /*#__PURE__*/function () {
              var _ref2 = (0, _asyncToGenerator2["default"])( /*#__PURE__*/_regenerator["default"].mark(function _callee(plainMessage) {
                var message, result;
                return _regenerator["default"].wrap(function _callee$(_context) {
                  while (1) switch (_context.prev = _context.next) {
                    case 0:
                      message = plainMessage;
                      if (!(message.method === 'create')) {
                        _context.next = 3;
                        break;
                      }
                      return _context.abrupt("return");
                    case 3:
                      if (Array.isArray(message.params)) {
                        _context.next = 5;
                        break;
                      }
                      return _context.abrupt("return");
                    case 5:
                      _context.prev = 5;
                      if (!(message.method === 'close' && (0, _util.ensureNotFalsy)(state).connectionIds.size > 1)) {
                        _context.next = 11;
                        break;
                      }
                      settings.send((0, _storageRemoteHelpers.createAnswer)(message, null));
                      (0, _util.ensureNotFalsy)(state).connectionIds["delete"](connectionId);
                      subs.forEach(function (sub) {
                        return sub.unsubscribe();
                      });
                      return _context.abrupt("return");
                    case 11:
                      _context.next = 13;
                      return (0, _util.ensureNotFalsy)(state).storageInstance[message.method](message.params[0], message.params[1], message.params[2], message.params[3]);
                    case 13:
                      result = _context.sent;
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

                      settings.send((0, _storageRemoteHelpers.createAnswer)(message, result));
                      _context.next = 21;
                      break;
                    case 18:
                      _context.prev = 18;
                      _context.t0 = _context["catch"](5);
                      settings.send((0, _storageRemoteHelpers.createErrorAnswer)(message, _context.t0));
                    case 21:
                    case "end":
                      return _context.stop();
                  }
                }, _callee, null, [[5, 18]]);
              }));
              return function (_x2) {
                return _ref2.apply(this, arguments);
              };
            }()));
            settings.send((0, _storageRemoteHelpers.createAnswer)(msg, 'ok'));
          case 28:
          case "end":
            return _context2.stop();
        }
      }, _callee2, null, [[7, 15]]);
    }));
    return function (_x) {
      return _ref.apply(this, arguments);
    };
  }());
  return {
    instanceByFullName: instanceByFullName
  };
}
//# sourceMappingURL=remote.js.map