function _asyncToGenerator(fn) { return function () { var gen = fn.apply(this, arguments); return new Promise(function (resolve, reject) { function step(key, arg) { try { var info = gen[key](arg); var value = info.value; } catch (error) { reject(error); return; } if (info.done) { resolve(value); } else { return Promise.resolve(value).then(function (value) { step("next", value); }, function (err) { step("throw", err); }); } } return step("next"); }); }; }

import randomToken from 'random-token';
import PouchDB from './PouchDB';

import * as util from './util';
import * as RxCollection from './RxCollection';
import * as RxSchema from './RxSchema';
import * as RxChangeEvent from './RxChangeEvent';
import * as Socket from './Socket';
import * as LeaderElector from './LeaderElector';

const SETTINGS = {
    minPassLength: 8
};

export class RxDatabase {

    constructor(name, adapter, password, multiInstance) {
        this.name = name;
        this.adapter = adapter;
        this.password = password;
        this.multiInstance = multiInstance;

        this.token = randomToken(10);

        this.subs = [];
        this.destroyed = false;

        // cache for collection-objects
        this.collections = {};

        // this is needed to preserver attribute-name
        this.subject = null;
        this.observable$ = null;
    }

    /**
     * make the async things for this database
     */
    prepare() {
        var _this = this;

        return _asyncToGenerator(function* () {

            // rx
            _this.subject = new util.Rx.Subject();
            _this.observable$ = _this.subject.asObservable().filter(function (cEvent) {
                return cEvent.constructor.name == 'RxChangeEvent';
            });

            // create internal collections
            // - admin-collection
            _this._adminPouch = _this._spawnPouchDB('_admin', 0, {
                auto_compaction: false, // no compaction because this only stores local documents
                revs_limit: 1
            });
            // - collections-collection
            _this._collectionsPouch = _this._spawnPouchDB('_collections', 0, {
                auto_compaction: false, // no compaction because this only stores local documents
                revs_limit: 1
            });

            // validate/insert password-hash
            if (_this.password) {
                let pwHashDoc = null;
                try {
                    pwHashDoc = yield _this._adminPouch.get('_local/pwHash');
                } catch (e) {}
                if (!pwHashDoc) {
                    try {
                        yield _this._adminPouch.put({
                            _id: '_local/pwHash',
                            value: util.hash(_this.password)
                        });
                    } catch (e) {}
                }
                if (pwHashDoc && _this.password && util.hash(_this.password) != pwHashDoc.value) throw new Error('another instance on this adapter has a different password');
            }

            if (_this.multiInstance) {
                // socket
                _this.socket = yield Socket.create(_this);

                //TODO only subscribe when sth is listening to the event-chain
                _this.socket.messages$.subscribe(function (cE) {
                    return _this.$emit(cE);
                });
            }

            // leader elector
            _this.leaderElector = yield LeaderElector.create(_this);
        })();
    }

    /**
     * transforms the given adapter into a pouch-compatible object
     * @return {Object} adapterObject
     */
    get _adapterObj() {
        let adapterObj = {
            db: this.adapter
        };
        if (typeof this.adapter === 'string') {
            adapterObj = {
                adapter: this.adapter
            };
        }
        return adapterObj;
    }

    /**
     * spawns a new pouch-instance
     * @param {string} collectionName
     * @param {string} schemaVersion
     * @param {Object} [pouchSettings={}] pouchSettings
     * @type {Object}
     */
    _spawnPouchDB(collectionName, schemaVersion, pouchSettings = {}) {
        const pouchLocation = this.name + '-rxdb-' + schemaVersion + '-' + collectionName;
        return new PouchDB(pouchLocation, this._adapterObj, pouchSettings);
    }

    get isLeader() {
        if (!this.multiInstance) return true;
        return this.leaderElector.isLeader;
    }
    waitForLeadership() {
        var _this2 = this;

        return _asyncToGenerator(function* () {
            if (!_this2.multiInstance) return true;
            return _this2.leaderElector.waitForLeadership();
        })();
    }

    writeToSocket(changeEvent) {
        var _this3 = this;

        return _asyncToGenerator(function* () {
            if (_this3.multiInstance && !changeEvent.isIntern() && _this3.socket) {
                yield _this3.socket.write(changeEvent);
                return true;
            }
            return false;
        })();
    }

    /**
     * throw a new event into the event-cicle
     */
    $emit(changeEvent) {
        if (!changeEvent) return;

        // throw in own cycle
        this.subject.next(changeEvent);

        // write to socket if event was created by self
        if (changeEvent.data.it == this.token) this.writeToSocket(changeEvent);
    }

    /**
     * @return {Observable} observable
     */
    get $() {
        return this.observable$;
    }

    /**
     * returns the primary for a given collection-data
     * used in the internal pouchdb-instances
     * @param {string} name
     * @param {RxSchema} schema
     */
    _collectionNamePrimary(name, schema) {
        return name + '-' + schema.version;
    }

    /**
     * removes the collection-doc from this._collectionsPouch
     * @return {Promise}
     */
    removeCollectionDoc(name, schema) {
        var _this4 = this;

        return _asyncToGenerator(function* () {
            const docId = _this4._collectionNamePrimary(name, schema);
            const doc = yield _this4._collectionsPouch.get(docId);
            return _this4._collectionsPouch.remove(doc);
        })();
    }

