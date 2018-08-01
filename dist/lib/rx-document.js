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

var _customIdleQueue = require('custom-idle-queue');

var _customIdleQueue2 = _interopRequireDefault(_customIdleQueue);

var _objectPath = require('object-path');

var _objectPath2 = _interopRequireDefault(_objectPath);

var _deepEqual = require('deep-equal');

var _deepEqual2 = _interopRequireDefault(_deepEqual);

var _util = require('./util');

var _rxChangeEvent = require('./rx-change-event');

var _rxChangeEvent2 = _interopRequireDefault(_rxChangeEvent);

var _rxError = require('./rx-error');

var _rxError2 = _interopRequireDefault(_rxError);

var _hooks = require('./hooks');

var _rxjs = require('rxjs');

var _operators = require('rxjs/operators');

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

var RxDocument = exports.RxDocument = function () {
    function RxDocument(collection, jsonData) {
        (0, _classCallCheck3['default'])(this, RxDocument);

        this.collection = collection;

        // if true, this is a temporary document
        this._isTemporary = false;

        // assume that this is always equal to the doc-data in the database
        this._dataSync$ = new _rxjs.BehaviorSubject((0, _util.clone)(jsonData));

        // current doc-data, changes when setting values etc
        this._data = (0, _util.clone)(jsonData);

        // false when _data !== _dataSync
        this._synced$ = new _rxjs.BehaviorSubject(true);
        this._deleted$ = new _rxjs.BehaviorSubject(false);
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
                this._data = (0, _util.clone)(this._dataSync$.getValue());
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
                    var newData = (0, _util.clone)(changeEvent.data.v);
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
                    this._dataSync$.next((0, _util.clone)(newData));
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

            return this._dataSync$.pipe((0, _operators.map)(function (data) {
                return _objectPath2['default'].get(data, path);
            }), (0, _operators.distinctUntilChanged)()).asObservable();
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
            valueObj = (0, _util.clone)(valueObj);

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
            if (typeof pathProperties === 'undefined') return;
            if (pathProperties.properties) pathProperties = pathProperties.properties;

            Object.keys(pathProperties).forEach(function (key) {
                var fullPath = (0, _util.trimDots)(objPath + '.' + key);

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
            return (0, _util.clone)(this._data);
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

        /**
         * updates document
         * @overwritten by plugin (optinal)
         * @param  {object} updateObj mongodb-like syntax
         */

    }, {
        key: 'update',
        value: function update() {
            throw _rxError2['default'].pluginMissing('update');
        }
    }, {
        key: 'putAttachment',
        value: function putAttachment() {
            throw _rxError2['default'].pluginMissing('attachments');
        }
    }, {
        key: 'getAttachment',
        value: function getAttachment() {
            throw _rxError2['default'].pluginMissing('attachments');
        }
    }, {
        key: 'allAttachments',
        value: function allAttachments() {
            throw _rxError2['default'].pluginMissing('attachments');
        }
    }, {
        key: 'atomicUpdate',


        /**
         * runs an atomic update over the document
         * @param  {function(RxDocument)}  fun
         * @return {Promise<RxDocument>}
         */
        value: function atomicUpdate(fun) {
            var _this2 = this;

            var queue = this.atomicQueue;
            return queue.requestIdlePromise().then(function () {
                return queue.wrapCall((0, _asyncToGenerator3['default'])( /*#__PURE__*/_regenerator2['default'].mark(function _callee() {
                    return _regenerator2['default'].wrap(function _callee$(_context) {
                        while (1) {
                            switch (_context.prev = _context.next) {
                                case 0:
                                    _context.next = 2;
                                    return fun(_this2);

                                case 2:
                                    _context.next = 4;
                                    return _this2.save();

                                case 4:
                                case 'end':
                                    return _context.stop();
                            }
                        }
                    }, _callee, _this2);
                })));
            }).then(function () {
                return _this2;
            });
        }

        /**
         * save document if its data has changed
         * @return {boolean} false if nothing to save
         */

    }, {
        key: 'save',
        value: function () {
            var _ref2 = (0, _asyncToGenerator3['default'])( /*#__PURE__*/_regenerator2['default'].mark(function _callee2() {
                var ret, emitValue, changeEvent;
                return _regenerator2['default'].wrap(function _callee2$(_context2) {
                    while (1) {
                        switch (_context2.prev = _context2.next) {
                            case 0:
                                if (!this._isTemporary) {
                                    _context2.next = 2;
                                    break;
                                }

                                return _context2.abrupt('return', this._saveTemporary());

                            case 2:
                                if (!this._deleted$.getValue()) {
                                    _context2.next = 4;
                                    break;
                                }

                                throw _rxError2['default'].newRxError('DOC11', {
                                    id: this.primary,
                                    document: this
                                });

                            case 4:
                                if (!(0, _deepEqual2['default'])(this._data, this._dataSync$.getValue())) {
                                    _context2.next = 7;
                                    break;
                                }

                                this._synced$.next(true);
                                return _context2.abrupt('return', false);

                            case 7:
                                _context2.next = 9;
                                return this.collection._runHooks('pre', 'save', this);

                            case 9:

                                this.collection.schema.validate(this._data);

                                _context2.next = 12;
                                return this.collection._pouchPut((0, _util.clone)(this._data));

                            case 12:
                                ret = _context2.sent;

                                if (ret.ok) {
                                    _context2.next = 15;
                                    break;
                                }

                                throw _rxError2['default'].newRxError('DOC12', {
                                    data: ret
                                });

                            case 15:
                                emitValue = (0, _util.clone)(this._data);

                                emitValue._rev = ret.rev;

                                this._data = emitValue;

                                _context2.next = 20;
                                return this.collection._runHooks('post', 'save', this);

                            case 20:

                                // event
                                this._synced$.next(true);
                                this._dataSync$.next((0, _util.clone)(emitValue));

                                changeEvent = _rxChangeEvent2['default'].create('UPDATE', this.collection.database, this.collection, this, emitValue);

                                this.$emit(changeEvent);
                                return _context2.abrupt('return', true);

                            case 25:
                            case 'end':
                                return _context2.stop();
                        }
                    }
                }, _callee2, this);
            }));

            function save() {
                return _ref2.apply(this, arguments);
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
        value: function _saveTemporary() {
            var _this3 = this;

            return this.collection.insert(this).then(function () {
                _this3._isTemporary = false;
                _this3.collection._docCache.set(_this3.primary, _this3);

                // internal events
                _this3._synced$.next(true);
                _this3._dataSync$.next((0, _util.clone)(_this3._data));

                return true;
            });
        }
    }, {
        key: 'remove',
        value: function remove() {
            var _this4 = this;

            if (this.deleted) {
                throw _rxError2['default'].newRxError('DOC13', {
                    document: this,
                    id: this.primary
                });
            }

            return (0, _util.promiseWait)(0).then(function () {
                return _this4.collection._runHooks('pre', 'remove', _this4);
            }).then(function () {
                return _this4.collection.database.lockedRun(function () {
                    return _this4.collection.pouch.remove(_this4.primary, _this4._data._rev);
                });
            }).then(function () {
                _this4.$emit(_rxChangeEvent2['default'].create('REMOVE', _this4.collection.database, _this4.collection, _this4, _this4._data));
                return _this4.collection._runHooks('post', 'remove', _this4);
            }).then(function () {
                return (0, _util.promiseWait)(0);
            });
        }
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
        key: 'atomicQueue',
        get: function get() {
            if (!this._atomicQueue) this._atomicQueue = new _customIdleQueue2['default']();
            return this._atomicQueue;
        }
    }, {
        key: 'synced$',
        get: function get() {
            return this._synced$.pipe((0, _operators.distinctUntilChanged)()).asObservable();
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
