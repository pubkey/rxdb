'use strict';

Object.defineProperty(exports, "__esModule", {
    value: true
});
exports.RxChangeEvent = undefined;

var _classCallCheck2 = require('babel-runtime/helpers/classCallCheck');

var _classCallCheck3 = _interopRequireDefault(_classCallCheck2);

var _createClass2 = require('babel-runtime/helpers/createClass');

var _createClass3 = _interopRequireDefault(_createClass2);

exports.fromJSON = fromJSON;
exports.fromPouchChange = fromPouchChange;
exports.create = create;
exports.isInstanceOf = isInstanceOf;

var _util = require('./util');

var util = _interopRequireWildcard(_util);

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) newObj[key] = obj[key]; } } newObj['default'] = obj; return newObj; } }

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

var RxChangeEvent = exports.RxChangeEvent = function () {
    function RxChangeEvent(data) {
        (0, _classCallCheck3['default'])(this, RxChangeEvent);

        this.data = data;
    }

    (0, _createClass3['default'])(RxChangeEvent, [{
        key: 'toJSON',
        value: function toJSON() {
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
        }
    }, {
        key: 'isIntern',
        value: function isIntern() {
            if (this.data.col && this.data.col.charAt(0) === '_') return true;
            return false;
        }
    }, {
        key: 'isSocket',
        value: function isSocket() {
            if (this.data.col && this.data.col === '_socket') return true;
            return false;
        }
    }, {
        key: 'hash',
        get: function get() {
            if (!this._hash) this._hash = util.hash(this.data);
            return this._hash;
        }
    }]);
    return RxChangeEvent;
}(); /**
      * RxChangeEvents a emitted when something in the database changes
      * they can be grabbed by the observables of database, collection and document
      */

function fromJSON(data) {
    return new RxChangeEvent(data);
}

function fromPouchChange(changeDoc, collection) {
    var op = changeDoc._rev.startsWith('1-') ? 'INSERT' : 'UPDATE';
    if (changeDoc._deleted) op = 'REMOVE';

    // decompress / primarySwap
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

exports['default'] = {
    fromJSON: fromJSON,
    fromPouchChange: fromPouchChange,
    create: create,
    isInstanceOf: isInstanceOf
};
