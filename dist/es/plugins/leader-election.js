/**
 * this plugin adds the leader-election-capabilities to rxdb
 */
import { createLeaderElection } from 'broadcast-channel';
var LEADER_ELECTORS_OF_DB = new WeakMap();
export var LeaderElector = /*#__PURE__*/function () {
  function LeaderElector(database) {
    this.destroyed = false;
    this.isLeader = false;
    this.isDead = false;
    this.database = database;
    this.elector = createLeaderElection(database.broadcastChannel);
  }

  var _proto = LeaderElector.prototype;

  _proto.die = function die() {
    return this.elector.die();
  };

  _proto.waitForLeadership = function waitForLeadership() {
    var _this = this;

    return this.elector.awaitLeadership().then(function () {
      _this.isLeader = true;
      return true;
    });
  };

  _proto.destroy = function destroy() {
    if (this.destroyed) return;
    this.destroyed = true;
    this.isDead = true;
    return this.die();
  };

  return LeaderElector;
}();
export function getForDatabase() {
  if (!LEADER_ELECTORS_OF_DB.has(this)) {
    LEADER_ELECTORS_OF_DB.set(this, new LeaderElector(this));
  }

  return LEADER_ELECTORS_OF_DB.get(this);
}
export function isLeader() {
  if (!this.multiInstance) {
    return true;
  }

  return this.leaderElector().isLeader;
}
export function waitForLeadership() {
  if (!this.multiInstance) {
    return Promise.resolve(true);
  } else {
    return this.leaderElector().waitForLeadership();
  }
}
/**
 * runs when the database gets destroyed
 */

export function onDestroy(db) {
  var has = LEADER_ELECTORS_OF_DB.get(db);

  if (has) {
    has.destroy();
  }
}
export var rxdb = true;
export var prototypes = {
  RxDatabase: function RxDatabase(proto) {
    proto.leaderElector = getForDatabase;
    proto.isLeader = isLeader;
    proto.waitForLeadership = waitForLeadership;
  }
};
export var RxDBLeaderElectionPlugin = {
  name: 'leader-election',
  rxdb: rxdb,
  prototypes: prototypes,
  hooks: {
    preDestroyRxDatabase: onDestroy
  }
};
//# sourceMappingURL=leader-election.js.map