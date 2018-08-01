'use strict';

Object.defineProperty(exports, "__esModule", {
    value: true
});
exports.hooks = exports.overwritable = exports.prototypes = exports.rxdb = exports.RxReplicationState = undefined;

var _classCallCheck2 = require('babel-runtime/helpers/classCallCheck');

var _classCallCheck3 = _interopRequireDefault(_classCallCheck2);

var _createClass2 = require('babel-runtime/helpers/createClass');

var _createClass3 = _interopRequireDefault(_createClass2);

exports.createRxReplicationState = createRxReplicationState;
exports.watchForChanges = watchForChanges;
exports.sync = sync;

var _pouchdbReplication = require('pouchdb-replication');

var _pouchdbReplication2 = _interopRequireDefault(_pouchdbReplication);

var _rxjs = require('rxjs');

var _operators = require('rxjs/operators');

var _util = require('../util');

var _core = require('../core');

var _core2 = _interopRequireDefault(_core);

var _rxCollection = require('../rx-collection');

var _rxCollection2 = _interopRequireDefault(_rxCollection);

var _rxChangeEvent = require('../rx-change-event');

var _rxChangeEvent2 = _interopRequireDefault(_rxChangeEvent);

var _rxError = require('../rx-error');

var _rxError2 = _interopRequireDefault(_rxError);

var _pouchDb = require('../pouch-db');

var _pouchDb2 = _interopRequireDefault(_pouchDb);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

// add pouchdb-replication-plugin
_core2['default'].plugin(_pouchdbReplication2['default']); /**
                                                            * this plugin adds the RxCollection.sync()-function to rxdb
                                                            * you can use it to sync collections with remote or local couchdb-instances
                                                            */

var INTERNAL_POUCHDBS = new WeakSet();

var RxReplicationState = exports.RxReplicationState = function () {
    function RxReplicationState(collection) {
        var _this = this;

        (0, _classCallCheck3['default'])(this, RxReplicationState);

        this._subs = [];
        this.collection = collection;
        this._pouchEventEmitterObject = null;
        this._subjects = {
            change: new _rxjs.Subject(),
            docs: new _rxjs.Subject(),
            active: new _rxjs.BehaviorSubject(false),
            complete: new _rxjs.BehaviorSubject(false),
            error: new _rxjs.Subject()
        };

        // create getters
        Object.keys(this._subjects).forEach(function (key) {
            Object.defineProperty(_this, key + '$', {
                get: function get() {
                    return this._subjects[key].asObservable();
                }
            });
        });
    }

    (0, _createClass3['default'])(RxReplicationState, [{
        key: 'setPouchEventEmitter',
        value: function setPouchEventEmitter(evEmitter) {
            var _this2 = this;

            if (this._pouchEventEmitterObject) throw _rxError2['default'].newRxError('RC1');
            this._pouchEventEmitterObject = evEmitter;

            // change
            this._subs.push((0, _rxjs.fromEvent)(evEmitter, 'change').subscribe(function (ev) {
                return _this2._subjects.change.next(ev);
            }));

            // docs
            this._subs.push((0, _rxjs.fromEvent)(evEmitter, 'change').subscribe(function (ev) {
                if (_this2._subjects.docs.observers.length === 0 || ev.direction !== 'pull') return;

                ev.change.docs.filter(function (doc) {
                    return doc.language !== 'query';
                }) // remove internal docs
                .map(function (doc) {
                    return _this2.collection._handleFromPouch(doc);
                }) // do primary-swap and keycompression
                .forEach(function (doc) {
                    return _this2._subjects.docs.next(doc);
                });
            }));

            // error
            this._subs.push((0, _rxjs.fromEvent)(evEmitter, 'error').subscribe(function (ev) {
                return _this2._subjects.error.next(ev);
            }));

            // active
            this._subs.push((0, _rxjs.fromEvent)(evEmitter, 'active').subscribe(function () {
                return _this2._subjects.active.next(true);
            }));
            this._subs.push((0, _rxjs.fromEvent)(evEmitter, 'paused').subscribe(function () {
                return _this2._subjects.active.next(false);
            }));

            // complete
            this._subs.push((0, _rxjs.fromEvent)(evEmitter, 'complete').subscribe(function (info) {
                return _this2._subjects.complete.next(info);
            }));
        }
    }, {
        key: 'cancel',
        value: function cancel() {
            if (this._pouchEventEmitterObject) this._pouchEventEmitterObject.cancel();
            this._subs.forEach(function (sub) {
                return sub.unsubscribe();
            });
        }
    }]);
    return RxReplicationState;
}();

