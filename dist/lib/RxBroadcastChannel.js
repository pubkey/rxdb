'use strict';

Object.defineProperty(exports, "__esModule", {
    value: true
});

var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) { return typeof obj; } : function (obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; };

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

exports.canIUse = canIUse;
exports.create = create;

var _util = require('./util');

var util = _interopRequireWildcard(_util);

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) newObj[key] = obj[key]; } } newObj.default = obj; return newObj; } }

function _asyncToGenerator(fn) { return function () { var gen = fn.apply(this, arguments); return new Promise(function (resolve, reject) { function step(key, arg) { try { var info = gen[key](arg); var value = info.value; } catch (error) { reject(error); return; } if (info.done) { resolve(value); } else { return Promise.resolve(value).then(function (value) { step("next", value); }, function (err) { step("throw", err); }); } } return step("next"); }); }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

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


    _createClass(RxBroadcastChannel, [{
        key: 'write',
        value: function () {
            var _ref = _asyncToGenerator(regeneratorRuntime.mark(function _callee(type, data) {
                return regeneratorRuntime.wrap(function _callee$(_context) {
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
        }()
    }, {
        key: 'destroy',
        value: function destroy() {
            this.bc.close();
        }
    }]);

    return RxBroadcastChannel;
}();

/**
 * Detect if client can use BroadcastChannel
 * @return {Boolean}
 */


function canIUse() {
    if ((typeof window === 'undefined' ? 'undefined' : _typeof(window)) === 'object' && window.BroadcastChannel && typeof window.BroadcastChannel === 'function' && typeof window.BroadcastChannel.prototype.postMessage === 'function' && typeof window.BroadcastChannel.prototype.close === 'function') return true;
    return false;
}

/**
 * returns null if no bc available
 * @return {BroadcastChannel} bc which is observable
 */
function create(database, name) {
    if (!canIUse()) return null;

    return new RxBroadcastChannel(database, name);
}