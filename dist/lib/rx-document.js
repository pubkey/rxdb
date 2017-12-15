'use strict';

Object.defineProperty(exports, "__esModule", {
    value: true
});
exports.RxDocument = undefined;

var _toConsumableArray2 = require('babel-runtime/helpers/toConsumableArray');

var _toConsumableArray3 = _interopRequireDefault(_toConsumableArray2);

var _regenerator = require('babel-runtime/regenerator');

var _regenerator2 = _interopRequireDefault(_regenerator);

var _asyncToGenerator2 = require('babel-runtime/helpers/asyncToGenerator');

var _asyncToGenerator3 = _interopRequireDefault(_asyncToGenerator2);

var _typeof2 = require('babel-runtime/helpers/typeof');

var _typeof3 = _interopRequireDefault(_typeof2);

var _classCallCheck2 = require('babel-runtime/helpers/classCallCheck');

var _classCallCheck3 = _interopRequireDefault(_classCallCheck2);

var _createClass2 = require('babel-runtime/helpers/createClass');

var _createClass3 = _interopRequireDefault(_createClass2);

exports.create = create;
exports.createAr = createAr;
exports.properties = properties;
exports.isInstanceOf = isInstanceOf;

var _clone = require('clone');

var _clone2 = _interopRequireDefault(_clone);

var _objectPath = require('object-path');

var _objectPath2 = _interopRequireDefault(_objectPath);

var _deepEqual = require('deep-equal');

var _deepEqual2 = _interopRequireDefault(_deepEqual);

var _util = require('./util');

var util = _interopRequireWildcard(_util);

var _rxChangeEvent = require('./rx-change-event');

var _rxChangeEvent2 = _interopRequireDefault(_rxChangeEvent);

var _rxError = require('./rx-error');

var _rxError2 = _interopRequireDefault(_rxError);

var _hooks = require('./hooks');

var _BehaviorSubject = require('rxjs/BehaviorSubject');

var _distinctUntilChanged = require('rxjs/operators/distinctUntilChanged');

var _map = require('rxjs/operators/map');

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) newObj[key] = obj[key]; } } newObj['default'] = obj; return newObj; } }

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

