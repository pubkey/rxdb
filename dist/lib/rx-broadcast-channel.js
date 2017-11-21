'use strict';

Object.defineProperty(exports, "__esModule", {
    value: true
});

var _typeof2 = require('babel-runtime/helpers/typeof');

var _typeof3 = _interopRequireDefault(_typeof2);

var _classCallCheck2 = require('babel-runtime/helpers/classCallCheck');

var _classCallCheck3 = _interopRequireDefault(_classCallCheck2);

var _createClass2 = require('babel-runtime/helpers/createClass');

var _createClass3 = _interopRequireDefault(_createClass2);

exports.canIUse = canIUse;
exports.create = create;

var _fromEvent = require('rxjs/observable/fromEvent');

var _map = require('rxjs/operators/map');

var _filter = require('rxjs/operators/filter');

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

/**
 * this is a wrapper for BroadcastChannel to integrate it with RxJS
 * @link https://developer.mozilla.org/en-US/docs/Web/API/Broadcast_Channel_API
 */
var RxBroadcastChannel = function () {
    function RxBroadcastChannel(database, name) {
        (0, _classCallCheck3['default'])(this, RxBroadcastChannel);

        this.name = name;
        this.database = database;
        this.token = database.token;
    }

    /**
     * @return {BroadcastChannel}
     */


    (0, _createClass3['default'])(RxBroadcastChannel, [{
        key: 'write',


        /**
         * write data to the channel
         * @param {string} type
         * @param {Object} data
         * @return {Promise<any>}
         */
        value: function write(type, data) {
            return this.bc.postMessage(JSON.stringify({
                type: type,
                it: this.token,
                data: data,
                t: new Date().getTime()
            }));
        }
    }, {
        key: 'destroy',
        value: function destroy() {
            this._bc && this._bc.close();
        }
    }, {
        key: 'bc',
        get: function get() {
            if (!this._bc) {
                this._bc = new BroadcastChannel('RxDB:' + this.database.name + ':' + this.name);
            }
            return this._bc;
        }

        /**
         * @return {Observable}
         */

    }, {
        key: '$',
        get: function get() {
            var _this = this;

            if (!this._$) {
                this._$ = (0, _fromEvent.fromEvent)(this.bc, 'message').pipe((0, _map.map)(function (msg) {
                    return msg.data;
                }), (0, _map.map)(function (strMsg) {
                    return JSON.parse(strMsg);
                }), (0, _filter.filter)(function (msg) {
                    return msg.it !== _this.token;
                }));
            }
            return this._$;
        }
    }]);
    return RxBroadcastChannel;
}();

/**
 * Detect if client can use BroadcastChannel
 * @return {Boolean}
 */


var _canIUse = null;
function canIUse() {
    if (_canIUse === null) {
        if ((typeof window === 'undefined' ? 'undefined' : (0, _typeof3['default'])(window)) === 'object' && window.BroadcastChannel && typeof window.BroadcastChannel === 'function' && typeof window.BroadcastChannel.prototype.postMessage === 'function' && typeof window.BroadcastChannel.prototype.close === 'function') _canIUse = true;else _canIUse = false;
    }
    return _canIUse;
}

/**
 * returns null if no bc available
 * @return {BroadcastChannel} bc which is observable
 */
function create(database, name) {
    if (!canIUse()) return null;
    return new RxBroadcastChannel(database, name);
}

exports['default'] = {
    create: create,
    canIUse: canIUse
};
