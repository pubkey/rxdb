"use strict";

var _interopRequireDefault = require("@babel/runtime/helpers/interopRequireDefault");
Object.defineProperty(exports, "__esModule", {
  value: true
});
var _exportNames = {
  RxCouchDBReplicationState: true,
  replicateCouchDB: true
};
exports.RxCouchDBReplicationState = void 0;
exports.replicateCouchDB = replicateCouchDB;
var _inheritsLoose2 = _interopRequireDefault(require("@babel/runtime/helpers/inheritsLoose"));
var _utils = require("../../plugins/utils");
var _leaderElection = require("../leader-election");
var _replication = require("../replication");
var _index = require("../../index");
var _rxjs = require("rxjs");
var _couchdbHelper = require("./couchdb-helper");
Object.keys(_couchdbHelper).forEach(function (key) {
  if (key === "default" || key === "__esModule") return;
  if (Object.prototype.hasOwnProperty.call(_exportNames, key)) return;
  if (key in exports && exports[key] === _couchdbHelper[key]) return;
  Object.defineProperty(exports, key, {
    enumerable: true,
    get: function () {
      return _couchdbHelper[key];
    }
  });
});
var _couchdbTypes = require("./couchdb-types");
Object.keys(_couchdbTypes).forEach(function (key) {
  if (key === "default" || key === "__esModule") return;
  if (Object.prototype.hasOwnProperty.call(_exportNames, key)) return;
  if (key in exports && exports[key] === _couchdbTypes[key]) return;
  Object.defineProperty(exports, key, {
    enumerable: true,
    get: function () {
      return _couchdbTypes[key];
    }
  });
});
/**
 * This plugin can be used to sync collections with a remote CouchDB endpoint.
 */
