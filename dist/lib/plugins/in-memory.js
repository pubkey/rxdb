'use strict';

Object.defineProperty(exports, "__esModule", {
    value: true
});
exports.overwritable = exports.prototypes = exports.rxdb = exports.spawnInMemory = exports.InMemoryRxCollection = undefined;

var _typeof2 = require('babel-runtime/helpers/typeof');

var _typeof3 = _interopRequireDefault(_typeof2);

var _regenerator = require('babel-runtime/regenerator');

var _regenerator2 = _interopRequireDefault(_regenerator);

var _asyncToGenerator2 = require('babel-runtime/helpers/asyncToGenerator');

var _asyncToGenerator3 = _interopRequireDefault(_asyncToGenerator2);

var _classCallCheck2 = require('babel-runtime/helpers/classCallCheck');

var _classCallCheck3 = _interopRequireDefault(_classCallCheck2);

var _createClass2 = require('babel-runtime/helpers/createClass');

var _createClass3 = _interopRequireDefault(_createClass2);

var _possibleConstructorReturn2 = require('babel-runtime/helpers/possibleConstructorReturn');

var _possibleConstructorReturn3 = _interopRequireDefault(_possibleConstructorReturn2);

var _inherits2 = require('babel-runtime/helpers/inherits');

var _inherits3 = _interopRequireDefault(_inherits2);

/**
 * called in the proto of RxCollection
 * @return {Promise<RxCollection>}
 */
var spawnInMemory = exports.spawnInMemory = function () {
    var _ref5 = (0, _asyncToGenerator3['default'])( /*#__PURE__*/_regenerator2['default'].mark(function _callee5() {
        var col, preparePromise;
        return _regenerator2['default'].wrap(function _callee5$(_context5) {
            while (1) {
                switch (_context5.prev = _context5.next) {
                    case 0:
                        if (INIT_DONE) {
                            _context5.next = 4;
                            break;
                        }

                        INIT_DONE = true;
                        // ensure memory-adapter is added

                        if (!(!_pouchDb2['default'].adapters || !_pouchDb2['default'].adapters.memory)) {
                            _context5.next = 4;
                            break;
                        }

                        throw _rxError2['default'].newRxError('IM1');

                    case 4:
                        if (!collectionCacheMap.has(this)) {
                            _context5.next = 8;
                            break;
                        }

                        _context5.next = 7;
                        return collectionPromiseCacheMap.get(this);

                    case 7:
                        return _context5.abrupt('return', collectionCacheMap.get(this));

                    case 8:
                        col = new InMemoryRxCollection(this);
                        preparePromise = col.prepare();

                        collectionCacheMap.set(this, col);
                        collectionPromiseCacheMap.set(this, preparePromise);

                        _context5.next = 14;
                        return preparePromise;

                    case 14:
                        return _context5.abrupt('return', col);

                    case 15:
                    case 'end':
                        return _context5.stop();
                }
            }
        }, _callee5, this);
    }));

    return function spawnInMemory() {
        return _ref5.apply(this, arguments);
    };
}();

var _clone = require('clone');

var _clone2 = _interopRequireDefault(_clone);

var _Subject = require('rxjs/Subject');

var _rxCollection = require('../rx-collection');

var _rxCollection2 = _interopRequireDefault(_rxCollection);

var _util = require('../util');

var util = _interopRequireWildcard(_util);

var _crypter = require('../crypter');

var _crypter2 = _interopRequireDefault(_crypter);

var _changeEventBuffer = require('../change-event-buffer');

var _changeEventBuffer2 = _interopRequireDefault(_changeEventBuffer);

var _rxSchema = require('../rx-schema');

var _rxSchema2 = _interopRequireDefault(_rxSchema);

var _pouchDb = require('../pouch-db');

var _pouchDb2 = _interopRequireDefault(_pouchDb);

var _rxError = require('../rx-error');

var _rxError2 = _interopRequireDefault(_rxError);

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) newObj[key] = obj[key]; } } newObj['default'] = obj; return newObj; } }

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

var collectionCacheMap = new WeakMap(); /**
                                         * This plugin adds RxCollection.inMemory()
                                         * Which replicates the collection into an in-memory-collection
                                         * So you can do faster queries and also query over encrypted fields
                                         */

var collectionPromiseCacheMap = new WeakMap();
var BULK_DOC_OPTIONS = {
    new_edits: false
};

