"use strict";

var _interopRequireDefault = require("@babel/runtime/helpers/interopRequireDefault");
Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.RxSupabaseReplicationState = void 0;
exports.replicateSupabase = replicateSupabase;
var _inheritsLoose2 = _interopRequireDefault(require("@babel/runtime/helpers/inheritsLoose"));
var _index = require("../replication/index.js");
var _plugin = require("../../plugin.js");
var _index2 = require("../leader-election/index.js");
var _rxjs = require("rxjs");
var _helper = require("./helper.js");
var _index3 = require("../utils/index.js");
var RxSupabaseReplicationState = exports.RxSupabaseReplicationState = /*#__PURE__*/function (_RxReplicationState) {
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
  (0, _inheritsLoose2.default)(RxSupabaseReplicationState, _RxReplicationState);
  return RxSupabaseReplicationState;
}(_index.RxReplicationState);
function replicateSupabase(options) {
  options = (0, _index3.flatClone)(options);
  (0, _plugin.addRxPlugin)(_index2.RxDBLeaderElectionPlugin);
  var collection = options.collection;
  var primaryPath = collection.schema.primaryPath;

  // set defaults
  options.waitForLeadership = typeof options.waitForLeadership === 'undefined' ? true : options.waitForLeadership;
  options.live = typeof options.live === 'undefined' ? true : options.live;
  var modifiedField = options.modifiedField ? options.modifiedField : _helper.DEFAULT_MODIFIED_FIELD;
  var deletedField = options.deletedField ? options.deletedField : _helper.DEFAULT_DELETED_FIELD;
  var pullStream$ = new _rxjs.Subject();
  var replicationPrimitivesPull;
  function rowToDoc(row) {
    var deleted = !!row[deletedField];
    var modified = row[modifiedField];
    var doc = (0, _index3.flatClone)(row);
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
        var lastDoc = (0, _index3.lastOfArray)(data);
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
      batchSize: (0, _index3.ensureNotFalsy)(options.pull).batchSize,
      modifier: (0, _index3.ensureNotFalsy)(options.pull).modifier,
      stream$: pullStream$.asObservable(),
      initialCheckpoint: options.pull.initialCheckpoint
    };
  }
  var replicationPrimitivesPush = options.push ? {
    batchSize: options.push.batchSize,
    initialCheckpoint: options.push.initialCheckpoint,
    modifier: options.push.modifier,
    async handler(rows) {
      async function insertOrReturnConflict(doc) {
        var id = doc[primaryPath];
        var {
          error
        } = await options.client.from(options.tableName).insert(doc);
        if (!error) {
          return;
        } else if (error.code == _helper.POSTGRES_INSERT_CONFLICT_CODE) {
          // conflict!
          var conflict = await fetchById(id);
          return conflict;
        } else {
          throw error;
        }
      }
      async function updateOrReturnConflict(doc, assumedMasterState) {
        (0, _index3.ensureNotFalsy)(assumedMasterState);
        var id = doc[primaryPath];
        var toRow = (0, _index3.flatClone)(doc);
        if (doc._deleted) {
          toRow[deletedField] = !!doc._deleted;
          if (deletedField !== '_deleted') {
            delete toRow._deleted;
          }
        }

        // modified field will be set server-side
        delete toRow[modifiedField];
        var query = options.client.from(options.tableName).update(toRow);
        query = (0, _helper.addDocEqualityToQuery)(collection.schema.jsonSchema, deletedField, modifiedField, assumedMasterState, query);
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
  (0, _index.startReplicationOnLeaderShip)(options.waitForLeadership, replicationState);
  return replicationState;
}
//# sourceMappingURL=index.js.map