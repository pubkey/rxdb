"use strict";

var _interopRequireDefault = require("@babel/runtime/helpers/interopRequireDefault");

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.fromJSON = fromJSON;
exports.fromPouchChange = fromPouchChange;
exports.create = create;
exports.isInstanceOf = isInstanceOf;
exports["default"] = exports.RxChangeEvent = void 0;

var _createClass2 = _interopRequireDefault(require("@babel/runtime/helpers/createClass"));

var _util = require("./util");

/**
 * RxChangeEvents a emitted when something in the database changes
 * they can be grabbed by the observables of database, collection and document
 */
var RxChangeEvent =
/*#__PURE__*/
function () {
  function RxChangeEvent(data) {
    this.data = data;
  }

  var _proto = RxChangeEvent.prototype;

  _proto.toJSON = function toJSON() {
    var ret = {
      op: this.data.op,
      t: this.data.t,
      db: this.data.db,
      it: this.data.it,
      isLocal: this.data.isLocal
    };
    if (this.data.col) ret.col = this.data.col;
    if (this.data.doc) ret.doc = this.data.doc;
    if (this.data.v) ret.v = this.data.v;
    return ret;
  };

  _proto.isIntern = function isIntern() {
    if (this.data.col && this.data.col.charAt(0) === '_') return true;
    return false;
  };

  _proto.isSocket = function isSocket() {
    if (this.data.col && this.data.col === '_socket') return true;
    return false;
  };

  (0, _createClass2["default"])(RxChangeEvent, [{
    key: "hash",
    get: function get() {
      if (!this._hash) this._hash = (0, _util.hash)(this.data);
      return this._hash;
    }
  }]);
  return RxChangeEvent;
}();

exports.RxChangeEvent = RxChangeEvent;

function fromJSON(data) {
  return new RxChangeEvent(data);
}

function fromPouchChange(changeDoc, collection) {
  var op = changeDoc._rev.startsWith('1-') ? 'INSERT' : 'UPDATE';
  if (changeDoc._deleted) op = 'REMOVE'; // decompress / primarySwap

  changeDoc = collection._handleFromPouch(changeDoc);
  var data = {
    op: op,
    t: new Date().getTime(),
    db: 'remote',
    col: collection.name,
    it: collection.database.token,
    doc: changeDoc[collection.schema.primaryPath],
    v: changeDoc
  };
  return new RxChangeEvent(data);
}

function create(op, database, collection, doc, value) {
  var isLocal = arguments.length > 5 && arguments[5] !== undefined ? arguments[5] : false;
  var data = {
    op: op,
    t: new Date().getTime(),
    db: database.name,
    it: database.token,
    isLocal: isLocal
  };
  if (collection) data.col = collection.name;
  if (doc) data.doc = doc.primary;
  if (value) data.v = value;
  return new RxChangeEvent(data);
}

function isInstanceOf(obj) {
  return obj instanceof RxChangeEvent;
}

var _default = {
  fromJSON: fromJSON,
  fromPouchChange: fromPouchChange,
  create: create,
  isInstanceOf: isInstanceOf
};
exports["default"] = _default;
