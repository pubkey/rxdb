'use strict';

Object.defineProperty(exports, "__esModule", {
    value: true
});
exports.overwritable = exports.prototypes = exports.rxdb = exports.RxLocalDocument = undefined;

var _regenerator = require('babel-runtime/regenerator');

var _regenerator2 = _interopRequireDefault(_regenerator);

var _asyncToGenerator2 = require('babel-runtime/helpers/asyncToGenerator');

var _asyncToGenerator3 = _interopRequireDefault(_asyncToGenerator2);

var _classCallCheck2 = require('babel-runtime/helpers/classCallCheck');

var _classCallCheck3 = _interopRequireDefault(_classCallCheck2);

var _createClass2 = require('babel-runtime/helpers/createClass');

var _createClass3 = _interopRequireDefault(_createClass2);

var _possibleConstructorReturn2 = require('babel-runtime/helpers/possibleConstructorReturn');

var _possibleConstructorReturn3 = _interopRequireDefault(_possibleConstructorReturn2);

var _inherits2 = require('babel-runtime/helpers/inherits');

var _inherits3 = _interopRequireDefault(_inherits2);

var _objectPath = require('object-path');

var _objectPath2 = _interopRequireDefault(_objectPath);

var _deepEqual = require('deep-equal');

var _deepEqual2 = _interopRequireDefault(_deepEqual);

var _rxDocument = require('../rx-document');

var _rxDocument2 = _interopRequireDefault(_rxDocument);

var _rxDatabase = require('../rx-database');

var _rxDatabase2 = _interopRequireDefault(_rxDatabase);

var _rxCollection = require('../rx-collection');

var _rxCollection2 = _interopRequireDefault(_rxCollection);

var _rxChangeEvent = require('../rx-change-event');

var _rxChangeEvent2 = _interopRequireDefault(_rxChangeEvent);

var _docCache = require('../doc-cache');

var _docCache2 = _interopRequireDefault(_docCache);

var _rxError = require('../rx-error');

var _rxError2 = _interopRequireDefault(_rxError);

var _util = require('../util');

var _operators = require('rxjs/operators');

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

/**
 * This plugin adds the local-documents-support
 * Local documents behave equal then with pouchdb
 * @link https://pouchdb.com/guides/local-documents.html
 */

var DOC_CACHE_BY_PARENT = new WeakMap();
var _getDocCache = function _getDocCache(parent) {
    if (!DOC_CACHE_BY_PARENT.has(parent)) {
        DOC_CACHE_BY_PARENT.set(parent, _docCache2['default'].create());
    }
    return DOC_CACHE_BY_PARENT.get(parent);
};
var CHANGE_SUB_BY_PARENT = new WeakMap();
var _getChangeSub = function _getChangeSub(parent) {
    if (!CHANGE_SUB_BY_PARENT.has(parent)) {
        var sub = parent.$.pipe((0, _operators.filter)(function (cE) {
            return cE.data.isLocal;
        })).subscribe(function (cE) {
            var docCache = _getDocCache(parent);
            var doc = docCache.get(cE.data.doc);
            if (doc) doc._handleChangeEvent(cE);
        });
        parent._subs.push(sub);
        CHANGE_SUB_BY_PARENT.set(parent, sub);
    }
    return CHANGE_SUB_BY_PARENT.get(parent);
};

var LOCAL_PREFIX = '_local/';

