'use strict';

Object.defineProperty(exports, "__esModule", {
    value: true
});

var _classCallCheck2 = require('babel-runtime/helpers/classCallCheck');

var _classCallCheck3 = _interopRequireDefault(_classCallCheck2);

var _createClass2 = require('babel-runtime/helpers/createClass');

var _createClass3 = _interopRequireDefault(_createClass2);

exports.create = create;

var _rxjs = require('rxjs');

var _rxChangeEvent = require('./rx-change-event');

var _rxChangeEvent2 = _interopRequireDefault(_rxChangeEvent);

var _broadcastChannel = require('broadcast-channel');

var _broadcastChannel2 = _interopRequireDefault(_broadcastChannel);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

var Socket = function () {
    function Socket(database) {
        (0, _classCallCheck3['default'])(this, Socket);

        this._destroyed = false;
        this.database = database;
        this.token = database.token;

        this.bc = new _broadcastChannel2['default']('RxDB:' + this.database.name + ':' + 'socket');
        this.messages$ = new _rxjs.Subject();
    }

    /**
     * @return {Observable}
     */


    (0, _createClass3['default'])(Socket, [{
        key: 'prepare',
        value: function prepare() {
            var _this = this;

            this.bc.onmessage = function (msg) {
                if (msg.st !== _this.database.storageToken) return; // not same storage-state
                if (msg.db === _this.database.token) return; // same db
                var changeEvent = _rxChangeEvent2['default'].fromJSON(msg.d);
                _this.messages$.next(changeEvent);
            };

            return this;
        }

        /**
         * write the given event to the socket
         */

    }, {
        key: 'write',
        value: function write(changeEvent) {
            var socketDoc = changeEvent.toJSON();

            delete socketDoc.db;
            var sendOverChannel = {
                db: this.token, // database-token
                st: this.database.storageToken, // storage-token
                d: socketDoc
            };

            return this.bc.postMessage(sendOverChannel);
        }
    }, {
        key: 'destroy',
        value: function destroy() {
            var _this2 = this;

            if (this._destroyed) return;
            this._destroyed = true;

            setTimeout(function () {
                return _this2.bc.close();
            }, 100);
        }
    }, {
        key: '$',
        get: function get() {
            if (!this._$) this._$ = this.messages$.asObservable();
            return this._$;
        }
    }]);
    return Socket;
}();

/**
 * creates a socket
 * @return {Promise<Socket>}
 */


function create(database) {
    var socket = new Socket(database);
    return socket.prepare();
}

exports['default'] = {
    create: create
};
