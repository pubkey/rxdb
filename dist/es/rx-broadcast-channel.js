import _classCallCheck from 'babel-runtime/helpers/classCallCheck';
import _createClass from 'babel-runtime/helpers/createClass';
import { fromEvent } from 'rxjs/observable/fromEvent';
import { map } from 'rxjs/operators/map';
import { filter } from 'rxjs/operators/filter';

/**
 * this is a wrapper for BroadcastChannel to integrate it with RxJS
 * @link https://developer.mozilla.org/en-US/docs/Web/API/Broadcast_Channel_API
 */

var RxBroadcastChannel = function () {
    function RxBroadcastChannel(database, name) {
        _classCallCheck(this, RxBroadcastChannel);

        this.name = name;
        this.database = database;
        this.token = database.token;
    }

    /**
     * @return {BroadcastChannel}
     */


    /**
     * write data to the channel
     * @param {string} type
     * @param {Object} data
     * @return {Promise<any>}
     */
    RxBroadcastChannel.prototype.write = function write(type, data) {
        return this.bc.postMessage(JSON.stringify({
            type: type,
            it: this.token,
            data: data,
            t: new Date().getTime()
        }));
    };

    RxBroadcastChannel.prototype.destroy = function destroy() {
        this._bc && this._bc.close();
    };

    _createClass(RxBroadcastChannel, [{
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
                this._$ = fromEvent(this.bc, 'message').pipe(map(function (msg) {
                    return msg.data;
                }), map(function (strMsg) {
                    return JSON.parse(strMsg);
                }), filter(function (msg) {
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
export function canIUse() {
    if (_canIUse === null) {
        if (typeof window === 'object' && window.BroadcastChannel && typeof window.BroadcastChannel === 'function' && typeof window.BroadcastChannel.prototype.postMessage === 'function' && typeof window.BroadcastChannel.prototype.close === 'function') _canIUse = true;else _canIUse = false;
    }
    return _canIUse;
}

/**
 * returns null if no bc available
 * @return {BroadcastChannel} bc which is observable
 */
export function create(database, name) {
    if (!canIUse()) return null;
    return new RxBroadcastChannel(database, name);
}

export default {
    create: create,
    canIUse: canIUse
};