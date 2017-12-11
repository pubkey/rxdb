import _regeneratorRuntime from 'babel-runtime/regenerator';
import _asyncToGenerator from 'babel-runtime/helpers/asyncToGenerator';
import _classCallCheck from 'babel-runtime/helpers/classCallCheck';
import _possibleConstructorReturn from 'babel-runtime/helpers/possibleConstructorReturn';
import _inherits from 'babel-runtime/helpers/inherits';
/**
 * This plugin adds RxCollection.inMemory()
 * Which replicates the collection into an in-memory-collection
 * So you can do faster queries and also query over encrypted fields
 */

import clone from 'clone';
import { Subject } from 'rxjs/Subject';

import RxCollection from '../rx-collection';
import * as util from '../util';
import Crypter from '../crypter';
import ChangeEventBuffer from '../change-event-buffer';
import RxSchema from '../rx-schema';
import PouchDB from '../pouch-db';
import RxError from '../rx-error';

var collectionCacheMap = new WeakMap();
var collectionPromiseCacheMap = new WeakMap();
var BULK_DOC_OPTIONS = {
    new_edits: false
};

export var InMemoryRxCollection = function (_RxCollection$RxColle) {
    _inherits(InMemoryRxCollection, _RxCollection$RxColle);

    function InMemoryRxCollection(parentCollection, pouchSettings) {
        _classCallCheck(this, InMemoryRxCollection);

        var _this = _possibleConstructorReturn(this, _RxCollection$RxColle.call(this, parentCollection.database, parentCollection.name, toCleanSchema(parentCollection.schema), pouchSettings, // pouchSettings
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

    InMemoryRxCollection.prototype.prepare = function () {
        var _ref = _asyncToGenerator( /*#__PURE__*/_regeneratorRuntime.mark(function _callee() {
            var _this2 = this;

            return _regeneratorRuntime.wrap(function _callee$(_context) {
                while (1) {
                    switch (_context.prev = _context.next) {
                        case 0:
                            this._crypter = Crypter.create(this.database.password, this.schema);

                            this.pouch = new PouchDB('rxdb-in-memory-' + util.randomCouchString(10), util.adapterObject('memory'), {});

                            this._observable$ = new Subject();
                            this._changeEventBuffer = ChangeEventBuffer.create(this);

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
    }();

    /**
     * this does the initial sync
     * so that the in-memory-collection has the same docs as the original
     * @return {Promise}
     */


    InMemoryRxCollection.prototype._initialSync = function () {
        var _ref2 = _asyncToGenerator( /*#__PURE__*/_regeneratorRuntime.mark(function _callee4() {
            var _this3 = this;

            var allRows, fromOwnStream, fromParentStream;
            return _regeneratorRuntime.wrap(function _callee4$(_context4) {
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
                                var _ref3 = _asyncToGenerator( /*#__PURE__*/_regeneratorRuntime.mark(function _callee2(change) {
                                    var doc;
                                    return _regeneratorRuntime.wrap(function _callee2$(_context2) {
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
                                var _ref4 = _asyncToGenerator( /*#__PURE__*/_regeneratorRuntime.mark(function _callee3(change) {
                                    var doc;
                                    return _regeneratorRuntime.wrap(function _callee3$(_context3) {
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
    }();

    /**
     * @overwrite
     */


    InMemoryRxCollection.prototype.$emit = function $emit(changeEvent) {
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
    };

    return InMemoryRxCollection;
}(RxCollection.RxCollection);;

function toCleanSchema(rxSchema) {
    var newSchemaJson = clone(rxSchema.jsonID);
    newSchemaJson.disableKeyCompression = true;
    delete newSchemaJson.properties._id;
    delete newSchemaJson.properties._rev;
    delete newSchemaJson.properties._attachments;

    var removeEncryption = function removeEncryption(schema, complete) {
        delete schema.encrypted;
        Object.values(schema).filter(function (val) {
            return typeof val === 'object';
        }).forEach(function (val) {
            return removeEncryption(val, complete);
        });
    };
    removeEncryption(newSchemaJson, newSchemaJson);

    return RxSchema.create(newSchemaJson);
}

var INIT_DONE = false;
/**
 * called in the proto of RxCollection
 * @return {Promise<RxCollection>}
 */
export var spawnInMemory = function () {
    var _ref5 = _asyncToGenerator( /*#__PURE__*/_regeneratorRuntime.mark(function _callee5() {
        var col, preparePromise;
        return _regeneratorRuntime.wrap(function _callee5$(_context5) {
            while (1) {
                switch (_context5.prev = _context5.next) {
                    case 0:
                        if (INIT_DONE) {
                            _context5.next = 4;
                            break;
                        }

                        INIT_DONE = true;
                        // ensure memory-adapter is added

                        if (!(!PouchDB.adapters || !PouchDB.adapters.memory)) {
                            _context5.next = 4;
                            break;
                        }

                        throw RxError.newRxError('IM1');

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
}();;

export var rxdb = true;
export var prototypes = {
    RxCollection: function RxCollection(proto) {
        proto.inMemory = spawnInMemory;
    }
};
export var overwritable = {};

export default {
    rxdb: rxdb,
    prototypes: prototypes,
    overwritable: overwritable,
    spawnInMemory: spawnInMemory
};