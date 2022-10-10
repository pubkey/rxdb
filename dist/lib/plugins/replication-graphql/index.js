"use strict";

var _interopRequireDefault = require("@babel/runtime/helpers/interopRequireDefault");
Object.defineProperty(exports, "__esModule", {
  value: true
});
var _exportNames = {
  RxGraphQLReplicationState: true,
  syncGraphQL: true,
  RxDBReplicationGraphQLPlugin: true
};
exports.RxGraphQLReplicationState = exports.RxDBReplicationGraphQLPlugin = void 0;
exports.syncGraphQL = syncGraphQL;
var _inheritsLoose2 = _interopRequireDefault(require("@babel/runtime/helpers/inheritsLoose"));
var _graphqlClient = _interopRequireDefault(require("graphql-client"));
var _objectPath = _interopRequireDefault(require("object-path"));
var _util = require("../../util");
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
 * you can use it to sync collections with remote graphql endpoint
 */var RxGraphQLReplicationState = /*#__PURE__*/function (_RxReplicationState) {
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
    this.clientState.client = (0, _graphqlClient["default"])({
      url: this.url.http,
      headers: headers,
      credentials: this.clientState.credentials
    });
  };
  _proto.setCredentials = function setCredentials(credentials) {
    this.clientState.credentials = credentials;
    this.clientState.client = (0, _graphqlClient["default"])({
      url: this.url.http,
      headers: this.clientState.headers,
      credentials: credentials
    });
  };
  return RxGraphQLReplicationState;
}(_replication.RxReplicationState);
exports.RxGraphQLReplicationState = RxGraphQLReplicationState;
function syncGraphQL(_ref) {
  var url = _ref.url,
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
  var collection = this;

  /**
   * We use this object to store the GraphQL client
   * so we can later swap out the client inside of the replication handlers.
   */
  var mutateableClientState = {
    headers: headers,
    credentials: credentials,
    client: (0, _graphqlClient["default"])({
      url: url.http,
      headers: headers,
      credentials: credentials
    })
  };
  var pullStream$ = new _rxjs.Subject();
  var replicationPrimitivesPull;
  if (pull) {
    var pullBatchSize = pull.batchSize ? pull.batchSize : 20;
    replicationPrimitivesPull = {
      handler: function handler(lastPulledCheckpoint) {
        try {
          return Promise.resolve(pull.queryBuilder(lastPulledCheckpoint, pullBatchSize)).then(function (pullGraphQL) {
            return Promise.resolve(mutateableClientState.client.query(pullGraphQL.query, pullGraphQL.variables)).then(function (result) {
              function _temp2() {
                var docsData = data.documents;
                var newCheckpoint = data.checkpoint;
                return {
                  documents: docsData,
                  checkpoint: newCheckpoint
                };
              }
              if (result.errors) {
                throw result.errors;
              }
              var dataPath = pull.dataPath || ['data', Object.keys(result.data)[0]];
              var data = _objectPath["default"].get(result, dataPath);
              var _temp = function () {
                if (pull.responseModifier) {
                  return Promise.resolve(pull.responseModifier(data, 'handler', lastPulledCheckpoint)).then(function (_pull$responseModifie) {
                    data = _pull$responseModifie;
                  });
                }
              }();
              return _temp && _temp.then ? _temp.then(_temp2) : _temp2(_temp);
            });
          });
        } catch (e) {
          return Promise.reject(e);
        }
      },
      batchSize: pull.batchSize,
      modifier: pull.modifier,
      stream$: pullStream$.asObservable()
    };
  }
  var replicationPrimitivesPush;
  if (push) {
    replicationPrimitivesPush = {
      handler: function handler(rows) {
        try {
          return Promise.resolve(push.queryBuilder(rows)).then(function (pushObj) {
            return Promise.resolve(mutateableClientState.client.query(pushObj.query, pushObj.variables)).then(function (result) {
              if (result.errors) {
                throw result.errors;
              }
              var dataPath = Object.keys(result.data)[0];
              var data = _objectPath["default"].get(result.data, dataPath);
              return data;
            });
          });
        } catch (e) {
          return Promise.reject(e);
        }
      },
      batchSize: push.batchSize,
      modifier: push.modifier
    };
  }
  var graphqlReplicationState = new RxGraphQLReplicationState(url, mutateableClientState, _helper.GRAPHQL_REPLICATION_PLUGIN_IDENTITY_PREFIX + (0, _util.fastUnsecureHash)(url.http ? url.http : url.ws), collection, deletedField, replicationPrimitivesPull, replicationPrimitivesPush, live, retryTime, autoStart);
  var mustUseSocket = url.ws && pull && pull.streamQueryBuilder && live;
  var startBefore = graphqlReplicationState.start.bind(graphqlReplicationState);
  graphqlReplicationState.start = function () {
    if (mustUseSocket) {
      var wsClient = (0, _graphqlWebsocket.getGraphQLWebSocket)((0, _util.ensureNotFalsy)(url.ws));
      wsClient.on('connected', function () {
        pullStream$.next('RESYNC');
      });
      var query = (0, _util.ensureNotFalsy)(pull.streamQueryBuilder)(mutateableClientState.headers);
      wsClient.subscribe(query, {
        next: function (streamResponse) {
          try {
            var _temp5 = function _temp5() {
              pullStream$.next(_data);
            };
            var firstField = Object.keys(streamResponse.data)[0];
            var _data = streamResponse.data[firstField];
            var _temp6 = function () {
              if (pull.responseModifier) {
                return Promise.resolve(pull.responseModifier(_data, 'stream')).then(function (_pull$responseModifie2) {
                  _data = _pull$responseModifie2;
                });
              }
            }();
            return Promise.resolve(_temp6 && _temp6.then ? _temp6.then(_temp5) : _temp5(_temp6));
          } catch (e) {
            return Promise.reject(e);
          }
        },
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
      (0, _graphqlWebsocket.removeGraphQLWebSocketRef)((0, _util.ensureNotFalsy)(url.ws));
    }
    return cancelBefore();
  };
  (0, _replication.startReplicationOnLeaderShip)(waitForLeadership, graphqlReplicationState);
  return graphqlReplicationState;
}
var RxDBReplicationGraphQLPlugin = {
  name: 'replication-graphql',
  init: function init() {
    (0, _index.addRxPlugin)(_leaderElection.RxDBLeaderElectionPlugin);
  },
  rxdb: true,
  prototypes: {
    RxCollection: function RxCollection(proto) {
      proto.syncGraphQL = syncGraphQL;
    }
  }
};
exports.RxDBReplicationGraphQLPlugin = RxDBReplicationGraphQLPlugin;
//# sourceMappingURL=index.js.map