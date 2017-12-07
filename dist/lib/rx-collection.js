'use strict';

Object.defineProperty(exports, "__esModule", {
    value: true
});
exports.create = exports.RxCollection = undefined;

var _toConsumableArray2 = require('babel-runtime/helpers/toConsumableArray');

var _toConsumableArray3 = _interopRequireDefault(_toConsumableArray2);

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

/**
 * creates and prepares a new collection
 * @param  {RxDatabase}  database
 * @param  {string}  name
 * @param  {RxSchema}  schema
 * @param  {?Object}  [pouchSettings={}]
 * @param  {?Object}  [migrationStrategies={}]
 * @return {Promise.<RxCollection>} promise with collection
 */
var create = exports.create = function () {
    var _ref16 = (0, _asyncToGenerator3['default'])( /*#__PURE__*/_regenerator2['default'].mark(function _callee15(_ref15) {
        var database = _ref15.database,
            name = _ref15.name,
            schema = _ref15.schema,
            _ref15$pouchSettings = _ref15.pouchSettings,
            pouchSettings = _ref15$pouchSettings === undefined ? {} : _ref15$pouchSettings,
            _ref15$migrationStrat = _ref15.migrationStrategies,
            migrationStrategies = _ref15$migrationStrat === undefined ? {} : _ref15$migrationStrat,
            _ref15$autoMigrate = _ref15.autoMigrate,
            autoMigrate = _ref15$autoMigrate === undefined ? true : _ref15$autoMigrate,
            _ref15$statics = _ref15.statics,
            statics = _ref15$statics === undefined ? {} : _ref15$statics,
            _ref15$methods = _ref15.methods,
            methods = _ref15$methods === undefined ? {} : _ref15$methods,
            _ref15$attachments = _ref15.attachments,
            attachments = _ref15$attachments === undefined ? {} : _ref15$attachments,
            _ref15$options = _ref15.options,
            options = _ref15$options === undefined ? {} : _ref15$options;
        var collection;
        return _regenerator2['default'].wrap(function _callee15$(_context15) {
            while (1) {
                switch (_context15.prev = _context15.next) {
                    case 0:
                        util.validateCouchDBString(name);
                        checkMigrationStrategies(schema, migrationStrategies);

                        // check ORM-methods
                        checkOrmMethods(statics);
                        checkOrmMethods(methods);
                        checkOrmMethods(attachments);
                        Object.keys(methods).filter(function (funName) {
                            return schema.topLevelFields.includes(funName);
                        }).forEach(function (funName) {
                            throw _rxError2['default'].newRxError('COL18', {
                                funName: funName
                            });
                        });

                        collection = new RxCollection(database, name, schema, pouchSettings, migrationStrategies, methods, attachments, options);
                        _context15.next = 9;
                        return collection.prepare();

                    case 9:

                        // ORM add statics
                        Object.entries(statics).forEach(function (entry) {
                            var fun = entry.pop();
                            var funName = entry.pop();
                            collection.__defineGetter__(funName, function () {
                                return fun.bind(collection);
                            });
                        });

                        if (!autoMigrate) {
                            _context15.next = 13;
                            break;
                        }

                        _context15.next = 13;
                        return collection.migratePromise();

                    case 13:

                        (0, _hooks.runPluginHooks)('createRxCollection', collection);
                        return _context15.abrupt('return', collection);

                    case 15:
                    case 'end':
                        return _context15.stop();
                }
            }
        }, _callee15, this);
    }));

    return function create(_x28) {
        return _ref16.apply(this, arguments);
    };
}();

exports.properties = properties;
exports.isInstanceOf = isInstanceOf;

var _clone = require('clone');

var _clone2 = _interopRequireDefault(_clone);

var _customIdleQueue = require('custom-idle-queue');

var _customIdleQueue2 = _interopRequireDefault(_customIdleQueue);

var _filter = require('rxjs/operators/filter');

var _util = require('./util');

var util = _interopRequireWildcard(_util);

var _rxDocument = require('./rx-document');

var _rxDocument2 = _interopRequireDefault(_rxDocument);

var _rxQuery = require('./rx-query');

var _rxQuery2 = _interopRequireDefault(_rxQuery);

var _rxChangeEvent = require('./rx-change-event');

var _rxChangeEvent2 = _interopRequireDefault(_rxChangeEvent);

var _rxError = require('./rx-error');

var _rxError2 = _interopRequireDefault(_rxError);

var _dataMigrator = require('./data-migrator');

var _dataMigrator2 = _interopRequireDefault(_dataMigrator);

var _crypter = require('./crypter');

var _crypter2 = _interopRequireDefault(_crypter);

var _docCache = require('./doc-cache');

var _docCache2 = _interopRequireDefault(_docCache);

var _queryCache = require('./query-cache');

