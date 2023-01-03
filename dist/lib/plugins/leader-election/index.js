"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.RxDBLeaderElectionPlugin = void 0;
exports.getForDatabase = getForDatabase;
exports.getLeaderElectorByBroadcastChannel = getLeaderElectorByBroadcastChannel;
exports.isLeader = isLeader;
exports.onDestroy = onDestroy;
exports.rxdb = exports.prototypes = void 0;
exports.waitForLeadership = waitForLeadership;
var _broadcastChannel = require("broadcast-channel");
var _rxStorageMultiinstance = require("../../rx-storage-multiinstance");
var _utils = require("../utils");
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
  var elector = LEADER_ELECTOR_BY_BROADCAST_CHANNEL.get(broadcastChannel);
  if (!elector) {
    elector = (0, _broadcastChannel.createLeaderElection)(broadcastChannel);
    LEADER_ELECTOR_BY_BROADCAST_CHANNEL.set(broadcastChannel, elector);
  }
  return elector;
}

/**
 * @overwrites RxDatabase().leaderElector for caching
 */
function getForDatabase() {
  var broadcastChannel = (0, _rxStorageMultiinstance.getBroadcastChannelReference)(this.token, this.name, this);

  /**
   * Clean up the reference on RxDatabase.destroy()
   */
  var oldDestroy = this.destroy.bind(this);
  this.destroy = function () {
    (0, _rxStorageMultiinstance.removeBroadcastChannelReference)(this.token, this);
    return oldDestroy();
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
    return _utils.PROMISE_RESOLVE_TRUE;
  } else {
    return this.leaderElector().awaitLeadership().then(() => true);
  }
}

/**
 * runs when the database gets destroyed
 */
function onDestroy(db) {
  var has = LEADER_ELECTORS_OF_DB.get(db);
  if (has) {
    has.die();
  }
}
var rxdb = true;
exports.rxdb = rxdb;
var prototypes = {
  RxDatabase: proto => {
    proto.leaderElector = getForDatabase;
    proto.isLeader = isLeader;
    proto.waitForLeadership = waitForLeadership;
  }
};
exports.prototypes = prototypes;
var RxDBLeaderElectionPlugin = {
  name: 'leader-election',
  rxdb,
  prototypes,
  hooks: {
    preDestroyRxDatabase: {
      after: onDestroy
    }
  }
};
exports.RxDBLeaderElectionPlugin = RxDBLeaderElectionPlugin;
//# sourceMappingURL=index.js.map