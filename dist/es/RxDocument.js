import _regeneratorRuntime from 'babel-runtime/regenerator';
import _asyncToGenerator from 'babel-runtime/helpers/asyncToGenerator';
import _classCallCheck from 'babel-runtime/helpers/classCallCheck';
import _createClass from 'babel-runtime/helpers/createClass';
import clone from 'clone';
import objectPath from 'object-path';
import deepEqual from 'deep-equal';
import modify from 'modifyjs';

import * as util from './util';
import * as RxChangeEvent from './RxChangeEvent';

var RxDocument = function () {
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

    RxDocument.prototype.getPrimaryPath = function getPrimaryPath() {
        return this.collection.schema.primaryPath;
    };

    RxDocument.prototype.getPrimary = function getPrimary() {
        return this._data[this.getPrimaryPath()];
    };

    RxDocument.prototype.getRevision = function getRevision() {
        return this._data._rev;
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
        if (changeEvent.data.doc != this.getPrimary()) return;

        // TODO check if new _rev is higher then current

        switch (changeEvent.data.op) {
            case 'INSERT':
                break;
            case 'UPDATE':
                var newData = clone(changeEvent.data.v);
                delete newData._ext;
                var prevSyncData = this._dataSync$.getValue();
                var prevData = this._data;

                if (deepEqual(prevSyncData, prevData)) {
                    // document is in sync, overwrite _data
                    this._data = newData;

                    if (this._synced$.getValue() != true) this._synced$.next(true);
                } else {
                    // not in sync, emit to synced$
                    if (this._synced$.getValue() != false) this._synced$.next(false);

                    // overwrite _rev of data
                    this._data._rev = newData._rev;
                }
                this._dataSync$.next(clone(newData));
                break;
            case 'REMOVE':
                // remove from docCache to assure new upserted RxDocuments will be a new instance
                this.collection._docCache['delete'](this.getPrimary());

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

    RxDocument.prototype.populate = function () {
        var _ref = _asyncToGenerator(_regeneratorRuntime.mark(function _callee(path, object) {
            var schemaObj, value, refCollection;
            return _regeneratorRuntime.wrap(function _callee$(_context) {
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
    }();

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
        if (typeof valueObj != 'object' || Array.isArray(valueObj)) return valueObj;

        this._defineGetterSetter(valueObj, objPath);
        return valueObj;
    };

    RxDocument.prototype._defineGetterSetter = function _defineGetterSetter(valueObj) {
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
        if (!this._isTemporary && objPath == this.getPrimaryPath()) {
            throw new Error('RxDocument.set(): primary-key (' + this.getPrimaryPath() + ')\n                cannot be modified');
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
     *  @param  {object} updateObj
     */
    RxDocument.prototype.update = function () {
        var _ref2 = _asyncToGenerator(_regeneratorRuntime.mark(function _callee2(updateObj) {
            var _this2 = this;

            var newDoc;
            return _regeneratorRuntime.wrap(function _callee2$(_context2) {
                while (1) {
                    switch (_context2.prev = _context2.next) {
                        case 0:
                            newDoc = modify(this._data, updateObj);


                            Object.keys(this._data).forEach(function (previousPropName) {
                                if (newDoc[previousPropName]) {
                                    // if we don't check inequality, it triggers an update attempt on fields that didn't really change,
                                    // which causes problems with "readonly" fields
                                    if (!deepEqual(_this2._data[previousPropName], newDoc[previousPropName])) _this2._data[previousPropName] = newDoc[previousPropName];
                                } else delete _this2._data[previousPropName];
                            });
                            delete newDoc._rev;
                            delete newDoc._id;
                            Object.keys(newDoc).forEach(function (newPropName) {
                                if (!deepEqual(_this2._data[newPropName], newDoc[newPropName])) _this2._data[newPropName] = newDoc[newPropName];
                            });
                            _context2.next = 7;
                            return this.save();

                        case 7:
                        case 'end':
                            return _context2.stop();
                    }
                }
            }, _callee2, this);
        }));

        function update(_x4) {
            return _ref2.apply(this, arguments);
        }

        return update;
    }();

    RxDocument.prototype.atomicUpdate = function () {
        var _ref3 = _asyncToGenerator(_regeneratorRuntime.mark(function _callee3(fun) {
            var _this3 = this;

            var retPromise;
            return _regeneratorRuntime.wrap(function _callee3$(_context3) {
                while (1) {
                    switch (_context3.prev = _context3.next) {
                        case 0:
                            this._atomicUpdates.push(fun);
                            retPromise = new Promise(function (res) {
                                _this3._atomicUpdatesResolveFunctions.set(fun, res);
                            });

                            this._runAtomicUpdates();
                            return _context3.abrupt('return', retPromise);

                        case 4:
                        case 'end':
                            return _context3.stop();
                    }
                }
            }, _callee3, this);
        }));

        function atomicUpdate(_x5) {
            return _ref3.apply(this, arguments);
        }

        return atomicUpdate;
    }();

    RxDocument.prototype._runAtomicUpdates = function () {
        var _ref4 = _asyncToGenerator(_regeneratorRuntime.mark(function _callee4() {
            var fun;
            return _regeneratorRuntime.wrap(function _callee4$(_context4) {
                while (1) {
                    switch (_context4.prev = _context4.next) {
                        case 0:
                            if (!this.__runAtomicUpdates_running) {
                                _context4.next = 4;
                                break;
                            }

                            return _context4.abrupt('return');

                        case 4:
                            this.__runAtomicUpdates_running = true;

                        case 5:
                            if (!(this._atomicUpdates.length === 0)) {
                                _context4.next = 7;
                                break;
                            }

                            return _context4.abrupt('return');

                        case 7:
                            fun = this._atomicUpdates.shift();
                            _context4.next = 10;
                            return fun(this);

                        case 10:
                            // run atomic
                            this._atomicUpdatesResolveFunctions.get(fun)(); // resolve promise

                            this.__runAtomicUpdates_running = false;
                            this._runAtomicUpdates();

                        case 13:
                        case 'end':
                            return _context4.stop();
                    }
                }
            }, _callee4, this);
        }));

        function _runAtomicUpdates() {
            return _ref4.apply(this, arguments);
        }

        return _runAtomicUpdates;
    }();

    /**
     * save document if its data has changed
     * @return {boolean} false if nothing to save
     */


    RxDocument.prototype.save = function () {
        var _ref5 = _asyncToGenerator(_regeneratorRuntime.mark(function _callee5() {
            var ret, emitValue, changeEvent;
            return _regeneratorRuntime.wrap(function _callee5$(_context5) {
                while (1) {
                    switch (_context5.prev = _context5.next) {
                        case 0:
                            if (!this._isTemporary) {
                                _context5.next = 2;
                                break;
                            }

                            return _context5.abrupt('return', this._saveTemporary());

                        case 2:
                            if (!this._deleted$.getValue()) {
                                _context5.next = 4;
                                break;
                            }

                            throw new Error('RxDocument.save(): cant save deleted document');

                        case 4:
                            if (!deepEqual(this._data, this._dataSync$.getValue())) {
                                _context5.next = 7;
                                break;
                            }

                            this._synced$.next(true);
                            return _context5.abrupt('return', false);

                        case 7:
                            _context5.next = 9;
                            return this.collection._runHooks('pre', 'save', this);

                        case 9:
                            this.collection.schema.validate(this._data);

                            _context5.next = 12;
                            return this.collection._pouchPut(clone(this._data));

                        case 12:
                            ret = _context5.sent;

                            if (ret.ok) {
                                _context5.next = 15;
                                break;
                            }

                            throw new Error('RxDocument.save(): error ' + JSON.stringify(ret));

                        case 15:
                            emitValue = clone(this._data);

                            emitValue._rev = ret.rev;

                            this._data = emitValue;

                            _context5.next = 20;
                            return this.collection._runHooks('post', 'save', this);

                        case 20:

                            // event
                            this._synced$.next(true);
                            this._dataSync$.next(clone(emitValue));

                            changeEvent = RxChangeEvent.create('UPDATE', this.collection.database, this.collection, this, emitValue);

                            this.$emit(changeEvent);
                            return _context5.abrupt('return', true);

                        case 25:
                        case 'end':
                            return _context5.stop();
                    }
                }
            }, _callee5, this);
        }));

        function save() {
            return _ref5.apply(this, arguments);
        }

        return save;
    }();

    /**
     * does the same as .save() but for temporary documents
     * Saving a temporary doc is basically the same as RxCollection.insert()
     * @return {Promise}
     */


    RxDocument.prototype._saveTemporary = function () {
        var _ref6 = _asyncToGenerator(_regeneratorRuntime.mark(function _callee6() {
            return _regeneratorRuntime.wrap(function _callee6$(_context6) {
                while (1) {
                    switch (_context6.prev = _context6.next) {
                        case 0:
                            _context6.next = 2;
                            return this.collection.insert(this);

                        case 2:
                            this._isTemporary = false;
                            this.collection._docCache.set(this.getPrimary(), this);

                            // internal events
                            this._synced$.next(true);
                            this._dataSync$.next(clone(this._data));

                            return _context6.abrupt('return', true);

                        case 7:
                        case 'end':
                            return _context6.stop();
                    }
                }
            }, _callee6, this);
        }));

        function _saveTemporary() {
            return _ref6.apply(this, arguments);
        }

        return _saveTemporary;
    }();

    RxDocument.prototype.remove = function () {
        var _ref7 = _asyncToGenerator(_regeneratorRuntime.mark(function _callee7() {
            return _regeneratorRuntime.wrap(function _callee7$(_context7) {
                while (1) {
                    switch (_context7.prev = _context7.next) {
                        case 0:
                            if (!this.deleted) {
                                _context7.next = 2;
                                break;
                            }

                            throw new Error('RxDocument.remove(): Document is already deleted');

                        case 2:
                            _context7.next = 4;
                            return this.collection._runHooks('pre', 'remove', this);

                        case 4:
                            _context7.next = 6;
                            return this.collection.pouch.remove(this.getPrimary(), this._data._rev);

                        case 6:

                            this.$emit(RxChangeEvent.create('REMOVE', this.collection.database, this.collection, this, this._data));

                            _context7.next = 9;
                            return this.collection._runHooks('post', 'remove', this);

                        case 9:
                            _context7.next = 11;
                            return util.promiseWait(0);

                        case 11:
                            return _context7.abrupt('return');

                        case 12:
                        case 'end':
                            return _context7.stop();
                    }
                }
            }, _callee7, this);
        }));

        function remove() {
            return _ref7.apply(this, arguments);
        }

        return remove;
    }();

    RxDocument.prototype.destroy = function destroy() {};

    _createClass(RxDocument, [{
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
    return doc;
}

export function createAr(collection, jsonDataAr) {
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