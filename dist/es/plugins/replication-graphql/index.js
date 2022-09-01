import _inheritsLoose from "@babel/runtime/helpers/inheritsLoose";

/**
 * this plugin adds the RxCollection.syncGraphQl()-function to rxdb
 * you can use it to sync collections with remote graphql endpoint
 */
import GraphQLClient from 'graphql-client';
import objectPath from 'object-path';
import { ensureNotFalsy, fastUnsecureHash } from '../../util';
import { GRAPHQL_REPLICATION_PLUGIN_IDENTITY_PREFIX } from './helper';
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
    this.clientState.client = GraphQLClient({
      url: this.url.http,
      headers: headers
    });
  };

  return RxGraphQLReplicationState;
}(RxReplicationState);
export function syncGraphQL(_ref) {
  var url = _ref.url,
      _ref$headers = _ref.headers,
      headers = _ref$headers === void 0 ? {} : _ref$headers,
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
    client: GraphQLClient({
      url: url.http,
      headers: headers
    })
  };
  var pullStream$ = new Subject();
  var replicationPrimitivesPull;

  if (pull) {
    var pullBatchSize = pull.batchSize ? pull.batchSize : 20;
    replicationPrimitivesPull = {
      handler: function handler(lastPulledCheckpoint) {
        try {
          return Promise.resolve(pull.queryBuilder(lastPulledCheckpoint, pullBatchSize)).then(function (pullGraphQL) {
            return Promise.resolve(mutateableClientState.client.query(pullGraphQL.query, pullGraphQL.variables)).then(function (result) {
              if (result.errors) {
                throw result.errors;
              }

              var dataPath = pull.dataPath || ['data', Object.keys(result.data)[0]];
              var data = objectPath.get(result, dataPath);
              var docsData = data.documents;
              var newCheckpoint = data.checkpoint;
              return {
                documents: docsData,
                checkpoint: newCheckpoint
              };
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
              var data = objectPath.get(result.data, dataPath);
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

  var graphqlReplicationState = new RxGraphQLReplicationState(url, mutateableClientState, GRAPHQL_REPLICATION_PLUGIN_IDENTITY_PREFIX + fastUnsecureHash(url.http ? url.http : url.ws), collection, deletedField, replicationPrimitivesPull, replicationPrimitivesPush, live, retryTime, autoStart);
  var mustUseSocket = url.ws && pull && pull.streamQueryBuilder && live;
  var startBefore = graphqlReplicationState.start.bind(graphqlReplicationState);

  graphqlReplicationState.start = function () {
    if (mustUseSocket) {
      var wsClient = getGraphQLWebSocket(ensureNotFalsy(url.ws));
      var clientRequest = wsClient.request(ensureNotFalsy(pull.streamQueryBuilder)(mutateableClientState.headers));
      clientRequest.subscribe({
        next: function next(data) {
          var firstField = Object.keys(data.data)[0];
          pullStream$.next(data.data[firstField]);
        },
        error: function error(_error) {
          pullStream$.error(_error);
        }
      });
      wsClient.onReconnected(function () {
        pullStream$.next('RESYNC');
      });
    }

    return startBefore();
  };

  var cancelBefore = graphqlReplicationState.cancel.bind(graphqlReplicationState);

  graphqlReplicationState.cancel = function () {
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
export var RxDBReplicationGraphQLPlugin = {
  name: 'replication-graphql',
  init: function init() {
    addRxPlugin(RxDBLeaderElectionPlugin);
  },
  rxdb: true,
  prototypes: {
    RxCollection: function RxCollection(proto) {
      proto.syncGraphQL = syncGraphQL;
    }
  }
};
//# sourceMappingURL=index.js.map