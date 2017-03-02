'use strict';

Object.defineProperty(exports, "__esModule", {
    value: true
});

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

exports.isDeepEqual = isDeepEqual;
exports.create = create;
exports.createAr = createAr;
exports.properties = properties;

var _clone = require('clone');

var _clone2 = _interopRequireDefault(_clone);

var _objectPath = require('object-path');

var _objectPath2 = _interopRequireDefault(_objectPath);

var _util = require('./util');

var util = _interopRequireWildcard(_util);

var _RxChangeEvent = require('./RxChangeEvent');

var RxChangeEvent = _interopRequireWildcard(_RxChangeEvent);

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) newObj[key] = obj[key]; } } newObj.default = obj; return newObj; } }

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var RxDocument = function () {
    function RxDocument(collection, jsonData) {
        var _this = this;

        (0, _classCallCheck3.default)(this, RxDocument);

        this.$emit = function (changeEvent) {
            return _this.collection.$emit(changeEvent);
        };

        this.collection = collection;

        // assume that this is always equal to the doc-data in the database
        this._dataSync$ = new util.Rx.BehaviorSubject((0, _clone2.default)(jsonData));

        // current doc-data, changes when setting values etc
        this._data = (0, _clone2.default)(jsonData);

        // false when _data !== _dataSync
        this._synced$ = new util.Rx.BehaviorSubject(true);

        this._deleted$ = new util.Rx.BehaviorSubject(false);
    }

    (0, _createClass3.default)(RxDocument, [{
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

            //TODO check if new _rev is higher then current

            switch (changeEvent.data.op) {
                case 'INSERT':
                    break;
                case 'UPDATE':
                    var newData = (0, _clone2.default)(changeEvent.data.v);
                    delete newData._ext;
                    var prevSyncData = this._dataSync$.getValue();
                    var prevData = this._data;

                    if (isDeepEqual(prevSyncData, prevData)) {
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
        key: 'get$',


        /**
         * returns observable of the value of the given path
         * @param {string} path
         * @return {Observable}
         */
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
            var _ref = (0, _asyncToGenerator3.default)(_regenerator2.default.mark(function _callee(path, object) {
                var schemaObj, value, refCollection, doc;
                return _regenerator2.default.wrap(function _callee$(_context) {
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
                                _context.next = 11;
                                return refCollection.findOne(value).exec();

                            case 11:
                                doc = _context.sent;
                                return _context.abrupt('return', doc);

                            case 13:
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
            if ((typeof valueObj === 'undefined' ? 'undefined' : (0, _typeof3.default)(valueObj)) != 'object' || Array.isArray(valueObj)) return valueObj;

            this._defineGetterSetter(valueObj, objPath);
            return valueObj;
        }
    }, {
        key: '_defineGetterSetter',
        value: function _defineGetterSetter(valueObj) {
            var _this2 = this;

            var objPath = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : '';

            var pathProperties = this.collection.schema.getSchemaByObjectPath(objPath);
            if (pathProperties.properties) pathProperties = pathProperties.properties;

            Object.keys(pathProperties).forEach(function (key) {
                // getter - value
                valueObj.__defineGetter__(key, function () {
                    return _this2.get(util.trimDots(objPath + '.' + key));
                });
                // getter - observable$
                valueObj.__defineGetter__(key + '$', function () {
                    return _this2.get$(util.trimDots(objPath + '.' + key));
                });
                // getter - populate_
                valueObj.__defineGetter__(key + '_', function () {
                    return _this2.populate(util.trimDots(objPath + '.' + key));
                });

                // setter - value
                valueObj.__defineSetter__(key, function (val) {
                    return _this2.set(util.trimDots(objPath + '.' + key), val);
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
            var schemaObj = this.collection.schema.getSchemaByObjectPath(objPath);
            this.collection.schema.validate(value, schemaObj);

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
            var _ref2 = (0, _asyncToGenerator3.default)(_regenerator2.default.mark(function _callee2() {
                var ret, emitValue, changeEvent;
                return _regenerator2.default.wrap(function _callee2$(_context2) {
                    while (1) {
                        switch (_context2.prev = _context2.next) {
                            case 0:
                                if (!this._deleted$.getValue()) {
                                    _context2.next = 2;
                                    break;
                                }

                                throw new Error('RxDocument.save(): cant save deleted document');

                            case 2:
                                if (!isDeepEqual(this._data, this._dataSync$.getValue())) {
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
            var _ref3 = (0, _asyncToGenerator3.default)(_regenerator2.default.mark(function _callee3() {
                return _regenerator2.default.wrap(function _callee3$(_context3) {
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

                                this.deleted = true;
                                _context3.next = 7;
                                return this.collection.pouch.remove(this.getPrimary(), this._data._rev);

                            case 7:
                                _context3.next = 9;
                                return this.collection._runHooks('post', 'remove', this);

                            case 9:

                                this.$emit(RxChangeEvent.create('REMOVE', this.collection.database, this.collection, this, null));

                            case 10:
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
        key: 'synced$',
        get: function get() {
            return this._synced$.asObservable().distinctUntilChanged();
        }
    }, {
        key: '$',
        get: function get() {
            return this._dataSync$.asObservable();
        }
    }]);
    return RxDocument;
}();

/**
 * performs a deep-equal without comparing internal getters and setter (observe$ and populate_ etc.)
 * @param  {object}  data1
 * @param  {object}  data2
 * @throws {Error} if given data not a plain js object
 * @return {Boolean} true if equal
 */


function isDeepEqual(data1, data2) {
    if ((typeof data1 === 'undefined' ? 'undefined' : (0, _typeof3.default)(data1)) !== (typeof data2 === 'undefined' ? 'undefined' : (0, _typeof3.default)(data2))) return false;

    var ret = true;

    // array
    if (Array.isArray(data1)) {
        var k = 0;
        while (k < data1.length && ret == true) {
            if (!data2[k] || !isDeepEqual(data1[k], data2[k])) ret = false;
            k++;
        }
        return ret;
    }

    // object
    if ((typeof data1 === 'undefined' ? 'undefined' : (0, _typeof3.default)(data1)) === 'object') {
        var entries = Object.entries(data1).filter(function (entry) {
            return !entry[0].endsWith('$');
        }) // observe
        .filter(function (entry) {
            return !entry[0].endsWith('_');
        }); // populate;
        var _k = 0;
        while (_k < entries.length && ret) {
            var entry = entries[_k];
            var name = entry[0];
            var value = entry[1];
            if (!isDeepEqual(data2[name], value)) ret = false;
            _k++;
        }
        return ret;
    }

    // other
    return data1 == data2;
}

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
        _properties = [].concat((0, _toConsumableArray3.default)(ownProperties), (0, _toConsumableArray3.default)(prototypeProperties), reserved);
    }
    return _properties;
}