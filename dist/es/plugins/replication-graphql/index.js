import _inheritsLoose from "@babel/runtime/helpers/inheritsLoose";
/**
 * this plugin adds the RxCollection.syncGraphQl()-function to rxdb
 * you can use it to sync collections with a remote graphql endpoint.
 */
import { ensureNotFalsy, fastUnsecureHash, getProperty } from '../../plugins/utils';
import { graphQLRequest as _graphQLRequest, GRAPHQL_REPLICATION_PLUGIN_IDENTITY_PREFIX } from './helper';
import { RxDBLeaderElectionPlugin } from '../leader-election';
import { RxReplicationState, startReplicationOnLeaderShip } from '../replication';
import { addRxPlugin } from '../../index';
import { removeGraphQLWebSocketRef, getGraphQLWebSocket } from './graphql-websocket';
import { Subject } from 'rxjs';
export var RxGraphQLReplicationState = /*#__PURE__*/function (_RxReplicationState) {
  _inheritsLoose(RxGraphQLReplicationState, _RxReplicationState);
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
    return _graphQLRequest(ensureNotFalsy(this.url.http), this.clientState, queryParams);
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
  retryTime = 1000 * 5,
  // in ms
  autoStart = true
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
        var dataPath = pull.dataPath || ['data', Object.keys(result.data)[0]];
        var data = getProperty(result, dataPath);
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
        var data = getProperty(result.data, dataPath);
        return data;
      },
      batchSize: push.batchSize,
      modifier: push.modifier
    };
  }
  var graphqlReplicationState = new RxGraphQLReplicationState(url, mutateableClientState, GRAPHQL_REPLICATION_PLUGIN_IDENTITY_PREFIX + fastUnsecureHash(url.http ? url.http : url.ws), collection, deletedField, replicationPrimitivesPull, replicationPrimitivesPush, live, retryTime, autoStart);
  var mustUseSocket = url.ws && pull && pull.streamQueryBuilder && live;
  var startBefore = graphqlReplicationState.start.bind(graphqlReplicationState);
  graphqlReplicationState.start = () => {
    if (mustUseSocket) {
      var wsClient = getGraphQLWebSocket(ensureNotFalsy(url.ws));
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
    pullStream$.complete();
    if (mustUseSocket) {
      removeGraphQLWebSocketRef(ensureNotFalsy(url.ws));
    }
    return cancelBefore();
  };
  startReplicationOnLeaderShip(waitForLeadership, graphqlReplicationState);
  return graphqlReplicationState;
}
export * from './helper';
export * from './graphql-schema-from-rx-schema';
export * from './query-builder-from-rx-schema';
export * from './graphql-websocket';
//# sourceMappingURL=index.js.map