'use strict';

Object.defineProperty(exports, "__esModule", {
    value: true
});

var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) { return typeof obj; } : function (obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; };

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

exports.create = create;
exports.createAr = createAr;
exports.properties = properties;

var _clone = require('clone');

var _clone2 = _interopRequireDefault(_clone);

var _objectPath = require('object-path');

var _objectPath2 = _interopRequireDefault(_objectPath);

var _deepEqual = require('deep-equal');

var _deepEqual2 = _interopRequireDefault(_deepEqual);

var _util = require('./util');

var util = _interopRequireWildcard(_util);

var _RxChangeEvent = require('./RxChangeEvent');

var RxChangeEvent = _interopRequireWildcard(_RxChangeEvent);

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) newObj[key] = obj[key]; } } newObj.default = obj; return newObj; } }

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _toConsumableArray(arr) { if (Array.isArray(arr)) { for (var i = 0, arr2 = Array(arr.length); i < arr.length; i++) { arr2[i] = arr[i]; } return arr2; } else { return Array.from(arr); } }

function _asyncToGenerator(fn) { return function () { var gen = fn.apply(this, arguments); return new Promise(function (resolve, reject) { function step(key, arg) { try { var info = gen[key](arg); var value = info.value; } catch (error) { reject(error); return; } if (info.done) { resolve(value); } else { return Promise.resolve(value).then(function (value) { step("next", value); }, function (err) { step("throw", err); }); } } return step("next"); }); }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var RxDocument = function () {
    function RxDocument(collection, jsonData) {
        _classCallCheck(this, RxDocument);

        this.collection = collection;

        // assume that this is always equal to the doc-data in the database
        this._dataSync$ = new util.Rx.BehaviorSubject((0, _clone2.default)(jsonData));

        // current doc-data, changes when setting values etc
        this._data = (0, _clone2.default)(jsonData);

        // false when _data !== _dataSync
        this._synced$ = new util.Rx.BehaviorSubject(true);

        this._deleted$ = new util.Rx.BehaviorSubject(false);
    }

    _createClass(RxDocument, [{
        key: 'prepare',
        value: function prepare() {
            // set getter/setter/observable
            this._defineGetterSetter(this, '');
        }
    }, {
        key: 'getPrimaryPath',
        value: function getPrimaryPath() {
            return this.collection.schema.primaryPath;
        }
    }, {
        key: 'getPrimary',
        value: function getPrimary() {
            return this._data[this.getPrimaryPath()];
        }
    }, {
        key: 'getRevision',
        value: function getRevision() {
            return this._data._rev;
        }
    }, {
        key: 'resync',
        value: function resync() {
            if (this._synced$.getValue()) return;else {
                this._data = (0, _clone2.default)(this._dataSync$.getValue());
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
            if (changeEvent.data.doc != this.getPrimary()) return;

            // TODO check if new _rev is higher then current

            switch (changeEvent.data.op) {
                case 'INSERT':
                    break;
                case 'UPDATE':
                    var newData = (0, _clone2.default)(changeEvent.data.v);
                    delete newData._ext;
                    var prevSyncData = this._dataSync$.getValue();
                    var prevData = this._data;

                    if ((0, _deepEqual2.default)(prevSyncData, prevData)) {
                        // document is in sync, overwrite _data
                        this._data = newData;

                        if (this._synced$.getValue() != true) this._synced$.next(true);
                    } else {
                        // not in sync, emit to synced$
                        if (this._synced$.getValue() != false) this._synced$.next(false);

                        // overwrite _rev of data
                        this._data._rev = newData._rev;
                    }
                    this._dataSync$.next((0, _clone2.default)(newData));
                    break;
                case 'REMOVE':
                    // remove from docCache to assure new upserted RxDocuments will be a new instance
                    this.collection._docCache.delete(this.getPrimary());

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
            if (path.includes('.item.')) throw new Error('cannot get observable of in-array fields because order cannot be guessed: ' + path);

            var schemaObj = this.collection.schema.getSchemaByObjectPath(path);
            if (!schemaObj) throw new Error('cannot observe a non-existed field (' + path + ')');

            return this._dataSync$.map(function (data) {
                return _objectPath2.default.get(data, path);
            }).distinctUntilChanged().asObservable();
        }
    }, {
        key: 'populate',
        value: function () {
            var _ref = _asyncToGenerator(regeneratorRuntime.mark(function _callee(path, object) {
                var schemaObj, value, refCollection;
                return regeneratorRuntime.wrap(function _callee$(_context) {
                    while (1) {
                        switch (_context.prev = _context.next) {
                            case 0:
                                schemaObj = this.collection.schema.getSchemaByObjectPath(path);
                                value = this.get(path);

                                if (schemaObj) {
                                    _context.next = 4;
                                    break;
                                }

                                throw new Error('cannot populate a non-existed field (' + path + ')');

                            case 4:
                                if (schemaObj.ref) {
                                    _context.next = 6;
                                    break;
                                }

                                throw new Error('cannot populate because path has no ref (' + path + ')');

                            case 6:
                                refCollection = this.collection.database.collections[schemaObj.ref];

                                if (refCollection) {
                                    _context.next = 9;
                                    break;
                                }

                                throw new Error('ref-collection (' + schemaObj.ref + ') not in database');

                            case 9:
                                if (!(schemaObj.type == 'array')) {
                                    _context.next = 13;
                                    break;
                                }

                                return _context.abrupt('return', Promise.all(value.map(function (id) {
                                    return refCollection.findOne(id).exec();
                                })));

                            case 13:
                                _context.next = 15;
                                return refCollection.findOne(value).exec();

                            case 15:
                                return _context.abrupt('return', _context.sent);

                            case 16:
                            case 'end':
                                return _context.stop();
                        }
                    }
                }, _callee, this);
            }));

            function populate(_x, _x2) {
                return _ref.apply(this, arguments);
            }

            return populate;
        }()

        /**
         * get data by objectPath
         * @param {string} objPath
         * @return {object} valueObj
         */

    }, {
        key: 'get',
        value: function get(objPath) {
            if (!this._data) return undefined;

            if (typeof objPath !== 'string') throw new TypeError('RxDocument.get(): objPath must be a string');

            var valueObj = _objectPath2.default.get(this._data, objPath);
            valueObj = (0, _clone2.default)(valueObj);

            // direct return if array or non-object
            if ((typeof valueObj === 'undefined' ? 'undefined' : _typeof(valueObj)) != 'object' || Array.isArray(valueObj)) return valueObj;

            this._defineGetterSetter(valueObj, objPath);
            return valueObj;
        }
    }, {
        key: '_defineGetterSetter',
        value: function _defineGetterSetter(valueObj) {
            var _this = this;

            var objPath = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : '';

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
            return (0, _clone2.default)(this._data);
        }

        /**
         * set data by objectPath
         * @param {string} objPath
         * @param {object} value
         */

    }, {
        key: 'set',
        value: function set(objPath, value) {
            if (typeof objPath !== 'string') throw new TypeError('RxDocument.set(): objPath must be a string');
            if (objPath == this.getPrimaryPath()) {
                throw new Error('RxDocument.set(): primary-key (' + this.getPrimaryPath() + ')\n                cannot be modified');
            }
            // check if equal
            if (Object.is(this.get(objPath), value)) return;

            // check if nested without root-object
            var pathEls = objPath.split('.');
            pathEls.pop();
            var rootPath = pathEls.join('.');
            if (typeof _objectPath2.default.get(this._data, rootPath) === 'undefined') {
                throw new Error('cannot set childpath ' + objPath + '\n                 when rootPath ' + rootPath + ' not selected');
            }

            // check schema of changed field
            this.collection.schema.validate(value, objPath);

            _objectPath2.default.set(this._data, objPath, value);

            return this;
        }
    }, {
        key: 'save',


        /**
         * save document if its data has changed
         * @return {boolean} false if nothing to save
         */
        value: function () {
            var _ref2 = _asyncToGenerator(regeneratorRuntime.mark(function _callee2() {
                var ret, emitValue, changeEvent;
                return regeneratorRuntime.wrap(function _callee2$(_context2) {
                    while (1) {
                        switch (_context2.prev = _context2.next) {
                            case 0:
                                if (!this._deleted$.getValue()) {
                                    _context2.next = 2;
                                    break;
                                }

                                throw new Error('RxDocument.save(): cant save deleted document');

                            case 2:
                                if (!(0, _deepEqual2.default)(this._data, this._dataSync$.getValue())) {
                                    _context2.next = 5;
                                    break;
                                }

                                this._synced$.next(true);
                                return _context2.abrupt('return', false);

                            case 5:
                                _context2.next = 7;
                                return this.collection._runHooks('pre', 'save', this);

                            case 7:
                                this.collection.schema.validate(this._data);

                                _context2.next = 10;
                                return this.collection._pouchPut((0, _clone2.default)(this._data));

                            case 10:
                                ret = _context2.sent;

                                if (ret.ok) {
                                    _context2.next = 13;
                                    break;
                                }

                                throw new Error('RxDocument.save(): error ' + JSON.stringify(ret));

                            case 13:
                                emitValue = (0, _clone2.default)(this._data);

                                emitValue._rev = ret.rev;

                                this._data = emitValue;

                                _context2.next = 18;
                                return this.collection._runHooks('post', 'save', this);

                            case 18:

                                // event
                                this._synced$.next(true);
                                this._dataSync$.next((0, _clone2.default)(emitValue));

                                changeEvent = RxChangeEvent.create('UPDATE', this.collection.database, this.collection, this, emitValue);

                                this.$emit(changeEvent);
                                return _context2.abrupt('return', true);

                            case 23:
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
    }, {
        key: 'remove',
        value: function () {
            var _ref3 = _asyncToGenerator(regeneratorRuntime.mark(function _callee3() {
                return regeneratorRuntime.wrap(function _callee3$(_context3) {
                    while (1) {
                        switch (_context3.prev = _context3.next) {
                            case 0:
                                if (!this.deleted) {
                                    _context3.next = 2;
                                    break;
                                }

                                throw new Error('RxDocument.remove(): Document is already deleted');

                            case 2:
                                _context3.next = 4;
                                return this.collection._runHooks('pre', 'remove', this);

                            case 4:
                                _context3.next = 6;
                                return this.collection.pouch.remove(this.getPrimary(), this._data._rev);

                            case 6:

                                this.$emit(RxChangeEvent.create('REMOVE', this.collection.database, this.collection, this, this._data));

                                _context3.next = 9;
                                return this.collection._runHooks('post', 'remove', this);

                            case 9:
                                _context3.next = 11;
                                return util.promiseWait(0);

                            case 11:
                                return _context3.abrupt('return');

                            case 12:
                            case 'end':
                                return _context3.stop();
                        }
                    }
                }, _callee3, this);
            }));

            function remove() {
                return _ref3.apply(this, arguments);
            }

            return remove;
        }()
    }, {
        key: 'destroy',
        value: function destroy() {}
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
            return this._synced$.asObservable().distinctUntilChanged();
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
    }]);

    return RxDocument;
}();

function create(collection, jsonData) {
    if (jsonData[collection.schema.primaryPath].startsWith('_design')) return null;

    var doc = new RxDocument(collection, jsonData);
    doc.prepare();
    return doc;
}

function createAr(collection, jsonDataAr) {
    return jsonDataAr.map(function (jsonData) {
        return create(collection, jsonData);
    }).filter(function (doc) {
        return doc != null;
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
        _properties = [].concat(_toConsumableArray(ownProperties), _toConsumableArray(prototypeProperties), reserved);
    }
    return _properties;
}
