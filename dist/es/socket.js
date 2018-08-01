import _classCallCheck from 'babel-runtime/helpers/classCallCheck';
import _createClass from 'babel-runtime/helpers/createClass';
import { Subject } from 'rxjs';

import RxChangeEvent from './rx-change-event';
import BroadcastChannel from 'broadcast-channel';

var Socket = function () {
    function Socket(database) {
        _classCallCheck(this, Socket);

        this._destroyed = false;
        this.database = database;
        this.token = database.token;

        this.bc = new BroadcastChannel('RxDB:' + this.database.name + ':' + 'socket');
        this.messages$ = new Subject();
    }

    /**
     * @return {Observable}
     */


    Socket.prototype.prepare = function prepare() {
        var _this = this;

        this.bc.onmessage = function (msg) {
            if (msg.st !== _this.database.storageToken) return; // not same storage-state
            if (msg.db === _this.database.token) return; // same db
            var changeEvent = RxChangeEvent.fromJSON(msg.d);
            _this.messages$.next(changeEvent);
        };

        return this;
    };

    /**
     * write the given event to the socket
     */


    Socket.prototype.write = function write(changeEvent) {
        var socketDoc = changeEvent.toJSON();

        delete socketDoc.db;
        var sendOverChannel = {
            db: this.token, // database-token
            st: this.database.storageToken, // storage-token
            d: socketDoc
        };

        return this.bc.postMessage(sendOverChannel);
    };

    Socket.prototype.destroy = function destroy() {
        var _this2 = this;

        if (this._destroyed) return;
        this._destroyed = true;

        setTimeout(function () {
            return _this2.bc.close();
        }, 100);
    };

    _createClass(Socket, [{
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


export function create(database) {
    var socket = new Socket(database);
    return socket.prepare();
}

export default {
    create: create
};