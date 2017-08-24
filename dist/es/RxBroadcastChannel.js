import _regeneratorRuntime from 'babel-runtime/regenerator';
import _asyncToGenerator from 'babel-runtime/helpers/asyncToGenerator';
import _classCallCheck from 'babel-runtime/helpers/classCallCheck';
import * as util from './util';

/**
 * this is a wrapper for BroadcastChannel to integrate it with RxJS
 * @link https://developer.mozilla.org/en-US/docs/Web/API/Broadcast_Channel_API
 */

var RxBroadcastChannel = function () {
    function RxBroadcastChannel(database, name) {
        var _this = this;

        _classCallCheck(this, RxBroadcastChannel);

        this.name = name;
        this.database = database;
        this.token = database.token;

        this.bc = new BroadcastChannel('RxDB:' + this.database.name + ':' + this.name);

        this.$ = util.Rx.Observable.fromEvent(this.bc, 'message').map(function (msg) {
            return msg.data;
        }).map(function (strMsg) {
            return JSON.parse(strMsg);
        }).filter(function (msg) {
            return msg.it != _this.token;
        });
    }

    /**
     * write data to the channel
     * @param {string} type
     * @param {Object} data
     */


    RxBroadcastChannel.prototype.write = function () {
        var _ref = _asyncToGenerator( /*#__PURE__*/_regeneratorRuntime.mark(function _callee(type, data) {
            return _regeneratorRuntime.wrap(function _callee$(_context) {
                while (1) {
                    switch (_context.prev = _context.next) {
                        case 0:
                            _context.next = 2;
                            return this.bc.postMessage(JSON.stringify({
                                type: type,
                                it: this.token,
                                data: data,
                                t: new Date().getTime()
                            }));

                        case 2:
                        case 'end':
                            return _context.stop();
                    }
                }
            }, _callee, this);
        }));

        function write(_x, _x2) {
            return _ref.apply(this, arguments);
        }

        return write;
    }();

    RxBroadcastChannel.prototype.destroy = function destroy() {
        this.bc.close();
    };

    return RxBroadcastChannel;
}();

/**
 * Detect if client can use BroadcastChannel
 * @return {Boolean}
 */


export function canIUse() {
    if (typeof window === 'object' && window.BroadcastChannel && typeof window.BroadcastChannel === 'function' && typeof window.BroadcastChannel.prototype.postMessage === 'function' && typeof window.BroadcastChannel.prototype.close === 'function') return true;
    return false;
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