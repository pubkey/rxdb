"use strict";

var _interopRequireDefault = require("@babel/runtime/helpers/interopRequireDefault");
Object.defineProperty(exports, "__esModule", {
  value: true
});
var _exportNames = {
  RxGraphQLReplicationState: true,
  replicateGraphQL: true
};
exports.RxGraphQLReplicationState = void 0;
exports.replicateGraphQL = replicateGraphQL;
var _regenerator = _interopRequireDefault(require("@babel/runtime/regenerator"));
var _asyncToGenerator2 = _interopRequireDefault(require("@babel/runtime/helpers/asyncToGenerator"));
var _inheritsLoose2 = _interopRequireDefault(require("@babel/runtime/helpers/inheritsLoose"));
var _objectPath = _interopRequireDefault(require("object-path"));
var _utils = require("../../plugins/utils");
var _helper = require("./helper");
Object.keys(_helper).forEach(function (key) {
  if (key === "default" || key === "__esModule") return;
  if (Object.prototype.hasOwnProperty.call(_exportNames, key)) return;
  if (key in exports && exports[key] === _helper[key]) return;
  Object.defineProperty(exports, key, {
    enumerable: true,
    get: function get() {
      return _helper[key];
    }
  });
});
var _leaderElection = require("../leader-election");
var _replication = require("../replication");
var _index = require("../../index");
var _graphqlWebsocket = require("./graphql-websocket");
Object.keys(_graphqlWebsocket).forEach(function (key) {
  if (key === "default" || key === "__esModule") return;
  if (Object.prototype.hasOwnProperty.call(_exportNames, key)) return;
  if (key in exports && exports[key] === _graphqlWebsocket[key]) return;
  Object.defineProperty(exports, key, {
    enumerable: true,
    get: function get() {
      return _graphqlWebsocket[key];
    }
  });
});
var _rxjs = require("rxjs");
var _graphqlSchemaFromRxSchema = require("./graphql-schema-from-rx-schema");
Object.keys(_graphqlSchemaFromRxSchema).forEach(function (key) {
  if (key === "default" || key === "__esModule") return;
  if (Object.prototype.hasOwnProperty.call(_exportNames, key)) return;
  if (key in exports && exports[key] === _graphqlSchemaFromRxSchema[key]) return;
  Object.defineProperty(exports, key, {
    enumerable: true,
    get: function get() {
      return _graphqlSchemaFromRxSchema[key];
    }
  });
});
var _queryBuilderFromRxSchema = require("./query-builder-from-rx-schema");
Object.keys(_queryBuilderFromRxSchema).forEach(function (key) {
  if (key === "default" || key === "__esModule") return;
  if (Object.prototype.hasOwnProperty.call(_exportNames, key)) return;
  if (key in exports && exports[key] === _queryBuilderFromRxSchema[key]) return;
  Object.defineProperty(exports, key, {
    enumerable: true,
    get: function get() {
      return _queryBuilderFromRxSchema[key];
    }
  });
});
/**
 * this plugin adds the RxCollection.syncGraphQl()-function to rxdb
 * you can use it to sync collections with a remote graphql endpoint.
 */
