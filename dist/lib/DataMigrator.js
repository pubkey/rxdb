'use strict';

Object.defineProperty(exports, "__esModule", {
    value: true
});

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }(); /**
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      * The DataMigrator handles the documents from collections with older schemas
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      * and transforms/saves them into the newest collection
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      */

exports.create = create;

var _PouchDB = require('./PouchDB');

var _PouchDB2 = _interopRequireDefault(_PouchDB);

var _clone = require('clone');

var _clone2 = _interopRequireDefault(_clone);

var _util = require('./util');

var util = _interopRequireWildcard(_util);

var _RxSchema = require('./RxSchema');

var RxSchema = _interopRequireWildcard(_RxSchema);

var _KeyCompressor = require('./KeyCompressor');

var KeyCompressor = _interopRequireWildcard(_KeyCompressor);

var _Crypter = require('./Crypter');

var Crypter = _interopRequireWildcard(_Crypter);

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) newObj[key] = obj[key]; } } newObj.default = obj; return newObj; } }

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _asyncToGenerator(fn) { return function () { var gen = fn.apply(this, arguments); return new Promise(function (resolve, reject) { function step(key, arg) { try { var info = gen[key](arg); var value = info.value; } catch (error) { reject(error); return; } if (info.done) { resolve(value); } else { return Promise.resolve(value).then(function (value) { step("next", value); }, function (err) { step("throw", err); }); } } return step("next"); }); }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var DataMigrator = function () {
    function DataMigrator(newestCollection, migrationStrategies) {
        _classCallCheck(this, DataMigrator);

        this.newestCollection = newestCollection;
        this.migrationStrategies = migrationStrategies;
        this.currentSchema = newestCollection.schema;
        this.database = newestCollection.database;
        this.name = newestCollection.name;
    }

    /**
     * get an array with OldCollection-instances from all existing old pouchdb-instance
     * @return {OldCollection[]}
     */


    _createClass(DataMigrator, [{
        key: '_getOldCollections',
        value: function () {
            var _ref = _asyncToGenerator(regeneratorRuntime.mark(function _callee() {
                var _this = this;

                var oldColDocs;
                return regeneratorRuntime.wrap(function _callee$(_context) {
                    while (1) {
                        switch (_context.prev = _context.next) {
                            case 0:
                                _context.next = 2;
                                return Promise.all(this.currentSchema.previousVersions.map(function (v) {
                                    return _this.database._collectionsPouch.get(_this.name + '-' + v);
                                }).map(function (fun) {
                                    return fun.catch(function (e) {
                                        return null;
                                    });
                                }) // auto-catch so Promise.all continues
                                );

                            case 2:
                                oldColDocs = _context.sent;
                                return _context.abrupt('return', oldColDocs.filter(function (colDoc) {
                                    return colDoc != null;
                                }).map(function (colDoc) {
                                    return new OldCollection(colDoc.schema.version, colDoc.schema, _this);
                                }));

                            case 4:
                            case 'end':
                                return _context.stop();
                        }
                    }
                }, _callee, this);
            }));

            function _getOldCollections() {
                return _ref.apply(this, arguments);
            }

            return _getOldCollections;
        }()

        /**
         * @param {number} [batchSize=10] amount of documents handled in parallel
         * @return {Observable} emits the migration-state
         */

    }, {
        key: 'migrate',
        value: function migrate() {
            var _this2 = this;

            var batchSize = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : 10;

            if (this._migrated) throw new Error('Migration has already run');
            this._migrated = true;

            var state = {
                done: false, // true if finished
                total: null, // will be the doc-count
                handled: 0, // amount of handled docs
                success: 0, // handled docs which successed
                deleted: 0, // handled docs which got deleted
                percent: 0 // percentage
            };

            var migrationState$ = new util.Rx.Observable(function () {
                var _ref2 = _asyncToGenerator(regeneratorRuntime.mark(function _callee2(observer) {
                    var oldCols, countAll, total_count, currentCol, error, _loop;

                    return regeneratorRuntime.wrap(function _callee2$(_context3) {
                        while (1) {
                            switch (_context3.prev = _context3.next) {
                                case 0:
                                    _context3.next = 2;
                                    return _this2._getOldCollections();

                                case 2:
                                    oldCols = _context3.sent;
                                    _context3.next = 5;
                                    return Promise.all(oldCols.map(function (oldCol) {
                                        return oldCol.countAllUndeleted();
                                    }));

                                case 5:
                                    countAll = _context3.sent;
                                    total_count = countAll.reduce(function (cur, prev) {
                                        return prev = cur + prev;
                                    }, 0);


                                    state.total = total_count;
                                    observer.next((0, _clone2.default)(state));

                                    currentCol = null;
                                    error = null;
                                    _loop = regeneratorRuntime.mark(function _loop() {
                                        var migrationState$;
                                        return regeneratorRuntime.wrap(function _loop$(_context2) {
                                            while (1) {
                                                switch (_context2.prev = _context2.next) {
                                                    case 0:
                                                        migrationState$ = currentCol.migrate(batchSize);
                                                        _context2.next = 3;
                                                        return new Promise(function (res) {
                                                            var sub = migrationState$.subscribe(function (subState) {
                                                                state.handled++;
                                                                state[subState.type] = state[subState.type] + 1;
                                                                state.percent = Math.round(state.handled / state.total * 100);
                                                                observer.next((0, _clone2.default)(state));
                                                            }, function (e) {
                                                                error = e;
                                                                sub.unsubscribe();
                                                                observer.error(e);
                                                            }, function () {
                                                                sub.unsubscribe();
                                                                res();
                                                            });
                                                        });

                                                    case 3:
                                                    case 'end':
                                                        return _context2.stop();
                                                }
                                            }
                                        }, _loop, _this2);
                                    });

                                case 12:
                                    if (!(currentCol = oldCols.shift())) {
                                        _context3.next = 16;
                                        break;
                                    }

                                    return _context3.delegateYield(_loop(), 't0', 14);

                                case 14:
                                    _context3.next = 12;
                                    break;

                                case 16:

                                    state.done = true;
                                    state.percent = 100;
                                    observer.next((0, _clone2.default)(state));

                                    observer.complete();

                                case 20:
                                case 'end':
                                    return _context3.stop();
                            }
                        }
                    }, _callee2, _this2);
                }));

                return function (_x2) {
                    return _ref2.apply(this, arguments);
                };
            }());
            return migrationState$;
        }
    }, {
        key: 'migratePromise',
        value: function migratePromise(batchSize) {
            var _this3 = this;

            if (!this._migratePromise) {
                this._migratePromise = new Promise(function (res, rej) {
                    var state$ = _this3.migrate(batchSize);
                    state$.subscribe(null, rej, res);
                });
            }
            return this._migratePromise;
        }
    }]);

    return DataMigrator;
}();

var OldCollection = function () {
    function OldCollection(version, schemaObj, dataMigrator) {
        _classCallCheck(this, OldCollection);

        this.version = version;
        this.dataMigrator = dataMigrator;
        this.schemaObj = schemaObj;
        this.newestCollection = dataMigrator.newestCollection;
        this.database = dataMigrator.newestCollection.database;
    }

    _createClass(OldCollection, [{
        key: 'countAllUndeleted',
        value: function () {
            var _ref3 = _asyncToGenerator(regeneratorRuntime.mark(function _callee3() {
                return regeneratorRuntime.wrap(function _callee3$(_context4) {
                    while (1) {
                        switch (_context4.prev = _context4.next) {
                            case 0:
                                return _context4.abrupt('return', _PouchDB2.default.countAllUndeleted(this.pouchdb));

                            case 1:
                            case 'end':
                                return _context4.stop();
                        }
                    }
                }, _callee3, this);
            }));

            function countAllUndeleted() {
                return _ref3.apply(this, arguments);
            }

            return countAllUndeleted;
        }()
    }, {
        key: 'getBatch',
        value: function () {
            var _ref4 = _asyncToGenerator(regeneratorRuntime.mark(function _callee4(batchSize) {
                var _this4 = this;

                var docs;
                return regeneratorRuntime.wrap(function _callee4$(_context5) {
                    while (1) {
                        switch (_context5.prev = _context5.next) {
                            case 0:
                                _context5.next = 2;
                                return _PouchDB2.default.getBatch(this.pouchdb, batchSize);

                            case 2:
                                docs = _context5.sent;
                                return _context5.abrupt('return', docs.map(function (doc) {
                                    return _this4._handleFromPouch(doc);
                                }));

                            case 4:
                            case 'end':
                                return _context5.stop();
                        }
                    }
                }, _callee4, this);
            }));

            function getBatch(_x3) {
                return _ref4.apply(this, arguments);
            }

            return getBatch;
        }()

        /**
         * handles a document from the pouchdb-instance
         */

    }, {
        key: '_handleFromPouch',
        value: function _handleFromPouch(docData) {
            var swapped = this.schema.swapIdToPrimary(docData);
            var decompressed = this.keyCompressor.decompress(swapped);
            var decrypted = this.crypter.decrypt(decompressed);
            return decrypted;
        }

        /**
         * runs the doc-data through all following migrationStrategies
         * so it will match the newest schema.
         * @throws Error if final doc does not match final schema or migrationStrategy crashes
         * @return {Object|null} final object or null if migrationStrategy deleted it
         */

    }, {
        key: 'migrateDocumentData',
        value: function () {
            var _ref5 = _asyncToGenerator(regeneratorRuntime.mark(function _callee5(doc) {
                var nextVersion, error;
                return regeneratorRuntime.wrap(function _callee5$(_context6) {
                    while (1) {
                        switch (_context6.prev = _context6.next) {
                            case 0:
                                doc = (0, _clone2.default)(doc);
                                nextVersion = this.version + 1;

                                // run throught migrationStrategies

                                error = null;

                            case 3:
                                if (!(nextVersion <= this.newestCollection.schema.version && !error)) {
                                    _context6.next = 12;
                                    break;
                                }

                                _context6.next = 6;
                                return this.dataMigrator.migrationStrategies[nextVersion + ''](doc);

                            case 6:
                                doc = _context6.sent;


                                nextVersion++;

                                if (!(doc == null && !error)) {
                                    _context6.next = 10;
                                    break;
                                }

                                return _context6.abrupt('return', null);

                            case 10:
                                _context6.next = 3;
                                break;

                            case 12:
                                _context6.prev = 12;

                                this.newestCollection.schema.validate(doc);
                                _context6.next = 19;
                                break;

                            case 16:
                                _context6.prev = 16;
                                _context6.t0 = _context6['catch'](12);
                                throw new Error('\n              migration of document from v' + this.version + ' to v' + this.newestCollection.schema.version + ' failed\n              - final document does not match final schema\n              - final doc: ' + JSON.stringify(doc) + '\n            ');

                            case 19:
                                return _context6.abrupt('return', doc);

                            case 20:
                            case 'end':
                                return _context6.stop();
                        }
                    }
                }, _callee5, this, [[12, 16]]);
            }));

            function migrateDocumentData(_x4) {
                return _ref5.apply(this, arguments);
            }

            return migrateDocumentData;
        }()

        /**
         * transform docdata and save to new collection
         * @return {{type: string, doc: {}}} status-action with status and migrated document
         */

    }, {
        key: '_migrateDocument',
        value: function () {
            var _ref6 = _asyncToGenerator(regeneratorRuntime.mark(function _callee6(doc) {
                var migrated, action;
                return regeneratorRuntime.wrap(function _callee6$(_context7) {
                    while (1) {
                        switch (_context7.prev = _context7.next) {
                            case 0:
                                _context7.next = 2;
                                return this.migrateDocumentData(doc);

                            case 2:
                                migrated = _context7.sent;
                                action = {
                                    doc: doc,
                                    migrated: migrated
                                };

                                if (!migrated) {
                                    _context7.next = 11;
                                    break;
                                }

                                // save to newest collection
                                delete migrated._rev;
                                _context7.next = 8;
                                return this.newestCollection._pouchPut(migrated, true);

                            case 8:
                                action.type = 'success';
                                _context7.next = 12;
                                break;

                            case 11:
                                action.type = 'deleted';

                            case 12:
                                _context7.prev = 12;
                                _context7.next = 15;
                                return this.pouchdb.remove(doc);

                            case 15:
                                _context7.next = 19;
                                break;

                            case 17:
                                _context7.prev = 17;
                                _context7.t0 = _context7['catch'](12);

                            case 19:
                                return _context7.abrupt('return', action);

                            case 20:
                            case 'end':
                                return _context7.stop();
                        }
                    }
                }, _callee6, this, [[12, 17]]);
            }));

            function _migrateDocument(_x5) {
                return _ref6.apply(this, arguments);
            }

            return _migrateDocument;
        }()

        /**
         * deletes this.pouchdb and removes it from the database.collectionsCollection
         */

    }, {
        key: 'delete',
        value: function () {
            var _ref7 = _asyncToGenerator(regeneratorRuntime.mark(function _callee7() {
                return regeneratorRuntime.wrap(function _callee7$(_context8) {
                    while (1) {
                        switch (_context8.prev = _context8.next) {
                            case 0:
                                _context8.next = 2;
                                return this.pouchdb.destroy();

                            case 2:
                                _context8.next = 4;
                                return this.database.removeCollectionDoc(this.dataMigrator.name, this.schema);

                            case 4:
                            case 'end':
                                return _context8.stop();
                        }
                    }
                }, _callee7, this);
            }));

            function _delete() {
                return _ref7.apply(this, arguments);
            }

            return _delete;
        }()

        /**
         * runs the migration on all documents and deletes the pouchdb afterwards
         */

    }, {
        key: 'migrate',
        value: function migrate() {
            var _this5 = this;

            var batchSize = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : 10;

            if (this._migrate) throw new Error('migration already running');
            this._migrate = true;

            var stateStream$ = new util.Rx.Observable(function () {
                var _ref8 = _asyncToGenerator(regeneratorRuntime.mark(function _callee8(observer) {
                    var batch, error;
                    return regeneratorRuntime.wrap(function _callee8$(_context9) {
                        while (1) {
                            switch (_context9.prev = _context9.next) {
                                case 0:
                                    _context9.next = 2;
                                    return _this5.getBatch(batchSize);

                                case 2:
                                    batch = _context9.sent;
                                    error = void 0;

                                case 4:
                                    _context9.next = 6;
                                    return Promise.all(batch.map(function (doc) {
                                        return _this5._migrateDocument(doc).then(function (action) {
                                            return observer.next(action);
                                        });
                                    })).catch(function (e) {
                                        return error = e;
                                    });

                                case 6:
                                    if (!error) {
                                        _context9.next = 9;
                                        break;
                                    }

                                    observer.error(error);
                                    return _context9.abrupt('return');

                                case 9:
                                    _context9.next = 11;
                                    return _this5.getBatch(batchSize);

                                case 11:
                                    batch = _context9.sent;

                                case 12:
                                    if (!error && batch.length > 0) {
                                        _context9.next = 4;
                                        break;
                                    }

                                case 13:
                                    _context9.next = 15;
                                    return _this5.delete();

                                case 15:

                                    observer.complete();

                                case 16:
                                case 'end':
                                    return _context9.stop();
                            }
                        }
                    }, _callee8, _this5);
                }));

                return function (_x7) {
                    return _ref8.apply(this, arguments);
                };
            }());
            return stateStream$;
        }
    }, {
        key: 'migratePromise',
        value: function migratePromise(batchSize) {
            var _this6 = this;

            if (!this._migratePromise) {
                this._migratePromise = new Promise(function (res, rej) {
                    var state$ = _this6.migrate(batchSize);
                    state$.subscribe(null, rej, res);
                });
            }
            return this._migratePromise;
        }
    }, {
        key: 'schema',
        get: function get() {
            if (!this._schema) {
                //            delete this.schemaObj._id;
                this._schema = RxSchema.create(this.schemaObj, false);
            }
            return this._schema;
        }
    }, {
        key: 'keyCompressor',
        get: function get() {
            if (!this._keyCompressor) this._keyCompressor = KeyCompressor.create(this.schema);
            return this._keyCompressor;
        }
    }, {
        key: 'crypter',
        get: function get() {
            if (!this._crypter) this._crypter = Crypter.create(this.database.password, this.schema);
            return this._crypter;
        }
    }, {
        key: 'pouchdb',
        get: function get() {
            if (!this._pouchdb) {
                this._pouchdb = this.database._spawnPouchDB(this.newestCollection.name, this.version, this.newestCollection.pouchSettings);
            }
            return this._pouchdb;
        }
    }]);

    return OldCollection;
}();

function create(newestCollection, migrationStrategies) {
    return new DataMigrator(newestCollection, migrationStrategies);
}