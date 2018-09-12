"use strict";

var _interopRequireDefault = require("@babel/runtime/helpers/interopRequireDefault");

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.create = create;
exports["default"] = exports.overwritable = exports.prototypes = exports.rxdb = void 0;

var _leaderElection = _interopRequireDefault(require("broadcast-channel/leader-election"));

/**
 * this plugin adds the leader-election-capabilities to rxdb
 */
var LeaderElector =
/*#__PURE__*/
function () {
  function LeaderElector(database) {
    this.destroyed = false;
    this.database = database;
    this.isLeader = false;
    this.isDead = false;
    this.elector = _leaderElection["default"].create(database.broadcastChannel);
  }

  var _proto = LeaderElector.prototype;

  _proto.die = function die() {
    return this.elector.die();
  };
  /**
   * @return {Promise} promise which resolve when the instance becomes leader
   */


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
var _default = {
  rxdb: rxdb,
  prototypes: prototypes,
  overwritable: overwritable
};
exports["default"] = _default;
