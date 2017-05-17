function _asyncToGenerator(fn) { return function () { var gen = fn.apply(this, arguments); return new Promise(function (resolve, reject) { function step(key, arg) { try { var info = gen[key](arg); var value = info.value; } catch (error) { reject(error); return; } if (info.done) { resolve(value); } else { return Promise.resolve(value).then(function (value) { step("next", value); }, function (err) { step("throw", err); }); } } return step("next"); }); }; }

/**
 * The DataMigrator handles the documents from collections with older schemas
 * and transforms/saves them into the newest collection
 */

import PouchDB from './PouchDB';
import clone from 'clone';

import * as util from './util';
import * as RxSchema from './RxSchema';
import * as KeyCompressor from './KeyCompressor';
import * as Crypter from './Crypter';

class DataMigrator {

    constructor(newestCollection, migrationStrategies) {
        this.newestCollection = newestCollection;
        this.migrationStrategies = migrationStrategies;
        this.currentSchema = newestCollection.schema;
        this.database = newestCollection.database;
        this.name = newestCollection.name;
    }

    /**
     * get an array with OldCollection-instances from all existing old pouchdb-instance
     * @return {OldCollection[]}
     */
    _getOldCollections() {
        var _this = this;

        return _asyncToGenerator(function* () {
            const oldColDocs = yield Promise.all(_this.currentSchema.previousVersions.map(function (v) {
                return _this.database._collectionsPouch.get(_this.name + '-' + v);
            }).map(function (fun) {
                return fun.catch(function (e) {
                    return null;
                });
            }) // auto-catch so Promise.all continues
            );
            // spawn OldCollection-instances
            return oldColDocs.filter(function (colDoc) {
                return colDoc != null;
            }).map(function (colDoc) {
                return new OldCollection(colDoc.schema.version, colDoc.schema, _this);
            });
        })();
    }

    /**
     * @param {number} [batchSize=10] amount of documents handled in parallel
     * @return {Observable} emits the migration-state
     */
    migrate(batchSize = 10) {
        var _this2 = this;

        if (this._migrated) throw new Error('Migration has already run');
        this._migrated = true;

        const state = {
            done: false, // true if finished
            total: null, // will be the doc-count
            handled: 0, // amount of handled docs
            success: 0, // handled docs which successed
            deleted: 0, // handled docs which got deleted
            percent: 0 // percentage
        };

        const migrationState$ = new util.Rx.Observable((() => {
            var _ref = _asyncToGenerator(function* (observer) {
                const oldCols = yield _this2._getOldCollections();

                const countAll = yield Promise.all(oldCols.map(function (oldCol) {
                    return oldCol.countAllUndeleted();
                }));
                const total_count = countAll.reduce(function (cur, prev) {
                    return prev = cur + prev;
                }, 0);

                state.total = total_count;
                observer.next(clone(state));

                let currentCol = null;
                let error = null;
                while (currentCol = oldCols.shift()) {
                    const migrationState$ = currentCol.migrate(batchSize);
                    yield new Promise(function (res) {
                        const sub = migrationState$.subscribe(function (subState) {
                            state.handled++;
                            state[subState.type] = state[subState.type] + 1;
                            state.percent = Math.round(state.handled / state.total * 100);
                            observer.next(clone(state));
                        }, function (e) {
                            error = e;
                            sub.unsubscribe();
                            observer.error(e);
                        }, function () {
                            sub.unsubscribe();
                            res();
                        });
                    });
                }

                state.done = true;
                state.percent = 100;
                observer.next(clone(state));

                observer.complete();
            });

            return function (_x) {
                return _ref.apply(this, arguments);
            };
        })());
        return migrationState$;
    }

    migratePromise(batchSize) {
        if (!this._migratePromise) {
            this._migratePromise = new Promise((res, rej) => {
                const state$ = this.migrate(batchSize);
                state$.subscribe(null, rej, res);
            });
        }
        return this._migratePromise;
    }

}

class OldCollection {
    constructor(version, schemaObj, dataMigrator) {
        this.version = version;
        this.dataMigrator = dataMigrator;
        this.schemaObj = schemaObj;
        this.newestCollection = dataMigrator.newestCollection;
        this.database = dataMigrator.newestCollection.database;
    }
    get schema() {
        if (!this._schema) {
            //            delete this.schemaObj._id;
            this._schema = RxSchema.create(this.schemaObj, false);
        }
        return this._schema;
    }
    get keyCompressor() {
        if (!this._keyCompressor) this._keyCompressor = KeyCompressor.create(this.schema);
        return this._keyCompressor;
    }
    get crypter() {
        if (!this._crypter) this._crypter = Crypter.create(this.database.password, this.schema);
        return this._crypter;
    }
    get pouchdb() {
        if (!this._pouchdb) {
            this._pouchdb = this.database._spawnPouchDB(this.newestCollection.name, this.version, this.newestCollection.pouchSettings);
        }
        return this._pouchdb;
    }

