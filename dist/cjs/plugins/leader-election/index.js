"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.RxDBLeaderElectionPlugin = void 0;
exports.getForDatabase = getForDatabase;
exports.getLeaderElectorByBroadcastChannel = getLeaderElectorByBroadcastChannel;
exports.isLeader = isLeader;
exports.onClose = onClose;
exports.rxdb = exports.prototypes = void 0;
exports.waitForLeadership = waitForLeadership;
var _broadcastChannel = require("broadcast-channel");
var _rxStorageMultiinstance = require("../../rx-storage-multiinstance.js");
var _index = require("../utils/index.js");
/**
 * this plugin adds the leader-election-capabilities to rxdb
 */

var LEADER_ELECTORS_OF_DB = new WeakMap();
var LEADER_ELECTOR_BY_BROADCAST_CHANNEL = new WeakMap();

/**
 * Returns the leader elector of a broadcast channel.
 * Used to ensure we reuse the same elector for the channel each time.
 */
function getLeaderElectorByBroadcastChannel(broadcastChannel) {
  return (0, _index.getFromMapOrCreate)(LEADER_ELECTOR_BY_BROADCAST_CHANNEL, broadcastChannel, () => (0, _broadcastChannel.createLeaderElection)(broadcastChannel));
}

/**
 * @overwrites RxDatabase().leaderElector for caching
 */
function getForDatabase() {
  var broadcastChannel = (0, _rxStorageMultiinstance.getBroadcastChannelReference)(this.storage.name, this.token, this.name, this);

  /**
   * Clean up the reference on RxDatabase.close()
   */
  var oldClose = this.close.bind(this);
  this.close = function () {
    (0, _rxStorageMultiinstance.removeBroadcastChannelReference)(this.token, this);
    return oldClose();
  };
  var elector = getLeaderElectorByBroadcastChannel(broadcastChannel);
  if (!elector) {
    elector = getLeaderElectorByBroadcastChannel(broadcastChannel);
    LEADER_ELECTORS_OF_DB.set(this, elector);
  }

  /**
   * Overwrite for caching
   */
  this.leaderElector = () => elector;
  return elector;
}
function isLeader() {
  if (!this.multiInstance) {
    return true;
  }
  return this.leaderElector().isLeader;
}
function waitForLeadership() {
  if (!this.multiInstance) {
    return _index.PROMISE_RESOLVE_TRUE;
  } else {
    return this.leaderElector().awaitLeadership().then(() => true);
  }
}

/**
 * runs when the database gets closed
 */
function onClose(db) {
  var has = LEADER_ELECTORS_OF_DB.get(db);
  if (has) {
    has.die();
  }
}
var rxdb = exports.rxdb = true;
var prototypes = exports.prototypes = {
  RxDatabase: proto => {
    proto.leaderElector = getForDatabase;
    proto.isLeader = isLeader;
    proto.waitForLeadership = waitForLeadership;
  }
};
var RxDBLeaderElectionPlugin = exports.RxDBLeaderElectionPlugin = {
  name: 'leader-election',
  rxdb,
  prototypes,
  hooks: {
    preCloseRxDatabase: {
      after: onClose
    }
  }
};
//# sourceMappingURL=index.js.map