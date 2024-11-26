/**
 * this plugin adds the leader-election-capabilities to rxdb
 */

import { createLeaderElection } from 'broadcast-channel';
import { getBroadcastChannelReference, removeBroadcastChannelReference } from "../../rx-storage-multiinstance.js";
import { PROMISE_RESOLVE_TRUE, getFromMapOrCreate } from "../utils/index.js";
var LEADER_ELECTORS_OF_DB = new WeakMap();
var LEADER_ELECTOR_BY_BROADCAST_CHANNEL = new WeakMap();

/**
 * Returns the leader elector of a broadcast channel.
 * Used to ensure we reuse the same elector for the channel each time.
 */
export function getLeaderElectorByBroadcastChannel(broadcastChannel) {
  return getFromMapOrCreate(LEADER_ELECTOR_BY_BROADCAST_CHANNEL, broadcastChannel, () => createLeaderElection(broadcastChannel));
}

/**
 * @overwrites RxDatabase().leaderElector for caching
 */
export function getForDatabase() {
  var broadcastChannel = getBroadcastChannelReference(this.storage.name, this.token, this.name, this);

  /**
   * Clean up the reference on RxDatabase.close()
   */
  var oldClose = this.close.bind(this);
  this.close = function () {
    removeBroadcastChannelReference(this.token, this);
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
export function isLeader() {
  if (!this.multiInstance) {
    return true;
  }
  return this.leaderElector().isLeader;
}
export function waitForLeadership() {
  if (!this.multiInstance) {
    return PROMISE_RESOLVE_TRUE;
  } else {
    return this.leaderElector().awaitLeadership().then(() => true);
  }
}

/**
 * runs when the database gets closed
 */
export function onClose(db) {
  var has = LEADER_ELECTORS_OF_DB.get(db);
  if (has) {
    has.die();
  }
}
export var rxdb = true;
export var prototypes = {
  RxDatabase: proto => {
    proto.leaderElector = getForDatabase;
    proto.isLeader = isLeader;
    proto.waitForLeadership = waitForLeadership;
  }
};
export var RxDBLeaderElectionPlugin = {
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