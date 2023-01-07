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
var _inheritsLoose2 = _interopRequireDefault(require("@babel/runtime/helpers/inheritsLoose"));
var _utils = require("../../plugins/utils");
var _helper = require("./helper");
Object.keys(_helper).forEach(function (key) {
  if (key === "default" || key === "__esModule") return;
  if (Object.prototype.hasOwnProperty.call(_exportNames, key)) return;
  if (key in exports && exports[key] === _helper[key]) return;
  Object.defineProperty(exports, key, {
    enumerable: true,
    get: function () {
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
    get: function () {
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
    get: function () {
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
    get: function () {
      return _queryBuilderFromRxSchema[key];
    }
  });
});
/**
 * this plugin adds the RxCollection.syncGraphQl()-function to rxdb
 * you can use it to sync collections with a remote graphql endpoint.
 */
var RxGraphQLReplicationState = /*#__PURE__*/function (_RxReplicationState) {
  (0, _inheritsLoose2.default)(RxGraphQLReplicationState, _RxReplicationState);
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
function replicateGraphQL({
  collection,
  url,
  headers = {},
  credentials,
  deletedField = '_deleted',
  waitForLeadership = true,
  pull,
  push,
  live = true,
  retryTime = 1000 * 5,
  // in ms
  autoStart = true
}) {
  (0, _index.addRxPlugin)(_leaderElection.RxDBLeaderElectionPlugin);
  /**
   * We use this object to store the GraphQL client
   * so we can later swap out the client inside of the replication handlers.
   */
  var mutateableClientState = {
    headers,
    credentials
  };
  var pullStream$ = new _rxjs.Subject();
  var replicationPrimitivesPull;
  if (pull) {
    var pullBatchSize = pull.batchSize ? pull.batchSize : 20;
    replicationPrimitivesPull = {
      async handler(lastPulledCheckpoint) {
        var pullGraphQL = await pull.queryBuilder(lastPulledCheckpoint, pullBatchSize);
        var result = await graphqlReplicationState.graphQLRequest(pullGraphQL);
        if (result.errors) {
          throw result.errors;
        }
        var dataPath = pull.dataPath || ['data', Object.keys(result.data)[0]];
        var data = (0, _utils.getProperty)(result, dataPath);
        if (pull.responseModifier) {
          data = await pull.responseModifier(data, 'handler', lastPulledCheckpoint);
        }
        var docsData = data.documents;
        var newCheckpoint = data.checkpoint;
        return {
          documents: docsData,
          checkpoint: newCheckpoint
        };
      },
      batchSize: pull.batchSize,
      modifier: pull.modifier,
      stream$: pullStream$.asObservable()
    };
  }
  var replicationPrimitivesPush;
  if (push) {
    replicationPrimitivesPush = {
      async handler(rows) {
        var pushObj = await push.queryBuilder(rows);
        var result = await graphqlReplicationState.graphQLRequest(pushObj);
        if (result.errors) {
          throw result.errors;
        }
        var dataPath = Object.keys(result.data)[0];
        var data = (0, _utils.getProperty)(result.data, dataPath);
        return data;
      },
      batchSize: push.batchSize,
      modifier: push.modifier
    };
  }
  var graphqlReplicationState = new RxGraphQLReplicationState(url, mutateableClientState, _helper.GRAPHQL_REPLICATION_PLUGIN_IDENTITY_PREFIX + (0, _utils.fastUnsecureHash)(url.http ? url.http : url.ws), collection, deletedField, replicationPrimitivesPull, replicationPrimitivesPush, live, retryTime, autoStart);
  var mustUseSocket = url.ws && pull && pull.streamQueryBuilder && live;
  var startBefore = graphqlReplicationState.start.bind(graphqlReplicationState);
  graphqlReplicationState.start = () => {
    if (mustUseSocket) {
      var wsClient = (0, _graphqlWebsocket.getGraphQLWebSocket)((0, _utils.ensureNotFalsy)(url.ws));
      wsClient.on('connected', () => {
        pullStream$.next('RESYNC');
      });
      var query = (0, _utils.ensureNotFalsy)(pull.streamQueryBuilder)(mutateableClientState.headers);
      wsClient.subscribe(query, {
        next: async streamResponse => {
          var firstField = Object.keys(streamResponse.data)[0];
          var data = streamResponse.data[firstField];
          if (pull.responseModifier) {
            data = await pull.responseModifier(data, 'stream');
          }
          pullStream$.next(data);
        },
        error: error => {
          pullStream$.error(error);
        },
        complete: () => {
          pullStream$.complete();
        }
      });
    }
    return startBefore();
  };
  var cancelBefore = graphqlReplicationState.cancel.bind(graphqlReplicationState);
  graphqlReplicationState.cancel = () => {
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