'use strict';

Object.defineProperty(exports, "__esModule", {
    value: true
});
exports.create = exports.RxCollection = undefined;

var _toConsumableArray2 = require('babel-runtime/helpers/toConsumableArray');

var _toConsumableArray3 = _interopRequireDefault(_toConsumableArray2);

var _typeof2 = require('babel-runtime/helpers/typeof');

var _typeof3 = _interopRequireDefault(_typeof2);

var _slicedToArray2 = require('babel-runtime/helpers/slicedToArray');

var _slicedToArray3 = _interopRequireDefault(_slicedToArray2);

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
    var _ref14 = (0, _asyncToGenerator3['default'])( /*#__PURE__*/_regenerator2['default'].mark(function _callee9(_ref13) {
        var database = _ref13.database,
            name = _ref13.name,
            schema = _ref13.schema,
            _ref13$pouchSettings = _ref13.pouchSettings,
            pouchSettings = _ref13$pouchSettings === undefined ? {} : _ref13$pouchSettings,
            _ref13$migrationStrat = _ref13.migrationStrategies,
            migrationStrategies = _ref13$migrationStrat === undefined ? {} : _ref13$migrationStrat,
            _ref13$autoMigrate = _ref13.autoMigrate,
            autoMigrate = _ref13$autoMigrate === undefined ? true : _ref13$autoMigrate,
            _ref13$statics = _ref13.statics,
            statics = _ref13$statics === undefined ? {} : _ref13$statics,
            _ref13$methods = _ref13.methods,
            methods = _ref13$methods === undefined ? {} : _ref13$methods,
            _ref13$attachments = _ref13.attachments,
            attachments = _ref13$attachments === undefined ? {} : _ref13$attachments,
            _ref13$options = _ref13.options,
            options = _ref13$options === undefined ? {} : _ref13$options;
        var collection;
        return _regenerator2['default'].wrap(function _callee9$(_context9) {
            while (1) {
                switch (_context9.prev = _context9.next) {
                    case 0:
                        (0, _util.validateCouchDBString)(name);

                        // ensure it is a schema-object
                        if (!_rxSchema2['default'].isInstanceOf(schema)) schema = _rxSchema2['default'].create(schema);

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
                        _context9.next = 10;
                        return collection.prepare();

                    case 10:

                        // ORM add statics
                        Object.entries(statics).forEach(function (_ref15) {
                            var _ref16 = (0, _slicedToArray3['default'])(_ref15, 2),
                                funName = _ref16[0],
                                fun = _ref16[1];

                            return collection.__defineGetter__(funName, function () {
                                return fun.bind(collection);
                            });
                        });

                        if (!autoMigrate) {
                            _context9.next = 14;
                            break;
                        }

                        _context9.next = 14;
                        return collection.migratePromise();

                    case 14:

                        (0, _hooks.runPluginHooks)('createRxCollection', collection);
                        return _context9.abrupt('return', collection);

                    case 16:
                    case 'end':
                        return _context9.stop();
                }
            }
        }, _callee9, this);
    }));

    return function create(_x22) {
        return _ref14.apply(this, arguments);
    };
}();

exports.properties = properties;
exports.isInstanceOf = isInstanceOf;

var _customIdleQueue = require('custom-idle-queue');

var _customIdleQueue2 = _interopRequireDefault(_customIdleQueue);

var _operators = require('rxjs/operators');

var _util = require('./util');

var _rxDocument = require('./rx-document');

var _rxDocument2 = _interopRequireDefault(_rxDocument);

var _rxQuery = require('./rx-query');

var _rxQuery2 = _interopRequireDefault(_rxQuery);

var _rxSchema = require('./rx-schema');

