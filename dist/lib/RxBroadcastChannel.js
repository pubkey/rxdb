'use strict';

Object.defineProperty(exports, "__esModule", {
    value: true
});

var _typeof2 = require('babel-runtime/helpers/typeof');

var _typeof3 = _interopRequireDefault(_typeof2);

var _regenerator = require('babel-runtime/regenerator');

var _regenerator2 = _interopRequireDefault(_regenerator);

var _asyncToGenerator2 = require('babel-runtime/helpers/asyncToGenerator');

var _asyncToGenerator3 = _interopRequireDefault(_asyncToGenerator2);

var _classCallCheck2 = require('babel-runtime/helpers/classCallCheck');

var _classCallCheck3 = _interopRequireDefault(_classCallCheck2);

var _createClass2 = require('babel-runtime/helpers/createClass');

var _createClass3 = _interopRequireDefault(_createClass2);

exports.canIUse = canIUse;
exports.create = create;

var _util = require('./util');

var util = _interopRequireWildcard(_util);

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) newObj[key] = obj[key]; } } newObj['default'] = obj; return newObj; } }

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

/**
 * this is a wrapper for BroadcastChannel to integrate it with RxJS
 * @link https://developer.mozilla.org/en-US/docs/Web/API/Broadcast_Channel_API
 */
var RxBroadcastChannel = function () {
    function RxBroadcastChannel(database, name) {
        var _this = this;

        (0, _classCallCheck3['default'])(this, RxBroadcastChannel);

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


    (0, _createClass3['default'])(RxBroadcastChannel, [{
        key: 'write',
        value: function () {
            var _ref = (0, _asyncToGenerator3['default'])( /*#__PURE__*/_regenerator2['default'].mark(function _callee(type, data) {
                return _regenerator2['default'].wrap(function _callee$(_context) {
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
    if ((typeof window === 'undefined' ? 'undefined' : (0, _typeof3['default'])(window)) === 'object' && window.BroadcastChannel && typeof window.BroadcastChannel === 'function' && typeof window.BroadcastChannel.prototype.postMessage === 'function' && typeof window.BroadcastChannel.prototype.close === 'function') return true;
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

exports['default'] = {
    create: create,
    canIUse: canIUse
};
