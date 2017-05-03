'use strict';

Object.defineProperty(exports, "__esModule", {
    value: true
});

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }(); /**
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      * RxChangeEvents a emitted when something in the database changes
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      * they can be grabbed by the observables of database, collection and document
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      */

exports.fromJSON = fromJSON;
exports.fromPouchChange = fromPouchChange;
exports.create = create;

var _util = require('./util');

var util = _interopRequireWildcard(_util);

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) newObj[key] = obj[key]; } } newObj.default = obj; return newObj; } }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var RxChangeEvent = function () {
    function RxChangeEvent(data) {
        _classCallCheck(this, RxChangeEvent);

        this.data = data;
    }

    _createClass(RxChangeEvent, [{
        key: 'toJSON',
        value: function toJSON() {
            var ret = {
                op: this.data.op,
                t: this.data.t,
                db: this.data.db,
                it: this.data.it
            };
            if (this.data.col) ret.col = this.data.col;
            if (this.data.doc) ret.doc = this.data.doc;
            if (this.data.v) ret.v = this.data.v;
            return ret;
        }
    }, {
        key: 'isIntern',
        value: function isIntern() {
            if (this.data.col && this.data.col.charAt(0) == '_') return true;
            return false;
        }
    }, {
        key: 'isSocket',
        value: function isSocket() {
            if (this.data.col && this.data.col == '_socket') return true;
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
}();

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
    var data = {
        op: op,
        t: new Date().getTime(),
        db: database.prefix,
        it: database.token
    };
    if (collection) data.col = collection.name;
    if (doc) data.doc = doc.getPrimary();
    if (value) data.v = value;
    return new RxChangeEvent(data);
}
