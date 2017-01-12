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
    function RxDocument(collection, jsonData, query) {
        var _this = this;

        (0, _classCallCheck3.default)(this, RxDocument);

        this.$emit = function (changeEvent) {
            return _this.collection.$emit(changeEvent);
        };

        this.collection = collection;
        this.rawData = jsonData;
        this.query = query;

        this.data = (0, _clone2.default)(this.rawData);
        delete this.data._rev;
        delete this.data._id;

        // handle encrypted data
        var encPaths = this.collection.schema.getEncryptedPaths();
        var currentPath = void 0;
        Object.keys(encPaths).map(function (path) {
            return currentPath = path;
        }).map(function (path) {
            return _objectPath2.default.get(_this.data, currentPath);
        }).filter(function (enc) {
            return !!enc;
        }).map(function (encrypted) {
            return _this.collection.database._decrypt(encrypted);
        }).forEach(function (decrypted) {
            return _objectPath2.default.set(_this.data, currentPath, decrypted);
        });

        this.deleted = false;
        this.changed = false;

        this.observable$ = this.collection.$.filter(function (event) {
            return event.data.doc == _this.rawData._id || event.data.doc == '*';
        });
    }

    (0, _createClass3.default)(RxDocument, [{
        key: 'get$',


        /**
         * returns observable of the value of the given path
         * @param {string} path
         * @return {Observable} obs
         */
        value: function get$(path) {
            var schemaObj = this.collection.schema.getSchemaByObjectPath(path);
            if (!schemaObj) throw new Error('cannot observe a non-existed field (' + path + ')');

            return this.$.map(function (cEvent) {
                return _objectPath2.default.get(cEvent.data.v, path);
            }).distinctUntilChanged().startWith(this.get(path));
        }
    }, {
        key: 'get',


        /**
         * get data by objectPath
         * @param {string} objPath
         * @return {object} value
         */
        value: function get(objPath) {
            if (typeof objPath !== 'string') throw new TypeError('RxDocument.get(): objPath must be a string');

            if (objPath == this.collection.schema.primaryPath) return this.rawData._id;

            return _objectPath2.default.get(this.data, objPath);
        }

        /**
         * get the proxy-version of an nested object of this documents data
         * used to get observables like myfield.nestedfield$
         * @param {string} path
         * @param {object} obj
         */

    }, {
        key: 'proxyfy',
        value: function proxyfy(path, obj) {
            var _this2 = this;

            return new Proxy(obj, {
                get: function get(target, name) {
                    var value = obj[name];

                    if (!obj.hasOwnProperty(name) && !obj.hasOwnProperty([name.slice(0, -1)])) return undefined;

                    // return observable if field ends with $
                    if (name.slice(-1) == '$') return _this2.get$(path + '.' + name.slice(0, -1));

                    // return value if no object or is array
                    if ((typeof value === 'undefined' ? 'undefined' : (0, _typeof3.default)(value)) !== 'object' || Array.isArray(value)) return value;

                    // return proxy if object again
                    var newPath = path + '.' + name;
                    return _this2.proxyfy(newPath, _this2.get(newPath));
                },
                set: function set(doc, name, value) {
                    _this2.set(path + '.' + name, value);
                    return true;
                }
            });
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
            if (objPath == '_id') throw new Error('_id cannot be modified');
            if (objPath == this.collection.schema.primaryPath) throw new Error('primary-fields cannot be modified');

            // check if equal
            if (Object.is(this.get(objPath), value)) return;else this.changed = true;

            // check if nested without root-object
            var pathEls = objPath.split('.');
            pathEls.pop();
            var rootPath = pathEls.join('.');
            if (typeof _objectPath2.default.get(this.data, rootPath) === 'undefined') {
                throw new Error('cannot set childpath ' + objPath + '\n                 when rootPath ' + rootPath + ' not selected');
            }

            // check schema of changed field
            var schemaObj = this.collection.schema.getSchemaByObjectPath(objPath);
            this.collection.schema.validate(value, schemaObj);

            _objectPath2.default.set(this.data, objPath, value);
            _objectPath2.default.set(this.rawData, objPath, value);

            return this;
        }
    }, {
        key: 'save',
        value: function () {
            var _ref = (0, _asyncToGenerator3.default)(_regenerator2.default.mark(function _callee() {
                var _this3 = this;

                var rootDoc, emitValue, encPaths, ret;
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
                                if (!this.query.fields) {
                                    _context.next = 10;
                                    break;
                                }

                                _context.next = 7;
                                return this.collection.findOne(this.rawData._id).exec();

                            case 7:
                                rootDoc = _context.sent;

                                this.rawData = Object.assign(rootDoc.rawData, this.rawData);
                                this.data = Object.assign(rootDoc.data, this.data);

                            case 10:
                                emitValue = (0, _clone2.default)(this.rawData);
                                _context.next = 13;
                                return this.collection._runHooks('pre', 'save', this);

                            case 13:

                                // handle encrypted data
                                encPaths = this.collection.schema.getEncryptedPaths();

                                Object.keys(encPaths).map(function (path) {
                                    var value = _objectPath2.default.get(_this3.rawData, path);
                                    var encrypted = _this3.collection.database._encrypt(value);
                                    _objectPath2.default.set(_this3.rawData, path, encrypted);
                                });

                                _context.next = 17;
                                return this.collection.pouch.put(this.rawData);

                            case 17:
                                ret = _context.sent;

                                if (ret.ok) {
                                    _context.next = 20;
                                    break;
                                }

                                throw new Error('RxDocument.save(): error ' + JSON.stringify(ret));

                            case 20:
                                this.rawData._rev = ret.rev;

                                _context.next = 23;
                                return this.collection._runHooks('post', 'save', this);

                            case 23:

                                // event
                                this.$emit(RxChangeEvent.create('RxDocument.save', this.collection.database, this.collection, this, emitValue));

                                this.changed = false;

                            case 25:
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
                                return this.collection.pouch.remove(this.rawData._id, this.rawData._rev);

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
            return this.observable$;
        }
    }]);
    return RxDocument;
}();

function create(collection, jsonData, query) {
    if (jsonData._id.startsWith('_design')) return null;

    var doc = new RxDocument(collection, jsonData, query);
    return new Proxy(doc, {
        get: function get(doc, name) {

            // return document-property if exists
            if (doc[name]) return doc[name];

            // return observable if field ends with $
            if (name.slice(-1) == '$') return doc.get$(name.slice(0, -1));

            var value = doc.get(name);
            if ((typeof value === 'undefined' ? 'undefined' : (0, _typeof3.default)(value)) == 'object' && !Array.isArray(value)) return doc.proxyfy(name, value);else return value;
        },

        set: function set(doc, name, value) {
            if (doc.hasOwnProperty(name)) {
                doc[name] = value;
                return true;
            }
            if (!doc.get(name)) throw new Error('can not set unknown field ' + name);
            doc.set(name, value);
            return true;
        }
    });
}

function createAr(collection, jsonDataAr, query) {
    return jsonDataAr.filter(function (jsonData) {
        return !jsonData._id.startsWith('_design');
    }).map(function (jsonData) {
        return create(collection, jsonData, query);
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