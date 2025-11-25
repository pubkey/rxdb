import _inheritsLoose from "@babel/runtime/helpers/inheritsLoose";
import { RxReplicationState, startReplicationOnLeaderShip } from "../replication/index.js";
import { addRxPlugin } from "../../plugin.js";
import { RxDBLeaderElectionPlugin } from "../leader-election/index.js";
import { Subject } from 'rxjs';
import { DEFAULT_DELETED_FIELD, DEFAULT_MODIFIED_FIELD, POSTGRES_INSERT_CONFLICT_CODE, addDocEqualityToQuery } from "./helper.js";
import { ensureNotFalsy, flatClone, lastOfArray } from "../utils/index.js";
export var RxSupabaseReplicationState = /*#__PURE__*/function (_RxReplicationState) {
  function RxSupabaseReplicationState(replicationIdentifier, collection, pull, push, live = true, retryTime = 1000 * 5, autoStart = true) {
    var _this;
    _this = _RxReplicationState.call(this, replicationIdentifier, collection, '_deleted', pull, push, live, retryTime, autoStart) || this;
    _this.replicationIdentifier = replicationIdentifier;
    _this.collection = collection;
    _this.pull = pull;
    _this.push = push;
    _this.live = live;
    _this.retryTime = retryTime;
    _this.autoStart = autoStart;
    return _this;
  }
  _inheritsLoose(RxSupabaseReplicationState, _RxReplicationState);
  return RxSupabaseReplicationState;
}(RxReplicationState);
export function replicateSupabase(options) {
  options = flatClone(options);
  addRxPlugin(RxDBLeaderElectionPlugin);
  var collection = options.collection;
  var primaryPath = collection.schema.primaryPath;

  // set defaults
  options.waitForLeadership = typeof options.waitForLeadership === 'undefined' ? true : options.waitForLeadership;
  options.live = typeof options.live === 'undefined' ? true : options.live;
  var modifiedField = options.modifiedField ? options.modifiedField : DEFAULT_MODIFIED_FIELD;
  var deletedField = options.deletedField ? options.deletedField : DEFAULT_DELETED_FIELD;
  var pullStream$ = new Subject();
  var replicationPrimitivesPull;
  function rowToDoc(row) {
    var deleted = !!row[deletedField];
    var modified = row[modifiedField];
    var doc = flatClone(row);
    delete doc[deletedField];
    delete doc[modifiedField];
    doc._deleted = deleted;

    /**
     * Only keep the modified value if that field is defined
     * in the schema.
     */
    if (collection.schema.jsonSchema.properties[modifiedField]) {
      doc[modifiedField] = modified;
    }
    return doc;
  }
  async function fetchById(id) {
    var {
      data,
      error
    } = await options.client.from(options.tableName).select().eq(primaryPath, id).limit(1);
    if (error) throw error;
    if (data.length != 1) throw new Error('doc not found ' + id);
    return rowToDoc(data[0]);
  }
  if (options.pull) {
    replicationPrimitivesPull = {
      async handler(lastPulledCheckpoint, batchSize) {
        var query = options.client.from(options.tableName).select('*');
        if (lastPulledCheckpoint) {
          var {
            modified,
            id
          } = lastPulledCheckpoint;

          // WHERE modified > :m OR (modified = :m AND id > :id)
          // PostgREST or() takes comma-separated disjuncts; use nested and() for the tie-breaker.
          // Wrap identifiers with double quotes to be safe if they're mixed-case.
          query = query.or("\"" + modifiedField + "\".gt." + modified + ",and(\"" + modifiedField + "\".eq." + modified + ",\"" + primaryPath + "\".gt." + id + ")");
        }

        // deterministic order & batch size
        query = query.order(modifiedField, {
          ascending: true
        }).order(primaryPath, {
          ascending: true
        }).limit(batchSize);
        var {
          data,
          error
        } = await query;
        if (error) {
          throw error;
        }
        var lastDoc = lastOfArray(data);
        var newCheckpoint = lastDoc ? {
          id: lastDoc[primaryPath],
          modified: lastDoc[modifiedField]
        } : undefined;
        var docs = data.map(row => rowToDoc(row));
        return {
          documents: docs,
          checkpoint: newCheckpoint
        };
      },
      batchSize: ensureNotFalsy(options.pull).batchSize,
      modifier: ensureNotFalsy(options.pull).modifier,
      stream$: pullStream$.asObservable(),
      initialCheckpoint: options.pull.initialCheckpoint
    };
  }
  var replicationPrimitivesPush = options.push ? {
    async handler(rows) {
      async function insertOrReturnConflict(doc) {
        var id = doc[primaryPath];
        var {
          error
        } = await options.client.from(options.tableName).insert(doc);
        if (!error) {
          return;
        } else if (error.code == POSTGRES_INSERT_CONFLICT_CODE) {
          // conflict!
          var conflict = await fetchById(id);
          return conflict;
        } else {
          throw error;
        }
      }
      async function updateOrReturnConflict(doc, assumedMasterState) {
        ensureNotFalsy(assumedMasterState);
        var id = doc[primaryPath];
        var toRow = flatClone(doc);
        if (doc._deleted) {
          toRow[deletedField] = !!doc._deleted;
          if (deletedField !== '_deleted') {
            delete toRow._deleted;
          }
        }

        // modified field will be set server-side
        delete toRow[modifiedField];
        var query = options.client.from(options.tableName).update(toRow);
        query = addDocEqualityToQuery(collection.schema.jsonSchema, deletedField, modifiedField, assumedMasterState, query);
        var {
          data,
          error
        } = await query.select();
        if (error) {
          throw error;
        }
        if (data && data.length > 0) {
          return;
        } else {
          // no match -> conflict
          return await fetchById(id);
        }
      }
      var conflicts = [];
      await Promise.all(rows.map(async row => {
        var newDoc = row.newDocumentState;
        if (!row.assumedMasterState) {
          var c = await insertOrReturnConflict(newDoc);
          if (c) conflicts.push(c);
        } else {
          var _c = await updateOrReturnConflict(newDoc, row.assumedMasterState);
          if (_c) conflicts.push(_c);
        }
      }));
      return conflicts;
    }
  } : undefined;
  var replicationState = new RxSupabaseReplicationState(options.replicationIdentifier, collection, replicationPrimitivesPull, replicationPrimitivesPush, options.live, options.retryTime, options.autoStart);

  /**
   * Subscribe to changes for the pull.stream$
   */
  if (options.live && options.pull) {
    var startBefore = replicationState.start.bind(replicationState);
    var cancelBefore = replicationState.cancel.bind(replicationState);
    replicationState.start = () => {
      var sub = options.client.channel('realtime:' + options.tableName).on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: options.tableName
      }, payload => {
        /**
         * We assume soft-deletes in supabase
         * and therefore cleanup-hard-deletes
         * are not relevant for the sync.
         */
        if (payload.eventType === 'DELETE') {
          return;
        }
        var row = payload.new;
        var doc = rowToDoc(row);
        pullStream$.next({
          checkpoint: {
            id: doc[primaryPath],
            modified: row[modifiedField]
          },
          documents: [doc]
        });
      }).subscribe(status => {
        /**
         * Trigger resync flag on reconnects
         */
        if (status === 'SUBSCRIBED') {
          pullStream$.next('RESYNC');
        }
      });
      replicationState.cancel = () => {
        sub.unsubscribe();
        return cancelBefore();
      };
      return startBefore();
    };
  }
  startReplicationOnLeaderShip(options.waitForLeadership, replicationState);
  return replicationState;
}
//# sourceMappingURL=index.js.map