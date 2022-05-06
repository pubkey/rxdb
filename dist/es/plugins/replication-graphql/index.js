/**
 * this plugin adds the RxCollection.syncGraphQl()-function to rxdb
 * you can use it to sync collections with remote graphql endpoint
 */
import GraphQLClient from 'graphql-client';
import objectPath from 'object-path';
import { flatClone } from '../../util';
import { hash } from '../../util';
import { DEFAULT_MODIFIER, GRAPHQL_REPLICATION_PLUGIN_IDENTITY_PREFIX } from './helper';
import { RxDBLeaderElectionPlugin } from '../leader-election';
import { overwritable } from '../../overwritable';
import { replicateRxCollection } from '../replication';
import { RxReplicationPullError, RxReplicationPushError } from '../replication/rx-replication-error';
import { newRxError } from '../../rx-error';
import { addRxPlugin } from '../../index';
export var RxGraphQLReplicationState = /*#__PURE__*/function () {
  function RxGraphQLReplicationState(
  /**
   * The GraphQL replication uses the replication primitives plugin
   * internally. So we need that replicationState.
   */
  replicationState, collection, url, clientState) {
    this.send$ = undefined;
    this.error$ = undefined;
    this.canceled$ = undefined;
    this.active$ = undefined;
    this.replicationState = replicationState;
    this.collection = collection;
    this.url = url;
    this.clientState = clientState;
    // map observables from replicationState to this
    this.received$ = replicationState.subjects.received.asObservable();
    this.send$ = replicationState.subjects.send.asObservable();
    this.error$ = replicationState.subjects.error.asObservable();
    this.canceled$ = replicationState.subjects.canceled.asObservable();
    this.active$ = replicationState.subjects.active.asObservable();
    this.initialReplicationComplete$ = replicationState.initialReplicationComplete$;
  }

  var _proto = RxGraphQLReplicationState.prototype;

  _proto.isStopped = function isStopped() {
    return this.replicationState.isStopped();
  };

  _proto.awaitInitialReplication = function awaitInitialReplication() {
    return this.replicationState.awaitInitialReplication();
  };

  _proto.run = function run() {
    var retryOnFail = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : true;
    return this.replicationState.run(retryOnFail);
  };

  _proto.notifyAboutRemoteChange = function notifyAboutRemoteChange() {
    return this.replicationState.notifyAboutRemoteChange();
  };

  _proto.cancel = function cancel() {
    return this.replicationState.cancel();
  };

  _proto.setHeaders = function setHeaders(headers) {
    this.clientState.client = GraphQLClient({
      url: this.url,
      headers: headers
    });
  };

  return RxGraphQLReplicationState;
}();
export function syncGraphQL(_ref) {
  var url = _ref.url,
      _ref$headers = _ref.headers,
      headers = _ref$headers === void 0 ? {} : _ref$headers,
      _ref$waitForLeadershi = _ref.waitForLeadership,
      waitForLeadership = _ref$waitForLeadershi === void 0 ? true : _ref$waitForLeadershi,
      pull = _ref.pull,
      push = _ref.push,
      _ref$deletedFlag = _ref.deletedFlag,
      deletedFlag = _ref$deletedFlag === void 0 ? '_deleted' : _ref$deletedFlag,
      _ref$live = _ref.live,
      live = _ref$live === void 0 ? false : _ref$live,
      _ref$liveInterval = _ref.liveInterval,
      liveInterval = _ref$liveInterval === void 0 ? 1000 * 10 : _ref$liveInterval,
      _ref$retryTime = _ref.retryTime,
      retryTime = _ref$retryTime === void 0 ? 1000 * 5 : _ref$retryTime,
      _ref$autoStart = _ref.autoStart,
      autoStart = _ref$autoStart === void 0 ? true : _ref$autoStart;
  var collection = this; // fill in defaults for pull & push

  var pullModifier = pull && pull.modifier ? pull.modifier : DEFAULT_MODIFIER;
  var pushModifier = push && push.modifier ? push.modifier : DEFAULT_MODIFIER;
  /**
   * We use this object to store the GraphQL client
   * so we can later swap out the client inside of the replication handlers.
   */

  var mutateableClientState = {
    client: GraphQLClient({
      url: url,
      headers: headers
    })
  };
  var replicationPrimitivesPull;

  if (pull) {
    replicationPrimitivesPull = {
      handler: function handler(latestPulledDocument) {
        try {
          return Promise.resolve(pull.queryBuilder(latestPulledDocument)).then(function (pullGraphQL) {
            return Promise.resolve(mutateableClientState.client.query(pullGraphQL.query, pullGraphQL.variables)).then(function (result) {
              if (result.errors) {
                if (typeof result.errors === 'string') {
                  throw new RxReplicationPullError(result.errors, latestPulledDocument);
                } else {
                  throw new RxReplicationPullError(overwritable.tunnelErrorMessage('GQL2'), latestPulledDocument, result.errors);
                }
              }

              var dataPath = pull.dataPath || ['data', Object.keys(result.data)[0]];
              var docsData = objectPath.get(result, dataPath); // optimization shortcut, do not proceed if there are no documents.

              if (docsData.length === 0) {
                return {
                  documents: [],
                  hasMoreDocuments: false
                };
              }

              var hasMoreDocuments = false;

              if (docsData.length > pull.batchSize) {
                throw newRxError('GQL3', {
                  args: {
                    pull: pull,
                    documents: docsData
                  }
                });
              } else if (docsData.length === pull.batchSize) {
                hasMoreDocuments = true;
              }

              return Promise.resolve(Promise.all(docsData.map(function (doc) {
                try {
                  // swap out deleted flag
                  if (deletedFlag !== '_deleted') {
                    var isDeleted = !!doc[deletedFlag];
                    doc._deleted = isDeleted;
                    delete doc[deletedFlag];
                  }

                  return Promise.resolve(pullModifier(doc));
                } catch (e) {
                  return Promise.reject(e);
                }
              }))).then(function (_Promise$all) {
                var modified = _Promise$all.filter(function (doc) {
                  return !!doc;
                });

                return {
                  documents: modified,
                  hasMoreDocuments: hasMoreDocuments
                };
              });
            });
          });
        } catch (e) {
          return Promise.reject(e);
        }
      }
    };
  }

  var replicationPrimitivesPush;

  if (push) {
    replicationPrimitivesPush = {
      batchSize: push.batchSize,
      handler: function handler(docs) {
        try {
          return Promise.resolve(Promise.all(docs.map(function (doc) {
            try {
              var changedDoc = flatClone(doc); // swap out deleted flag

              if (deletedFlag !== '_deleted') {
                var isDeleted = !!doc._deleted;
                changedDoc[deletedFlag] = isDeleted;
                delete changedDoc._deleted;
              }

              return Promise.resolve(pushModifier(changedDoc)).then(function (_pushModifier) {
                changedDoc = _pushModifier;
                return changedDoc ? changedDoc : null;
              });
            } catch (e) {
              return Promise.reject(e);
            }
          }))).then(function (modifiedPushDocs) {
            /**
             * The push modifier might have returned null instead of a document
             * which means that these documents must not be pushed and filtered out.
             */
            modifiedPushDocs = modifiedPushDocs.filter(function (doc) {
              return !!doc;
            });
            /**
             * Optimization shortcut.
             * If we have no more documents to push,
             * because all were filtered out by the modifier,
             * we can quit here.
             */

            if (modifiedPushDocs.length === 0) {
              return;
            }

            return Promise.resolve(push.queryBuilder(modifiedPushDocs)).then(function (pushObj) {
              return Promise.resolve(mutateableClientState.client.query(pushObj.query, pushObj.variables)).then(function (result) {
                if (result.errors) {
                  if (typeof result.errors === 'string') {
                    throw new RxReplicationPushError(result.errors, docs);
                  } else {
                    throw new RxReplicationPushError(overwritable.tunnelErrorMessage('GQL4'), docs, result.errors);
                  }
                }
              });
            });
          });
        } catch (e) {
          return Promise.reject(e);
        }
      }
    };
  }

  var replicationState = replicateRxCollection({
    replicationIdentifier: GRAPHQL_REPLICATION_PLUGIN_IDENTITY_PREFIX + hash(url),
    collection: collection,
    deletedFlag: deletedFlag,
    pull: replicationPrimitivesPull,
    push: replicationPrimitivesPush,
    waitForLeadership: waitForLeadership,
    live: live,
    liveInterval: liveInterval,
    retryTime: retryTime,
    autoStart: autoStart
  });
  var graphqlReplicationState = new RxGraphQLReplicationState(replicationState, collection, url, mutateableClientState);
  return graphqlReplicationState;
}
export * from './helper';
export * from './graphql-schema-from-rx-schema';
export * from './query-builder-from-rx-schema';
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