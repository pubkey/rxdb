"use strict";

var _interopRequireDefault = require("@babel/runtime/helpers/interopRequireDefault");

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.create = create;
exports["default"] = void 0;

var _createClass2 = _interopRequireDefault(require("@babel/runtime/helpers/createClass"));

var _rxjs = require("rxjs");

var _rxChangeEvent = _interopRequireDefault(require("./rx-change-event"));

var _broadcastChannel = _interopRequireDefault(require("broadcast-channel"));

var Socket =
/*#__PURE__*/
function () {
  function Socket(database) {
    this._destroyed = false;
    this.database = database;
    this.token = database.token;
    this.bc = new _broadcastChannel["default"]('RxDB:' + this.database.name + ':' + 'socket');
    this.messages$ = new _rxjs.Subject();
  }
  /**
   * @return {Observable}
   */


  var _proto = Socket.prototype;

  _proto.prepare = function prepare() {
    var _this = this;

    this.bc.onmessage = function (msg) {
      if (msg.st !== _this.database.storageToken) return; // not same storage-state

      if (msg.db === _this.database.token) return; // same db

      var changeEvent = _rxChangeEvent["default"].fromJSON(msg.d);

      _this.messages$.next(changeEvent);
    };

    return this;
  };
  /**
   * write the given event to the socket
   */


  _proto.write = function write(changeEvent) {
    var socketDoc = changeEvent.toJSON();
    delete socketDoc.db;
    var sendOverChannel = {
      db: this.token,
      // database-token
      st: this.database.storageToken,
      // storage-token
      d: socketDoc
    };
    return this.bc.postMessage(sendOverChannel);
  };

  _proto.destroy = function destroy() {
    var _this2 = this;

    if (this._destroyed) return;
    this._destroyed = true;
    /**
     * The broadcast-channel gets closed lazy
     * to ensure that all pending change-events
     * get emitted
     */

    setTimeout(function () {
      return _this2.bc.close();
    }, 1000);
  };

  (0, _createClass2["default"])(Socket, [{
    key: "$",
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

var _default = {
  create: create
};
exports["default"] = _default;
