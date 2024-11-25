import _inheritsLoose from "@babel/runtime/helpers/inheritsLoose";
/**
 * This plugin can be used to sync collections with a remote CouchDB endpoint.
 */
import { ensureNotFalsy, errorToPlainJson, flatClone, getFromMapOrThrow, now, promiseWait } from "../../plugins/utils/index.js";
import { RxDBLeaderElectionPlugin } from "../leader-election/index.js";
import { RxReplicationState, startReplicationOnLeaderShip } from "../replication/index.js";
import { addRxPlugin, newRxError } from "../../index.js";
import { Subject } from 'rxjs';
import { couchDBDocToRxDocData, mergeUrlQueryParams, couchSwapPrimaryToId, getDefaultFetch } from "./couchdb-helper.js";
import { awaitRetry } from "../replication/replication-helper.js";
export * from "./couchdb-helper.js";
export * from "./couchdb-types.js";
export var RxCouchDBReplicationState = /*#__PURE__*/function (_RxReplicationState) {
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
  _inheritsLoose(RxCouchDBReplicationState, _RxReplicationState);
  return RxCouchDBReplicationState;
}(RxReplicationState);
export function replicateCouchDB(options) {
  var collection = options.collection;
  var conflictHandler = collection.conflictHandler;
  addRxPlugin(RxDBLeaderElectionPlugin);
  var primaryPath = options.collection.schema.primaryPath;
  if (!options.url.endsWith('/')) {
    throw newRxError('RC_COUCHDB_1', {
      args: {
        collection: options.collection.name,
        url: options.url
      }
    });
  }
  options = flatClone(options);
  if (!options.url.endsWith('/')) {
    options.url = options.url + '/';
  }
  options.waitForLeadership = typeof options.waitForLeadership === 'undefined' ? true : options.waitForLeadership;
  var pullStream$ = new Subject();
  var replicationPrimitivesPull;
  if (options.pull) {
    replicationPrimitivesPull = {
      async handler(lastPulledCheckpoint, batchSize) {
        /**
         * @link https://docs.couchdb.org/en/3.2.2-docs/api/database/changes.html
         */
        var url = options.url + '_changes?' + mergeUrlQueryParams({
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
          throw newRxError('RC_COUCHDB_2', {
            args: {
              jsonResponse
            }
          });
        }
        var documents = jsonResponse.results.map(row => couchDBDocToRxDocData(collection.schema.primaryPath, ensureNotFalsy(row.doc)));
        return {
          documents,
          checkpoint: {
            sequence: jsonResponse.last_seq
          }
        };
      },
      batchSize: ensureNotFalsy(options.pull).batchSize,
      modifier: ensureNotFalsy(options.pull).modifier,
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
        var docsByIdResponse = await replicationState.fetch(options.url + '_all_docs?' + mergeUrlQueryParams({}), {
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
            nonConflictRows.push(getFromMapOrThrow(pushRowsById, row.key));
            return;
          }
          var realMasterState = couchDBDocToRxDocData(primaryPath, row.doc);
          var pushRow = getFromMapOrThrow(pushRowsById, row.id);
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
        var url = options.url + '_bulk_docs?' + mergeUrlQueryParams({});
        var body = {
          docs: nonConflictRows.map(row => {
            var docId = row.newDocumentState[primaryPath];
            var sendDoc = flatClone(row.newDocumentState);
            if (remoteRevById.has(docId)) {
              sendDoc._rev = getFromMapOrThrow(remoteRevById, docId);
            }
            return couchSwapPrimaryToId(collection.schema.primaryPath, sendDoc);
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
            throw newRxError('SNH', {
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
        var getConflictDocsUrl = options.url + '_all_docs?' + mergeUrlQueryParams({
          include_docs: true,
          keys: JSON.stringify(conflictAgainIds)
        });
        var conflictResponse = await replicationState.fetch(getConflictDocsUrl);
        var conflictResponseJson = await conflictResponse.json();
        conflictResponseJson.rows.forEach(conflictAgainRow => {
          conflicts.push(couchDBDocToRxDocData(collection.schema.primaryPath, conflictAgainRow.doc));
        });
        return conflicts;
      },
      batchSize: options.push.batchSize,
      modifier: options.push.modifier,
      initialCheckpoint: options.push.initialCheckpoint
    };
  }
  var replicationState = new RxCouchDBReplicationState(options.url, options.fetch ? options.fetch : getDefaultFetch(), options.replicationIdentifier, collection, replicationPrimitivesPull, replicationPrimitivesPush, options.live, options.retryTime, options.autoStart);

  /**
   * Use long polling to get live changes for the pull.stream$
   */
  if (options.live && options.pull) {
    var startBefore = replicationState.start.bind(replicationState);
    replicationState.start = () => {
      var since = 'now';
      var batchSize = options.pull && options.pull.batchSize ? options.pull.batchSize : 20;
      (async () => {
        var lastRequestStartTime = now();
        while (!replicationState.isStopped()) {
          var _url = options.url + '_changes?' + mergeUrlQueryParams({
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
            lastRequestStartTime = now();
            jsonResponse = await (await replicationState.fetch(_url)).json();
          } catch (err) {
            replicationState.subjects.error.next(newRxError('RC_STREAM', {
              args: {
                url: _url
              },
              error: errorToPlainJson(err)
            }));
            if (lastRequestStartTime < now() - replicationState.retryTime) {
              /**
               * Last request start was long ago,
               * so we directly retry.
               * This mostly happens on timeouts
               * which are normal behavior for long polling requests.
               */
              await promiseWait(0);
            } else {
              // await next tick here otherwise we could go in to a 100% CPU blocking cycle.
              await awaitRetry(collection, replicationState.retryTime);
            }
            continue;
          }
          var documents = jsonResponse.results.map(row => couchDBDocToRxDocData(collection.schema.primaryPath, ensureNotFalsy(row.doc)));
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
  startReplicationOnLeaderShip(options.waitForLeadership, replicationState);
  return replicationState;
}
//# sourceMappingURL=index.js.map