import _inheritsLoose from "@babel/runtime/helpers/inheritsLoose";
/**
 * This plugin can be used to sync collections with a remote CouchDB endpoint.
 */
import { ensureNotFalsy, errorToPlainJson, flatClone, getFromMapOrThrow, lastOfArray } from '../../plugins/utils';
import { RxDBLeaderElectionPlugin } from '../leader-election';
import { RxReplicationState, startReplicationOnLeaderShip } from '../replication';
import { addRxPlugin, newRxError } from '../../index';
import { Subject } from 'rxjs';
import { couchDBDocToRxDocData, COUCHDB_NEW_REPLICATION_PLUGIN_IDENTITY_PREFIX, mergeUrlQueryParams, couchSwapPrimaryToId, getDefaultFetch } from './couchdb-helper';
export * from './couchdb-helper';
export * from './couchdb-types';
export var RxCouchDBReplicationState = /*#__PURE__*/function (_RxReplicationState) {
  _inheritsLoose(RxCouchDBReplicationState, _RxReplicationState);
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
}(RxReplicationState);
export function replicateCouchDB(options) {
  var collection = options.collection;
  addRxPlugin(RxDBLeaderElectionPlugin);
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
      stream$: pullStream$.asObservable()
    };
  }
  var replicationPrimitivesPush;
  var revisionByCallId = new Map();
  if (options.push) {
    replicationPrimitivesPush = {
      async handler(rows, meta) {
        /**
         * @link https://docs.couchdb.org/en/3.2.2-docs/api/database/bulk-api.html#db-bulk-docs
         */
        var url = options.url + '_bulk_docs?' + mergeUrlQueryParams({});
        var body = {
          docs: rows.map(row => {
            var sendDoc = flatClone(row.newDocumentState);
            if (row.assumedMasterState) {
              sendDoc._rev = ensureNotFalsy(row.assumedMasterState._rev);
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

        /**
         * CouchDB creates the new document revision
         * and we have to remember it here so that
         * we can later inject them into the assumedMasterState
         * of the meta storage instance.
         */
        var revisions = new Map();
        responseJson.filter(row => row.ok).forEach(row => revisions.set(row.id, row.rev));
        if (revisions.size > 0) {
          revisionByCallId.set(meta.callId, revisions);
        }

        // get conflicting writes
        var conflicts = responseJson.filter(row => {
          var isConflict = row.error === 'conflict';
          if (!row.ok && !isConflict) {
            throw newRxError('SNH', {
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
        var getConflictDocsUrl = options.url + '_all_docs?' + mergeUrlQueryParams({
          include_docs: true,
          keys: JSON.stringify(conflicts.map(c => c.id))
        });
        var conflictResponse = await replicationState.fetch(getConflictDocsUrl);
        var conflictResponseJson = await conflictResponse.json();
        var conflictResponseRows = conflictResponseJson.rows;
        var conflictDocsMasterState = conflictResponseRows.map(r => couchDBDocToRxDocData(collection.schema.primaryPath, r.doc));
        return conflictDocsMasterState;
      },
      batchSize: options.push.batchSize,
      modifier: options.push.modifier
    };
  }
  var replicationState = new RxCouchDBReplicationState(options.url, options.fetch ? options.fetch : getDefaultFetch(), COUCHDB_NEW_REPLICATION_PLUGIN_IDENTITY_PREFIX + options.collection.database.hashFunction(options.url), collection, replicationPrimitivesPull, replicationPrimitivesPush, options.live, options.retryTime, options.autoStart);

  /**
   * Wrap the meta instance to make it store
   * the server-side generated revisions from CouchDB
   * so that the assumedMasterState contains the correct _rev value.
   */
  if (options.push) {
    var startBefore = replicationState.start.bind(replicationState);
    replicationState.start = async () => {
      var startResult = await startBefore();
      var metaInstance = ensureNotFalsy(replicationState.metaInstance);
      var bulkWriteBefore = metaInstance.bulkWrite.bind(metaInstance);
      metaInstance.bulkWrite = function (writeRows, context) {
        if (context.startsWith('replication-up-write-meta')) {
          var callId = ensureNotFalsy(lastOfArray(context.split('-')));
          var revisions = getFromMapOrThrow(revisionByCallId, callId);
          revisionByCallId.delete(callId);
          writeRows.forEach(row => {
            var docId = row.document.itemId;
            row.document.data = flatClone(row.document.data);
            var revision = getFromMapOrThrow(revisions, docId);
            row.document.data._rev = revision;
          });
        }
        return bulkWriteBefore(writeRows, context);
      };
      return startResult;
    };
  }

  /**
   * Use long polling to get live changes for the pull.stream$
   */
  if (options.live && options.pull) {
    var _startBefore = replicationState.start.bind(replicationState);
    replicationState.start = () => {
      var since = 'now';
      var batchSize = options.pull && options.pull.batchSize ? options.pull.batchSize : 20;
      (async () => {
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
            jsonResponse = await (await replicationState.fetch(_url)).json();
          } catch (err) {
            pullStream$.error(newRxError('RC_STREAM', {
              args: {
                url: _url
              },
              error: errorToPlainJson(err)
            }));
            // await next tick here otherwise we could go in to a 100% CPU blocking cycle.
            await collection.promiseWait(0);
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
      return _startBefore();
    };
  }
  startReplicationOnLeaderShip(options.waitForLeadership, replicationState);
  return replicationState;
}
//# sourceMappingURL=index.js.map