    countAllUndeleted() {
        var _this3 = this;

        return _asyncToGenerator(function* () {
            return PouchDB.countAllUndeleted(_this3.pouchdb);
        })();
    }
    getBatch(batchSize) {
        var _this4 = this;

        return _asyncToGenerator(function* () {
            const docs = yield PouchDB.getBatch(_this4.pouchdb, batchSize);
            return docs.map(function (doc) {
                return _this4._handleFromPouch(doc);
            });
        })();
    }

    /**
     * handles a document from the pouchdb-instance
     */
    _handleFromPouch(docData) {
        const swapped = this.schema.swapIdToPrimary(docData);
        const decompressed = this.keyCompressor.decompress(swapped);
        const decrypted = this.crypter.decrypt(decompressed);
        return decrypted;
    }

    /**
     * runs the doc-data through all following migrationStrategies
     * so it will match the newest schema.
     * @throws Error if final doc does not match final schema or migrationStrategy crashes
     * @return {Object|null} final object or null if migrationStrategy deleted it
     */
    migrateDocumentData(doc) {
        var _this5 = this;

        return _asyncToGenerator(function* () {
            doc = clone(doc);
            let nextVersion = _this5.version + 1;

            // run throught migrationStrategies
            let error = null;
            while (nextVersion <= _this5.newestCollection.schema.version && !error) {

                doc = yield _this5.dataMigrator.migrationStrategies[nextVersion + ''](doc);

                nextVersion++;
                if (doc == null && !error) return null;
            }

            // check final schema
            try {
                _this5.newestCollection.schema.validate(doc);
            } catch (e) {
                throw new Error(`
              migration of document from v${_this5.version} to v${_this5.newestCollection.schema.version} failed
              - final document does not match final schema
              - final doc: ${JSON.stringify(doc)}
            `);
            }
            return doc;
        })();
    }

    /**
     * transform docdata and save to new collection
     * @return {{type: string, doc: {}}} status-action with status and migrated document
     */
    _migrateDocument(doc) {
        var _this6 = this;

        return _asyncToGenerator(function* () {
            const migrated = yield _this6.migrateDocumentData(doc);
            const action = {
                doc,
                migrated
            };

            if (migrated) {
                // save to newest collection
                delete migrated._rev;
                yield _this6.newestCollection._pouchPut(migrated, true);
                action.type = 'success';
            } else action.type = 'deleted';

            // remove from old collection
            try {
                yield _this6.pouchdb.remove(doc);
            } catch (e) {}

            return action;
        })();
    }

    /**
     * deletes this.pouchdb and removes it from the database.collectionsCollection
     */
    delete() {
        var _this7 = this;

        return _asyncToGenerator(function* () {
            yield _this7.pouchdb.destroy();
            yield _this7.database.removeCollectionDoc(_this7.dataMigrator.name, _this7.schema);
        })();
    }

    /**
     * runs the migration on all documents and deletes the pouchdb afterwards
     */
    migrate(batchSize = 10) {
        var _this8 = this;

        if (this._migrate) throw new Error('migration already running');
        this._migrate = true;

        const stateStream$ = new util.Rx.Observable((() => {
            var _ref2 = _asyncToGenerator(function* (observer) {
                let batch = yield _this8.getBatch(batchSize);
                let error;
                do {
                    yield Promise.all(batch.map(function (doc) {
                        return _this8._migrateDocument(doc).then(function (action) {
                            return observer.next(action);
                        });
                    })).catch(function (e) {
                        return error = e;
                    });

                    if (error) {
                        observer.error(error);
                        return;
                    }

                    // reset batch so loop can run again
                    batch = yield _this8.getBatch(batchSize);
                } while (!error && batch.length > 0);

                // remove this oldCollection
                yield _this8.delete();

                observer.complete();
            });

            return function (_x2) {
                return _ref2.apply(this, arguments);
            };
        })());
        return stateStream$;
    }
    migratePromise(batchSize) {
        if (!this._migratePromise) {
            this._migratePromise = new Promise((res, rej) => {
                const state$ = this.migrate(batchSize);
                state$.subscribe(null, rej, res);
            });
        }
        return this._migratePromise;
    }
}

export function create(newestCollection, migrationStrategies) {
    return new DataMigrator(newestCollection, migrationStrategies);
}