/**
 * this plugin adds the leader-election-capabilities to rxdb
 */
import LeaderElection from 'broadcast-channel/leader-election';

var LeaderElector =
/*#__PURE__*/
function () {
  function LeaderElector(database) {
    this.destroyed = false;
    this.database = database;
    this.isLeader = false;
    this.isDead = false;
    this.elector = LeaderElection.create(database.broadcastChannel);
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

export function create(database) {
  var elector = new LeaderElector(database);
  return elector;
}
export var rxdb = true;
export var prototypes = {};
export var overwritable = {
  createLeaderElector: create
};
export default {
  rxdb: rxdb,
  prototypes: prototypes,
  overwritable: overwritable
};