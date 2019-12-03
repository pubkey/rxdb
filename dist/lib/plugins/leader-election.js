"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.create = create;
exports["default"] = exports.overwritable = exports.prototypes = exports.rxdb = exports.LeaderElector = void 0;

var _broadcastChannel = require("broadcast-channel");

/**
 * this plugin adds the leader-election-capabilities to rxdb
 */
var LeaderElector =
/*#__PURE__*/
function () {
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

function create(database) {
  var elector = new LeaderElector(database);
  return elector;
}

var rxdb = true;
exports.rxdb = rxdb;
var prototypes = {};
exports.prototypes = prototypes;
var overwritable = {
  createLeaderElector: create
};
exports.overwritable = overwritable;
var plugin = {
  rxdb: rxdb,
  prototypes: prototypes,
  overwritable: overwritable
};
var _default = plugin;
exports["default"] = _default;

//# sourceMappingURL=leader-election.js.map