import _regeneratorRuntime from 'babel-runtime/regenerator';
import _asyncToGenerator from 'babel-runtime/helpers/asyncToGenerator';
import _classCallCheck from 'babel-runtime/helpers/classCallCheck';
import _createClass from 'babel-runtime/helpers/createClass';
import _possibleConstructorReturn from 'babel-runtime/helpers/possibleConstructorReturn';
import _inherits from 'babel-runtime/helpers/inherits';
/**
 * This plugin adds the local-documents-support
 * Local documents behave equal then with pouchdb
 * @link https://pouchdb.com/guides/local-documents.html
 */

import clone from 'clone';
import objectPath from 'object-path';
import deepEqual from 'deep-equal';

import RxDocument from '../rx-document';
import RxDatabase from '../rx-database';
import RxCollection from '../rx-collection';
import RxChangeEvent from '../rx-change-event';
import DocCache from '../doc-cache';
import RxError from '../rx-error';

import { filter } from 'rxjs/operators/filter';

var DOC_CACHE_BY_PARENT = new WeakMap();
var _getDocCache = function _getDocCache(parent) {
    if (!DOC_CACHE_BY_PARENT.has(parent)) {
        DOC_CACHE_BY_PARENT.set(parent, DocCache.create());
    }
    return DOC_CACHE_BY_PARENT.get(parent);
};
var CHANGE_SUB_BY_PARENT = new WeakMap();
var _getChangeSub = function _getChangeSub(parent) {
    if (!CHANGE_SUB_BY_PARENT.has(parent)) {
        var sub = parent.$.pipe(filter(function (cE) {
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

export var RxLocalDocument = function (_RxDocument$RxDocumen) {
    _inherits(RxLocalDocument, _RxDocument$RxDocumen);

    /**
     * @constructor
     * @param  {string} id
     * @param  {Object} jsonData
     * @param  {RxCollection|RxDatabase} parent
     */
    function RxLocalDocument(id, jsonData, parent) {
        _classCallCheck(this, RxLocalDocument);

        var _this = _possibleConstructorReturn(this, _RxDocument$RxDocumen.call(this, null, jsonData));

        _this.id = id;
        _this.parent = parent;
        return _this;
    }

    RxLocalDocument.prototype.toPouchJson = function toPouchJson() {
        var data = clone(this._data);
        data._id = LOCAL_PREFIX + this.id;
    };

    //
    // overwrites
    //

    RxLocalDocument.prototype._handleChangeEvent = function _handleChangeEvent(changeEvent) {
        if (changeEvent.data.doc !== this.primary) return;
        switch (changeEvent.data.op) {
            case 'UPDATE':
                var newData = clone(changeEvent.data.v);
                var prevSyncData = this._dataSync$.getValue();
                var prevData = this._data;

                if (deepEqual(prevSyncData, prevData)) {
                    // document is in sync, overwrite _data
                    this._data = newData;

                    if (this._synced$.getValue() !== true) this._synced$.next(true);
                } else {
                    // not in sync, emit to synced$
                    if (this._synced$.getValue() !== false) this._synced$.next(false);

                    // overwrite _rev of data
                    this._data._rev = newData._rev;
                }
                this._dataSync$.next(clone(newData));
                break;
            case 'REMOVE':
                // remove from docCache to assure new upserted RxDocuments will be a new instance
                var docCache = _getDocCache(this.parent);
                docCache['delete'](this.primary);
                this._deleted$.next(true);
                break;
        }
    };

    RxLocalDocument.prototype.$emit = function $emit(changeEvent) {
        return this.parent.$emit(changeEvent);
    };

    RxLocalDocument.prototype.get = function get(objPath) {
        if (!this._data) return undefined;
        if (typeof objPath !== 'string') {
            throw RxError.newRxTypeError('LD2', {
                objPath: objPath
            });
        }

        var valueObj = objectPath.get(this._data, objPath);
        valueObj = clone(valueObj);
        return valueObj;
    };

    RxLocalDocument.prototype.get$ = function get$(path) {
        if (path.includes('.item.')) {
            throw RxError.newRxError('LD3', {
                path: path
            });
        }
        if (path === this.primaryPath) throw RxError.newRxError('LD4');

        return this._dataSync$.map(function (data) {
            return objectPath.get(data, path);
        }).distinctUntilChanged().asObservable();
    };

    RxLocalDocument.prototype.set = function set(objPath, value) {
        if (!value) {
            // object path not set, overwrite whole data
            var data = clone(objPath);
            data._rev = this._data._rev;
            this._data = data;
            return this;
        }
        if (objPath === '_id') {
            throw RxError.newRxError('LD5', {
                objPath: objPath,
                value: value
            });
        }
        if (Object.is(this.get(objPath), value)) return;
        objectPath.set(this._data, objPath, value);
        return this;
    };

    RxLocalDocument.prototype.save = function () {
        var _ref = _asyncToGenerator( /*#__PURE__*/_regeneratorRuntime.mark(function _callee() {
            var saveData, res, changeEvent;
            return _regeneratorRuntime.wrap(function _callee$(_context) {
                while (1) {
                    switch (_context.prev = _context.next) {
                        case 0:
                            saveData = clone(this._data);

                            saveData._id = LOCAL_PREFIX + this.id;
                            _context.next = 4;
                            return this.parentPouch.put(saveData);

                        case 4:
                            res = _context.sent;

                            this._data._rev = res.rev;

                            changeEvent = RxChangeEvent.create('UPDATE', RxDatabase.isInstanceOf(this.parent) ? this.parent : this.parent.database, RxCollection.isInstanceOf(this.parent) ? this.parent : null, this, clone(this._data), true);

                            this.$emit(changeEvent);

                        case 8:
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
    }();

    RxLocalDocument.prototype.remove = function () {
        var _ref2 = _asyncToGenerator( /*#__PURE__*/_regeneratorRuntime.mark(function _callee2() {
            var removeId, changeEvent;
            return _regeneratorRuntime.wrap(function _callee2$(_context2) {
                while (1) {
                    switch (_context2.prev = _context2.next) {
                        case 0:
                            removeId = LOCAL_PREFIX + this.id;
                            _context2.next = 3;
                            return this.parentPouch.remove(removeId, this._data._rev);

                        case 3:
                            _getDocCache(this.parent)['delete'](this.id);
                            changeEvent = RxChangeEvent.create('REMOVE', RxDatabase.isInstanceOf(this.parent) ? this.parent : this.parent.database, RxCollection.isInstanceOf(this.parent) ? this.parent : null, this, clone(this._data), true);

                            this.$emit(changeEvent);

                        case 6:
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
    }();

    _createClass(RxLocalDocument, [{
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
            throw RxError.newRxError('LD1', {
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
}(RxDocument.RxDocument);;

var INIT_DONE = false;
var _init = function _init() {
    if (INIT_DONE) return;else INIT_DONE = true;

    /**
     * overwrite things that not work on local documents
     * with throwing function
     */
    var getThrowingFun = function getThrowingFun(k) {
        return function () {
            throw RxError.newRxError('LD6', {
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
    if (RxDatabase.isInstanceOf(parent)) return parent._adminPouch; // database
    else return parent.pouch; // collection
};

/**
 * save the local-document-data
 * throws if already exists
 * @return {RxLocalDocument}
 */
var insertLocal = function () {
    var _ref3 = _asyncToGenerator( /*#__PURE__*/_regeneratorRuntime.mark(function _callee3(id, data) {
        var existing, pouch, saveData, res, newDoc;
        return _regeneratorRuntime.wrap(function _callee3$(_context3) {
            while (1) {
                switch (_context3.prev = _context3.next) {
                    case 0:
                        if (!(RxCollection.isInstanceOf(this) && this._isInMemory)) {
                            _context3.next = 2;
                            break;
                        }

                        return _context3.abrupt('return', this._parentCollection.insertLocal(id, data));

                    case 2:

                        data = clone(data);
                        _context3.next = 5;
                        return this.getLocal(id);

                    case 5:
                        existing = _context3.sent;

                        if (!existing) {
                            _context3.next = 8;
                            break;
                        }

                        throw RxError.newRxError('LD7', {
                            id: id,
                            data: data
                        });

                    case 8:

                        // create new one
                        pouch = _getPouchByParent(this);
                        saveData = clone(data);

                        saveData._id = LOCAL_PREFIX + id;

                        _context3.next = 13;
                        return pouch.put(saveData);

                    case 13:
                        res = _context3.sent;


                        data._rev = res.rev;
                        newDoc = RxLocalDocument.create(id, data, this);
                        return _context3.abrupt('return', newDoc);

                    case 17:
                    case 'end':
                        return _context3.stop();
                }
            }
        }, _callee3, this);
    }));

    return function insertLocal(_x, _x2) {
        return _ref3.apply(this, arguments);
    };
}();

/**
 * save the local-document-data
 * overwrites existing if exists
 * @return {RxLocalDocument}
 */
var upsertLocal = function () {
    var _ref4 = _asyncToGenerator( /*#__PURE__*/_regeneratorRuntime.mark(function _callee4(id, data) {
        var existing, doc;
        return _regeneratorRuntime.wrap(function _callee4$(_context4) {
            while (1) {
                switch (_context4.prev = _context4.next) {
                    case 0:
                        if (!(RxCollection.isInstanceOf(this) && this._isInMemory)) {
                            _context4.next = 2;
                            break;
                        }

                        return _context4.abrupt('return', this._parentCollection.upsertLocal(id, data));

                    case 2:
                        _context4.next = 4;
                        return this.getLocal(id);

                    case 4:
                        existing = _context4.sent;

                        if (existing) {
                            _context4.next = 10;
                            break;
                        }

                        // create new one
                        doc = this.insertLocal(id, data);
                        return _context4.abrupt('return', doc);

                    case 10:
                        // update existing
                        data._rev = existing._data._rev;
                        existing._data = data;
                        _context4.next = 14;
                        return existing.save();

                    case 14:
                        return _context4.abrupt('return', existing);

                    case 15:
                    case 'end':
                        return _context4.stop();
                }
            }
        }, _callee4, this);
    }));

    return function upsertLocal(_x3, _x4) {
        return _ref4.apply(this, arguments);
    };
}();

var getLocal = function () {
    var _ref5 = _asyncToGenerator( /*#__PURE__*/_regeneratorRuntime.mark(function _callee5(id) {
        var pouch, docCache, found, docData, doc;
        return _regeneratorRuntime.wrap(function _callee5$(_context5) {
            while (1) {
                switch (_context5.prev = _context5.next) {
                    case 0:
                        if (!(RxCollection.isInstanceOf(this) && this._isInMemory)) {
                            _context5.next = 2;
                            break;
                        }

                        return _context5.abrupt('return', this._parentCollection.getLocal(id));

                    case 2:
                        pouch = _getPouchByParent(this);
                        docCache = _getDocCache(this);

                        // check in doc-cache

                        found = docCache.get(id);

                        // check in pouch

                        if (found) {
                            _context5.next = 19;
                            break;
                        }

                        _context5.prev = 6;
                        _context5.next = 9;
                        return pouch.get(LOCAL_PREFIX + id);

                    case 9:
                        docData = _context5.sent;

                        if (docData) {
                            _context5.next = 12;
                            break;
                        }

                        return _context5.abrupt('return', null);

                    case 12:
                        doc = RxLocalDocument.create(id, docData, this);
                        return _context5.abrupt('return', doc);

                    case 16:
                        _context5.prev = 16;
                        _context5.t0 = _context5['catch'](6);
                        return _context5.abrupt('return', null);

                    case 19:
                        return _context5.abrupt('return', found);

                    case 20:
                    case 'end':
                        return _context5.stop();
                }
            }
        }, _callee5, this, [[6, 16]]);
    }));

    return function getLocal(_x5) {
        return _ref5.apply(this, arguments);
    };
}();

export var rxdb = true;
export var prototypes = {
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
export var overwritable = {};

export default {
    rxdb: rxdb,
    prototypes: prototypes,
    overwritable: overwritable
};