var _rxSchema2 = _interopRequireDefault(_rxSchema);

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
                var fnName = when + (0, _util.ucfirst)(key);
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

                                this._observable$ = this.database.$.pipe((0, _operators.filter)(function (event) {
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

                                this._subs.push(this._observable$.pipe((0, _operators.filter)(function (cE) {
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
            var data = (0, _util.clone)(docData);
            data = this._crypter.encrypt(data);
            data = this.schema.swapPrimaryToId(data);
            if (this.schema.doKeyCompression()) data = this._keyCompressor.compress(data);
            return data;
        }
    }, {
        key: '_handleFromPouch',
        value: function _handleFromPouch(docData) {
            var noDecrypt = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : false;

            var data = (0, _util.clone)(docData);
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
        value: function _pouchFind(rxQuery, limit) {
            var _this5 = this;

            var noDecrypt = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : false;

            var compressedQueryJSON = rxQuery.keyCompress();
            if (limit) compressedQueryJSON.limit = limit;

            return this.database.lockedRun(function () {
                return _this5.pouch.find(compressedQueryJSON);
            }).then(function (docsCompressed) {
                var docs = docsCompressed.docs.map(function (doc) {
                    return _this5._handleFromPouch(doc, noDecrypt);
                });

                return docs;
            });
        }

        /**
         * assigns the ORM-methods to the RxDocument
         * @param {RxDocument} doc
         */

    }, {
        key: '_assignMethodsToDocument',
        value: function _assignMethodsToDocument(doc) {
            Object.entries(this._methods).forEach(function (_ref3) {
                var _ref4 = (0, _slicedToArray3['default'])(_ref3, 2),
                    funName = _ref4[0],
                    fun = _ref4[1];

                return doc.__defineGetter__(funName, function () {
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
        value: function _createDocument(json) {
            // return from cache if exsists
            var id = json[this.schema.primaryPath];
            var cacheDoc = this._docCache.get(id);
            if (cacheDoc) return cacheDoc;

            var doc = _rxDocument2['default'].create(this, json);
            this._assignMethodsToDocument(doc);
            this._docCache.set(id, doc);
            this._runHooksSync('post', 'create', doc);

            return (0, _hooks.runAsyncPluginHooks)('postCreateRxDocument', doc).then(function () {
                return doc;
            });
        }
        /**
         * create RxDocument from the docs-array
         * @return {Promise<RxDocument[]>} documents
         */

    }, {
        key: '_createDocuments',
        value: function _createDocuments(docsJSON) {
            var _this6 = this;

            return Promise.all(docsJSON.map(function (json) {
                return _this6._createDocument(json);
            }));
        }

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
            var _ref5 = (0, _asyncToGenerator3['default'])( /*#__PURE__*/_regenerator2['default'].mark(function _callee3(json) {
                var tempDoc, insertResult, newDoc, emitEvent;
                return _regenerator2['default'].wrap(function _callee3$(_context3) {
                    while (1) {
                        switch (_context3.prev = _context3.next) {
                            case 0:
                                // inserting a temporary-document
                                tempDoc = null;

                                if (!_rxDocument2['default'].isInstanceOf(json)) {
                                    _context3.next = 6;
                                    break;
                                }

                                tempDoc = json;

                                if (json._isTemporary) {
                                    _context3.next = 5;
                                    break;
                                }

                                throw _rxError2['default'].newRxError('COL1', {
                                    data: json
                                });

                            case 5:
                                json = json.toJSON();

                            case 6:

                                json = (0, _util.clone)(json);
                                json = this.schema.fillObjectWithDefaults(json);

                                if (!json._id) {
                                    _context3.next = 10;
                                    break;
                                }

                                throw _rxError2['default'].newRxError('COL2', {
                                    data: json
                                });

                            case 10:

                                // fill _id
                                if (this.schema.primaryPath === '_id' && !json._id) json._id = (0, _util.generateId)();

                                _context3.next = 13;
                                return this._runHooks('pre', 'insert', json);

                            case 13:

                                this.schema.validate(json);

                                _context3.next = 16;
                                return this._pouchPut(json);

                            case 16:
                                insertResult = _context3.sent;


                                json[this.schema.primaryPath] = insertResult.id;
                                json._rev = insertResult.rev;

                                newDoc = tempDoc;

                                if (!tempDoc) {
                                    _context3.next = 24;
                                    break;
                                }

                                tempDoc._data = json;
                                _context3.next = 27;
                                break;

                            case 24:
                                _context3.next = 26;
                                return this._createDocument(json);

                            case 26:
                                newDoc = _context3.sent;

                            case 27:
                                _context3.next = 29;
                                return this._runHooks('post', 'insert', newDoc);

                            case 29:

                                // event
                                emitEvent = _rxChangeEvent2['default'].create('INSERT', this.database, this, newDoc, json);

                                this.$emit(emitEvent);

                                return _context3.abrupt('return', newDoc);

                            case 32:
                            case 'end':
                                return _context3.stop();
                        }
                    }
                }, _callee3, this);
            }));

            function insert(_x12) {
                return _ref5.apply(this, arguments);
            }

            return insert;
        }()

        /**
         * same as insert but overwrites existing document with same primary
         */

    }, {
        key: 'upsert',
        value: function () {
            var _ref6 = (0, _asyncToGenerator3['default'])( /*#__PURE__*/_regenerator2['default'].mark(function _callee4(json) {
                var primary, existing, newDoc;
                return _regenerator2['default'].wrap(function _callee4$(_context4) {
                    while (1) {
                        switch (_context4.prev = _context4.next) {
                            case 0:
                                json = (0, _util.clone)(json);
                                primary = json[this.schema.primaryPath];

                                if (primary) {
                                    _context4.next = 4;
                                    break;
                                }

                                throw _rxError2['default'].newRxError('COL3', {
                                    primaryPath: this.schema.primaryPath,
                                    data: json
                                });

                            case 4:
                                _context4.next = 6;
                                return this.findOne(primary).exec();

                            case 6:
                                existing = _context4.sent;

                                if (!existing) {
                                    _context4.next = 15;
                                    break;
                                }

                                json._rev = existing._rev;
                                existing._data = json;
                                _context4.next = 12;
                                return existing.save();

                            case 12:
                                return _context4.abrupt('return', existing);

                            case 15:
                                _context4.next = 17;
                                return this.insert(json);

                            case 17:
                                newDoc = _context4.sent;
                                return _context4.abrupt('return', newDoc);

                            case 19:
                            case 'end':
                                return _context4.stop();
                        }
                    }
                }, _callee4, this);
            }));

            function upsert(_x13) {
                return _ref6.apply(this, arguments);
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
            var _ref7 = (0, _asyncToGenerator3['default'])( /*#__PURE__*/_regenerator2['default'].mark(function _callee5(primary, json) {
                var doc, newDoc;
                return _regenerator2['default'].wrap(function _callee5$(_context5) {
                    while (1) {
                        switch (_context5.prev = _context5.next) {
                            case 0:
                                _context5.next = 2;
                                return this.findOne(primary).exec();

                            case 2:
                                doc = _context5.sent;

                                if (doc) {
                                    _context5.next = 10;
                                    break;
                                }

                                _context5.next = 6;
                                return this.insert(json);

                            case 6:
                                newDoc = _context5.sent;
                                return _context5.abrupt('return', {
                                    doc: newDoc,
                                    inserted: true
                                });

                            case 10:
                                return _context5.abrupt('return', {
                                    doc: doc,
                                    inserted: false
                                });

                            case 11:
                            case 'end':
                                return _context5.stop();
                        }
                    }
                }, _callee5, this);
            }));

            function _atomicUpsertEnsureRxDocumentExists(_x14, _x15) {
                return _ref7.apply(this, arguments);
            }

            return _atomicUpsertEnsureRxDocumentExists;
        }()

        /**
         * @return {Promise}
         */

    }, {
        key: '_atomicUpsertUpdate',
        value: function _atomicUpsertUpdate(doc, json) {
            return doc.atomicUpdate(function (innerDoc) {
                json._rev = innerDoc._rev;
                innerDoc._data = json;
            }).then(function () {
                return doc;
            });
        }

        /**
         * upserts to a RxDocument, uses atomicUpdate if document already exists
         * @param  {object}  json
         * @return {Promise}
         */

    }, {
        key: 'atomicUpsert',
        value: function () {
            var _ref8 = (0, _asyncToGenerator3['default'])( /*#__PURE__*/_regenerator2['default'].mark(function _callee7(json) {
                var _this7 = this;

                var primary, queue, ret;
                return _regenerator2['default'].wrap(function _callee7$(_context7) {
                    while (1) {
                        switch (_context7.prev = _context7.next) {
                            case 0:
                                json = (0, _util.clone)(json);
                                primary = json[this.schema.primaryPath];

                                if (primary) {
                                    _context7.next = 4;
                                    break;
                                }

                                throw _rxError2['default'].newRxError('COL4', {
                                    data: json
                                });

                            case 4:

                                // ensure that it wont try 2 parallel runs
                                if (!this._atomicUpsertQueues[primary]) this._atomicUpsertQueues[primary] = new _customIdleQueue2['default']();
                                queue = this._atomicUpsertQueues[primary];
                                _context7.next = 8;
                                return queue.requestIdlePromise();

                            case 8:
                                _context7.next = 10;
                                return queue.wrapCall((0, _asyncToGenerator3['default'])( /*#__PURE__*/_regenerator2['default'].mark(function _callee6() {
                                    var wasInserted;
                                    return _regenerator2['default'].wrap(function _callee6$(_context6) {
                                        while (1) {
                                            switch (_context6.prev = _context6.next) {
                                                case 0:
                                                    _context6.next = 2;
                                                    return _this7._atomicUpsertEnsureRxDocumentExists(primary, json);

                                                case 2:
                                                    wasInserted = _context6.sent;

                                                    if (wasInserted.inserted) {
                                                        _context6.next = 11;
                                                        break;
                                                    }

                                                    _context6.next = 6;
                                                    return _this7._atomicUpsertUpdate(wasInserted.doc, json);

                                                case 6:
                                                    _context6.next = 8;
                                                    return (0, _util.nextTick)();

                                                case 8:
                                                    return _context6.abrupt('return', wasInserted.doc);

                                                case 11:
                                                    return _context6.abrupt('return', wasInserted.doc);

                                                case 12:
                                                case 'end':
                                                    return _context6.stop();
                                            }
                                        }
                                    }, _callee6, _this7);
                                })));

                            case 10:
                                ret = _context7.sent;
                                return _context7.abrupt('return', ret);

                            case 12:
                            case 'end':
                                return _context7.stop();
                        }
                    }
                }, _callee7, this);
            }));

            function atomicUpsert(_x16) {
                return _ref8.apply(this, arguments);
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
        value: function importDump() {
            throw _rxError2['default'].pluginMissing('json-dump');
        }

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
            var _ref10 = (0, _asyncToGenerator3['default'])( /*#__PURE__*/_regenerator2['default'].mark(function _callee8(when, key, doc) {
                var hooks, i;
                return _regenerator2['default'].wrap(function _callee8$(_context8) {
                    while (1) {
                        switch (_context8.prev = _context8.next) {
                            case 0:
                                hooks = this.getHooks(when, key);

                                if (hooks) {
                                    _context8.next = 3;
                                    break;
                                }

                                return _context8.abrupt('return');

                            case 3:
                                i = 0;

                            case 4:
                                if (!(i < hooks.series.length)) {
                                    _context8.next = 10;
                                    break;
                                }

                                _context8.next = 7;
                                return hooks.series[i](doc);

                            case 7:
                                i++;
                                _context8.next = 4;
                                break;

                            case 10:
                                _context8.next = 12;
                                return Promise.all(hooks.parallel.map(function (hook) {
                                    return hook(doc);
                                }));

                            case 12:
                            case 'end':
                                return _context8.stop();
                        }
                    }
                }, _callee8, this);
            }));

            function _runHooks(_x18, _x19, _x20) {
                return _ref10.apply(this, arguments);
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
        value: function destroy() {
            if (this.destroyed) return;

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
        }

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
        key: 'insert$',
        get: function get() {
            return this.$.pipe((0, _operators.filter)(function (cE) {
                return cE.data.op === 'INSERT';
            }));
        }
    }, {
        key: 'update$',
        get: function get() {
            return this.$.pipe((0, _operators.filter)(function (cE) {
                return cE.data.op === 'UPDATE';
            }));
        }
    }, {
        key: 'remove$',
        get: function get() {
            return this.$.pipe((0, _operators.filter)(function (cE) {
                return cE.data.op === 'REMOVE';
            }));
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
    Object.entries(statics).forEach(function (_ref11) {
        var _ref12 = (0, _slicedToArray3['default'])(_ref11, 2),
            k = _ref12[0],
            v = _ref12[1];

        if (typeof k !== 'string') {
            throw _rxError2['default'].newRxTypeError('COL14', {
                name: k
            });
        }

        if (k.startsWith('_')) {
            throw _rxError2['default'].newRxTypeError('COL15', {
                name: k
            });
        }

        if (typeof v !== 'function') {
            throw _rxError2['default'].newRxTypeError('COL16', {
                name: k,
                type: typeof k === 'undefined' ? 'undefined' : (0, _typeof3['default'])(k)
            });
        }

        if (properties().includes(k) || _rxDocument2['default'].properties().includes(k)) {
            throw _rxError2['default'].newRxError('COL17', {
                name: k
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
