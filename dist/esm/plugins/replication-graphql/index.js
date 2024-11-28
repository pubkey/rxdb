import _inheritsLoose from "@babel/runtime/helpers/inheritsLoose";
/**
 * this plugin adds the RxCollection.syncGraphQl()-function to rxdb
 * you can use it to sync collections with a remote graphql endpoint.
 */
import { ensureNotFalsy, flatClone } from "../../plugins/utils/index.js";
import { getDataFromResult, graphQLRequest as _graphQLRequest } from "./helper.js";
import { RxDBLeaderElectionPlugin } from "../leader-election/index.js";
import { RxReplicationState, startReplicationOnLeaderShip } from "../replication/index.js";
import { addRxPlugin } from "../../index.js";
import { removeGraphQLWebSocketRef, getGraphQLWebSocket } from "./graphql-websocket.js";
import { Subject } from 'rxjs';
export var RxGraphQLReplicationState = /*#__PURE__*/function (_RxReplicationState) {
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
  _inheritsLoose(RxGraphQLReplicationState, _RxReplicationState);
  var _proto = RxGraphQLReplicationState.prototype;
  _proto.setHeaders = function setHeaders(headers) {
    this.clientState.headers = flatClone(headers);
  };
  _proto.setCredentials = function setCredentials(credentials) {
    this.clientState.credentials = credentials;
  };
  _proto.graphQLRequest = function graphQLRequest(queryParams) {
    return _graphQLRequest(this.customFetch ?? fetch, ensureNotFalsy(this.url.http), this.clientState, queryParams);
  };
  return RxGraphQLReplicationState;
}(RxReplicationState);
export function replicateGraphQL({
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
  addRxPlugin(RxDBLeaderElectionPlugin);
  /**
   * We use this object to store the GraphQL client
   * so we can later swap out the client inside of the replication handlers.
   */
  var mutateableClientState = {
    headers,
    credentials
  };
  var pullStream$ = new Subject();
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
        var data = getDataFromResult(result, pull.dataPath);
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
        var data = getDataFromResult(result, push.dataPath);
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
      var wsClient = getGraphQLWebSocket(ensureNotFalsy(url.ws), httpHeaders, pull.wsOptions);
      wsClient.on('connected', () => {
        pullStream$.next('RESYNC');
      });
      var query = ensureNotFalsy(pull.streamQueryBuilder)(mutateableClientState.headers);
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
        removeGraphQLWebSocketRef(ensureNotFalsy(url.ws));
      }
    }
    return cancelBefore();
  };
  startReplicationOnLeaderShip(waitForLeadership, graphqlReplicationState);
  return graphqlReplicationState;
}
export * from "./helper.js";
export * from "./graphql-schema-from-rx-schema.js";
export * from "./query-builder-from-rx-schema.js";
export * from "./graphql-websocket.js";
//# sourceMappingURL=index.js.map