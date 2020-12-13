"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.getForDatabase = getForDatabase;
exports.isLeader = isLeader;
exports.waitForLeadership = waitForLeadership;
exports.onDestroy = onDestroy;
exports.RxDBLeaderElectionPlugin = exports.prototypes = exports.rxdb = exports.LeaderElector = void 0;

var _broadcastChannel = require("broadcast-channel");

/**
 * this plugin adds the leader-election-capabilities to rxdb
 */
var LEADER_ELECTORS_OF_DB = new WeakMap();

var LeaderElector = /*#__PURE__*/function () {
  function LeaderElector(database) {
    this.destroyed = false;
    this.isLeader = false;
    this.isDead = false;
    this.database = database;
    this.elector = (0, _broadcastChannel.createLeaderElection)(database.broadcastChannel);
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

exports.LeaderElector = LeaderElector;

function getForDatabase() {
  if (!LEADER_ELECTORS_OF_DB.has(this)) {
    LEADER_ELECTORS_OF_DB.set(this, new LeaderElector(this));
  }

  return LEADER_ELECTORS_OF_DB.get(this);
}

function isLeader() {
  if (!this.multiInstance) {
    return true;
  }

  return this.leaderElector().isLeader;
}

function waitForLeadership() {
  if (!this.multiInstance) {
    return Promise.resolve(true);
  } else {
    return this.leaderElector().waitForLeadership();
  }
}
/**
 * runs when the database gets destroyed
 */


function onDestroy(db) {
  var has = LEADER_ELECTORS_OF_DB.get(db);

  if (has) {
    has.destroy();
  }
}

var rxdb = true;
exports.rxdb = rxdb;
var prototypes = {
  RxDatabase: function RxDatabase(proto) {
    proto.leaderElector = getForDatabase;
    proto.isLeader = isLeader;
    proto.waitForLeadership = waitForLeadership;
  }
};
exports.prototypes = prototypes;
var RxDBLeaderElectionPlugin = {
  name: 'leader-election',
  rxdb: rxdb,
  prototypes: prototypes,
  hooks: {
    preDestroyRxDatabase: onDestroy
  }
};
exports.RxDBLeaderElectionPlugin = RxDBLeaderElectionPlugin;

//# sourceMappingURL=leader-election.js.map