var RxGraphQLReplicationState = /*#__PURE__*/function (_RxReplicationState) {
  (0, _inheritsLoose2["default"])(RxGraphQLReplicationState, _RxReplicationState);
  function RxGraphQLReplicationState(url, clientState, replicationIdentifierHash, collection, deletedField, pull, push, live, retryTime, autoStart) {
    var _this;
    _this = _RxReplicationState.call(this, replicationIdentifierHash, collection, deletedField, pull, push, live, retryTime, autoStart) || this;
    _this.url = url;
    _this.clientState = clientState;
    _this.replicationIdentifierHash = replicationIdentifierHash;
    _this.collection = collection;
    _this.deletedField = deletedField;
    _this.pull = pull;
    _this.push = push;
    _this.live = live;
    _this.retryTime = retryTime;
    _this.autoStart = autoStart;
    return _this;
  }
  var _proto = RxGraphQLReplicationState.prototype;
  _proto.setHeaders = function setHeaders(headers) {
    this.clientState.headers = headers;
  };
  _proto.setCredentials = function setCredentials(credentials) {
    this.clientState.credentials = credentials;
  };
  _proto.graphQLRequest = function graphQLRequest(queryParams) {
    return (0, _helper.graphQLRequest)((0, _utils.ensureNotFalsy)(this.url.http), this.clientState, queryParams);
  };
  return RxGraphQLReplicationState;
}(_replication.RxReplicationState);
exports.RxGraphQLReplicationState = RxGraphQLReplicationState;
function replicateGraphQL(_ref) {
  var collection = _ref.collection,
    url = _ref.url,
    _ref$headers = _ref.headers,
    headers = _ref$headers === void 0 ? {} : _ref$headers,
    credentials = _ref.credentials,
    _ref$deletedField = _ref.deletedField,
    deletedField = _ref$deletedField === void 0 ? '_deleted' : _ref$deletedField,
    _ref$waitForLeadershi = _ref.waitForLeadership,
    waitForLeadership = _ref$waitForLeadershi === void 0 ? true : _ref$waitForLeadershi,
    pull = _ref.pull,
    push = _ref.push,
    _ref$live = _ref.live,
    live = _ref$live === void 0 ? true : _ref$live,
    _ref$retryTime = _ref.retryTime,
    retryTime = _ref$retryTime === void 0 ? 1000 * 5 : _ref$retryTime,
    _ref$autoStart = _ref.autoStart,
    autoStart = _ref$autoStart === void 0 ? true : _ref$autoStart;
  (0, _index.addRxPlugin)(_leaderElection.RxDBLeaderElectionPlugin);
  /**
   * We use this object to store the GraphQL client
   * so we can later swap out the client inside of the replication handlers.
   */
  var mutateableClientState = {
    headers: headers,
    credentials: credentials
  };
  var pullStream$ = new _rxjs.Subject();
  var replicationPrimitivesPull;
  if (pull) {
    var pullBatchSize = pull.batchSize ? pull.batchSize : 20;
    replicationPrimitivesPull = {
      handler: function () {
        var _handler = (0, _asyncToGenerator2["default"])( /*#__PURE__*/_regenerator["default"].mark(function _callee(lastPulledCheckpoint) {
          var pullGraphQL, result, dataPath, data, docsData, newCheckpoint;
          return _regenerator["default"].wrap(function _callee$(_context) {
            while (1) switch (_context.prev = _context.next) {
              case 0:
                _context.next = 2;
                return pull.queryBuilder(lastPulledCheckpoint, pullBatchSize);
              case 2:
                pullGraphQL = _context.sent;
                _context.next = 5;
                return graphqlReplicationState.graphQLRequest(pullGraphQL);
              case 5:
                result = _context.sent;
                if (!result.errors) {
                  _context.next = 8;
                  break;
                }
                throw result.errors;
              case 8:
                dataPath = pull.dataPath || ['data', Object.keys(result.data)[0]];
                data = _objectPath["default"].get(result, dataPath);
                if (!pull.responseModifier) {
                  _context.next = 14;
                  break;
                }
                _context.next = 13;
                return pull.responseModifier(data, 'handler', lastPulledCheckpoint);
              case 13:
                data = _context.sent;
              case 14:
                docsData = data.documents;
                newCheckpoint = data.checkpoint;
                return _context.abrupt("return", {
                  documents: docsData,
                  checkpoint: newCheckpoint
                });
              case 17:
              case "end":
                return _context.stop();
            }
          }, _callee);
        }));
        function handler(_x) {
          return _handler.apply(this, arguments);
        }
        return handler;
      }(),
      batchSize: pull.batchSize,
      modifier: pull.modifier,
      stream$: pullStream$.asObservable()
    };
  }
  var replicationPrimitivesPush;
  if (push) {
    replicationPrimitivesPush = {
      handler: function () {
        var _handler2 = (0, _asyncToGenerator2["default"])( /*#__PURE__*/_regenerator["default"].mark(function _callee2(rows) {
          var pushObj, result, dataPath, data;
          return _regenerator["default"].wrap(function _callee2$(_context2) {
            while (1) switch (_context2.prev = _context2.next) {
              case 0:
                _context2.next = 2;
                return push.queryBuilder(rows);
              case 2:
                pushObj = _context2.sent;
                _context2.next = 5;
                return graphqlReplicationState.graphQLRequest(pushObj);
              case 5:
                result = _context2.sent;
                if (!result.errors) {
                  _context2.next = 8;
                  break;
                }
                throw result.errors;
              case 8:
                dataPath = Object.keys(result.data)[0];
                data = _objectPath["default"].get(result.data, dataPath);
                return _context2.abrupt("return", data);
              case 11:
              case "end":
                return _context2.stop();
            }
          }, _callee2);
        }));
        function handler(_x2) {
          return _handler2.apply(this, arguments);
        }
        return handler;
      }(),
      batchSize: push.batchSize,
      modifier: push.modifier
    };
  }
  var graphqlReplicationState = new RxGraphQLReplicationState(url, mutateableClientState, _helper.GRAPHQL_REPLICATION_PLUGIN_IDENTITY_PREFIX + (0, _utils.fastUnsecureHash)(url.http ? url.http : url.ws), collection, deletedField, replicationPrimitivesPull, replicationPrimitivesPush, live, retryTime, autoStart);
  var mustUseSocket = url.ws && pull && pull.streamQueryBuilder && live;
  var startBefore = graphqlReplicationState.start.bind(graphqlReplicationState);
  graphqlReplicationState.start = function () {
    if (mustUseSocket) {
      var wsClient = (0, _graphqlWebsocket.getGraphQLWebSocket)((0, _utils.ensureNotFalsy)(url.ws));
      wsClient.on('connected', function () {
        pullStream$.next('RESYNC');
      });
      var query = (0, _utils.ensureNotFalsy)(pull.streamQueryBuilder)(mutateableClientState.headers);
      wsClient.subscribe(query, {
        next: function () {
          var _next = (0, _asyncToGenerator2["default"])( /*#__PURE__*/_regenerator["default"].mark(function _callee3(streamResponse) {
            var firstField, data;
            return _regenerator["default"].wrap(function _callee3$(_context3) {
              while (1) switch (_context3.prev = _context3.next) {
                case 0:
                  firstField = Object.keys(streamResponse.data)[0];
                  data = streamResponse.data[firstField];
                  if (!pull.responseModifier) {
                    _context3.next = 6;
                    break;
                  }
                  _context3.next = 5;
                  return pull.responseModifier(data, 'stream');
                case 5:
                  data = _context3.sent;
                case 6:
                  pullStream$.next(data);
                case 7:
                case "end":
                  return _context3.stop();
              }
            }, _callee3);
          }));
          function next(_x3) {
            return _next.apply(this, arguments);
          }
          return next;
        }(),
        error: function error(_error) {
          pullStream$.error(_error);
        },
        complete: function complete() {
          pullStream$.complete();
        }
      });
    }
    return startBefore();
  };
  var cancelBefore = graphqlReplicationState.cancel.bind(graphqlReplicationState);
  graphqlReplicationState.cancel = function () {
    pullStream$.complete();
    if (mustUseSocket) {
      (0, _graphqlWebsocket.removeGraphQLWebSocketRef)((0, _utils.ensureNotFalsy)(url.ws));
    }
    return cancelBefore();
  };
  (0, _replication.startReplicationOnLeaderShip)(waitForLeadership, graphqlReplicationState);
  return graphqlReplicationState;
}
//# sourceMappingURL=index.js.map