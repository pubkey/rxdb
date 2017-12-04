'use strict';

Object.defineProperty(exports, "__esModule", {
    value: true
});
exports.overwritable = exports.prototypes = exports.rxdb = exports.RxReplicationState = undefined;

var _regenerator = require('babel-runtime/regenerator');

var _regenerator2 = _interopRequireDefault(_regenerator);

var _asyncToGenerator2 = require('babel-runtime/helpers/asyncToGenerator');

var _asyncToGenerator3 = _interopRequireDefault(_asyncToGenerator2);

var _classCallCheck2 = require('babel-runtime/helpers/classCallCheck');

var _classCallCheck3 = _interopRequireDefault(_classCallCheck2);

var _createClass2 = require('babel-runtime/helpers/createClass');

var _createClass3 = _interopRequireDefault(_createClass2);

exports.createRxReplicationState = createRxReplicationState;
exports.watchForChanges = watchForChanges;
exports.sync = sync;

var _clone = require('clone');

var _clone2 = _interopRequireDefault(_clone);

var _pouchdbReplication = require('pouchdb-replication');

var _pouchdbReplication2 = _interopRequireDefault(_pouchdbReplication);

var _Subject = require('rxjs/Subject');

var _BehaviorSubject = require('rxjs/BehaviorSubject');

var _fromEvent = require('rxjs/observable/fromEvent');

var _filter = require('rxjs/operators/filter');

var _map = require('rxjs/operators/map');

var _delay = require('rxjs/operators/delay');

var _util = require('../util');

var util = _interopRequireWildcard(_util);

var _core = require('../core');

var _core2 = _interopRequireDefault(_core);

var _rxCollection = require('../rx-collection');

var _rxCollection2 = _interopRequireDefault(_rxCollection);

var _rxChangeEvent = require('../rx-change-event');

var _rxChangeEvent2 = _interopRequireDefault(_rxChangeEvent);

var _rxError = require('../rx-error');

var _rxError2 = _interopRequireDefault(_rxError);

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) newObj[key] = obj[key]; } } newObj['default'] = obj; return newObj; } }

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

// add pouchdb-replication-plugin
_core2['default'].plugin(_pouchdbReplication2['default']); /**
                                                            * this plugin adds the RxCollection.sync()-function to rxdb
                                                            * you can use it to sync collections with remote or local couchdb-instances
                                                            */

