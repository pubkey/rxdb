'use strict';

Object.defineProperty(exports, "__esModule", {
    value: true
});

var _regenerator = require('babel-runtime/regenerator');

var _regenerator2 = _interopRequireDefault(_regenerator);

var _asyncToGenerator2 = require('babel-runtime/helpers/asyncToGenerator');

var _asyncToGenerator3 = _interopRequireDefault(_asyncToGenerator2);

var _classCallCheck2 = require('babel-runtime/helpers/classCallCheck');

var _classCallCheck3 = _interopRequireDefault(_classCallCheck2);

var _createClass2 = require('babel-runtime/helpers/createClass');

var _createClass3 = _interopRequireDefault(_createClass2);

exports.create = create;

var _util = require('./util');

var util = _interopRequireWildcard(_util);

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) newObj[key] = obj[key]; } } newObj['default'] = obj; return newObj; } }

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

var RxReplicationState = function () {
    function RxReplicationState(collection) {
        var _this = this;

        (0, _classCallCheck3['default'])(this, RxReplicationState);

        this._subs = [];
        this.collection = collection;
        this._pouchEventEmitterObject = null;
        this._subjects = {
            change: new util.Rx.Subject(),
            docs: new util.Rx.Subject(),
            active: new util.Rx.BehaviorSubject(false),
            complete: new util.Rx.BehaviorSubject(false),
            error: new util.Rx.Subject()
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

            if (this._pouchEventEmitterObject) throw new Error('already added');
            this._pouchEventEmitterObject = evEmitter;

            // change
            this._subs.push(util.Rx.Observable.fromEvent(evEmitter, 'change').subscribe(function (ev) {
                return _this2._subjects.change.next(ev);
            }));

            // docs
            this._subs.push(util.Rx.Observable.fromEvent(evEmitter, 'change').subscribe(function (ev) {
                if (_this2._subjects.docs.observers.length === 0 || ev.direction !== 'pull') return;

                var docs = ev.change.docs.filter(function (doc) {
                    return doc.language !== 'query';
                } // remove internal docs
                ).map(function (doc) {
                    return _this2.collection._handleFromPouch(doc);
                } // do primary-swap and keycompression
                ).forEach(function (doc) {
                    return _this2._subjects.docs.next(doc);
                });
            }));

            // error
            this._subs.push(util.Rx.Observable.fromEvent(evEmitter, 'error').subscribe(function (ev) {
                return _this2._subjects.error.next(ev);
            }));

            // active
            this._subs.push(util.Rx.Observable.fromEvent(evEmitter, 'active').subscribe(function (ev) {
                return _this2._subjects.active.next(true);
            }));
            this._subs.push(util.Rx.Observable.fromEvent(evEmitter, 'paused').subscribe(function (ev) {
                return _this2._subjects.active.next(false);
            }));

            // complete
            this._subs.push(util.Rx.Observable.fromEvent(evEmitter, 'complete').subscribe(function (info) {
                return _this2._subjects.complete.next(info);
            }));
        }
    }, {
        key: 'cancel',
        value: function () {
            var _ref = (0, _asyncToGenerator3['default'])(_regenerator2['default'].mark(function _callee() {
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
}(); /**
      * This is the replication-state which you get back from calling RxCollection.sync()
      * It wraps the object of events which gets back from pouchdb.sync() or pouchdb.replicate()
      * Reason:
      * 1. Get rxjs-observables instead of event-emitters
      * 2. Create RxChangeEvents from the pull-changes and emit them to the local change-stream
      */

function create(collection) {
    return new RxReplicationState(collection);
}
