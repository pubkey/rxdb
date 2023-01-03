/**
 * this plugin adds the leader-election-capabilities to rxdb
 */

import { createLeaderElection } from 'broadcast-channel';
import { getBroadcastChannelReference, removeBroadcastChannelReference } from '../../rx-storage-multiinstance';
import { PROMISE_RESOLVE_TRUE } from '../utils';
var LEADER_ELECTORS_OF_DB = new WeakMap();
var LEADER_ELECTOR_BY_BROADCAST_CHANNEL = new WeakMap();

/**
 * Returns the leader elector of a broadcast channel.
 * Used to ensure we reuse the same elector for the channel each time.
 */
export function getLeaderElectorByBroadcastChannel(broadcastChannel) {
  var elector = LEADER_ELECTOR_BY_BROADCAST_CHANNEL.get(broadcastChannel);
  if (!elector) {
    elector = createLeaderElection(broadcastChannel);
    LEADER_ELECTOR_BY_BROADCAST_CHANNEL.set(broadcastChannel, elector);
  }
  return elector;
}

/**
 * @overwrites RxDatabase().leaderElector for caching
 */
export function getForDatabase() {
  var broadcastChannel = getBroadcastChannelReference(this.token, this.name, this);

  /**
   * Clean up the reference on RxDatabase.destroy()
   */
  var oldDestroy = this.destroy.bind(this);
  this.destroy = function () {
    removeBroadcastChannelReference(this.token, this);
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
 * runs when the database gets destroyed
 */
export function onDestroy(db) {
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
    preDestroyRxDatabase: {
      after: onDestroy
    }
  }
};
//# sourceMappingURL=index.js.map