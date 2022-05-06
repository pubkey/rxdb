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

var _overwritable = require("../../overwritable");

var _replication = require("../replication");

var _rxReplicationError = require("../replication/rx-replication-error");

var _rxError = require("../../rx-error");

var _index = require("../../index");

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
 */
var RxGraphQLReplicationState = /*#__PURE__*/function () {
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
    this.clientState.client = (0, _graphqlClient["default"])({
      url: this.url,
      headers: headers
    });
  };

  return RxGraphQLReplicationState;
}();

exports.RxGraphQLReplicationState = RxGraphQLReplicationState;

function syncGraphQL(_ref) {
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

  var pullModifier = pull && pull.modifier ? pull.modifier : _helper.DEFAULT_MODIFIER;
  var pushModifier = push && push.modifier ? push.modifier : _helper.DEFAULT_MODIFIER;
  /**
   * We use this object to store the GraphQL client
   * so we can later swap out the client inside of the replication handlers.
   */

  var mutateableClientState = {
    client: (0, _graphqlClient["default"])({
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
                  throw new _rxReplicationError.RxReplicationPullError(result.errors, latestPulledDocument);
                } else {
                  throw new _rxReplicationError.RxReplicationPullError(_overwritable.overwritable.tunnelErrorMessage('GQL2'), latestPulledDocument, result.errors);
                }
              }

              var dataPath = pull.dataPath || ['data', Object.keys(result.data)[0]];

              var docsData = _objectPath["default"].get(result, dataPath); // optimization shortcut, do not proceed if there are no documents.


              if (docsData.length === 0) {
                return {
                  documents: [],
                  hasMoreDocuments: false
                };
              }

              var hasMoreDocuments = false;

              if (docsData.length > pull.batchSize) {
                throw (0, _rxError.newRxError)('GQL3', {
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
              var changedDoc = (0, _util.flatClone)(doc); // swap out deleted flag

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
                    throw new _rxReplicationError.RxReplicationPushError(result.errors, docs);
                  } else {
                    throw new _rxReplicationError.RxReplicationPushError(_overwritable.overwritable.tunnelErrorMessage('GQL4'), docs, result.errors);
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

  var replicationState = (0, _replication.replicateRxCollection)({
    replicationIdentifier: _helper.GRAPHQL_REPLICATION_PLUGIN_IDENTITY_PREFIX + (0, _util.hash)(url),
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