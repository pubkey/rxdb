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

var _rxjs = require('rxjs');

var _operators = require('rxjs/operators');

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
        this._destroyed = false;
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
            if (this._destroyed) return;
            return this.bc.postMessage(JSON.stringify({
                type: type,
                it: this.token,
                data: data,
                t: new Date().getTime()
            }));
            /*.catch(err => {
                console.error('RxDB: Could not write to BroadcastChannel, this is a bug, report it');
                console.dir('type: ' + type);
                console.dir('data: ' + data);
                console.dir(err);
            });*/
        }
    }, {
        key: 'destroy',
        value: function destroy() {
            this._destroyed = true;
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
                this._$ = (0, _rxjs.fromEvent)(this.bc, 'message').pipe((0, _operators.map)(function (msg) {
                    return msg.data;
                }), (0, _operators.map)(function (strMsg) {
                    return JSON.parse(strMsg);
                }), (0, _operators.filter)(function (msg) {
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