    /**
     * create or fetch a collection
     * @param {{name: string, schema: Object, pouchSettings = {}, migrationStrategies = {}}} args
     * @return {Collection}
     */
    collection(args) {
        var _this5 = this;

        return _asyncToGenerator(function* () {
            args.database = _this5;

            if (args.name.charAt(0) == '_') throw new Error(`collection(${args.name}): collection-names cannot start with underscore _`);

            if (_this5.collections[args.name]) throw new Error(`collection(${args.name}) already exists. use myDatabase.${args.name} to get it`);

            if (!args.schema) throw new Error(`collection(${args.name}): schema is missing`);

            if (args.schema.constructor.name != 'RxSchema') args.schema = RxSchema.create(args.schema);

            const internalPrimary = _this5._collectionNamePrimary(args.name, args.schema);

            // check unallowed collection-names
            if (properties().includes(args.name)) throw new Error(`Collection-name ${args.name} not allowed`);

            // check schemaHash
            const schemaHash = args.schema.hash;
            let collectionDoc = null;
            try {
                collectionDoc = yield _this5._collectionsPouch.get(internalPrimary);
            } catch (e) {}

            if (collectionDoc && collectionDoc.schemaHash != schemaHash) throw new Error(`collection(${args.name}): another instance created this collection with a different schema`);

            const collection = yield RxCollection.create(args);
            if (Object.keys(collection.schema.encryptedPaths).length > 0 && !_this5.password) throw new Error(`collection(${args.name}): schema encrypted but no password given`);

            if (!collectionDoc) {
                try {
                    yield _this5._collectionsPouch.put({
                        _id: internalPrimary,
                        schemaHash,
                        schema: collection.schema.normalized,
                        version: collection.schema.version
                    });
                } catch (e) {}
            }

            const cEvent = RxChangeEvent.create('RxDatabase.collection', _this5);
            cEvent.data.v = collection.name;
            cEvent.data.col = '_collections';
            _this5.$emit(cEvent);

            _this5.collections[args.name] = collection;
            _this5.__defineGetter__(args.name, function () {
                return _this5.collections[args.name];
            });

            return collection;
        })();
    }

    /**
     * export to json
     * @param {boolean} decrypted
     * @param {?string[]} collections array with collectionNames or null if all
     */
    dump(decrypted = false, collections = null) {
        var _this6 = this;

        return _asyncToGenerator(function* () {
            const json = {
                name: _this6.name,
                instanceToken: _this6.token,
                encrypted: false,
                passwordHash: null,
                collections: []
            };

            if (_this6.password) {
                json.passwordHash = util.hash(_this6.password);
                if (decrypted) json.encrypted = false;else json.encrypted = true;
            }

            const useCollections = Object.keys(_this6.collections).filter(function (colName) {
                return !collections || collections.includes(colName);
            }).filter(function (colName) {
                return colName.charAt(0) != '_';
            }).map(function (colName) {
                return _this6.collections[colName];
            });

            json.collections = yield Promise.all(useCollections.map(function (col) {
                return col.dump(decrypted);
            }));

            return json;
        })();
    }

    /**
     * import json
     * @param {Object} dump
     */
    importDump(dump) {
        var _this7 = this;

        return _asyncToGenerator(function* () {
            return Promise.all(dump.collections.filter(function (colDump) {
                return _this7.collections[colDump.name];
            }).map(function (colDump) {
                return _this7.collections[colDump.name].importDump(colDump);
            }));
        })();
    }

    destroy() {
        var _this8 = this;

        return _asyncToGenerator(function* () {
            if (_this8.destroyed) return;
            _this8.destroyed = true;
            _this8.socket && _this8.socket.destroy();
            yield _this8.leaderElector.destroy();
            _this8.subs.map(function (sub) {
                return sub.unsubscribe();
            });
            Object.keys(_this8.collections).map(function (key) {
                return _this8.collections[key];
            }).map(function (col) {
                return col.destroy();
            });
        })();
    }

}

/**
 * returns all possible properties of a RxDatabase-instance
 * @return {string[]} property-names
 */
let _properties = null;
export function properties() {
    if (!_properties) {
        const pseudoInstance = new RxDatabase();
        const ownProperties = Object.getOwnPropertyNames(pseudoInstance);
        const prototypeProperties = Object.getOwnPropertyNames(Object.getPrototypeOf(pseudoInstance));
        _properties = [...ownProperties, ...prototypeProperties];
    }
    return _properties;
}

export let create = (() => {
    var _ref = _asyncToGenerator(function* ({
        name,
        adapter,
        password,
        multiInstance = true
    }) {
        util.validateCouchDBString(name);

        // check if pouchdb-adapter
        if (typeof adapter == 'string') {
            if (!PouchDB.adapters || !PouchDB.adapters[adapter]) {
                throw new Error(`Adapter ${adapter} not added.
                 Use RxDB.plugin(require('pouchdb-adapter-${adapter}');`);
            }
        } else {
            util.isLevelDown(adapter);
            if (!PouchDB.adapters || !PouchDB.adapters.leveldb) {
                throw new Error(`To use leveldown-adapters, you have to add the leveldb-plugin.
                 Use RxDB.plugin(require('pouchdb-adapter-leveldb'));`);
            }
        }

        if (password && typeof password !== 'string') throw new TypeError('password is no string');
        if (password && password.length < SETTINGS.minPassLength) throw new Error(`password must have at least ${SETTINGS.minPassLength} chars`);

        const db = new RxDatabase(name, adapter, password, multiInstance);
        yield db.prepare();

        return db;
    });

    return function create(_x) {
        return _ref.apply(this, arguments);
    };
})();

export { RxSchema };