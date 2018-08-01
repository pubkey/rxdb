'use strict';

Object.defineProperty(exports, "__esModule", {
    value: true
});
exports.overwritable = exports.prototypes = exports.rxdb = undefined;

var _classCallCheck2 = require('babel-runtime/helpers/classCallCheck');

var _classCallCheck3 = _interopRequireDefault(_classCallCheck2);

var _createClass2 = require('babel-runtime/helpers/createClass');

var _createClass3 = _interopRequireDefault(_createClass2);

exports.create = create;

var _leaderElection = require('broadcast-channel/leader-election');

var _leaderElection2 = _interopRequireDefault(_leaderElection);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

var LeaderElector = function () {
    function LeaderElector(database) {
        (0, _classCallCheck3['default'])(this, LeaderElector);

        this.destroyed = false;
        this.database = database;
        this.isLeader = false;
        this.isDead = false;
        this.elector = _leaderElection2['default'].create(database.socket.bc);
    }

    (0, _createClass3['default'])(LeaderElector, [{
        key: 'die',
        value: function die() {
            return this.elector.die();
        }

        /**
         * @return {Promise} promise which resolve when the instance becomes leader
         */

    }, {
        key: 'waitForLeadership',
        value: function waitForLeadership() {
            var _this = this;

            return this.elector.awaitLeadership().then(function () {
                _this.isLeader = true;
                return true;
            });
        }
    }, {
        key: 'destroy',
        value: function destroy() {
            if (this.destroyed) return;
            this.destroyed = true;
            this.isDead = true;
            return this.die();
        }
    }]);
    return LeaderElector;
}(); /**
      * this plugin adds the leader-election-capabilities to rxdb
      */

function create(database) {
    var elector = new LeaderElector(database);
    return elector;
}

var rxdb = exports.rxdb = true;
var prototypes = exports.prototypes = {};
var overwritable = exports.overwritable = {
    createLeaderElector: create
};

exports['default'] = {
    rxdb: rxdb,
    prototypes: prototypes,
    overwritable: overwritable
};
