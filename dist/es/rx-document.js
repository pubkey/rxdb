import _regeneratorRuntime from 'babel-runtime/regenerator';
import _asyncToGenerator from 'babel-runtime/helpers/asyncToGenerator';
import _classCallCheck from 'babel-runtime/helpers/classCallCheck';
import _createClass from 'babel-runtime/helpers/createClass';
import IdleQueue from 'custom-idle-queue';
import objectPath from 'object-path';
import deepEqual from 'deep-equal';

import { clone, promiseWait, trimDots } from './util';
import RxChangeEvent from './rx-change-event';
import RxError from './rx-error';
import { runPluginHooks } from './hooks';

import { BehaviorSubject } from 'rxjs';
import { distinctUntilChanged, map } from 'rxjs/operators';

export var RxDocument = function () {
    function RxDocument(collection, jsonData) {
        _classCallCheck(this, RxDocument);

        this.collection = collection;

        // if true, this is a temporary document
        this._isTemporary = false;

        // assume that this is always equal to the doc-data in the database
        this._dataSync$ = new BehaviorSubject(clone(jsonData));

        // current doc-data, changes when setting values etc
        this._data = clone(jsonData);

        // false when _data !== _dataSync
        this._synced$ = new BehaviorSubject(true);
        this._deleted$ = new BehaviorSubject(false);
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
        if (path.includes('.item.')) {
            throw RxError.newRxError('DOC1', {
                path: path
            });
        }

        if (path === this.primaryPath) throw RxError.newRxError('DOC2');

        // final fields cannot be modified and so also not observed
        if (this.collection.schema.finalFields.includes(path)) {
            throw RxError.newRxError('DOC3', {
                path: path
            });
        }

        var schemaObj = this.collection.schema.getSchemaByObjectPath(path);
        if (!schemaObj) {
            throw RxError.newRxError('DOC4', {
                path: path
            });
        }

        return this._dataSync$.pipe(map(function (data) {
            return objectPath.get(data, path);
        }), distinctUntilChanged()).asObservable();
    };

    /**
     * populate the given path
     * @param  {string}  path
     * @return {Promise<RxDocument>}
     */


    RxDocument.prototype.populate = function populate(path) {
        var schemaObj = this.collection.schema.getSchemaByObjectPath(path);
        var value = this.get(path);
        if (!schemaObj) {
            throw RxError.newRxError('DOC5', {
                path: path
            });
        }
        if (!schemaObj.ref) {
            throw RxError.newRxError('DOC6', {
                path: path,
                schemaObj: schemaObj
            });
        }

        var refCollection = this.collection.database.collections[schemaObj.ref];
        if (!refCollection) {
            throw RxError.newRxError('DOC7', {
                ref: schemaObj.ref,
                path: path,
                schemaObj: schemaObj
            });
        }

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
        if (typeof pathProperties === 'undefined') return;
        if (pathProperties.properties) pathProperties = pathProperties.properties;

        Object.keys(pathProperties).forEach(function (key) {
            var fullPath = trimDots(objPath + '.' + key);

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
        if (typeof objPath !== 'string') {
            throw RxError.newRxTypeError('DOC15', {
                objPath: objPath,
                value: value
            });
        }

        // primary cannot be modified
        if (!this._isTemporary && objPath === this.primaryPath) {
            throw RxError.newRxError('DOC8', {
                objPath: objPath,
                value: value,
                primaryPath: this.primaryPath
            });
        }

        // final fields cannot be modified
        if (!this._isTemporary && this.collection.schema.finalFields.includes(objPath)) {
            throw RxError.newRxError('DOC9', {
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
        if (typeof objectPath.get(this._data, rootPath) === 'undefined') {
            throw RxError.newRxError('DOC10', {
                childpath: objPath,
                rootPath: rootPath
            });
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


    RxDocument.prototype.update = function update() {
        throw RxError.pluginMissing('update');
    };

    RxDocument.prototype.putAttachment = function putAttachment() {
        throw RxError.pluginMissing('attachments');
    };

    RxDocument.prototype.getAttachment = function getAttachment() {
        throw RxError.pluginMissing('attachments');
    };

    RxDocument.prototype.allAttachments = function allAttachments() {
        throw RxError.pluginMissing('attachments');
    };

    /**
     * runs an atomic update over the document
     * @param  {function(RxDocument)}  fun
     * @return {Promise<RxDocument>}
     */
    RxDocument.prototype.atomicUpdate = function atomicUpdate(fun) {
        var _this2 = this;

        var queue = this.atomicQueue;
        return queue.requestIdlePromise().then(function () {
            return queue.wrapCall(_asyncToGenerator( /*#__PURE__*/_regeneratorRuntime.mark(function _callee() {
                return _regeneratorRuntime.wrap(function _callee$(_context) {
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
    };

    /**
     * save document if its data has changed
     * @return {boolean} false if nothing to save
     */


    RxDocument.prototype.save = function () {
        var _ref2 = _asyncToGenerator( /*#__PURE__*/_regeneratorRuntime.mark(function _callee2() {
            var ret, emitValue, changeEvent;
            return _regeneratorRuntime.wrap(function _callee2$(_context2) {
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

                            throw RxError.newRxError('DOC11', {
                                id: this.primary,
                                document: this
                            });

                        case 4:
                            if (!deepEqual(this._data, this._dataSync$.getValue())) {
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
                            return this.collection._pouchPut(clone(this._data));

                        case 12:
                            ret = _context2.sent;

                            if (ret.ok) {
                                _context2.next = 15;
                                break;
                            }

                            throw RxError.newRxError('DOC12', {
                                data: ret
                            });

                        case 15:
                            emitValue = clone(this._data);

                            emitValue._rev = ret.rev;

                            this._data = emitValue;

                            _context2.next = 20;
                            return this.collection._runHooks('post', 'save', this);

                        case 20:

                            // event
                            this._synced$.next(true);
                            this._dataSync$.next(clone(emitValue));

                            changeEvent = RxChangeEvent.create('UPDATE', this.collection.database, this.collection, this, emitValue);

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
    }();

    /**
     * does the same as .save() but for temporary documents
     * Saving a temporary doc is basically the same as RxCollection.insert()
     * @return {Promise}
     */


    RxDocument.prototype._saveTemporary = function _saveTemporary() {
        var _this3 = this;

        return this.collection.insert(this).then(function () {
            _this3._isTemporary = false;
            _this3.collection._docCache.set(_this3.primary, _this3);

            // internal events
            _this3._synced$.next(true);
            _this3._dataSync$.next(clone(_this3._data));

            return true;
        });
    };

    RxDocument.prototype.remove = function remove() {
        var _this4 = this;

        if (this.deleted) {
            throw RxError.newRxError('DOC13', {
                document: this,
                id: this.primary
            });
        }

        return promiseWait(0).then(function () {
            return _this4.collection._runHooks('pre', 'remove', _this4);
        }).then(function () {
            return _this4.collection.database.lockedRun(function () {
                return _this4.collection.pouch.remove(_this4.primary, _this4._data._rev);
            });
        }).then(function () {
            _this4.$emit(RxChangeEvent.create('REMOVE', _this4.collection.database, _this4.collection, _this4, _this4._data));
            return _this4.collection._runHooks('post', 'remove', _this4);
        }).then(function () {
            return promiseWait(0);
        });
    };

    RxDocument.prototype.destroy = function destroy() {
        throw RxError.newRxError('DOC14');
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
        key: 'atomicQueue',
        get: function get() {
            if (!this._atomicQueue) this._atomicQueue = new IdleQueue();
            return this._atomicQueue;
        }
    }, {
        key: 'synced$',
        get: function get() {
            return this._synced$.pipe(distinctUntilChanged()).asObservable();
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
            throw RxError.pluginMissing('attachments');
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