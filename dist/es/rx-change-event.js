import _classCallCheck from 'babel-runtime/helpers/classCallCheck';
import _createClass from 'babel-runtime/helpers/createClass';
/**
 * RxChangeEvents a emitted when something in the database changes
 * they can be grabbed by the observables of database, collection and document
 */

import * as util from './util';

export var RxChangeEvent = function () {
    function RxChangeEvent(data) {
        _classCallCheck(this, RxChangeEvent);

        this.data = data;
    }

    RxChangeEvent.prototype.toJSON = function toJSON() {
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

    RxChangeEvent.prototype.isIntern = function isIntern() {
        if (this.data.col && this.data.col.charAt(0) === '_') return true;
        return false;
    };

    RxChangeEvent.prototype.isSocket = function isSocket() {
        if (this.data.col && this.data.col === '_socket') return true;
        return false;
    };

    _createClass(RxChangeEvent, [{
        key: 'hash',
        get: function get() {
            if (!this._hash) this._hash = util.hash(this.data);
            return this._hash;
        }
    }]);

    return RxChangeEvent;
}();

export function fromJSON(data) {
    return new RxChangeEvent(data);
}

export function fromPouchChange(changeDoc, collection) {
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

export function create(op, database, collection, doc, value) {
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

export function isInstanceOf(obj) {
    return obj instanceof RxChangeEvent;
}

export default {
    fromJSON: fromJSON,
    fromPouchChange: fromPouchChange,
    create: create,
    isInstanceOf: isInstanceOf
};