function createRxReplicationState(collection) {
    return new RxReplicationState(collection);
}

/**
 * waits for external changes to the database
 * and ensures they are emitted to the internal RxChangeEvent-Stream
 * TODO this can be removed by listening to the pull-change-events of the RxReplicationState
 */
function watchForChanges() {
    var _this3 = this;

    if (this.synced) return;

    /**
     * this will grap the changes and publish them to the rx-stream
     * this is to ensure that changes from 'synced' dbs will be published
     */
    var sendChanges = {};
    var pouch$ = (0, _rxjs.fromEvent)(this.pouch.changes({
        since: 'now',
        live: true,
        include_docs: true
    }), 'change').pipe((0, _operators.map)(function (ar) {
        return ar[0];
    }), // rxjs6.x fires an array for whatever reason
    (0, _operators.filter)(function (c) {
        return c.id.charAt(0) !== '_';
    }), (0, _operators.map)(function (c) {
        return c.doc;
    }), (0, _operators.filter)(function (doc) {
        return !_this3._changeEventBuffer.buffer.map(function (cE) {
            return cE.data.v._rev;
        }).includes(doc._rev);
    }), (0, _operators.filter)(function (doc) {
        return sendChanges[doc._rev] = 'YES';
    }),
    // w8 2 ticks because pouchdb might also stream this event again from another process when multiInstance
    (0, _operators.delay)(0), (0, _operators.delay)(0), (0, _operators.map)(function (doc) {
        var ret = null;
        if (sendChanges[doc._rev] === 'YES') ret = doc;
        delete sendChanges[doc._rev];
        return ret;
    }), (0, _operators.filter)(function (doc) {
        return doc !== null;
    })).subscribe(function (doc) {
        _this3.$emit(_rxChangeEvent2['default'].fromPouchChange(doc, _this3));
    });

    this._subs.push(pouch$);

    var ob2 = this.$.pipe((0, _operators.map)(function (cE) {
        return cE.data.v;
    }), (0, _operators.map)(function (doc) {
        if (doc && sendChanges[doc._rev]) sendChanges[doc._rev] = 'NO';
    })).subscribe();
    this._subs.push(ob2);

    this.synced = true;
}

function sync(_ref) {
    var _this4 = this;

    var remote = _ref.remote,
        _ref$waitForLeadershi = _ref.waitForLeadership,
        waitForLeadership = _ref$waitForLeadershi === undefined ? true : _ref$waitForLeadershi,
        _ref$direction = _ref.direction,
        direction = _ref$direction === undefined ? {
        pull: true,
        push: true
    } : _ref$direction,
        _ref$options = _ref.options,
        options = _ref$options === undefined ? {
        live: true,
        retry: true
    } : _ref$options,
        query = _ref.query;

    options = (0, _util.clone)(options);

    // prevent #641 by not allowing internal pouchdbs as remote
    if (_pouchDb2['default'].isInstanceOf(remote) && INTERNAL_POUCHDBS.has(remote)) {
        throw _rxError2['default'].newRxError('RC3', {
            database: this.database.name,
            collection: this.name
        });
    }

    // if remote is RxCollection, get internal pouchdb
    if (_rxCollection2['default'].isInstanceOf(remote)) {
        remote.watchForChanges();
        remote = remote.pouch;
    }

    if (query && this !== query.collection) {
        throw _rxError2['default'].newRxError('RC2', {
            query: query
        });
    }

    var syncFun = (0, _util.pouchReplicationFunction)(this.pouch, direction);
    if (query) options.selector = query.keyCompress().selector;

    var repState = createRxReplicationState(this);

    // run internal so .sync() does not have to be async
    var waitTillRun = waitForLeadership ? this.database.waitForLeadership() : (0, _util.promiseWait)(0);
    waitTillRun.then(function () {
        var pouchSync = syncFun(remote, options);
        _this4.watchForChanges();
        repState.setPouchEventEmitter(pouchSync);
        _this4._repStates.push(repState);
    });

    return repState;
}

var rxdb = exports.rxdb = true;
var prototypes = exports.prototypes = {
    RxCollection: function RxCollection(proto) {
        proto.watchForChanges = watchForChanges;
        proto.sync = sync;
    }
};

var overwritable = exports.overwritable = {};

var hooks = exports.hooks = {
    createRxCollection: function createRxCollection(collection) {
        INTERNAL_POUCHDBS.add(collection.pouch);
    }
};

exports['default'] = {
    rxdb: rxdb,
    prototypes: prototypes,
    overwritable: overwritable,
    hooks: hooks,
    watchForChanges: watchForChanges,
    sync: sync
};