var RxLocalDocument = exports.RxLocalDocument = function (_RxDocument$RxDocumen) {
    (0, _inherits3['default'])(RxLocalDocument, _RxDocument$RxDocumen);

    /**
     * @constructor
     * @param  {string} id
     * @param  {Object} jsonData
     * @param  {RxCollection|RxDatabase} parent
     */
    function RxLocalDocument(id, jsonData, parent) {
        (0, _classCallCheck3['default'])(this, RxLocalDocument);

        var _this = (0, _possibleConstructorReturn3['default'])(this, (RxLocalDocument.__proto__ || Object.getPrototypeOf(RxLocalDocument)).call(this, null, jsonData));

        _this.id = id;
        _this.parent = parent;
        return _this;
    }

    (0, _createClass3['default'])(RxLocalDocument, [{
        key: 'toPouchJson',
        value: function toPouchJson() {
            var data = (0, _util.clone)(this._data);
            data._id = LOCAL_PREFIX + this.id;
        }
    }, {
        key: '_handleChangeEvent',


        //
        // overwrites
        //

        value: function _handleChangeEvent(changeEvent) {
            if (changeEvent.data.doc !== this.primary) return;
            switch (changeEvent.data.op) {
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
                    var docCache = _getDocCache(this.parent);
                    docCache['delete'](this.primary);
                    this._deleted$.next(true);
                    break;
            }
        }
    }, {
        key: '$emit',
        value: function $emit(changeEvent) {
            return this.parent.$emit(changeEvent);
        }
    }, {
        key: 'get',
        value: function get(objPath) {
            if (!this._data) return undefined;
            if (typeof objPath !== 'string') {
                throw _rxError2['default'].newRxTypeError('LD2', {
                    objPath: objPath
                });
            }

            var valueObj = _objectPath2['default'].get(this._data, objPath);
            valueObj = (0, _util.clone)(valueObj);
            return valueObj;
        }
    }, {
        key: 'get$',
        value: function get$(path) {
            if (path.includes('.item.')) {
                throw _rxError2['default'].newRxError('LD3', {
                    path: path
                });
            }
            if (path === this.primaryPath) throw _rxError2['default'].newRxError('LD4');

            return this._dataSync$.pipe((0, _operators.map)(function (data) {
                return _objectPath2['default'].get(data, path);
            }), (0, _operators.distinctUntilChanged)()).asObservable();
        }
    }, {
        key: 'set',
        value: function set(objPath, value) {
            if (!value) {
                // object path not set, overwrite whole data
                var data = (0, _util.clone)(objPath);
                data._rev = this._data._rev;
                this._data = data;
                return this;
            }
            if (objPath === '_id') {
                throw _rxError2['default'].newRxError('LD5', {
                    objPath: objPath,
                    value: value
                });
            }
            if (Object.is(this.get(objPath), value)) return;
            _objectPath2['default'].set(this._data, objPath, value);
            return this;
        }
        /**
         * @return {Promise}
         */

    }, {
        key: 'save',
        value: function save() {
            var _this2 = this;

            var saveData = (0, _util.clone)(this._data);
            saveData._id = LOCAL_PREFIX + this.id;
            return this.parentPouch.put(saveData).then(function (res) {
                _this2._data._rev = res.rev;

                var changeEvent = _rxChangeEvent2['default'].create('UPDATE', _rxDatabase2['default'].isInstanceOf(_this2.parent) ? _this2.parent : _this2.parent.database, _rxCollection2['default'].isInstanceOf(_this2.parent) ? _this2.parent : null, _this2, (0, _util.clone)(_this2._data), true);
                _this2.$emit(changeEvent);
            });
        }
        /**
         * @return {Promise}
         */

    }, {
        key: 'remove',
        value: function remove() {
            var _this3 = this;

            var removeId = LOCAL_PREFIX + this.id;
            return this.parentPouch.remove(removeId, this._data._rev).then(function () {
                _getDocCache(_this3.parent)['delete'](_this3.id);
                var changeEvent = _rxChangeEvent2['default'].create('REMOVE', _rxDatabase2['default'].isInstanceOf(_this3.parent) ? _this3.parent : _this3.parent.database, _rxCollection2['default'].isInstanceOf(_this3.parent) ? _this3.parent : null, _this3, (0, _util.clone)(_this3._data), true);
                _this3.$emit(changeEvent);
            });
        }
    }, {
        key: 'isLocal',
        get: function get() {
            return true;
        }
    }, {
        key: 'parentPouch',
        get: function get() {
            return _getPouchByParent(this.parent);
        }
    }, {
        key: 'allAttachments$',
        get: function get() {
            // this is overwritte here because we cannot re-set getters on the prototype
            throw _rxError2['default'].newRxError('LD1', {
                document: this
            });
        }
    }, {
        key: 'primaryPath',
        get: function get() {
            return 'id';
        }
    }, {
        key: 'primary',
        get: function get() {
            return this.id;
        }
    }, {
        key: '$',
        get: function get() {
            return this._dataSync$.asObservable();
        }
    }]);
    return RxLocalDocument;
}(_rxDocument2['default'].RxDocument);

var INIT_DONE = false;
var _init = function _init() {
    if (INIT_DONE) return;else INIT_DONE = true;

    /**
     * overwrite things that not work on local documents
     * with throwing function
     */
    var getThrowingFun = function getThrowingFun(k) {
        return function () {
            throw _rxError2['default'].newRxError('LD6', {
                functionName: k
            });
        };
    };
    ['populate', 'update', 'putAttachment', 'getAttachment', 'allAttachments'].forEach(function (k) {
        return RxLocalDocument.prototype[k] = getThrowingFun(k);
    });
};

RxLocalDocument.create = function (id, data, parent) {
    _init();
    _getChangeSub(parent);
    var newDoc = new RxLocalDocument(id, data, parent);
    _getDocCache(parent).set(id, newDoc);
    return newDoc;
};

var _getPouchByParent = function _getPouchByParent(parent) {
    if (_rxDatabase2['default'].isInstanceOf(parent)) return parent._adminPouch; // database
    else return parent.pouch; // collection
};

