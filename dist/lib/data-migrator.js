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

var _pouchDb = require('./pouch-db');

var _pouchDb2 = _interopRequireDefault(_pouchDb);

var _clone = require('clone');

var _clone2 = _interopRequireDefault(_clone);

var _rxSchema = require('./rx-schema');

var _rxSchema2 = _interopRequireDefault(_rxSchema);

var _crypter = require('./crypter');

var _crypter2 = _interopRequireDefault(_crypter);

var _rxError = require('./rx-error');

var _rxError2 = _interopRequireDefault(_rxError);

var _overwritable = require('./overwritable');

var _overwritable2 = _interopRequireDefault(_overwritable);

var _hooks = require('./hooks');

var _hooks2 = _interopRequireDefault(_hooks);

var _Observable = require('rxjs/Observable');

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

/**
 * The DataMigrator handles the documents from collections with older schemas
 * and transforms/saves them into the newest collection
 */

var DataMigrator = function () {
    function DataMigrator(newestCollection, migrationStrategies) {
        (0, _classCallCheck3['default'])(this, DataMigrator);

        this.newestCollection = newestCollection;
        this.migrationStrategies = migrationStrategies;
        this.currentSchema = newestCollection.schema;
        this.database = newestCollection.database;
        this.name = newestCollection.name;
    }

    /**
     * get an array with OldCollection-instances from all existing old pouchdb-instance
     * @return {Promise<OldCollection[]>}
     */


    (0, _createClass3['default'])(DataMigrator, [{
        key: '_getOldCollections',
        value: function _getOldCollections() {
            var _this = this;

            return Promise.all(this.currentSchema.previousVersions.map(function (v) {
                return _this.database._collectionsPouch.get(_this.name + '-' + v);
            }).map(function (fun) {
                return fun['catch'](function () {
                    return null;
                });
            }) // auto-catch so Promise.all continues
            ).then(function (oldColDocs) {
                return oldColDocs.filter(function (colDoc) {
                    return colDoc !== null;
                }).map(function (colDoc) {
                    return new OldCollection(colDoc.schema.version, colDoc.schema, _this);
                });
            });
        }

        /**
         * @param {number} [batchSize=10] amount of documents handled in parallel
         * @return {Observable} emits the migration-state
         */

    }, {
        key: 'migrate',
        value: function migrate() {
            var _this2 = this;

            var batchSize = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : 10;

            if (this._migrated) throw _rxError2['default'].newRxError('DM1');
            this._migrated = true;

            var state = {
                done: false, // true if finished
                total: null, // will be the doc-count
                handled: 0, // amount of handled docs
                success: 0, // handled docs which successed
                deleted: 0, // handled docs which got deleted
                percent: 0 // percentage
            };

            var migrationState$ = new _Observable.Observable(function () {
                var _ref = (0, _asyncToGenerator3['default'])( /*#__PURE__*/_regenerator2['default'].mark(function _callee(observer) {
                    var oldCols, countAll, totalCount, currentCol, _loop;

                    return _regenerator2['default'].wrap(function _callee$(_context2) {
                        while (1) {
                            switch (_context2.prev = _context2.next) {
                                case 0:
                                    _context2.next = 2;
                                    return _this2._getOldCollections();

                                case 2:
                                    oldCols = _context2.sent;
                                    _context2.next = 5;
                                    return Promise.all(oldCols.map(function (oldCol) {
                                        return oldCol.countAllUndeleted();
                                    }));

                                case 5:
                                    countAll = _context2.sent;
                                    totalCount = countAll.reduce(function (cur, prev) {
                                        return prev = cur + prev;
                                    }, 0);


                                    state.total = totalCount;
                                    observer.next((0, _clone2['default'])(state));

                                    currentCol = null;
                                    _loop = /*#__PURE__*/_regenerator2['default'].mark(function _loop() {
                                        var migrationState$;
                                        return _regenerator2['default'].wrap(function _loop$(_context) {
                                            while (1) {
                                                switch (_context.prev = _context.next) {
                                                    case 0:
                                                        migrationState$ = currentCol.migrate(batchSize);
                                                        _context.next = 3;
                                                        return new Promise(function (res) {
                                                            var sub = migrationState$.subscribe(function (subState) {
                                                                state.handled++;
                                                                state[subState.type] = state[subState.type] + 1;
                                                                state.percent = Math.round(state.handled / state.total * 100);
                                                                observer.next((0, _clone2['default'])(state));
                                                            }, function (e) {
                                                                sub.unsubscribe();
                                                                observer.error(e);
                                                            }, function () {
                                                                sub.unsubscribe();
                                                                res();
                                                            });
                                                        });

                                                    case 3:
                                                    case 'end':
                                                        return _context.stop();
                                                }
                                            }
                                        }, _loop, _this2);
                                    });

                                case 11:
                                    if (!(currentCol = oldCols.shift())) {
                                        _context2.next = 15;
                                        break;
                                    }

                                    return _context2.delegateYield(_loop(), 't0', 13);

                                case 13:
                                    _context2.next = 11;
                                    break;

                                case 15:

                                    state.done = true;
                                    state.percent = 100;
                                    observer.next((0, _clone2['default'])(state));

                                    observer.complete();

                                case 19:
                                case 'end':
                                    return _context2.stop();
                            }
                        }
                    }, _callee, _this2);
                }));

                return function (_x2) {
                    return _ref.apply(this, arguments);
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
        (0, _classCallCheck3['default'])(this, OldCollection);

        this.version = version;
        this.dataMigrator = dataMigrator;
        this.schemaObj = schemaObj;
        this.newestCollection = dataMigrator.newestCollection;
        this.database = dataMigrator.newestCollection.database;
    }

    (0, _createClass3['default'])(OldCollection, [{
        key: 'countAllUndeleted',
        value: function () {
            var _ref2 = (0, _asyncToGenerator3['default'])( /*#__PURE__*/_regenerator2['default'].mark(function _callee2() {
                return _regenerator2['default'].wrap(function _callee2$(_context3) {
                    while (1) {
                        switch (_context3.prev = _context3.next) {
                            case 0:
                                return _context3.abrupt('return', _pouchDb2['default'].countAllUndeleted(this.pouchdb));

                            case 1:
                            case 'end':
                                return _context3.stop();
                        }
                    }
                }, _callee2, this);
            }));

            function countAllUndeleted() {
                return _ref2.apply(this, arguments);
            }

            return countAllUndeleted;
        }()
    }, {
        key: 'getBatch',
        value: function getBatch(batchSize) {
            var _this4 = this;

            return _pouchDb2['default'].getBatch(this.pouchdb, batchSize).then(function (docs) {
                return docs.map(function (doc) {
                    return _this4._handleFromPouch(doc);
                });
            });
        }

        /**
         * handles a document from the pouchdb-instance
         */

    }, {
        key: '_handleFromPouch',
        value: function _handleFromPouch(docData) {
            var data = (0, _clone2['default'])(docData);
            data = this.schema.swapIdToPrimary(docData);
            if (this.schema.doKeyCompression()) data = this.keyCompressor.decompress(data);
            data = this.crypter.decrypt(data);
            return data;
        }

        /**
         * wrappers for Pouch.put/get to handle keycompression etc
         */

    }, {
        key: '_handleToPouch',
        value: function _handleToPouch(docData) {
            var data = (0, _clone2['default'])(docData);
            data = this.crypter.encrypt(data);
            data = this.schema.swapPrimaryToId(data);
            if (this.schema.doKeyCompression()) data = this.keyCompressor.compress(data);
            return data;
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
            var _ref3 = (0, _asyncToGenerator3['default'])( /*#__PURE__*/_regenerator2['default'].mark(function _callee3(doc) {
                var nextVersion;
                return _regenerator2['default'].wrap(function _callee3$(_context4) {
                    while (1) {
                        switch (_context4.prev = _context4.next) {
                            case 0:
                                doc = (0, _clone2['default'])(doc);
                                nextVersion = this.version + 1;

                                // run throught migrationStrategies

                            case 2:
                                if (!(nextVersion <= this.newestCollection.schema.version)) {
                                    _context4.next = 11;
                                    break;
                                }

                                _context4.next = 5;
                                return this.dataMigrator.migrationStrategies[nextVersion + ''](doc);

                            case 5:
                                doc = _context4.sent;

                                nextVersion++;

                                if (!(doc === null)) {
                                    _context4.next = 9;
                                    break;
                                }

                                return _context4.abrupt('return', null);

                            case 9:
                                _context4.next = 2;
                                break;

                            case 11:
                                _context4.prev = 11;

                                this.newestCollection.schema.validate(doc);
                                _context4.next = 18;
                                break;

                            case 15:
                                _context4.prev = 15;
                                _context4.t0 = _context4['catch'](11);
                                throw _rxError2['default'].newRxError('DM2', {
                                    fromVersion: this.version,
                                    toVersion: this.newestCollection.schema.version,
                                    finalDoc: doc
                                });

                            case 18:
                                return _context4.abrupt('return', doc);

                            case 19:
                            case 'end':
                                return _context4.stop();
                        }
                    }
                }, _callee3, this, [[11, 15]]);
            }));

            function migrateDocumentData(_x3) {
                return _ref3.apply(this, arguments);
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
            var _ref4 = (0, _asyncToGenerator3['default'])( /*#__PURE__*/_regenerator2['default'].mark(function _callee4(doc) {
                var migrated, action, res;
                return _regenerator2['default'].wrap(function _callee4$(_context5) {
                    while (1) {
                        switch (_context5.prev = _context5.next) {
                            case 0:
                                _context5.next = 2;
                                return this.migrateDocumentData(doc);

                            case 2:
                                migrated = _context5.sent;
                                action = {
                                    doc: doc,
                                    migrated: migrated,
                                    oldCollection: this,
                                    newestCollection: this.newestCollection
                                };

                                if (!migrated) {
                                    _context5.next = 16;
                                    break;
                                }

                                _hooks2['default'].runPluginHooks('preMigrateDocument', action);

                                // save to newest collection
                                delete migrated._rev;
                                _context5.next = 9;
                                return this.newestCollection._pouchPut(migrated, true);

                            case 9:
                                res = _context5.sent;

                                action.res = res;
                                action.type = 'success';

                                _context5.next = 14;
                                return _hooks2['default'].runAsyncPluginHooks('postMigrateDocument', action);

                            case 14:
                                _context5.next = 17;
                                break;

                            case 16:
                                action.type = 'deleted';

                            case 17:
                                _context5.prev = 17;
                                _context5.next = 20;
                                return this.pouchdb.remove(this._handleToPouch(doc));

                            case 20:
                                _context5.next = 24;
                                break;

                            case 22:
                                _context5.prev = 22;
                                _context5.t0 = _context5['catch'](17);

                            case 24:
                                return _context5.abrupt('return', action);

                            case 25:
                            case 'end':
                                return _context5.stop();
                        }
                    }
                }, _callee4, this, [[17, 22]]);
            }));

            function _migrateDocument(_x4) {
                return _ref4.apply(this, arguments);
            }

            return _migrateDocument;
        }()

        /**
         * deletes this.pouchdb and removes it from the database.collectionsCollection
         * @return {Promise}
         */

    }, {
        key: 'delete',
        value: function _delete() {
            var _this5 = this;

            return this.pouchdb.destroy().then(function () {
                return _this5.database.removeCollectionDoc(_this5.dataMigrator.name, _this5.schema);
            });
        }

        /**
         * runs the migration on all documents and deletes the pouchdb afterwards
         */

    }, {
        key: 'migrate',
        value: function migrate() {
            var _this6 = this;

            var batchSize = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : 10;

            if (this._migrate) throw _rxError2['default'].newRxError('DM3');
            this._migrate = true;

            var stateStream$ = new _Observable.Observable(function () {
                var _ref5 = (0, _asyncToGenerator3['default'])( /*#__PURE__*/_regenerator2['default'].mark(function _callee5(observer) {
                    var batch, error;
                    return _regenerator2['default'].wrap(function _callee5$(_context6) {
                        while (1) {
                            switch (_context6.prev = _context6.next) {
                                case 0:
                                    _context6.next = 2;
                                    return _this6.getBatch(batchSize);

                                case 2:
                                    batch = _context6.sent;
                                    error = void 0;

                                case 4:
                                    _context6.next = 6;
                                    return Promise.all(batch.map(function (doc) {
                                        return _this6._migrateDocument(doc).then(function (action) {
                                            return observer.next(action);
                                        });
                                    }))['catch'](function (e) {
                                        return error = e;
                                    });

                                case 6:
                                    if (!error) {
                                        _context6.next = 9;
                                        break;
                                    }

                                    observer.error(error);
                                    return _context6.abrupt('return');

                                case 9:
                                    _context6.next = 11;
                                    return _this6.getBatch(batchSize);

                                case 11:
                                    batch = _context6.sent;

                                case 12:
                                    if (!error && batch.length > 0) {
                                        _context6.next = 4;
                                        break;
                                    }

                                case 13:
                                    _context6.next = 15;
                                    return _this6['delete']();

                                case 15:

                                    observer.complete();

                                case 16:
                                case 'end':
                                    return _context6.stop();
                            }
                        }
                    }, _callee5, _this6);
                }));

                return function (_x6) {
                    return _ref5.apply(this, arguments);
                };
            }());
            return stateStream$;
        }
    }, {
        key: 'migratePromise',
        value: function migratePromise(batchSize) {
            var _this7 = this;

            if (!this._migratePromise) {
                this._migratePromise = new Promise(function (res, rej) {
                    var state$ = _this7.migrate(batchSize);
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
                this._schema = _rxSchema2['default'].create(this.schemaObj, false);
            }
            return this._schema;
        }
    }, {
        key: 'keyCompressor',
        get: function get() {
            if (!this._keyCompressor) this._keyCompressor = _overwritable2['default'].createKeyCompressor(this.schema);
            return this._keyCompressor;
        }
    }, {
        key: 'crypter',
        get: function get() {
            if (!this._crypter) this._crypter = _crypter2['default'].create(this.database.password, this.schema);
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

exports['default'] = {
    create: create
};