var RxReplicationState = exports.RxReplicationState = function () {
    function RxReplicationState(collection) {
        var _this = this;

        (0, _classCallCheck3['default'])(this, RxReplicationState);

        this._subs = [];
        this.collection = collection;
        this._pouchEventEmitterObject = null;
        this._subjects = {
            change: new _Subject.Subject(),
            docs: new _Subject.Subject(),
            active: new _BehaviorSubject.BehaviorSubject(false),
            complete: new _BehaviorSubject.BehaviorSubject(false),
            error: new _Subject.Subject()
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
            this._subs.push((0, _fromEvent.fromEvent)(evEmitter, 'change').subscribe(function (ev) {
                return _this2._subjects.change.next(ev);
            }));

            // docs
            this._subs.push((0, _fromEvent.fromEvent)(evEmitter, 'change').subscribe(function (ev) {
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
            this._subs.push((0, _fromEvent.fromEvent)(evEmitter, 'error').subscribe(function (ev) {
                return _this2._subjects.error.next(ev);
            }));

            // active
            this._subs.push((0, _fromEvent.fromEvent)(evEmitter, 'active').subscribe(function () {
                return _this2._subjects.active.next(true);
            }));
            this._subs.push((0, _fromEvent.fromEvent)(evEmitter, 'paused').subscribe(function () {
                return _this2._subjects.active.next(false);
            }));

            // complete
            this._subs.push((0, _fromEvent.fromEvent)(evEmitter, 'complete').subscribe(function (info) {
                return _this2._subjects.complete.next(info);
            }));
        }
    }, {
        key: 'cancel',
        value: function () {
            var _ref = (0, _asyncToGenerator3['default'])( /*#__PURE__*/_regenerator2['default'].mark(function _callee() {
                return _regenerator2['default'].wrap(function _callee$(_context) {
                    while (1) {
                        switch (_context.prev = _context.next) {
                            case 0:
                                if (this._pouchEventEmitterObject) this._pouchEventEmitterObject.cancel();
                                this._subs.forEach(function (sub) {
                                    return sub.unsubscribe();
                                });

                            case 2:
                            case 'end':
                                return _context.stop();
                        }
                    }
                }, _callee, this);
            }));

            function cancel() {
                return _ref.apply(this, arguments);
            }

            return cancel;
        }()
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
    var pouch$ = (0, _fromEvent.fromEvent)(this.pouch.changes({
        since: 'now',
        live: true,
        include_docs: true
    }), 'change').pipe((0, _filter.filter)(function (c) {
        return c.id.charAt(0) !== '_';
    }), (0, _map.map)(function (c) {
        return c.doc;
    }), (0, _filter.filter)(function (doc) {
        return !_this3._changeEventBuffer.buffer.map(function (cE) {
            return cE.data.v._rev;
        }).includes(doc._rev);
    }), (0, _filter.filter)(function (doc) {
        return sendChanges[doc._rev] = 'YES';
    }), (0, _delay.delay)(10), (0, _map.map)(function (doc) {
        var ret = null;
        if (sendChanges[doc._rev] === 'YES') ret = doc;
        delete sendChanges[doc._rev];
        return ret;
    }), (0, _filter.filter)(function (doc) {
        return doc !== null;
    })).subscribe(function (doc) {
        _this3.$emit(_rxChangeEvent2['default'].fromPouchChange(doc, _this3));
    });

    this._subs.push(pouch$);

    var ob2 = this.$.pipe((0, _map.map)(function (cE) {
        return cE.data.v;
    }), (0, _map.map)(function (doc) {
        if (doc && sendChanges[doc._rev]) sendChanges[doc._rev] = 'NO';
    })).subscribe();
    this._subs.push(ob2);

    this.synced = true;
}

function sync(_ref2) {
    var _this4 = this;

    var remote = _ref2.remote,
        _ref2$waitForLeadersh = _ref2.waitForLeadership,
        waitForLeadership = _ref2$waitForLeadersh === undefined ? true : _ref2$waitForLeadersh,
        _ref2$direction = _ref2.direction,
        direction = _ref2$direction === undefined ? {
        pull: true,
        push: true
    } : _ref2$direction,
        _ref2$options = _ref2.options,
        options = _ref2$options === undefined ? {
        live: true,
        retry: true
    } : _ref2$options,
        query = _ref2.query;

    options = (0, _clone2['default'])(options);
    // if remote is RxCollection, get internal pouchdb
    if (_rxCollection2['default'].isInstanceOf(remote)) remote = remote.pouch;

    if (query && this !== query.collection) {
        throw _rxError2['default'].newRxError('RC2', {
            query: query
        });
    }

    var syncFun = util.pouchReplicationFunction(this.pouch, direction);
    if (query) options.selector = query.keyCompress().selector;

    var repState = createRxReplicationState(this);

    // run internal so .sync() does not have to be async
    (0, _asyncToGenerator3['default'])( /*#__PURE__*/_regenerator2['default'].mark(function _callee2() {
        var pouchSync;
        return _regenerator2['default'].wrap(function _callee2$(_context2) {
            while (1) {
                switch (_context2.prev = _context2.next) {
                    case 0:
                        if (!waitForLeadership) {
                            _context2.next = 5;
                            break;
                        }

                        _context2.next = 3;
                        return _this4.database.waitForLeadership();

                    case 3:
                        _context2.next = 7;
                        break;

                    case 5:
                        _context2.next = 7;
                        return util.promiseWait(0);

                    case 7:
                        pouchSync = syncFun(remote, options);

                        _this4.watchForChanges();
                        repState.setPouchEventEmitter(pouchSync);
                        _this4._repStates.push(repState);

                    case 11:
                    case 'end':
                        return _context2.stop();
                }
            }
        }, _callee2, _this4);
    }))();
    return repState;
};

var rxdb = exports.rxdb = true;
var prototypes = exports.prototypes = {
    RxCollection: function RxCollection(proto) {
        proto.watchForChanges = watchForChanges;
        proto.sync = sync;
    }
};

var overwritable = exports.overwritable = {};

exports['default'] = {
    rxdb: rxdb,
    prototypes: prototypes,
    overwritable: overwritable,
    watchForChanges: watchForChanges,
    sync: sync
};
