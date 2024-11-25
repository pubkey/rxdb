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
var _index = require("../../plugins/utils/index.js");
var _helper = require("./helper.js");
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
var _index2 = require("../leader-election/index.js");
var _index3 = require("../replication/index.js");
var _index4 = require("../../index.js");
var _graphqlWebsocket = require("./graphql-websocket.js");
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
var _graphqlSchemaFromRxSchema = require("./graphql-schema-from-rx-schema.js");
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
var _queryBuilderFromRxSchema = require("./query-builder-from-rx-schema.js");
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
var RxGraphQLReplicationState = exports.RxGraphQLReplicationState = /*#__PURE__*/function (_RxReplicationState) {
  function RxGraphQLReplicationState(url, clientState, replicationIdentifier, collection, deletedField, pull, push, live, retryTime, autoStart, customFetch) {
    var _this;
    _this = _RxReplicationState.call(this, replicationIdentifier, collection, deletedField, pull, push, live, retryTime, autoStart) || this;
    _this.url = url;
    _this.clientState = clientState;
    _this.replicationIdentifier = replicationIdentifier;
    _this.collection = collection;
    _this.deletedField = deletedField;
    _this.pull = pull;
    _this.push = push;
    _this.live = live;
    _this.retryTime = retryTime;
    _this.autoStart = autoStart;
    _this.customFetch = customFetch;
    return _this;
  }
  (0, _inheritsLoose2.default)(RxGraphQLReplicationState, _RxReplicationState);
  var _proto = RxGraphQLReplicationState.prototype;
  _proto.setHeaders = function setHeaders(headers) {
    this.clientState.headers = (0, _index.flatClone)(headers);
  };
  _proto.setCredentials = function setCredentials(credentials) {
    this.clientState.credentials = credentials;
  };
  _proto.graphQLRequest = function graphQLRequest(queryParams) {
    return (0, _helper.graphQLRequest)(this.customFetch ?? fetch, (0, _index.ensureNotFalsy)(this.url.http), this.clientState, queryParams);
  };
  return RxGraphQLReplicationState;
}(_index3.RxReplicationState);
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
  fetch: customFetch,
  retryTime = 1000 * 5,
  // in ms
  autoStart = true,
  replicationIdentifier
}) {
  (0, _index4.addRxPlugin)(_index2.RxDBLeaderElectionPlugin);
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
        var data = (0, _helper.getDataFromResult)(result, pull.dataPath);
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
        var data = (0, _helper.getDataFromResult)(result, push.dataPath);
        if (push.responseModifier) {
          data = await push.responseModifier(data);
        }
        return data;
      },
      batchSize: push.batchSize,
      modifier: push.modifier
    };
  }
  var graphqlReplicationState = new RxGraphQLReplicationState(url, mutateableClientState, replicationIdentifier, collection, deletedField, replicationPrimitivesPull, replicationPrimitivesPush, live, retryTime, autoStart, customFetch);
  var mustUseSocket = url.ws && pull && pull.streamQueryBuilder && live;
  var startBefore = graphqlReplicationState.start.bind(graphqlReplicationState);
  graphqlReplicationState.start = () => {
    if (mustUseSocket) {
      var httpHeaders = pull.includeWsHeaders ? mutateableClientState.headers : undefined;
      var wsClient = (0, _graphqlWebsocket.getGraphQLWebSocket)((0, _index.ensureNotFalsy)(url.ws), httpHeaders, pull.wsOptions);
      wsClient.on('connected', () => {
        pullStream$.next('RESYNC');
      });
      var query = (0, _index.ensureNotFalsy)(pull.streamQueryBuilder)(mutateableClientState.headers);
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
    if (!graphqlReplicationState.isStopped()) {
      pullStream$.complete();
      if (mustUseSocket) {
        (0, _graphqlWebsocket.removeGraphQLWebSocketRef)((0, _index.ensureNotFalsy)(url.ws));
      }
    }
    return cancelBefore();
  };
  (0, _index3.startReplicationOnLeaderShip)(waitForLeadership, graphqlReplicationState);
  return graphqlReplicationState;
}
//# sourceMappingURL=index.js.map