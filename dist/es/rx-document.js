import _regeneratorRuntime from 'babel-runtime/regenerator';
import _asyncToGenerator from 'babel-runtime/helpers/asyncToGenerator';
import _classCallCheck from 'babel-runtime/helpers/classCallCheck';
import _createClass from 'babel-runtime/helpers/createClass';
import clone from 'clone';
import objectPath from 'object-path';
import deepEqual from 'deep-equal';

import * as util from './util';
import RxChangeEvent from './rx-change-event';
import RxError from './rx-error';
import { runPluginHooks } from './hooks';

export var RxDocument = function () {
    function RxDocument(collection, jsonData) {
        _classCallCheck(this, RxDocument);

        this.collection = collection;

        // if true, this is a temporary document
        this._isTemporary = false;

        // assume that this is always equal to the doc-data in the database
        this._dataSync$ = new util.Rx.BehaviorSubject(clone(jsonData));

        // current doc-data, changes when setting values etc
        this._data = clone(jsonData);

        // atomic-update-functions that have not run yes
        this._atomicUpdates = [];

        // resolve-functions to resolve the promises of atomicUpdate
        this._atomicUpdatesResolveFunctions = new WeakMap();

        // false when _data !== _dataSync
        this._synced$ = new util.Rx.BehaviorSubject(true);

        this._deleted$ = new util.Rx.BehaviorSubject(false);
    }

    RxDocument.prototype.prepare = function prepare() {
        // set getter/setter/observable
        this._defineGetterSetter(this, '');
    };

    RxDocument.prototype.resync = function resync() {
        var syncedData = this._dataSync$.getValue();
        if (this._synced$.getValue() && deepEqual(syncedData, this._data)) return;else {
            this._data = clone(this._dataSync$.getValue());
            this._synced$.next(true);
        }
    };

    /**
     * returns the observable which emits the plain-data of this document
     * @return {Observable}
     */


    /**
     * @param {ChangeEvent}
     */
    RxDocument.prototype._handleChangeEvent = function _handleChangeEvent(changeEvent) {
        if (changeEvent.data.doc !== this.primary) return;

        // TODO check if new _rev is higher then current

        switch (changeEvent.data.op) {
            case 'INSERT':
                break;
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
                this.collection._docCache['delete'](this.primary);
                this._deleted$.next(true);
                break;
        }
    };

    /**
     * emits the changeEvent to the upper instance (RxCollection)
     * @param  {RxChangeEvent} changeEvent
     */


    RxDocument.prototype.$emit = function $emit(changeEvent) {
        return this.collection.$emit(changeEvent);
    };

    /**
     * returns observable of the value of the given path
     * @param {string} path
     * @return {Observable}
     */


    RxDocument.prototype.get$ = function get$(path) {
        if (path.includes('.item.')) throw new Error('cannot get observable of in-array fields because order cannot be guessed: ' + path);

        var schemaObj = this.collection.schema.getSchemaByObjectPath(path);
        if (!schemaObj) throw new Error('cannot observe a non-existed field (' + path + ')');

        return this._dataSync$.map(function (data) {
            return objectPath.get(data, path);
        }).distinctUntilChanged().asObservable();
    };

    /**
     * populate the given path
     * @param  {string}  path
     * @return {Promise<RxDocument>}
     */


    RxDocument.prototype.populate = function populate(path) {
        var schemaObj = this.collection.schema.getSchemaByObjectPath(path);
        var value = this.get(path);
        if (!schemaObj) throw new Error('cannot populate a non-existed field (' + path + ')');
        if (!schemaObj.ref) throw new Error('cannot populate because path has no ref (' + path + ')');

        var refCollection = this.collection.database.collections[schemaObj.ref];
        if (!refCollection) throw new Error('ref-collection (' + schemaObj.ref + ') not in database');

        if (schemaObj.type === 'array') return Promise.all(value.map(function (id) {
            return refCollection.findOne(id).exec();
        }));else return refCollection.findOne(value).exec();
    };

    /**
     * get data by objectPath
     * @param {string} objPath
     * @return {object} valueObj
     */


    RxDocument.prototype.get = function get(objPath) {
        if (!this._data) return undefined;

        if (typeof objPath !== 'string') throw new TypeError('RxDocument.get(): objPath must be a string');

        var valueObj = objectPath.get(this._data, objPath);
        valueObj = clone(valueObj);

        // direct return if array or non-object
        if (typeof valueObj !== 'object' || Array.isArray(valueObj)) return valueObj;

        this._defineGetterSetter(valueObj, objPath);
        return valueObj;
    };

    RxDocument.prototype._defineGetterSetter = function _defineGetterSetter(valueObj) {
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
    };

    RxDocument.prototype.toJSON = function toJSON() {
        return clone(this._data);
    };

    /**
     * set data by objectPath
     * @param {string} objPath
     * @param {object} value
     */


    RxDocument.prototype.set = function set(objPath, value) {
        if (typeof objPath !== 'string') throw new TypeError('RxDocument.set(): objPath must be a string');
        if (!this._isTemporary && objPath === this.primaryPath) {
            throw new Error('RxDocument.set(): primary-key (' + this.primaryPath + ')\n                cannot be modified');
        }
        // check if equal
        if (Object.is(this.get(objPath), value)) return;

        // check if nested without root-object
        var pathEls = objPath.split('.');
        pathEls.pop();
        var rootPath = pathEls.join('.');
        if (typeof objectPath.get(this._data, rootPath) === 'undefined') {
            throw new Error('cannot set childpath ' + objPath + '\n                 when rootPath ' + rootPath + ' not selected');
        }

        // check schema of changed field
        if (!this._isTemporary) this.collection.schema.validate(value, objPath);

        objectPath.set(this._data, objPath, value);
        return this;
    };

    /**
     * updates document
     * @overwritten by plugin (optinal)
     * @param  {object} updateObj mongodb-like syntax
     */
    RxDocument.prototype.update = function () {
        var _ref = _asyncToGenerator( /*#__PURE__*/_regeneratorRuntime.mark(function _callee() {
            return _regeneratorRuntime.wrap(function _callee$(_context) {
                while (1) {
                    switch (_context.prev = _context.next) {
                        case 0:
                            throw RxError.pluginMissing('update');

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
    }();

    /**
     * [atomicUpdate description]
     * @param  {[type]}  fun [description]
     * @return {Promise<RxDocument>}     [description]
     */


    RxDocument.prototype.atomicUpdate = function () {
        var _ref2 = _asyncToGenerator( /*#__PURE__*/_regeneratorRuntime.mark(function _callee2(fun) {
            var _this2 = this;

            var retPromise;
            return _regeneratorRuntime.wrap(function _callee2$(_context2) {
                while (1) {
                    switch (_context2.prev = _context2.next) {
                        case 0:
                            this._atomicUpdates.push(fun);
                            retPromise = new Promise(function (resolve, reject) {
                                _this2._atomicUpdatesResolveFunctions.set(fun, {
                                    resolve: resolve,
                                    reject: reject
                                });
                            });

                            this._runAtomicUpdates();
                            return _context2.abrupt('return', retPromise);

                        case 4:
                        case 'end':
                            return _context2.stop();
                    }
                }
            }, _callee2, this);
        }));

        function atomicUpdate(_x2) {
            return _ref2.apply(this, arguments);
        }

        return atomicUpdate;
    }();

    RxDocument.prototype._runAtomicUpdates = function () {
        var _ref3 = _asyncToGenerator( /*#__PURE__*/_regeneratorRuntime.mark(function _callee3() {
            var fun;
            return _regeneratorRuntime.wrap(function _callee3$(_context3) {
                while (1) {
                    switch (_context3.prev = _context3.next) {
                        case 0:
                            if (!this.__runAtomicUpdates_running) {
                                _context3.next = 4;
                                break;
                            }

                            return _context3.abrupt('return');

                        case 4:
                            this.__runAtomicUpdates_running = true;

                        case 5:
                            if (!(this._atomicUpdates.length === 0)) {
                                _context3.next = 8;
                                break;
                            }

                            this.__runAtomicUpdates_running = false;
                            return _context3.abrupt('return');

                        case 8:
                            ;
                            fun = this._atomicUpdates.shift();
                            _context3.prev = 10;
                            _context3.next = 13;
                            return fun(this);

                        case 13:
                            _context3.next = 15;
                            return this.save();

                        case 15:
                            _context3.next = 20;
                            break;

                        case 17:
                            _context3.prev = 17;
                            _context3.t0 = _context3['catch'](10);

                            this._atomicUpdatesResolveFunctions.get(fun).reject(_context3.t0);

                        case 20:
                            this._atomicUpdatesResolveFunctions.get(fun).resolve(this); // resolve promise
                            this.__runAtomicUpdates_running = false;
                            this._runAtomicUpdates();

                        case 23:
                        case 'end':
                            return _context3.stop();
                    }
                }
            }, _callee3, this, [[10, 17]]);
        }));

        function _runAtomicUpdates() {
            return _ref3.apply(this, arguments);
        }

        return _runAtomicUpdates;
    }();

    /**
     * save document if its data has changed
     * @return {boolean} false if nothing to save
     */


    RxDocument.prototype.save = function () {
        var _ref4 = _asyncToGenerator( /*#__PURE__*/_regeneratorRuntime.mark(function _callee4() {
            var ret, emitValue, changeEvent;
            return _regeneratorRuntime.wrap(function _callee4$(_context4) {
                while (1) {
                    switch (_context4.prev = _context4.next) {
                        case 0:
                            if (!this._isTemporary) {
                                _context4.next = 2;
                                break;
                            }

                            return _context4.abrupt('return', this._saveTemporary());

                        case 2:
                            if (!this._deleted$.getValue()) {
                                _context4.next = 4;
                                break;
                            }

                            throw new Error('RxDocument.save(): cant save deleted document');

                        case 4:
                            if (!deepEqual(this._data, this._dataSync$.getValue())) {
                                _context4.next = 7;
                                break;
                            }

                            this._synced$.next(true);
                            return _context4.abrupt('return', false);

                        case 7:
                            _context4.next = 9;
                            return this.collection._runHooks('pre', 'save', this);

                        case 9:

                            this.collection.schema.validate(this._data);

                            _context4.next = 12;
                            return this.collection._pouchPut(clone(this._data));

                        case 12:
                            ret = _context4.sent;

                            if (ret.ok) {
                                _context4.next = 15;
                                break;
                            }

                            throw new Error('RxDocument.save(): error ' + JSON.stringify(ret));

                        case 15:
                            emitValue = clone(this._data);

                            emitValue._rev = ret.rev;

                            this._data = emitValue;

                            _context4.next = 20;
                            return this.collection._runHooks('post', 'save', this);

                        case 20:

                            // event
                            this._synced$.next(true);
                            this._dataSync$.next(clone(emitValue));

                            changeEvent = RxChangeEvent.create('UPDATE', this.collection.database, this.collection, this, emitValue);

                            this.$emit(changeEvent);
                            return _context4.abrupt('return', true);

                        case 25:
                        case 'end':
                            return _context4.stop();
                    }
                }
            }, _callee4, this);
        }));

        function save() {
            return _ref4.apply(this, arguments);
        }

        return save;
    }();

    /**
     * does the same as .save() but for temporary documents
     * Saving a temporary doc is basically the same as RxCollection.insert()
     * @return {Promise}
     */


    RxDocument.prototype._saveTemporary = function () {
        var _ref5 = _asyncToGenerator( /*#__PURE__*/_regeneratorRuntime.mark(function _callee5() {
            return _regeneratorRuntime.wrap(function _callee5$(_context5) {
                while (1) {
                    switch (_context5.prev = _context5.next) {
                        case 0:
                            _context5.next = 2;
                            return this.collection.insert(this);

                        case 2:
                            this._isTemporary = false;
                            this.collection._docCache.set(this.primary, this);

                            // internal events
                            this._synced$.next(true);
                            this._dataSync$.next(clone(this._data));

                            return _context5.abrupt('return', true);

                        case 7:
                        case 'end':
                            return _context5.stop();
                    }
                }
            }, _callee5, this);
        }));

        function _saveTemporary() {
            return _ref5.apply(this, arguments);
        }

        return _saveTemporary;
    }();

    RxDocument.prototype.remove = function () {
        var _ref6 = _asyncToGenerator( /*#__PURE__*/_regeneratorRuntime.mark(function _callee6() {
            var _this3 = this;

            return _regeneratorRuntime.wrap(function _callee6$(_context6) {
                while (1) {
                    switch (_context6.prev = _context6.next) {
                        case 0:
                            if (!this.deleted) {
                                _context6.next = 2;
                                break;
                            }

                            throw new Error('RxDocument.remove(): Document is already deleted');

                        case 2:
                            _context6.next = 4;
                            return this.collection._runHooks('pre', 'remove', this);

                        case 4:
                            _context6.next = 6;
                            return this.collection.database.lockedRun(function () {
                                return _this3.collection.pouch.remove(_this3.primary, _this3._data._rev);
                            });

                        case 6:

                            this.$emit(RxChangeEvent.create('REMOVE', this.collection.database, this.collection, this, this._data));

                            _context6.next = 9;
                            return this.collection._runHooks('post', 'remove', this);

                        case 9:
                            _context6.next = 11;
                            return util.promiseWait(0);

                        case 11:
                            return _context6.abrupt('return');

                        case 12:
                        case 'end':
                            return _context6.stop();
                    }
                }
            }, _callee6, this);
        }));

        function remove() {
            return _ref6.apply(this, arguments);
        }

        return remove;
    }();

    RxDocument.prototype.destroy = function destroy() {
        throw new Error('RxDocument.destroy() does not exist');
    };

    _createClass(RxDocument, [{
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

export function create(collection, jsonData) {
    if (jsonData[collection.schema.primaryPath] && jsonData[collection.schema.primaryPath].startsWith('_design')) return null;

    var doc = new RxDocument(collection, jsonData);
    doc.prepare();
    runPluginHooks('createRxDocument', doc);
    return doc;
}

export function createAr(collection, jsonDataAr) {
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
export function properties() {
    if (!_properties) {
        var reserved = ['deleted', 'synced'];
        var pseudoRxDocument = new RxDocument();
        var ownProperties = Object.getOwnPropertyNames(pseudoRxDocument);
        var prototypeProperties = Object.getOwnPropertyNames(Object.getPrototypeOf(pseudoRxDocument));
        _properties = [].concat(ownProperties, prototypeProperties, reserved);
    }
    return _properties;
}

export function isInstanceOf(obj) {
    return obj instanceof RxDocument;
}

export default {
    create: create,
    createAr: createAr,
    properties: properties,
    RxDocument: RxDocument,
    isInstanceOf: isInstanceOf
};