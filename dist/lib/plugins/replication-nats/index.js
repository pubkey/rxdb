"use strict";

var _interopRequireDefault = require("@babel/runtime/helpers/interopRequireDefault");
Object.defineProperty(exports, "__esModule", {
  value: true
});
var _exportNames = {
  RxNatsReplicationState: true,
  replicateNats: true
};
exports.RxNatsReplicationState = void 0;
exports.replicateNats = replicateNats;
var _inheritsLoose2 = _interopRequireDefault(require("@babel/runtime/helpers/inheritsLoose"));
var _utils = require("../../plugins/utils");
var _leaderElection = require("../leader-election");
var _replication = require("../replication");
var _ = require("../../");
var _rxjs = require("rxjs");
var _nats = require("nats");
var _natsHelper = require("./nats-helper");
Object.keys(_natsHelper).forEach(function (key) {
  if (key === "default" || key === "__esModule") return;
  if (Object.prototype.hasOwnProperty.call(_exportNames, key)) return;
  if (key in exports && exports[key] === _natsHelper[key]) return;
  Object.defineProperty(exports, key, {
    enumerable: true,
    get: function () {
      return _natsHelper[key];
    }
  });
});
var _replicationHelper = require("../replication/replication-helper");
var _natsTypes = require("./nats-types");
Object.keys(_natsTypes).forEach(function (key) {
  if (key === "default" || key === "__esModule") return;
  if (Object.prototype.hasOwnProperty.call(_exportNames, key)) return;
  if (key in exports && exports[key] === _natsTypes[key]) return;
  Object.defineProperty(exports, key, {
    enumerable: true,
    get: function () {
      return _natsTypes[key];
    }
  });
});
var RxNatsReplicationState = exports.RxNatsReplicationState = /*#__PURE__*/function (_RxReplicationState) {
  (0, _inheritsLoose2.default)(RxNatsReplicationState, _RxReplicationState);
  function RxNatsReplicationState(replicationIdentifierHash, collection, pull, push, live = true, retryTime = 1000 * 5, autoStart = true) {
    var _this;
    _this = _RxReplicationState.call(this, replicationIdentifierHash, collection, '_deleted', pull, push, live, retryTime, autoStart) || this;
    _this.replicationIdentifierHash = replicationIdentifierHash;
    _this.collection = collection;
    _this.pull = pull;
    _this.push = push;
    _this.live = live;
    _this.retryTime = retryTime;
    _this.autoStart = autoStart;
    return _this;
  }
  return RxNatsReplicationState;
}(_replication.RxReplicationState);
function replicateNats(options) {
  options.live = typeof options.live === 'undefined' ? true : options.live;
  options.waitForLeadership = typeof options.waitForLeadership === 'undefined' ? true : options.waitForLeadership;
  var collection = options.collection;
  var primaryPath = collection.schema.primaryPath;
  (0, _.addRxPlugin)(_leaderElection.RxDBLeaderElectionPlugin);
  var jc = (0, _nats.JSONCodec)();
  var connectionStatePromise = (async () => {
    var nc = await (0, _nats.connect)(options.connection);
    var jetstreamClient = nc.jetstream();
    var jsm = await nc.jetstreamManager();
    await jsm.streams.add({
      name: options.streamName,
      subjects: [options.subjectPrefix + '.*']
    });
    var natsStream = await jetstreamClient.streams.get(options.streamName);
    return {
      nc,
      jetstreamClient,
      jsm,
      natsStream
    };
  })();
  var pullStream$ = new _rxjs.Subject();
  var replicationPrimitivesPull;
  if (options.pull) {
    replicationPrimitivesPull = {
      async handler(lastPulledCheckpoint, batchSize) {
        var cn = await connectionStatePromise;
        var newCheckpoint = {
          sequence: lastPulledCheckpoint ? lastPulledCheckpoint.sequence : 0
        };
        var consumer = await cn.natsStream.getConsumer({
          opt_start_seq: lastPulledCheckpoint ? lastPulledCheckpoint.sequence : 0,
          deliver_policy: _nats.DeliverPolicy.LastPerSubject,
          replay_policy: _nats.ReplayPolicy.Instant
        });
        var fetchedMessages = await consumer.fetch({
          max_messages: batchSize
        });
        await fetchedMessages.signal;
        await fetchedMessages.close();
        var useMessages = [];
        for await (var m of fetchedMessages) {
          useMessages.push(m.json());
          newCheckpoint.sequence = m.seq;
          m.ack();
        }
        return {
          documents: useMessages,
          checkpoint: newCheckpoint
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
        var cn = await connectionStatePromise;
        var conflicts = [];
        await Promise.all(rows.map(async writeRow => {
          var docId = writeRow.newDocumentState[primaryPath];

          /**
           * first get the current state of the documents from the server
           * so that we have the sequence number for conflict detection.
           */
          var remoteDocState;
          try {
            remoteDocState = await (0, _natsHelper.getNatsServerDocumentState)(cn.natsStream, options.subjectPrefix, docId);
          } catch (err) {
            if (!err.message.includes('no message found')) {
              throw err;
            }
          }
          if (remoteDocState && (!writeRow.assumedMasterState || (await collection.conflictHandler({
            newDocumentState: remoteDocState.json(),
            realMasterState: writeRow.assumedMasterState
          }, 'replication-firestore-push')).isEqual === false)) {
            // conflict
            conflicts.push(remoteDocState.json());
          } else {
            // no conflict (yet)
            var pushDone = false;
            while (!pushDone) {
              try {
                await cn.jetstreamClient.publish(options.subjectPrefix + '.' + docId, jc.encode(writeRow.newDocumentState), {
                  expect: remoteDocState ? {
                    streamName: options.streamName,
                    lastSubjectSequence: remoteDocState.seq
                  } : undefined
                });
                pushDone = true;
              } catch (err) {
                if (err.message.includes('wrong last sequence')) {
                  // A write happened while we are doing our write -> handle conflict
                  var newServerState = await (0, _natsHelper.getNatsServerDocumentState)(cn.natsStream, options.subjectPrefix, docId);
                  conflicts.push((0, _utils.ensureNotFalsy)(newServerState).json());
                  pushDone = true;
                } else {
                  replicationState.subjects.error.next((0, _.newRxError)('RC_STREAM', {
                    document: writeRow.newDocumentState,
                    error: (0, _utils.errorToPlainJson)(err)
                  }));

                  // -> retry after wait
                  await (0, _replicationHelper.awaitRetry)(collection, replicationState.retryTime);
                }
              }
            }
          }
        }));
        return conflicts;
      },
      batchSize: options.push.batchSize,
      modifier: options.push.modifier
    };
  }
  var replicationState = new RxNatsReplicationState(_natsHelper.NATS_REPLICATION_PLUGIN_IDENTITY_PREFIX + options.collection.database.hashFunction(options.replicationIdentifier), collection, replicationPrimitivesPull, replicationPrimitivesPush, options.live, options.retryTime, options.autoStart);

  /**
   * Use long polling to get live changes for the pull.stream$
   */
  if (options.live && options.pull) {
    var startBefore = replicationState.start.bind(replicationState);
    var cancelBefore = replicationState.cancel.bind(replicationState);
    replicationState.start = async () => {
      var cn = await connectionStatePromise;

      /**
       * First get the last sequence so that we can
       * laster only fetch 'newer' messages.
       */
      var lastSeq = 0;
      try {
        var lastDocState = await cn.natsStream.getMessage({
          last_by_subj: options.subjectPrefix + '.*'
        });
        lastSeq = lastDocState.seq;
      } catch (err) {
        if (!err.message.includes('no message found')) {
          throw err;
        }
      }
      var consumer = await cn.natsStream.getConsumer({
        opt_start_seq: lastSeq
      });
      var newMessages = await consumer.consume();
      (async () => {
        for await (var m of newMessages) {
          var docData = m.json();
          pullStream$.next({
            documents: [docData],
            checkpoint: {
              sequence: m.seq
            }
          });
          m.ack();
        }
      })();
      replicationState.cancel = () => {
        newMessages.close();
        return cancelBefore();
      };
      return startBefore();
    };
  }
  (0, _replication.startReplicationOnLeaderShip)(options.waitForLeadership, replicationState);
  return replicationState;
}
//# sourceMappingURL=index.js.map