var RxDocument = exports.RxDocument = function () {
    function RxDocument(collection, jsonData) {
        (0, _classCallCheck3['default'])(this, RxDocument);

        this.collection = collection;

        // if true, this is a temporary document
        this._isTemporary = false;

        // assume that this is always equal to the doc-data in the database
        this._dataSync$ = new _BehaviorSubject.BehaviorSubject((0, _clone2['default'])(jsonData));

        // current doc-data, changes when setting values etc
        this._data = (0, _clone2['default'])(jsonData);

        // atomic-update-functions that have not run yes
        this._atomicUpdates = [];

        // resolve-functions to resolve the promises of atomicUpdate
        this._atomicUpdatesResolveFunctions = new WeakMap();

        // false when _data !== _dataSync
        this._synced$ = new _BehaviorSubject.BehaviorSubject(true);
        this._deleted$ = new _BehaviorSubject.BehaviorSubject(false);
    }

    (0, _createClass3['default'])(RxDocument, [{
        key: 'prepare',
        value: function prepare() {
            // set getter/setter/observable
            this._defineGetterSetter(this, '');
        }
    }, {
        key: 'resync',
        value: function resync() {
            var syncedData = this._dataSync$.getValue();
            if (this._synced$.getValue() && (0, _deepEqual2['default'])(syncedData, this._data)) return;else {
                this._data = (0, _clone2['default'])(this._dataSync$.getValue());
                this._synced$.next(true);
            }
        }

        /**
         * returns the observable which emits the plain-data of this document
         * @return {Observable}
         */

    }, {
        key: '_handleChangeEvent',


        /**
         * @param {ChangeEvent}
         */
        value: function _handleChangeEvent(changeEvent) {
            if (changeEvent.data.doc !== this.primary) return;

            // TODO check if new _rev is higher then current

            switch (changeEvent.data.op) {
                case 'INSERT':
                    break;
                case 'UPDATE':
                    var newData = (0, _clone2['default'])(changeEvent.data.v);
                    var prevSyncData = this._dataSync$.getValue();
                    var prevData = this._data;

                    if ((0, _deepEqual2['default'])(prevSyncData, prevData)) {
                        // document is in sync, overwrite _data
                        this._data = newData;

                        if (this._synced$.getValue() !== true) this._synced$.next(true);
                    } else {
                        // not in sync, emit to synced$
                        if (this._synced$.getValue() !== false) this._synced$.next(false);

                        // overwrite _rev of data
                        this._data._rev = newData._rev;
                    }
                    this._dataSync$.next((0, _clone2['default'])(newData));
                    break;
                case 'REMOVE':
                    // remove from docCache to assure new upserted RxDocuments will be a new instance
                    this.collection._docCache['delete'](this.primary);
                    this._deleted$.next(true);
                    break;
            }
        }

        /**
         * emits the changeEvent to the upper instance (RxCollection)
         * @param  {RxChangeEvent} changeEvent
         */

    }, {
        key: '$emit',
        value: function $emit(changeEvent) {
            return this.collection.$emit(changeEvent);
        }

        /**
         * returns observable of the value of the given path
         * @param {string} path
         * @return {Observable}
         */

    }, {
        key: 'get$',
        value: function get$(path) {
            if (path.includes('.item.')) {
                throw _rxError2['default'].newRxError('DOC1', {
                    path: path
                });
            }

            if (path === this.primaryPath) throw _rxError2['default'].newRxError('DOC2');

            // final fields cannot be modified and so also not observed
            if (this.collection.schema.finalFields.includes(path)) {
                throw _rxError2['default'].newRxError('DOC3', {
                    path: path
                });
            }

            var schemaObj = this.collection.schema.getSchemaByObjectPath(path);
            if (!schemaObj) {
                throw _rxError2['default'].newRxError('DOC4', {
                    path: path
                });
            }

            return this._dataSync$.pipe((0, _map.map)(function (data) {
                return _objectPath2['default'].get(data, path);
            }), (0, _distinctUntilChanged.distinctUntilChanged)()).asObservable();
        }

        /**
         * populate the given path
         * @param  {string}  path
         * @return {Promise<RxDocument>}
         */

    }, {
        key: 'populate',
        value: function populate(path) {
            var schemaObj = this.collection.schema.getSchemaByObjectPath(path);
            var value = this.get(path);
            if (!schemaObj) {
                throw _rxError2['default'].newRxError('DOC5', {
                    path: path
                });
            }
            if (!schemaObj.ref) {
                throw _rxError2['default'].newRxError('DOC6', {
                    path: path,
                    schemaObj: schemaObj
                });
            }

            var refCollection = this.collection.database.collections[schemaObj.ref];
            if (!refCollection) {
                throw _rxError2['default'].newRxError('DOC7', {
                    ref: schemaObj.ref,
                    path: path,
                    schemaObj: schemaObj
                });
            }

            if (schemaObj.type === 'array') return Promise.all(value.map(function (id) {
                return refCollection.findOne(id).exec();
            }));else return refCollection.findOne(value).exec();
        }

        /**
         * get data by objectPath
         * @param {string} objPath
         * @return {object} valueObj
         */

    }, {
        key: 'get',
        value: function get(objPath) {
            if (!this._data) return undefined;
            var valueObj = _objectPath2['default'].get(this._data, objPath);
            valueObj = (0, _clone2['default'])(valueObj);

            // direct return if array or non-object
            if ((typeof valueObj === 'undefined' ? 'undefined' : (0, _typeof3['default'])(valueObj)) !== 'object' || Array.isArray(valueObj)) return valueObj;

            this._defineGetterSetter(valueObj, objPath);
            return valueObj;
        }
    }, {
        key: '_defineGetterSetter',
        value: function _defineGetterSetter(valueObj) {
            var _this = this;

            var objPath = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : '';

            if (valueObj === null) return;

            var pathProperties = this.collection.schema.getSchemaByObjectPath(objPath);
            if (pathProperties.properties) pathProperties = pathProperties.properties;

            Object.keys(pathProperties).forEach(function (key) {
                var fullPath = util.trimDots(objPath + '.' + key);

                // getter - value
                valueObj.__defineGetter__(key, function () {
                    return _this.get(fullPath);
                });
                // getter - observable$
                Object.defineProperty(valueObj, key + '$', {
                    get: function get() {
                        return _this.get$(fullPath);
                    },
                    enumerable: false,
                    configurable: false
                });
                // getter - populate_
                Object.defineProperty(valueObj, key + '_', {
                    get: function get() {
                        return _this.populate(fullPath);
                    },
                    enumerable: false,
                    configurable: false
                });
                // setter - value
                valueObj.__defineSetter__(key, function (val) {
                    return _this.set(fullPath, val);
                });
            });
        }
    }, {
        key: 'toJSON',
        value: function toJSON() {
            return (0, _clone2['default'])(this._data);
        }

        /**
         * set data by objectPath
         * @param {string} objPath
         * @param {object} value
         */

    }, {
        key: 'set',
        value: function set(objPath, value) {
            if (typeof objPath !== 'string') {
                throw _rxError2['default'].newRxTypeError('DOC15', {
                    objPath: objPath,
                    value: value
                });
            }

            // primary cannot be modified
            if (!this._isTemporary && objPath === this.primaryPath) {
                throw _rxError2['default'].newRxError('DOC8', {
                    objPath: objPath,
                    value: value,
                    primaryPath: this.primaryPath
                });
            }

            // final fields cannot be modified
            if (!this._isTemporary && this.collection.schema.finalFields.includes(objPath)) {
                throw _rxError2['default'].newRxError('DOC9', {
                    path: objPath,
                    value: value
                });
            }

            // check if equal
            if (Object.is(this.get(objPath), value)) return;

            // check if nested without root-object
            var pathEls = objPath.split('.');
            pathEls.pop();
            var rootPath = pathEls.join('.');
            if (typeof _objectPath2['default'].get(this._data, rootPath) === 'undefined') {
                throw _rxError2['default'].newRxError('DOC10', {
                    childpath: objPath,
                    rootPath: rootPath
                });
            }

            // check schema of changed field
            if (!this._isTemporary) this.collection.schema.validate(value, objPath);

            _objectPath2['default'].set(this._data, objPath, value);
            return this;
        }
    }, {
        key: 'update',


        /**
         * updates document
         * @overwritten by plugin (optinal)
         * @param  {object} updateObj mongodb-like syntax
         */
        value: function () {
            var _ref = (0, _asyncToGenerator3['default'])( /*#__PURE__*/_regenerator2['default'].mark(function _callee() {
                return _regenerator2['default'].wrap(function _callee$(_context) {
                    while (1) {
                        switch (_context.prev = _context.next) {
                            case 0:
                                throw _rxError2['default'].pluginMissing('update');

                            case 1:
                            case 'end':
                                return _context.stop();
                        }
                    }
                }, _callee, this);
            }));

            function update() {
                return _ref.apply(this, arguments);
            }

            return update;
        }()
    }, {
        key: 'putAttachment',
        value: function () {
            var _ref2 = (0, _asyncToGenerator3['default'])( /*#__PURE__*/_regenerator2['default'].mark(function _callee2() {
                return _regenerator2['default'].wrap(function _callee2$(_context2) {
                    while (1) {
                        switch (_context2.prev = _context2.next) {
                            case 0:
                                throw _rxError2['default'].pluginMissing('attachments');

                            case 1:
                            case 'end':
                                return _context2.stop();
                        }
                    }
                }, _callee2, this);
            }));

            function putAttachment() {
                return _ref2.apply(this, arguments);
            }

            return putAttachment;
        }()
    }, {
        key: 'getAttachment',
        value: function () {
            var _ref3 = (0, _asyncToGenerator3['default'])( /*#__PURE__*/_regenerator2['default'].mark(function _callee3() {
                return _regenerator2['default'].wrap(function _callee3$(_context3) {
                    while (1) {
                        switch (_context3.prev = _context3.next) {
                            case 0:
                                throw _rxError2['default'].pluginMissing('attachments');

                            case 1:
                            case 'end':
                                return _context3.stop();
                        }
                    }
                }, _callee3, this);
            }));

            function getAttachment() {
                return _ref3.apply(this, arguments);
            }

            return getAttachment;
        }()
    }, {
        key: 'allAttachments',
        value: function () {
            var _ref4 = (0, _asyncToGenerator3['default'])( /*#__PURE__*/_regenerator2['default'].mark(function _callee4() {
                return _regenerator2['default'].wrap(function _callee4$(_context4) {
                    while (1) {
                        switch (_context4.prev = _context4.next) {
                            case 0:
                                throw _rxError2['default'].pluginMissing('attachments');

                            case 1:
                            case 'end':
                                return _context4.stop();
                        }
                    }
                }, _callee4, this);
            }));

            function allAttachments() {
                return _ref4.apply(this, arguments);
            }

            return allAttachments;
        }()
    }, {
        key: 'atomicUpdate',


        /**
         * [atomicUpdate description]
         * @param  {[type]}  fun [description]
         * @return {Promise<RxDocument>}     [description]
         */
        value: function () {
            var _ref5 = (0, _asyncToGenerator3['default'])( /*#__PURE__*/_regenerator2['default'].mark(function _callee5(fun) {
                var _this2 = this;

                var retPromise;
                return _regenerator2['default'].wrap(function _callee5$(_context5) {
                    while (1) {
                        switch (_context5.prev = _context5.next) {
                            case 0:
                                this._atomicUpdates.push(fun);
                                retPromise = new Promise(function (resolve, reject) {
                                    _this2._atomicUpdatesResolveFunctions.set(fun, {
                                        resolve: resolve,
                                        reject: reject
                                    });
                                });

                                this._runAtomicUpdates();
                                return _context5.abrupt('return', retPromise);

                            case 4:
                            case 'end':
                                return _context5.stop();
                        }
                    }
                }, _callee5, this);
            }));

            function atomicUpdate(_x2) {
                return _ref5.apply(this, arguments);
            }

            return atomicUpdate;
        }()
    }, {
        key: '_runAtomicUpdates',
        value: function () {
            var _ref6 = (0, _asyncToGenerator3['default'])( /*#__PURE__*/_regenerator2['default'].mark(function _callee6() {
                var fun;
                return _regenerator2['default'].wrap(function _callee6$(_context6) {
                    while (1) {
                        switch (_context6.prev = _context6.next) {
                            case 0:
                                if (!this.__runAtomicUpdates_running) {
                                    _context6.next = 4;
                                    break;
                                }

                                return _context6.abrupt('return');

                            case 4:
                                this.__runAtomicUpdates_running = true;

                            case 5:
                                if (!(this._atomicUpdates.length === 0)) {
                                    _context6.next = 8;
                                    break;
                                }

                                this.__runAtomicUpdates_running = false;
                                return _context6.abrupt('return');

                            case 8:
                                ;
                                fun = this._atomicUpdates.shift();
                                _context6.prev = 10;
                                _context6.next = 13;
                                return fun(this);

                            case 13:
                                _context6.next = 15;
                                return this.save();

                            case 15:
                                _context6.next = 20;
                                break;

                            case 17:
                                _context6.prev = 17;
                                _context6.t0 = _context6['catch'](10);

                                this._atomicUpdatesResolveFunctions.get(fun).reject(_context6.t0);

                            case 20:
                                this._atomicUpdatesResolveFunctions.get(fun).resolve(this); // resolve promise
                                this.__runAtomicUpdates_running = false;
                                this._runAtomicUpdates();

                            case 23:
                            case 'end':
                                return _context6.stop();
                        }
                    }
                }, _callee6, this, [[10, 17]]);
            }));

            function _runAtomicUpdates() {
                return _ref6.apply(this, arguments);
            }

            return _runAtomicUpdates;
        }()

        /**
         * save document if its data has changed
         * @return {boolean} false if nothing to save
         */

    }, {
        key: 'save',
        value: function () {
            var _ref7 = (0, _asyncToGenerator3['default'])( /*#__PURE__*/_regenerator2['default'].mark(function _callee7() {
                var ret, emitValue, changeEvent;
                return _regenerator2['default'].wrap(function _callee7$(_context7) {
                    while (1) {
                        switch (_context7.prev = _context7.next) {
                            case 0:
                                if (!this._isTemporary) {
                                    _context7.next = 2;
                                    break;
                                }

                                return _context7.abrupt('return', this._saveTemporary());

                            case 2:
                                if (!this._deleted$.getValue()) {
                                    _context7.next = 4;
                                    break;
                                }

                                throw _rxError2['default'].newRxError('DOC11', {
                                    id: this.primary,
                                    document: this
                                });

                            case 4:
                                if (!(0, _deepEqual2['default'])(this._data, this._dataSync$.getValue())) {
                                    _context7.next = 7;
                                    break;
                                }

                                this._synced$.next(true);
                                return _context7.abrupt('return', false);

                            case 7:
                                _context7.next = 9;
                                return this.collection._runHooks('pre', 'save', this);

                            case 9:

                                this.collection.schema.validate(this._data);

                                _context7.next = 12;
                                return this.collection._pouchPut((0, _clone2['default'])(this._data));

                            case 12:
                                ret = _context7.sent;

                                if (ret.ok) {
                                    _context7.next = 15;
                                    break;
                                }

                                throw _rxError2['default'].newRxError('DOC12', {
                                    data: ret
                                });

                            case 15:
                                emitValue = (0, _clone2['default'])(this._data);

                                emitValue._rev = ret.rev;

                                this._data = emitValue;

                                _context7.next = 20;
                                return this.collection._runHooks('post', 'save', this);

                            case 20:

                                // event
                                this._synced$.next(true);
                                this._dataSync$.next((0, _clone2['default'])(emitValue));

                                changeEvent = _rxChangeEvent2['default'].create('UPDATE', this.collection.database, this.collection, this, emitValue);

                                this.$emit(changeEvent);
                                return _context7.abrupt('return', true);

                            case 25:
                            case 'end':
                                return _context7.stop();
                        }
                    }
                }, _callee7, this);
            }));

            function save() {
                return _ref7.apply(this, arguments);
            }

            return save;
        }()

        /**
         * does the same as .save() but for temporary documents
         * Saving a temporary doc is basically the same as RxCollection.insert()
         * @return {Promise}
         */

    }, {
        key: '_saveTemporary',
        value: function () {
            var _ref8 = (0, _asyncToGenerator3['default'])( /*#__PURE__*/_regenerator2['default'].mark(function _callee8() {
                return _regenerator2['default'].wrap(function _callee8$(_context8) {
                    while (1) {
                        switch (_context8.prev = _context8.next) {
                            case 0:
                                _context8.next = 2;
                                return this.collection.insert(this);

                            case 2:
                                this._isTemporary = false;
                                this.collection._docCache.set(this.primary, this);

                                // internal events
                                this._synced$.next(true);
                                this._dataSync$.next((0, _clone2['default'])(this._data));

                                return _context8.abrupt('return', true);

                            case 7:
                            case 'end':
                                return _context8.stop();
                        }
                    }
                }, _callee8, this);
            }));

            function _saveTemporary() {
                return _ref8.apply(this, arguments);
            }

            return _saveTemporary;
        }()
    }, {
        key: 'remove',
        value: function () {
            var _ref9 = (0, _asyncToGenerator3['default'])( /*#__PURE__*/_regenerator2['default'].mark(function _callee9() {
                var _this3 = this;

                return _regenerator2['default'].wrap(function _callee9$(_context9) {
                    while (1) {
                        switch (_context9.prev = _context9.next) {
                            case 0:
                                if (!this.deleted) {
                                    _context9.next = 2;
                                    break;
                                }

                                throw _rxError2['default'].newRxError('DOC13', {
                                    document: this,
                                    id: this.primary
                                });

                            case 2:
                                _context9.next = 4;
                                return util.promiseWait(0);

                            case 4:
                                _context9.next = 6;
                                return this.collection._runHooks('pre', 'remove', this);

                            case 6:
                                _context9.next = 8;
                                return this.collection.database.lockedRun(function () {
                                    return _this3.collection.pouch.remove(_this3.primary, _this3._data._rev);
                                });

                            case 8:

                                this.$emit(_rxChangeEvent2['default'].create('REMOVE', this.collection.database, this.collection, this, this._data));

                                _context9.next = 11;
                                return this.collection._runHooks('post', 'remove', this);

                            case 11:
                                _context9.next = 13;
                                return util.promiseWait(0);

                            case 13:
                                return _context9.abrupt('return');

                            case 14:
                            case 'end':
                                return _context9.stop();
                        }
                    }
                }, _callee9, this);
            }));

            function remove() {
                return _ref9.apply(this, arguments);
            }

            return remove;
        }()
    }, {
        key: 'destroy',
        value: function destroy() {
            throw _rxError2['default'].newRxError('DOC14');
        }
    }, {
        key: 'primaryPath',
        get: function get() {
            return this.collection.schema.primaryPath;
        }
    }, {
        key: 'primary',
        get: function get() {
            return this._data[this.primaryPath];
        }
    }, {
        key: 'revision',
        get: function get() {
            return this._data._rev;
        }
    }, {
        key: 'deleted$',
        get: function get() {
            return this._deleted$.asObservable();
        }
    }, {
        key: 'deleted',
        get: function get() {
            return this._deleted$.getValue();
        }
    }, {
        key: 'synced$',
        get: function get() {
            return this._synced$.pipe((0, _distinctUntilChanged.distinctUntilChanged)()).asObservable();
        }
    }, {
        key: 'synced',
        get: function get() {
            return this._synced$.getValue();
        }
    }, {
        key: '$',
        get: function get() {
            return this._dataSync$.asObservable();
        }
    }, {
        key: 'allAttachments$',
        get: function get() {
            throw _rxError2['default'].pluginMissing('attachments');
        }
    }]);
    return RxDocument;
}();