var InMemoryRxCollection = exports.InMemoryRxCollection = function (_RxCollection$RxColle) {
    (0, _inherits3['default'])(InMemoryRxCollection, _RxCollection$RxColle);

    function InMemoryRxCollection(parentCollection, pouchSettings) {
        (0, _classCallCheck3['default'])(this, InMemoryRxCollection);

        var _this = (0, _possibleConstructorReturn3['default'])(this, (InMemoryRxCollection.__proto__ || Object.getPrototypeOf(InMemoryRxCollection)).call(this, parentCollection.database, parentCollection.name, toCleanSchema(parentCollection.schema), pouchSettings, // pouchSettings
        {}, parentCollection._methods));
        //constructor(database, name, schema, pouchSettings, migrationStrategies, methods) {


        _this._isInMemory = true;
        _this._parentCollection = parentCollection;
        _this._parentCollection.onDestroy.then(function () {
            return _this.destroy();
        });

        _this._changeStreams = [];

        /**
         * runs on parentCollection.destroy()
         * Cleans up everything to free up memory
         */
        _this.onDestroy.then(function () {
            _this._changeStreams.forEach(function (stream) {
                return stream.cancel();
            });
            _this.pouch.destroy();
        });
        return _this;
    }

    (0, _createClass3['default'])(InMemoryRxCollection, [{
        key: 'prepare',
        value: function () {
            var _ref = (0, _asyncToGenerator3['default'])( /*#__PURE__*/_regenerator2['default'].mark(function _callee() {
                var _this2 = this;

                return _regenerator2['default'].wrap(function _callee$(_context) {
                    while (1) {
                        switch (_context.prev = _context.next) {
                            case 0:
                                this._crypter = _crypter2['default'].create(this.database.password, this.schema);

                                this.pouch = new _pouchDb2['default']('rxdb-in-memory-' + util.randomCouchString(10), util.adapterObject('memory'), {});

                                this._observable$ = new _Subject.Subject();
                                this._changeEventBuffer = _changeEventBuffer2['default'].create(this);

                                // INDEXES
                                _context.next = 6;
                                return Promise.all(this.schema.indexes.map(function (indexAr) {
                                    return _this2.pouch.createIndex({
                                        index: {
                                            fields: indexAr
                                        }
                                    });
                                }));

                            case 6:

                                this._subs.push(this._observable$.subscribe(function (cE) {
                                    // when data changes, send it to RxDocument in docCache
                                    var doc = _this2._docCache.get(cE.data.doc);
                                    if (doc) doc._handleChangeEvent(cE);
                                }));

                                _context.next = 9;
                                return this._initialSync();

                            case 9:
                            case 'end':
                                return _context.stop();
                        }
                    }
                }, _callee, this);
            }));

            function prepare() {
                return _ref.apply(this, arguments);
            }

            return prepare;
        }()

        /**
         * this does the initial sync
         * so that the in-memory-collection has the same docs as the original
         * @return {Promise}
         */

    }, {
        key: '_initialSync',
        value: function () {
            var _ref2 = (0, _asyncToGenerator3['default'])( /*#__PURE__*/_regenerator2['default'].mark(function _callee4() {
                var _this3 = this;

                var allRows, fromOwnStream, fromParentStream;
                return _regenerator2['default'].wrap(function _callee4$(_context4) {
                    while (1) {
                        switch (_context4.prev = _context4.next) {
                            case 0:
                                _context4.next = 2;
                                return this._parentCollection.pouch.allDocs({
                                    attachments: false,
                                    include_docs: true
                                });

                            case 2:
                                allRows = _context4.sent;
                                _context4.next = 5;
                                return this.pouch.bulkDocs({
                                    docs: allRows.rows.map(function (row) {
                                        return row.doc;
                                    }).filter(function (doc) {
                                        return !doc.language;
                                    }) // do not replicate design-docs
                                    .map(function (doc) {
                                        return _this3._parentCollection._handleFromPouch(doc);
                                    })
                                    // swap back primary because disableKeyCompression:true
                                    .map(function (doc) {
                                        return _this3._parentCollection.schema.swapPrimaryToId(doc);
                                    })
                                }, BULK_DOC_OPTIONS);

                            case 5:

                                // sync from own to parent
                                this._parentCollection.watchForChanges();
                                this.watchForChanges();
                                fromOwnStream = this.pouch.changes({
                                    since: 'now',
                                    include_docs: true,
                                    live: true
                                }).on('change', function () {
                                    var _ref3 = (0, _asyncToGenerator3['default'])( /*#__PURE__*/_regenerator2['default'].mark(function _callee2(change) {
                                        var doc;
                                        return _regenerator2['default'].wrap(function _callee2$(_context2) {
                                            while (1) {
                                                switch (_context2.prev = _context2.next) {
                                                    case 0:
                                                        doc = _this3._parentCollection._handleToPouch(change.doc);
                                                        // console.log('write to parent:');
                                                        // console.dir(doc);

                                                        _this3._parentCollection.pouch.bulkDocs({
                                                            docs: [doc]
                                                        }, BULK_DOC_OPTIONS);

                                                    case 2:
                                                    case 'end':
                                                        return _context2.stop();
                                                }
                                            }
                                        }, _callee2, _this3);
                                    }));

                                    return function (_x) {
                                        return _ref3.apply(this, arguments);
                                    };
                                }());

                                this._changeStreams.push(fromOwnStream);

                                // sync from parent to own
                                fromParentStream = this._parentCollection.pouch.changes({
                                    since: 'now',
                                    include_docs: true,
                                    live: true
                                }).on('change', function () {
                                    var _ref4 = (0, _asyncToGenerator3['default'])( /*#__PURE__*/_regenerator2['default'].mark(function _callee3(change) {
                                        var doc;
                                        return _regenerator2['default'].wrap(function _callee3$(_context3) {
                                            while (1) {
                                                switch (_context3.prev = _context3.next) {
                                                    case 0:
                                                        doc = _this3._parentCollection._handleFromPouch(change.doc);

                                                        doc = _this3.schema.swapPrimaryToId(doc);
                                                        // console.log('write to own2:');
                                                        // console.dir(doc);
                                                        _this3.pouch.bulkDocs({
                                                            docs: [doc]
                                                        }, BULK_DOC_OPTIONS);

                                                    case 3:
                                                    case 'end':
                                                        return _context3.stop();
                                                }
                                            }
                                        }, _callee3, _this3);
                                    }));

                                    return function (_x2) {
                                        return _ref4.apply(this, arguments);
                                    };
                                }());

                                this._changeStreams.push(fromParentStream);

                            case 11:
                            case 'end':
                                return _context4.stop();
                        }
                    }
                }, _callee4, this);
            }));

            function _initialSync() {
                return _ref2.apply(this, arguments);
            }

            return _initialSync;
        }()

        /**
         * @overwrite
         */

    }, {
        key: '$emit',
        value: function $emit(changeEvent) {
            this._observable$.next(changeEvent);

            // run compaction each 10 events
            if (!this._eventCounter) this._eventCounter = 0;
            this._eventCounter++;
            if (this._eventCounter === 10) {
                this._eventCounter = 0;
                this.pouch.compact();
            }

            //        console.log('$emit called:');
            //        console.dir(changeEvent);
        }
    }]);
    return InMemoryRxCollection;
}(_rxCollection2['default'].RxCollection);

;

function toCleanSchema(rxSchema) {
    var newSchemaJson = (0, _clone2['default'])(rxSchema.jsonID);
    newSchemaJson.disableKeyCompression = true;
    delete newSchemaJson.properties._id;
    delete newSchemaJson.properties._rev;
    delete newSchemaJson.properties._attachments;

    var removeEncryption = function removeEncryption(schema, complete) {
        delete schema.encrypted;
        Object.values(schema).filter(function (val) {
            return (typeof val === 'undefined' ? 'undefined' : (0, _typeof3['default'])(val)) === 'object';
        }).forEach(function (val) {
            return removeEncryption(val, complete);
        });
    };
    removeEncryption(newSchemaJson, newSchemaJson);

    return _rxSchema2['default'].create(newSchemaJson);
}

var INIT_DONE = false;;

var rxdb = exports.rxdb = true;
var prototypes = exports.prototypes = {
    RxCollection: function RxCollection(proto) {
        proto.inMemory = spawnInMemory;
    }
};
var overwritable = exports.overwritable = {};

exports['default'] = {
    rxdb: rxdb,
    prototypes: prototypes,
    overwritable: overwritable,
    spawnInMemory: spawnInMemory
};