var _queryCache2 = _interopRequireDefault(_queryCache);

var _changeEventBuffer = require('./change-event-buffer');

var _changeEventBuffer2 = _interopRequireDefault(_changeEventBuffer);

var _overwritable = require('./overwritable');

var _overwritable2 = _interopRequireDefault(_overwritable);

var _hooks = require('./hooks');

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) newObj[key] = obj[key]; } } newObj['default'] = obj; return newObj; } }

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

var HOOKS_WHEN = ['pre', 'post'];
var HOOKS_KEYS = ['insert', 'save', 'remove', 'create'];

var RxCollection = exports.RxCollection = function () {
    function RxCollection(database, name, schema) {
        var pouchSettings = arguments.length > 3 && arguments[3] !== undefined ? arguments[3] : {};
        var migrationStrategies = arguments.length > 4 && arguments[4] !== undefined ? arguments[4] : {};
        var methods = arguments.length > 5 && arguments[5] !== undefined ? arguments[5] : {};

        var _this = this;

        var attachments = arguments.length > 6 && arguments[6] !== undefined ? arguments[6] : {};
        var options = arguments.length > 7 && arguments[7] !== undefined ? arguments[7] : {};
        (0, _classCallCheck3['default'])(this, RxCollection);

        this._isInMemory = false;
        this.destroyed = false;
        this.database = database;
        this.name = name;
        this.schema = schema;
        this._migrationStrategies = migrationStrategies;
        this._pouchSettings = pouchSettings;
        this._methods = methods; // orm of documents
        this._attachments = attachments; // orm of attachments
        this.options = options;
        this._atomicUpsertQueues = {};

        this._docCache = _docCache2['default'].create();
        this._queryCache = _queryCache2['default'].create();

        // defaults
        this.synced = false;
        this.hooks = {};
        this._subs = [];
        this._repStates = [];
        this.pouch = null; // this is needed to preserve this name

        // set HOOKS-functions dynamically
        HOOKS_KEYS.forEach(function (key) {
            HOOKS_WHEN.map(function (when) {
                var fnName = when + util.ucfirst(key);
                _this[fnName] = function (fun, parallel) {
                    return _this.addHook(when, key, fun, parallel);
                };
            });
        });
    }

    (0, _createClass3['default'])(RxCollection, [{
        key: 'prepare',
        value: function () {
            var _ref = (0, _asyncToGenerator3['default'])( /*#__PURE__*/_regenerator2['default'].mark(function _callee() {
                var _this2 = this;

                return _regenerator2['default'].wrap(function _callee$(_context) {
                    while (1) {
                        switch (_context.prev = _context.next) {
                            case 0:
                                this._dataMigrator = _dataMigrator2['default'].create(this, this._migrationStrategies);
                                this._crypter = _crypter2['default'].create(this.database.password, this.schema);

                                this.pouch = this.database._spawnPouchDB(this.name, this.schema.version, this._pouchSettings);

                                // ensure that we wait until db is useable
                                _context.next = 5;
                                return this.database.lockedRun(function () {
                                    return _this2.pouch.info();
                                });

                            case 5:

                                this._observable$ = this.database.$.pipe((0, _filter.filter)(function (event) {
                                    return event.data.col === _this2.name;
                                }));
                                this._changeEventBuffer = _changeEventBuffer2['default'].create(this);

                                // INDEXES
                                _context.next = 9;
                                return Promise.all(this.schema.indexes.map(function (indexAr) {
                                    var compressedIdx = indexAr.map(function (key) {
                                        if (!_this2.schema.doKeyCompression()) return key;else return _this2._keyCompressor._transformKey('', '', key.split('.'));
                                    });

                                    return _this2.database.lockedRun(function () {
                                        return _this2.pouch.createIndex({
                                            index: {
                                                fields: compressedIdx
                                            }
                                        });
                                    });
                                }));

                            case 9:

                                this._subs.push(this._observable$.pipe((0, _filter.filter)(function (cE) {
                                    return !cE.data.isLocal;
                                })).subscribe(function (cE) {
                                    // when data changes, send it to RxDocument in docCache
                                    var doc = _this2._docCache.get(cE.data.doc);
                                    if (doc) doc._handleChangeEvent(cE);
                                }));

                            case 10:
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
    }, {
        key: 'migrationNeeded',


        /**
         * checks if a migration is needed
         * @return {boolean}
         */
        value: function migrationNeeded() {
            if (this.schema.version === 0) return false;
            return this._dataMigrator._getOldCollections().then(function (oldCols) {
                return oldCols.length > 0;
            });
        }

        /**
         * @param {number} [batchSize=10] amount of documents handled in parallel
         * @return {Observable} emits the migration-status
         */

    }, {
        key: 'migrate',
        value: function migrate() {
            var batchSize = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : 10;

            return this._dataMigrator.migrate(batchSize);
        }

        /**
         * does the same thing as .migrate() but returns promise
         * @param {number} [batchSize=10] amount of documents handled in parallel
         * @return {Promise} resolves when finished
         */

    }, {
        key: 'migratePromise',
        value: function migratePromise() {
            var batchSize = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : 10;

            return this._dataMigrator.migratePromise(batchSize);
        }

        /**
         * wrappers for Pouch.put/get to handle keycompression etc
         */

    }, {
        key: '_handleToPouch',
        value: function _handleToPouch(docData) {
            var data = (0, _clone2['default'])(docData);
            data = this._crypter.encrypt(data);
            data = this.schema.swapPrimaryToId(data);
            if (this.schema.doKeyCompression()) data = this._keyCompressor.compress(data);
            return data;
        }
    }, {
        key: '_handleFromPouch',
        value: function _handleFromPouch(docData) {
            var noDecrypt = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : false;

            var data = (0, _clone2['default'])(docData);
            data = this.schema.swapIdToPrimary(data);
            if (this.schema.doKeyCompression()) data = this._keyCompressor.decompress(data);
            if (noDecrypt) return data;
            data = this._crypter.decrypt(data);
            return data;
        }

        /**
         * [overwrite description]
         * @param {object} obj
         * @param {boolean} [overwrite=false] if true, it will overwrite existing document
         */

    }, {
        key: '_pouchPut',
        value: function () {
            var _ref2 = (0, _asyncToGenerator3['default'])( /*#__PURE__*/_regenerator2['default'].mark(function _callee2(obj) {
                var _this3 = this;

                var overwrite = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : false;
                var ret, exist;
                return _regenerator2['default'].wrap(function _callee2$(_context2) {
                    while (1) {
                        switch (_context2.prev = _context2.next) {
                            case 0:
                                obj = this._handleToPouch(obj);
                                ret = null;
                                _context2.prev = 2;
                                _context2.next = 5;
                                return this.database.lockedRun(function () {
                                    return _this3.pouch.put(obj);
                                });

                            case 5:
                                ret = _context2.sent;
                                _context2.next = 21;
                                break;

                            case 8:
                                _context2.prev = 8;
                                _context2.t0 = _context2['catch'](2);

                                if (!(overwrite && _context2.t0.status === 409)) {
                                    _context2.next = 20;
                                    break;
                                }

                                _context2.next = 13;
                                return this.database.lockedRun(function () {
                                    return _this3.pouch.get(obj._id);
                                });

                            case 13:
                                exist = _context2.sent;

                                obj._rev = exist._rev;
                                _context2.next = 17;
                                return this.database.lockedRun(function () {
                                    return _this3.pouch.put(obj);
                                });

                            case 17:
                                ret = _context2.sent;
                                _context2.next = 21;
                                break;

                            case 20:
                                throw _context2.t0;

                            case 21:
                                return _context2.abrupt('return', ret);

                            case 22:
                            case 'end':
                                return _context2.stop();
                        }
                    }
                }, _callee2, this, [[2, 8]]);
            }));

            function _pouchPut(_x10) {
                return _ref2.apply(this, arguments);
            }

            return _pouchPut;
        }()

        /**
         * get document from pouchdb by its _id
         * @param  {[type]} key [description]
         * @return {[type]}     [description]
         */

    }, {
        key: '_pouchGet',
        value: function _pouchGet(key) {
            var _this4 = this;

            return this.pouch.get(key).then(function (doc) {
                return _this4._handleFromPouch(doc);
            });
        }

        /**
         * wrapps pouch-find
         * @param {RxQuery} rxQuery
         * @param {?number} limit overwrites the limit
         * @param {?boolean} noDecrypt if true, decryption will not be made
         * @return {Object[]} array with documents-data
         */

    }, {
        key: '_pouchFind',
        value: function () {
            var _ref3 = (0, _asyncToGenerator3['default'])( /*#__PURE__*/_regenerator2['default'].mark(function _callee3(rxQuery, limit) {
                var _this5 = this;

                var noDecrypt = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : false;
                var compressedQueryJSON, docsCompressed, docs;
                return _regenerator2['default'].wrap(function _callee3$(_context3) {
                    while (1) {
                        switch (_context3.prev = _context3.next) {
                            case 0:
                                compressedQueryJSON = rxQuery.keyCompress();

                                if (limit) compressedQueryJSON.limit = limit;

                                _context3.next = 4;
                                return this.database.lockedRun(function () {
                                    return _this5.pouch.find(compressedQueryJSON);
                                });

                            case 4:
                                docsCompressed = _context3.sent;
                                docs = docsCompressed.docs.map(function (doc) {
                                    return _this5._handleFromPouch(doc, noDecrypt);
                                });
                                return _context3.abrupt('return', docs);

                            case 7:
                            case 'end':
                                return _context3.stop();
                        }
                    }
                }, _callee3, this);
            }));

            function _pouchFind(_x12, _x13) {
                return _ref3.apply(this, arguments);
            }

            return _pouchFind;
        }()

        /**
         * assigns the ORM-methods to the RxDocument
         * @param {RxDocument} doc
         */

    }, {
        key: '_assignMethodsToDocument',
        value: function _assignMethodsToDocument(doc) {
            Object.entries(this._methods).forEach(function (entry) {
                var funName = entry[0];
                var fun = entry[1];
                doc.__defineGetter__(funName, function () {
                    return fun.bind(doc);
                });
            });
        }

        /**
         * create a RxDocument-instance from the jsonData
         * @param {Object} json documentData
         * @return {Promise<RxDocument>}
         */

    }, {
        key: '_createDocument',
        value: function () {
            var _ref4 = (0, _asyncToGenerator3['default'])( /*#__PURE__*/_regenerator2['default'].mark(function _callee4(json) {
                var id, cacheDoc, doc;
                return _regenerator2['default'].wrap(function _callee4$(_context4) {
                    while (1) {
                        switch (_context4.prev = _context4.next) {
                            case 0:
                                // return from cache if exsists
                                id = json[this.schema.primaryPath];
                                cacheDoc = this._docCache.get(id);

                                if (!cacheDoc) {
                                    _context4.next = 4;
                                    break;
                                }

                                return _context4.abrupt('return', cacheDoc);

                            case 4:
                                doc = _rxDocument2['default'].create(this, json);

                                this._assignMethodsToDocument(doc);
                                this._docCache.set(id, doc);
                                this._runHooksSync('post', 'create', doc);

                                _context4.next = 10;
                                return (0, _hooks.runAsyncPluginHooks)('postCreateRxDocument', doc);

                            case 10:
                                return _context4.abrupt('return', doc);

                            case 11:
                            case 'end':
                                return _context4.stop();
                        }
                    }
                }, _callee4, this);
            }));

            function _createDocument(_x14) {
                return _ref4.apply(this, arguments);
            }

            return _createDocument;
        }()
        /**
         * create RxDocument from the docs-array
         * @return {Promise<RxDocument[]>} documents
         */

    }, {
        key: '_createDocuments',
        value: function () {
            var _ref5 = (0, _asyncToGenerator3['default'])( /*#__PURE__*/_regenerator2['default'].mark(function _callee5(docsJSON) {
                var _this6 = this;

                return _regenerator2['default'].wrap(function _callee5$(_context5) {
                    while (1) {
                        switch (_context5.prev = _context5.next) {
                            case 0:
                                return _context5.abrupt('return', Promise.all(docsJSON.map(function (json) {
                                    return _this6._createDocument(json);
                                })));

                            case 1:
                            case 'end':
                                return _context5.stop();
                        }
                    }
                }, _callee5, this);
            }));

            function _createDocuments(_x15) {
                return _ref5.apply(this, arguments);
            }

            return _createDocuments;
        }()

        /**
         * returns observable
         */

    }, {
        key: '$emit',
        value: function $emit(changeEvent) {
            return this.database.$emit(changeEvent);
        }

        /**
         * @param {Object|RxDocument} json data or RxDocument if temporary
         * @param {RxDocument} doc which was created
         * @return {Promise<RxDocument>}
         */

    }, {
        key: 'insert',
        value: function () {
            var _ref6 = (0, _asyncToGenerator3['default'])( /*#__PURE__*/_regenerator2['default'].mark(function _callee6(json) {
                var tempDoc, insertResult, newDoc, emitEvent;
                return _regenerator2['default'].wrap(function _callee6$(_context6) {
                    while (1) {
                        switch (_context6.prev = _context6.next) {
                            case 0:
                                // inserting a temporary-document
                                tempDoc = null;

                                if (!_rxDocument2['default'].isInstanceOf(json)) {
                                    _context6.next = 6;
                                    break;
                                }

                                tempDoc = json;

                                if (json._isTemporary) {
                                    _context6.next = 5;
                                    break;
                                }

                                throw _rxError2['default'].newRxError('COL1', {
                                    data: json
                                });

                            case 5:
                                json = json.toJSON();

                            case 6:

                                json = (0, _clone2['default'])(json);
                                json = this.schema.fillObjectWithDefaults(json);

                                if (!json._id) {
                                    _context6.next = 10;
                                    break;
                                }

                                throw _rxError2['default'].newRxError('COL2', {
                                    data: json
                                });

                            case 10:

                                // fill _id
                                if (this.schema.primaryPath === '_id' && !json._id) json._id = util.generateId();

                                _context6.next = 13;
                                return this._runHooks('pre', 'insert', json);

                            case 13:

                                this.schema.validate(json);

                                _context6.next = 16;
                                return this._pouchPut(json);

                            case 16:
                                insertResult = _context6.sent;


                                json[this.schema.primaryPath] = insertResult.id;
                                json._rev = insertResult.rev;

                                newDoc = tempDoc;

                                if (!tempDoc) {
                                    _context6.next = 24;
                                    break;
                                }

                                tempDoc._data = json;
                                _context6.next = 27;
                                break;

                            case 24:
                                _context6.next = 26;
                                return this._createDocument(json);

                            case 26:
                                newDoc = _context6.sent;

                            case 27:
                                _context6.next = 29;
                                return this._runHooks('post', 'insert', newDoc);

                            case 29:

                                // event
                                emitEvent = _rxChangeEvent2['default'].create('INSERT', this.database, this, newDoc, json);

                                this.$emit(emitEvent);

                                return _context6.abrupt('return', newDoc);

                            case 32:
                            case 'end':
                                return _context6.stop();
                        }
                    }
                }, _callee6, this);
            }));

            function insert(_x16) {
                return _ref6.apply(this, arguments);
            }

            return insert;
        }()

        /**
         * same as insert but overwrites existing document with same primary
         */

    }, {
        key: 'upsert',
        value: function () {
            var _ref7 = (0, _asyncToGenerator3['default'])( /*#__PURE__*/_regenerator2['default'].mark(function _callee7(json) {
                var primary, existing, newDoc;
                return _regenerator2['default'].wrap(function _callee7$(_context7) {
                    while (1) {
                        switch (_context7.prev = _context7.next) {
                            case 0:
                                json = (0, _clone2['default'])(json);
                                primary = json[this.schema.primaryPath];

                                if (primary) {
                                    _context7.next = 4;
                                    break;
                                }

                                throw _rxError2['default'].newRxError('COL3', {
                                    primaryPath: this.schema.primaryPath,
                                    data: json
                                });

                            case 4:
                                _context7.next = 6;
                                return this.findOne(primary).exec();

                            case 6:
                                existing = _context7.sent;

                                if (!existing) {
                                    _context7.next = 15;
                                    break;
                                }

                                json._rev = existing._rev;
                                existing._data = json;
                                _context7.next = 12;
                                return existing.save();

                            case 12:
                                return _context7.abrupt('return', existing);

                            case 15:
                                _context7.next = 17;
                                return this.insert(json);

                            case 17:
                                newDoc = _context7.sent;
                                return _context7.abrupt('return', newDoc);

                            case 19:
                            case 'end':
                                return _context7.stop();
                        }
                    }
                }, _callee7, this);
            }));

            function upsert(_x17) {
                return _ref7.apply(this, arguments);
            }

            return upsert;
        }()

        /**
         * ensures that the given document exists
         * @param  {string}  primary
         * @param  {any}  json
         * @return {Promise<{ doc: RxDocument, inserted: boolean}>} promise that resolves with new doc and flag if inserted
         */

    }, {
        key: '_atomicUpsertEnsureRxDocumentExists',
        value: function () {
            var _ref8 = (0, _asyncToGenerator3['default'])( /*#__PURE__*/_regenerator2['default'].mark(function _callee8(primary, json) {
                var doc, newDoc;
                return _regenerator2['default'].wrap(function _callee8$(_context8) {
                    while (1) {
                        switch (_context8.prev = _context8.next) {
                            case 0:
                                _context8.next = 2;
                                return this.findOne(primary).exec();

                            case 2:
                                doc = _context8.sent;

                                if (doc) {
                                    _context8.next = 10;
                                    break;
                                }

                                _context8.next = 6;
                                return this.insert(json);

                            case 6:
                                newDoc = _context8.sent;
                                return _context8.abrupt('return', {
                                    doc: newDoc,
                                    inserted: true
                                });

                            case 10:
                                return _context8.abrupt('return', {
                                    doc: doc,
                                    inserted: false
                                });

                            case 11:
                            case 'end':
                                return _context8.stop();
                        }
                    }
                }, _callee8, this);
            }));

            function _atomicUpsertEnsureRxDocumentExists(_x18, _x19) {
                return _ref8.apply(this, arguments);
            }

            return _atomicUpsertEnsureRxDocumentExists;
        }()
    }, {
        key: '_atomicUpsertUpdate',
        value: function () {
            var _ref9 = (0, _asyncToGenerator3['default'])( /*#__PURE__*/_regenerator2['default'].mark(function _callee9(doc, json) {
                return _regenerator2['default'].wrap(function _callee9$(_context9) {
                    while (1) {
                        switch (_context9.prev = _context9.next) {
                            case 0:
                                _context9.next = 2;
                                return doc.atomicUpdate(function (innerDoc) {
                                    json._rev = innerDoc._rev;
                                    innerDoc._data = json;
                                });

                            case 2:
                                return _context9.abrupt('return', doc);

                            case 3:
                            case 'end':
                                return _context9.stop();
                        }
                    }
                }, _callee9, this);
            }));

            function _atomicUpsertUpdate(_x20, _x21) {
                return _ref9.apply(this, arguments);
            }

            return _atomicUpsertUpdate;
        }()

        /**
         * upserts to a RxDocument, uses atomicUpdate if document already exists
         * @param  {object}  json
         * @return {Promise}
         */

    }, {
        key: 'atomicUpsert',
        value: function () {
            var _ref10 = (0, _asyncToGenerator3['default'])( /*#__PURE__*/_regenerator2['default'].mark(function _callee11(json) {
                var _this7 = this;

                var primary, queue, ret;
                return _regenerator2['default'].wrap(function _callee11$(_context11) {
                    while (1) {
                        switch (_context11.prev = _context11.next) {
                            case 0:
                                json = (0, _clone2['default'])(json);
                                primary = json[this.schema.primaryPath];

                                if (primary) {
                                    _context11.next = 4;
                                    break;
                                }

                                throw _rxError2['default'].newRxError('COL4', {
                                    data: json
                                });

                            case 4:

                                // ensure that it wont try 2 parallel runs
                                if (!this._atomicUpsertQueues[primary]) this._atomicUpsertQueues[primary] = new _customIdleQueue2['default']();
                                queue = this._atomicUpsertQueues[primary];
                                _context11.next = 8;
                                return queue.requestIdlePromise();

                            case 8:
                                _context11.next = 10;
                                return queue.wrapCall((0, _asyncToGenerator3['default'])( /*#__PURE__*/_regenerator2['default'].mark(function _callee10() {
                                    var wasInserted;
                                    return _regenerator2['default'].wrap(function _callee10$(_context10) {
                                        while (1) {
                                            switch (_context10.prev = _context10.next) {
                                                case 0:
                                                    _context10.next = 2;
                                                    return _this7._atomicUpsertEnsureRxDocumentExists(primary, json);

                                                case 2:
                                                    wasInserted = _context10.sent;

                                                    if (wasInserted.inserted) {
                                                        _context10.next = 11;
                                                        break;
                                                    }

                                                    _context10.next = 6;
                                                    return _this7._atomicUpsertUpdate(wasInserted.doc, json);

                                                case 6:
                                                    _context10.next = 8;
                                                    return util.nextTick();

                                                case 8:
                                                    return _context10.abrupt('return', wasInserted.doc);

                                                case 11:
                                                    return _context10.abrupt('return', wasInserted.doc);

                                                case 12:
                                                case 'end':
                                                    return _context10.stop();
                                            }
                                        }
                                    }, _callee10, _this7);
                                })));

                            case 10:
                                ret = _context11.sent;
                                return _context11.abrupt('return', ret);

                            case 12:
                            case 'end':
                                return _context11.stop();
                        }
                    }
                }, _callee11, this);
            }));

            function atomicUpsert(_x22) {
                return _ref10.apply(this, arguments);
            }

            return atomicUpsert;
        }()

        /**
         * takes a mongoDB-query-object and returns the documents
         * @param  {object} queryObj
         * @return {RxDocument[]} found documents
         */

    }, {
        key: 'find',
        value: function find(queryObj) {
            if (typeof queryObj === 'string') {
                throw _rxError2['default'].newRxError('COL5', {
                    queryObj: queryObj
                });
            }

            var query = _rxQuery2['default'].create('find', queryObj, this);
            return query;
        }
    }, {
        key: 'findOne',
        value: function findOne(queryObj) {
            var query = void 0;

            if (typeof queryObj === 'string') {
                query = _rxQuery2['default'].create('findOne', {
                    _id: queryObj
                }, this);
            } else query = _rxQuery2['default'].create('findOne', queryObj, this);

            if (typeof queryObj === 'number' || Array.isArray(queryObj)) {
                throw _rxError2['default'].newRxTypeError('COL6', {
                    queryObj: queryObj
                });
            }

            return query;
        }

        /**
         * export to json
         * @param {boolean} decrypted if true, all encrypted values will be decrypted
         */

    }, {
        key: 'dump',
        value: function dump() {
            throw _rxError2['default'].pluginMissing('json-dump');
        }

        /**
         * imports the json-data into the collection
         * @param {Array} exportedJSON should be an array of raw-data
         */

    }, {
        key: 'importDump',
        value: function () {
            var _ref12 = (0, _asyncToGenerator3['default'])( /*#__PURE__*/_regenerator2['default'].mark(function _callee12() {
                return _regenerator2['default'].wrap(function _callee12$(_context12) {
                    while (1) {
                        switch (_context12.prev = _context12.next) {
                            case 0:
                                throw _rxError2['default'].pluginMissing('json-dump');

                            case 1:
                            case 'end':
                                return _context12.stop();
                        }
                    }
                }, _callee12, this);
            }));

            function importDump() {
                return _ref12.apply(this, arguments);
            }

            return importDump;
        }()

        /**
         * waits for external changes to the database
         * and ensures they are emitted to the internal RxChangeEvent-Stream
         * TODO this can be removed by listening to the pull-change-events of the RxReplicationState
         */

    }, {
        key: 'watchForChanges',
        value: function watchForChanges() {
            throw _rxError2['default'].pluginMissing('replication');
        }

        /**
         * sync with another database
         */

    }, {
        key: 'sync',
        value: function sync() {
            throw _rxError2['default'].pluginMissing('replication');
        }

        /**
         * Create a replicated in-memory-collection
         */

    }, {
        key: 'inMemory',
        value: function inMemory() {
            throw _rxError2['default'].pluginMissing('in-memory');
        }

        /**
         * HOOKS
         */

    }, {
        key: 'addHook',
        value: function addHook(when, key, fun) {
            var parallel = arguments.length > 3 && arguments[3] !== undefined ? arguments[3] : false;

            if (typeof fun !== 'function') {
                throw _rxError2['default'].newRxTypeError('COL7', {
                    key: key,
                    when: when
                });
            }

            if (!HOOKS_WHEN.includes(when)) {
                throw _rxError2['default'].newRxTypeError('COL8', {
                    key: key,
                    when: when
                });
            }

            if (!HOOKS_KEYS.includes(key)) {
                throw _rxError2['default'].newRxError('COL9', {
                    key: key
                });
            }

            if (when === 'post' && key === 'create' && parallel === true) {
                throw _rxError2['default'].newRxError('COL10', {
                    when: when,
                    key: key,
                    parallel: parallel
                });
            }

            var runName = parallel ? 'parallel' : 'series';

            this.hooks[key] = this.hooks[key] || {};
            this.hooks[key][when] = this.hooks[key][when] || {
                series: [],
                parallel: []
            };
            this.hooks[key][when][runName].push(fun);
        }
    }, {
        key: 'getHooks',
        value: function getHooks(when, key) {
            try {
                return this.hooks[key][when];
            } catch (e) {
                return {
                    series: [],
                    parallel: []
                };
            }
        }
    }, {
        key: '_runHooks',
        value: function () {
            var _ref13 = (0, _asyncToGenerator3['default'])( /*#__PURE__*/_regenerator2['default'].mark(function _callee13(when, key, doc) {
                var hooks, i;
                return _regenerator2['default'].wrap(function _callee13$(_context13) {
                    while (1) {
                        switch (_context13.prev = _context13.next) {
                            case 0:
                                hooks = this.getHooks(when, key);

                                if (hooks) {
                                    _context13.next = 3;
                                    break;
                                }

                                return _context13.abrupt('return');

                            case 3:
                                i = 0;

                            case 4:
                                if (!(i < hooks.series.length)) {
                                    _context13.next = 10;
                                    break;
                                }

                                _context13.next = 7;
                                return hooks.series[i](doc);

                            case 7:
                                i++;
                                _context13.next = 4;
                                break;

                            case 10:
                                _context13.next = 12;
                                return Promise.all(hooks.parallel.map(function (hook) {
                                    return hook(doc);
                                }));

                            case 12:
                            case 'end':
                                return _context13.stop();
                        }
                    }
                }, _callee13, this);
            }));

            function _runHooks(_x24, _x25, _x26) {
                return _ref13.apply(this, arguments);
            }

            return _runHooks;
        }()

        /**
         * does the same as ._runHooks() but with non-async-functions
         */

    }, {
        key: '_runHooksSync',
        value: function _runHooksSync(when, key, doc) {
            var hooks = this.getHooks(when, key);
            if (!hooks) return;
            hooks.series.forEach(function (hook) {
                return hook(doc);
            });
        }

        /**
         * creates a temporaryDocument which can be saved later
         * @param {Object} docData
         * @return {RxDocument}
         */

    }, {
        key: 'newDocument',
        value: function newDocument() {
            var docData = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {};

            docData = this.schema.fillObjectWithDefaults(docData);
            var doc = _rxDocument2['default'].create(this, docData);
            doc._isTemporary = true;
            this._assignMethodsToDocument(doc);
            this._runHooksSync('post', 'create', doc);
            return doc;
        }

        /**
         * returns a promise that is resolved when the collection gets destroyed
         * @return {Promise}
         */

    }, {
        key: 'destroy',
        value: function () {
            var _ref14 = (0, _asyncToGenerator3['default'])( /*#__PURE__*/_regenerator2['default'].mark(function _callee14() {
                return _regenerator2['default'].wrap(function _callee14$(_context14) {
                    while (1) {
                        switch (_context14.prev = _context14.next) {
                            case 0:
                                if (!this.destroyed) {
                                    _context14.next = 2;
                                    break;
                                }

                                return _context14.abrupt('return');

                            case 2:

                                this._onDestroyCall && this._onDestroyCall();
                                this._subs.forEach(function (sub) {
                                    return sub.unsubscribe();
                                });
                                this._changeEventBuffer && this._changeEventBuffer.destroy();
                                this._queryCache.destroy();
                                this._repStates.forEach(function (sync) {
                                    return sync.cancel();
                                });
                                delete this.database.collections[this.name];
                                this.destroyed = true;

                            case 9:
                            case 'end':
                                return _context14.stop();
                        }
                    }
                }, _callee14, this);
            }));

            function destroy() {
                return _ref14.apply(this, arguments);
            }

            return destroy;
        }()

        /**
         * remove all data
         * @return {Promise}
         */

    }, {
        key: 'remove',
        value: function remove() {
            return this.database.removeCollection(this.name);
        }
    }, {
        key: '_keyCompressor',
        get: function get() {
            if (!this.__keyCompressor) this.__keyCompressor = _overwritable2['default'].createKeyCompressor(this.schema);
            return this.__keyCompressor;
        }
    }, {
        key: '$',
        get: function get() {
            return this._observable$;
        }
    }, {
        key: 'onDestroy',
        get: function get() {
            var _this8 = this;

            if (!this._onDestroy) this._onDestroy = new Promise(function (res) {
                return _this8._onDestroyCall = res;
            });
            return this._onDestroy;
        }
    }]);
    return RxCollection;
}();

/**
 * checks if the migrationStrategies are ok, throws if not
 * @param  {RxSchema} schema
 * @param  {Object} migrationStrategies
 * @throws {Error|TypeError} if not ok
 * @return {boolean}
 */


var checkMigrationStrategies = function checkMigrationStrategies(schema, migrationStrategies) {
    // migrationStrategies must be object not array
    if ((typeof migrationStrategies === 'undefined' ? 'undefined' : (0, _typeof3['default'])(migrationStrategies)) !== 'object' || Array.isArray(migrationStrategies)) {
        throw _rxError2['default'].newRxTypeError('COL11', {
            schema: schema
        });
    }

    // for every previousVersion there must be strategy
    if (schema.previousVersions.length !== Object.keys(migrationStrategies).length) {
        throw _rxError2['default'].newRxError('COL12', {
            have: Object.keys(migrationStrategies),
            should: schema.previousVersions
        });
    }

    // every strategy must have number as property and be a function
    schema.previousVersions.map(function (vNr) {
        return {
            v: vNr,
            s: migrationStrategies[vNr + 1 + '']
        };
    }).filter(function (strat) {
        return typeof strat.s !== 'function';
    }).forEach(function (strat) {
        throw _rxError2['default'].newRxTypeError('COL13', {
            version: strat.v,
            type: typeof strat === 'undefined' ? 'undefined' : (0, _typeof3['default'])(strat),
            schema: schema
        });
    });

    return true;
};

/**
 * returns all possible properties of a RxCollection-instance
 * @return {string[]} property-names
 */
var _properties = null;
function properties() {
    if (!_properties) {
        var pseudoInstance = new RxCollection();
        var ownProperties = Object.getOwnPropertyNames(pseudoInstance);
        var prototypeProperties = Object.getOwnPropertyNames(Object.getPrototypeOf(pseudoInstance));
        _properties = [].concat((0, _toConsumableArray3['default'])(ownProperties), (0, _toConsumableArray3['default'])(prototypeProperties));
    }
    return _properties;
}

/**
 * checks if the given static methods are allowed
 * @param  {{}} statics [description]
 * @throws if not allowed
 */
var checkOrmMethods = function checkOrmMethods(statics) {
    Object.entries(statics).forEach(function (entry) {
        if (typeof entry[0] !== 'string') {
            throw _rxError2['default'].newRxTypeError('COL14', {
                name: entry[0]
            });
        }

        if (entry[0].startsWith('_')) {
            throw _rxError2['default'].newRxTypeError('COL15', {
                name: entry[0]
            });
        }

        if (typeof entry[1] !== 'function') {
            throw _rxError2['default'].newRxTypeError('COL16', {
                name: entry[0],
                type: (0, _typeof3['default'])(entry[1])
            });
        }

        if (properties().includes(entry[0]) || _rxDocument2['default'].properties().includes(entry[0])) {
            throw _rxError2['default'].newRxError('COL17', {
                name: entry[0]
            });
        }
    });
};function isInstanceOf(obj) {
    return obj instanceof RxCollection;
}

exports['default'] = {
    create: create,
    properties: properties,
    isInstanceOf: isInstanceOf,
    RxCollection: RxCollection
};