/**
 * createas an RxDocument from the jsonData
 * @param  {RxCollection} collection
 * @param  {[type]} jsonData   [description]
 * @return {RxDocument}
 */


function create(collection, jsonData) {
    if (jsonData[collection.schema.primaryPath] && jsonData[collection.schema.primaryPath].startsWith('_design')) return null;

    var doc = new RxDocument(collection, jsonData);
    doc.prepare();
    (0, _hooks.runPluginHooks)('createRxDocument', doc);
    return doc;
}

function createAr(collection, jsonDataAr) {
    return jsonDataAr.map(function (jsonData) {
        return create(collection, jsonData);
    }).filter(function (doc) {
        return doc !== null;
    });
}

/**
 * returns all possible properties of a RxDocument
 * @return {string[]} property-names
 */
var _properties = void 0;
function properties() {
    if (!_properties) {
        var reserved = ['deleted', 'synced'];
        var pseudoRxDocument = new RxDocument();
        var ownProperties = Object.getOwnPropertyNames(pseudoRxDocument);
        var prototypeProperties = Object.getOwnPropertyNames(Object.getPrototypeOf(pseudoRxDocument));
        _properties = [].concat((0, _toConsumableArray3['default'])(ownProperties), (0, _toConsumableArray3['default'])(prototypeProperties), reserved);
    }
    return _properties;
}

function isInstanceOf(obj) {
    return obj instanceof RxDocument;
}

exports['default'] = {
    create: create,
    createAr: createAr,
    properties: properties,
    RxDocument: RxDocument,
    isInstanceOf: isInstanceOf
};
