'use strict';

Object.defineProperty(exports, "__esModule", {
    value: true
});

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
    (0, _createClass3.default)(RxDocument, [{
        key: Symbol.toStringTag,
        get: function get() {
            return 'RxDocument';
        }
    }]);

    function RxDocument(collection, jsonData, query) {
        var _this = this;

        (0, _classCallCheck3.default)(this, RxDocument);

        this.$emit = function (changeEvent) {
            return _this.collection.$emit(changeEvent);
        };

        this.collection = collection;
        this.query = query;

        this._data = (0, _clone2.default)(jsonData);

        this.deleted = false;
        this._deleted$;
        this.changed = false;

        this._observable$;
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

        /**
         * returns the observable which emits the plain-data of this document
         * @return {Observable}
         */

    }, {
        key: 'get$',


        /**
         * returns observable of the value of the given path
         * @param {string} path
         * @return {Observable}
         */
        value: function get$(path) {
            var schemaObj = this.collection.schema.getSchemaByObjectPath(path);
            if (!schemaObj) throw new Error('cannot observe a non-existed field (' + path + ')');

            return this.$.map(function (data) {
                return _objectPath2.default.get(data, path);
            }).distinctUntilChanged().startWith(this.get(path));
        }
    }, {
        key: 'get',


        /**
         * get data by objectPath
         * @param {string} objPath
         * @return {object} valueObj
         */
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
            if (Object.is(this.get(objPath), value)) return;else this.changed = true;

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
        value: function () {
            var _ref = (0, _asyncToGenerator3.default)(_regenerator2.default.mark(function _callee() {
                var emitValue, ret, changeEvent;
                return _regenerator2.default.wrap(function _callee$(_context) {
                    while (1) {
                        switch (_context.prev = _context.next) {
                            case 0:
                                if (this.changed) {
                                    _context.next = 2;
                                    break;
                                }

                                return _context.abrupt('return');

                            case 2:
                                if (!this.deleted) {
                                    _context.next = 4;
                                    break;
                                }

                                throw new Error('RxDocument.save(): cant save deleted document');

                            case 4:
                                emitValue = (0, _clone2.default)(this._data);
                                _context.next = 7;
                                return this.collection._runHooks('pre', 'save', this);

                            case 7:
                                _context.next = 9;
                                return this.collection._pouchPut((0, _clone2.default)(this._data));

                            case 9:
                                ret = _context.sent;

                                if (ret.ok) {
                                    _context.next = 12;
                                    break;
                                }

                                throw new Error('RxDocument.save(): error ' + JSON.stringify(ret));

                            case 12:
                                this._data._rev = ret.rev;

                                _context.next = 15;
                                return this.collection._runHooks('post', 'save', this);

                            case 15:

                                // event
                                changeEvent = RxChangeEvent.create('RxDocument.save', this.collection.database, this.collection, this, emitValue);

                                this.$emit(changeEvent);

                                this.changed = false;

                            case 18:
                            case 'end':
                                return _context.stop();
                        }
                    }
                }, _callee, this);
            }));

            function save() {
                return _ref.apply(this, arguments);
            }

            return save;
        }()
    }, {
        key: 'remove',
        value: function () {
            var _ref2 = (0, _asyncToGenerator3.default)(_regenerator2.default.mark(function _callee2() {
                return _regenerator2.default.wrap(function _callee2$(_context2) {
                    while (1) {
                        switch (_context2.prev = _context2.next) {
                            case 0:
                                if (!this.deleted) {
                                    _context2.next = 2;
                                    break;
                                }

                                throw new Error('RxDocument.remove(): Document is already deleted');

                            case 2:
                                _context2.next = 4;
                                return this.collection._runHooks('pre', 'remove', this);

                            case 4:

                                this.deleted = true;
                                _context2.next = 7;
                                return this.collection.pouch.remove(this.getPrimary(), this._data._rev);

                            case 7:
                                _context2.next = 9;
                                return this.collection._runHooks('post', 'remove', this);

                            case 9:

                                this.$emit(RxChangeEvent.create('RxDocument.remove', this.collection.database, this.collection, this, null));

                            case 10:
                            case 'end':
                                return _context2.stop();
                        }
                    }
                }, _callee2, this);
            }));

            function remove() {
                return _ref2.apply(this, arguments);
            }

            return remove;
        }()
    }, {
        key: 'destroy',
        value: function destroy() {}
    }, {
        key: '$',
        get: function get() {
            var _this3 = this;

            if (!this._observable$) {
                this._observable$ = this.collection.$.filter(function (event) {
                    return event.data.doc == _this3.getPrimary() || event.data.doc == '*';
                }).mergeMap(function () {
                    var _ref3 = (0, _asyncToGenerator3.default)(_regenerator2.default.mark(function _callee3(ev) {
                        var newData;
                        return _regenerator2.default.wrap(function _callee3$(_context3) {
                            while (1) {
                                switch (_context3.prev = _context3.next) {
                                    case 0:
                                        if (!(ev.data.op == 'RxDocument.remove')) {
                                            _context3.next = 3;
                                            break;
                                        }

                                        _this3.deleted = true;
                                        return _context3.abrupt('return', null);

                                    case 3:
                                        if (!ev.data.v) {
                                            _context3.next = 5;
                                            break;
                                        }

                                        return _context3.abrupt('return', ev.data.v);

                                    case 5:
                                        _context3.next = 7;
                                        return _this3.collection._pouchGet(_this3.getPrimary());

                                    case 7:
                                        newData = _context3.sent;
                                        return _context3.abrupt('return', newData);

                                    case 9:
                                    case 'end':
                                        return _context3.stop();
                                }
                            }
                        }, _callee3, _this3);
                    }));

                    return function (_x2) {
                        return _ref3.apply(this, arguments);
                    };
                }()).do(function (docData) {
                    return _this3._data = docData;
                });
            }
            return this._observable$;
        }
    }, {
        key: 'deleted$',
        get: function get() {
            if (!this._deleted$) {
                this._deleted$ = this.$.filter(function (docData) {
                    return docData == null;
                });
            }
            return this._deleted$;
        }
    }]);
    return RxDocument;
}();

function create(collection, jsonData, query) {
    if (jsonData[collection.schema.primaryPath].startsWith('_design')) return null;

    var doc = new RxDocument(collection, jsonData, query);
    doc.prepare();
    return doc;
}

function createAr(collection, jsonDataAr, query) {
    return jsonDataAr.map(function (jsonData) {
        return create(collection, jsonData, query);
    }).filter(function (doc) {
        return doc != null;
    });
}

var pseudoRxDocument = new RxDocument({
    schema: {
        getEncryptedPaths: function getEncryptedPaths() {
            return [];
        }
    },
    $: {
        filter: function filter() {
            return false;
        }
    }
}, {}, {});

/**
 * returns all possible properties of a RxDocument
 * @return {string[]} property-names
 */
function properties() {
    var ownProperties = Object.getOwnPropertyNames(pseudoRxDocument);
    var prototypeProperties = Object.getOwnPropertyNames(Object.getPrototypeOf(pseudoRxDocument));
    var properties = [].concat((0, _toConsumableArray3.default)(ownProperties), (0, _toConsumableArray3.default)(prototypeProperties));
    return properties;
}