var RxCouchDBReplicationState = /*#__PURE__*/function (_RxReplicationState) {
  (0, _inheritsLoose2.default)(RxCouchDBReplicationState, _RxReplicationState);
  function RxCouchDBReplicationState(url, fetch, replicationIdentifierHash, collection, pull, push, live = true, retryTime = 1000 * 5, autoStart = true) {
    var _this;
    _this = _RxReplicationState.call(this, replicationIdentifierHash, collection, '_deleted', pull, push, live, retryTime, autoStart) || this;
    _this.url = url;
    _this.fetch = fetch;
    _this.replicationIdentifierHash = replicationIdentifierHash;
    _this.collection = collection;
    _this.pull = pull;
    _this.push = push;
    _this.live = live;
    _this.retryTime = retryTime;
    _this.autoStart = autoStart;
    return _this;
  }
  return RxCouchDBReplicationState;
}(_replication.RxReplicationState);
exports.RxCouchDBReplicationState = RxCouchDBReplicationState;
function replicateCouchDB(options) {
  var collection = options.collection;
  (0, _index.addRxPlugin)(_leaderElection.RxDBLeaderElectionPlugin);
  options = (0, _utils.flatClone)(options);
  if (!options.url.endsWith('/')) {
    options.url = options.url + '/';
  }
  options.waitForLeadership = typeof options.waitForLeadership === 'undefined' ? true : options.waitForLeadership;
  var pullStream$ = new _rxjs.Subject();
  var replicationPrimitivesPull;
  if (options.pull) {
    replicationPrimitivesPull = {
      async handler(lastPulledCheckpoint, batchSize) {
        /**
         * @link https://docs.couchdb.org/en/3.2.2-docs/api/database/changes.html
         */
        var url = options.url + '_changes?' + (0, _couchdbHelper.mergeUrlQueryParams)({
          style: 'all_docs',
          feed: 'normal',
          include_docs: true,
          since: lastPulledCheckpoint ? lastPulledCheckpoint.sequence : 0,
          heartbeat: options.pull && options.pull.heartbeat ? options.pull.heartbeat : 60000,
          limit: batchSize,
          seq_interval: batchSize
        });
        var response = await replicationState.fetch(url);
        var jsonResponse = await response.json();
        var documents = jsonResponse.results.map(row => (0, _couchdbHelper.couchDBDocToRxDocData)(collection.schema.primaryPath, (0, _utils.ensureNotFalsy)(row.doc)));
        return {
          documents,
          checkpoint: {
            sequence: jsonResponse.last_seq
          }
        };
      },
      batchSize: (0, _utils.ensureNotFalsy)(options.pull).batchSize,
      modifier: (0, _utils.ensureNotFalsy)(options.pull).modifier,
      stream$: pullStream$.asObservable()
    };
  }
  var replicationPrimitivesPush;
  if (options.push) {
    replicationPrimitivesPush = {
      async handler(rows) {
        /**
         * @link https://docs.couchdb.org/en/3.2.2-docs/api/database/bulk-api.html#db-bulk-docs
         */
        var url = options.url + '_bulk_docs?' + (0, _couchdbHelper.mergeUrlQueryParams)({});
        var body = {
          docs: rows.map(row => {
            var sendDoc = (0, _utils.flatClone)(row.newDocumentState);
            if (row.assumedMasterState) {
              sendDoc._rev = (0, _utils.ensureNotFalsy)(row.assumedMasterState._rev);
            }
            return (0, _couchdbHelper.couchSwapPrimaryToId)(collection.schema.primaryPath, sendDoc);
          })
        };
        var response = await replicationState.fetch(url, {
          method: 'POST',
          headers: {
            'content-type': 'application/json'
          },
          body: JSON.stringify(body)
        });
        var responseJson = await response.json();
        var conflicts = responseJson.filter(row => {
          var isConflict = row.error === 'conflict';
          if (!row.ok && !isConflict) {
            throw (0, _index.newRxError)('SNH', {
              args: {
                row
              }
            });
          }
          return isConflict;
        });
        if (conflicts.length === 0) {
          return [];
        }
        var getConflictDocsUrl = options.url + '_all_docs?' + (0, _couchdbHelper.mergeUrlQueryParams)({
          include_docs: true,
          keys: JSON.stringify(conflicts.map(c => c.id))
        });
        var conflictResponse = await replicationState.fetch(getConflictDocsUrl);
        var conflictResponseJson = await conflictResponse.json();
        var conflictDocsMasterState = conflictResponseJson.rows.map(r => (0, _couchdbHelper.couchDBDocToRxDocData)(collection.schema.primaryPath, r.doc));
        return conflictDocsMasterState;
      },
      batchSize: options.push.batchSize,
      modifier: options.push.modifier
    };
  }
  var replicationState = new RxCouchDBReplicationState(options.url, options.fetch ? options.fetch : (0, _couchdbHelper.getDefaultFetch)(), _couchdbHelper.COUCHDB_NEW_REPLICATION_PLUGIN_IDENTITY_PREFIX + (0, _utils.fastUnsecureHash)(options.url), collection, replicationPrimitivesPull, replicationPrimitivesPush, options.live, options.retryTime, options.autoStart);

  /**
   * Use long polling to get live changes for the pull.stream$
   */
  if (options.live && options.pull) {
    var startBefore = replicationState.start.bind(replicationState);
    replicationState.start = () => {
      var since = 'now';
      var batchSize = options.pull && options.pull.batchSize ? options.pull.batchSize : 20;
      (async () => {
        while (!replicationState.isStopped()) {
          var _url = options.url + '_changes?' + (0, _couchdbHelper.mergeUrlQueryParams)({
            style: 'all_docs',
            feed: 'longpoll',
            since,
            include_docs: true,
            heartbeat: options.pull && options.pull.heartbeat ? options.pull.heartbeat : 60000,
            limit: batchSize,
            seq_interval: batchSize
          });
          var jsonResponse = void 0;
          try {
            jsonResponse = await (await replicationState.fetch(_url)).json();
          } catch (err) {
            pullStream$.error((0, _index.newRxError)('RC_STREAM', {
              args: {
                url: _url
              },
              error: (0, _utils.errorToPlainJson)(err)
            }));
            // await next tick here otherwise we could go in to a 100% CPU blocking cycle.
            await collection.promiseWait(0);
            continue;
          }
          var documents = jsonResponse.results.map(row => (0, _couchdbHelper.couchDBDocToRxDocData)(collection.schema.primaryPath, (0, _utils.ensureNotFalsy)(row.doc)));
          since = jsonResponse.last_seq;
          pullStream$.next({
            documents,
            checkpoint: {
              sequence: jsonResponse.last_seq
            }
          });
        }
      })();
      return startBefore();
    };
  }
  (0, _replication.startReplicationOnLeaderShip)(options.waitForLeadership, replicationState);
  return replicationState;
}
//# sourceMappingURL=index.js.map