/**
 * save the local-document-data
 * throws if already exists
 * @return {Promise<RxLocalDocument>}
 */
var insertLocal = function insertLocal(id, data) {
    var _this4 = this;

    if (_rxCollection2['default'].isInstanceOf(this) && this._isInMemory) return this._parentCollection.insertLocal(id, data);

    data = (0, _util.clone)(data);

    return this.getLocal(id).then(function (existing) {
        if (existing) {
            throw _rxError2['default'].newRxError('LD7', {
                id: id,
                data: data
            });
        }

        // create new one
        var pouch = _getPouchByParent(_this4);
        var saveData = (0, _util.clone)(data);
        saveData._id = LOCAL_PREFIX + id;

        return pouch.put(saveData);
    }).then(function (res) {
        data._rev = res.rev;
        var newDoc = RxLocalDocument.create(id, data, _this4);
        return newDoc;
    });
};

/**
 * save the local-document-data
 * overwrites existing if exists
 * @return {RxLocalDocument}
 */
var upsertLocal = function () {
    var _ref = (0, _asyncToGenerator3['default'])( /*#__PURE__*/_regenerator2['default'].mark(function _callee(id, data) {
        var existing, doc;
        return _regenerator2['default'].wrap(function _callee$(_context) {
            while (1) {
                switch (_context.prev = _context.next) {
                    case 0:
                        if (!(_rxCollection2['default'].isInstanceOf(this) && this._isInMemory)) {
                            _context.next = 2;
                            break;
                        }

                        return _context.abrupt('return', this._parentCollection.upsertLocal(id, data));

                    case 2:
                        _context.next = 4;
                        return this.getLocal(id);

                    case 4:
                        existing = _context.sent;

                        if (existing) {
                            _context.next = 10;
                            break;
                        }

                        // create new one
                        doc = this.insertLocal(id, data);
                        return _context.abrupt('return', doc);

                    case 10:
                        // update existing
                        data._rev = existing._data._rev;
                        existing._data = data;
                        _context.next = 14;
                        return existing.save();

                    case 14:
                        return _context.abrupt('return', existing);

                    case 15:
                    case 'end':
                        return _context.stop();
                }
            }
        }, _callee, this);
    }));

    return function upsertLocal(_x, _x2) {
        return _ref.apply(this, arguments);
    };
}();

var getLocal = function () {
    var _ref2 = (0, _asyncToGenerator3['default'])( /*#__PURE__*/_regenerator2['default'].mark(function _callee2(id) {
        var pouch, docCache, found, docData, doc;
        return _regenerator2['default'].wrap(function _callee2$(_context2) {
            while (1) {
                switch (_context2.prev = _context2.next) {
                    case 0:
                        if (!(_rxCollection2['default'].isInstanceOf(this) && this._isInMemory)) {
                            _context2.next = 2;
                            break;
                        }

                        return _context2.abrupt('return', this._parentCollection.getLocal(id));

                    case 2:
                        pouch = _getPouchByParent(this);
                        docCache = _getDocCache(this);

                        // check in doc-cache

                        found = docCache.get(id);

                        // check in pouch

                        if (found) {
                            _context2.next = 19;
                            break;
                        }

                        _context2.prev = 6;
                        _context2.next = 9;
                        return pouch.get(LOCAL_PREFIX + id);

                    case 9:
                        docData = _context2.sent;

                        if (docData) {
                            _context2.next = 12;
                            break;
                        }

                        return _context2.abrupt('return', null);

                    case 12:
                        doc = RxLocalDocument.create(id, docData, this);
                        return _context2.abrupt('return', doc);

                    case 16:
                        _context2.prev = 16;
                        _context2.t0 = _context2['catch'](6);
                        return _context2.abrupt('return', null);

                    case 19:
                        return _context2.abrupt('return', found);

                    case 20:
                    case 'end':
                        return _context2.stop();
                }
            }
        }, _callee2, this, [[6, 16]]);
    }));

    return function getLocal(_x3) {
        return _ref2.apply(this, arguments);
    };
}();

var rxdb = exports.rxdb = true;
var prototypes = exports.prototypes = {
    RxCollection: function RxCollection(proto) {
        proto.insertLocal = insertLocal;
        proto.upsertLocal = upsertLocal;
        proto.getLocal = getLocal;
    },
    RxDatabase: function RxDatabase(proto) {
        proto.insertLocal = insertLocal;
        proto.upsertLocal = upsertLocal;
        proto.getLocal = getLocal;
    }
};
var overwritable = exports.overwritable = {};

exports['default'] = {
    rxdb: rxdb,
    prototypes: prototypes,
    overwritable: overwritable
};
