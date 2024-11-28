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
var _index = require("../../plugins/utils/index.js");
var _index2 = require("../leader-election/index.js");
var _index3 = require("../replication/index.js");
var _index4 = require("../../index.js");
var _rxjs = require("rxjs");
var _couchdbHelper = require("./couchdb-helper.js");
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
var _replicationHelper = require("../replication/replication-helper.js");
var _couchdbTypes = require("./couchdb-types.js");
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
var RxCouchDBReplicationState = exports.RxCouchDBReplicationState = /*#__PURE__*/function (_RxReplicationState) {
  function RxCouchDBReplicationState(url, fetch, replicationIdentifier, collection, pull, push, live = true, retryTime = 1000 * 5, autoStart = true) {
    var _this;
    _this = _RxReplicationState.call(this, replicationIdentifier, collection, '_deleted', pull, push, live, retryTime, autoStart) || this;
    _this.url = url;
    _this.fetch = fetch;
    _this.replicationIdentifier = replicationIdentifier;
    _this.collection = collection;
    _this.pull = pull;
    _this.push = push;
    _this.live = live;
    _this.retryTime = retryTime;
    _this.autoStart = autoStart;
    return _this;
  }
  (0, _inheritsLoose2.default)(RxCouchDBReplicationState, _RxReplicationState);
  return RxCouchDBReplicationState;
}(_index3.RxReplicationState);
function replicateCouchDB(options) {
  var collection = options.collection;
  var conflictHandler = collection.conflictHandler;
  (0, _index4.addRxPlugin)(_index2.RxDBLeaderElectionPlugin);
  var primaryPath = options.collection.schema.primaryPath;
  if (!options.url.endsWith('/')) {
    throw (0, _index4.newRxError)('RC_COUCHDB_1', {
      args: {
        collection: options.collection.name,
        url: options.url
      }
    });
  }
  options = (0, _index.flatClone)(options);
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
        if (!jsonResponse.results) {
          throw (0, _index4.newRxError)('RC_COUCHDB_2', {
            args: {
              jsonResponse
            }
          });
        }
        var documents = jsonResponse.results.map(row => (0, _couchdbHelper.couchDBDocToRxDocData)(collection.schema.primaryPath, (0, _index.ensureNotFalsy)(row.doc)));
        return {
          documents,
          checkpoint: {
            sequence: jsonResponse.last_seq
          }
        };
      },
      batchSize: (0, _index.ensureNotFalsy)(options.pull).batchSize,
      modifier: (0, _index.ensureNotFalsy)(options.pull).modifier,
      stream$: pullStream$.asObservable(),
      initialCheckpoint: options.pull.initialCheckpoint
    };
  }
  var replicationPrimitivesPush;
  if (options.push) {
    replicationPrimitivesPush = {
      async handler(rows) {
        var conflicts = [];
        var pushRowsById = new Map();
        rows.forEach(row => {
          var id = row.newDocumentState[primaryPath];
          pushRowsById.set(id, row);
        });

        /**
         * First get the current master state from the remote
         * to check for conflicts
         */
        var docsByIdResponse = await replicationState.fetch(options.url + '_all_docs?' + (0, _couchdbHelper.mergeUrlQueryParams)({}), {
          method: 'POST',
          headers: {
            'content-type': 'application/json'
          },
          body: JSON.stringify({
            keys: rows.map(row => row.newDocumentState[primaryPath]),
            include_docs: true,
            deleted: 'ok'
          })
        });
        var docsByIdRows = await docsByIdResponse.json();
        var nonConflictRows = [];
        var remoteRevById = new Map();
        await Promise.all(docsByIdRows.rows.map(async row => {
          if (!row.doc) {
            nonConflictRows.push((0, _index.getFromMapOrThrow)(pushRowsById, row.key));
            return;
          }
          var realMasterState = (0, _couchdbHelper.couchDBDocToRxDocData)(primaryPath, row.doc);
          var pushRow = (0, _index.getFromMapOrThrow)(pushRowsById, row.id);
          if (pushRow.assumedMasterState && conflictHandler.isEqual(realMasterState, pushRow.assumedMasterState, 'couchdb-push-1')) {
            remoteRevById.set(row.id, row.doc._rev);
            nonConflictRows.push(pushRow);
          } else {
            conflicts.push(realMasterState);
          }
        }));

        /**
         * @link https://docs.couchdb.org/en/3.2.2-docs/api/database/bulk-api.html#db-bulk-docs
         */
        var url = options.url + '_bulk_docs?' + (0, _couchdbHelper.mergeUrlQueryParams)({});
        var body = {
          docs: nonConflictRows.map(row => {
            var docId = row.newDocumentState[primaryPath];
            var sendDoc = (0, _index.flatClone)(row.newDocumentState);
            if (remoteRevById.has(docId)) {
              sendDoc._rev = (0, _index.getFromMapOrThrow)(remoteRevById, docId);
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

        // get conflicting writes
        var conflictAgainIds = [];
        responseJson.forEach(writeResultRow => {
          var isConflict = writeResultRow.error === 'conflict';
          if (!writeResultRow.ok && !isConflict) {
            throw (0, _index4.newRxError)('SNH', {
              args: {
                writeResultRow
              }
            });
          }
          if (isConflict) {
            conflictAgainIds.push(writeResultRow.id);
          }
        });
        if (conflictAgainIds.length === 0) {
          return conflicts;
        }
        var getConflictDocsUrl = options.url + '_all_docs?' + (0, _couchdbHelper.mergeUrlQueryParams)({
          include_docs: true,
          keys: JSON.stringify(conflictAgainIds)
        });
        var conflictResponse = await replicationState.fetch(getConflictDocsUrl);
        var conflictResponseJson = await conflictResponse.json();
        conflictResponseJson.rows.forEach(conflictAgainRow => {
          conflicts.push((0, _couchdbHelper.couchDBDocToRxDocData)(collection.schema.primaryPath, conflictAgainRow.doc));
        });
        return conflicts;
      },
      batchSize: options.push.batchSize,
      modifier: options.push.modifier,
      initialCheckpoint: options.push.initialCheckpoint
    };
  }
  var replicationState = new RxCouchDBReplicationState(options.url, options.fetch ? options.fetch : (0, _couchdbHelper.getDefaultFetch)(), options.replicationIdentifier, collection, replicationPrimitivesPull, replicationPrimitivesPush, options.live, options.retryTime, options.autoStart);

  /**
   * Use long polling to get live changes for the pull.stream$
   */
  if (options.live && options.pull) {
    var startBefore = replicationState.start.bind(replicationState);
    replicationState.start = () => {
      var since = 'now';
      var batchSize = options.pull && options.pull.batchSize ? options.pull.batchSize : 20;
      (async () => {
        var lastRequestStartTime = (0, _index.now)();
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
            lastRequestStartTime = (0, _index.now)();
            jsonResponse = await (await replicationState.fetch(_url)).json();
          } catch (err) {
            replicationState.subjects.error.next((0, _index4.newRxError)('RC_STREAM', {
              args: {
                url: _url
              },
              error: (0, _index.errorToPlainJson)(err)
            }));
            if (lastRequestStartTime < (0, _index.now)() - replicationState.retryTime) {
              /**
               * Last request start was long ago,
               * so we directly retry.
               * This mostly happens on timeouts
               * which are normal behavior for long polling requests.
               */
              await (0, _index.promiseWait)(0);
            } else {
              // await next tick here otherwise we could go in to a 100% CPU blocking cycle.
              await (0, _replicationHelper.awaitRetry)(collection, replicationState.retryTime);
            }
            continue;
          }
          var documents = jsonResponse.results.map(row => (0, _couchdbHelper.couchDBDocToRxDocData)(collection.schema.primaryPath, (0, _index.ensureNotFalsy)(row.doc)));
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
  (0, _index3.startReplicationOnLeaderShip)(options.waitForLeadership, replicationState);
  return replicationState;
}
//# sourceMappingURL=index.js.map