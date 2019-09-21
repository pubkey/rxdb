/**
 * The DataMigrator handles the documents from collections with older schemas
 * and transforms/saves them into the newest collection
 */

import {
    PouchDB,
    countAllUndeleted,
    getBatch
} from './pouch-db';
import {
    clone,
    toPromise
} from './util';

import {
    createRxSchema
} from './rx-schema';
import {
    newRxError
} from './rx-error';
import overwritable from './overwritable';
import {
    runPluginHooks,
    runAsyncPluginHooks
} from './hooks';

import {
    Subject,
    Observable
} from 'rxjs';

import {
    MigrationState,
    KeyFunctionMap
} from '../typings';

import {
    RxCollection
} from './rx-collection';
import {
    RxSchema
} from './rx-schema';
import {
    RxDatabase
} from './';
import {
    KeyCompressor
} from './plugins/key-compression';
import {
    Crypter,
    create as createCrypter
} from './crypter';

export class DataMigrator {

    public currentSchema: RxSchema;
    public database: RxDatabase;
    public name: string;

    constructor(
        public newestCollection: RxCollection,
        public migrationStrategies: KeyFunctionMap
    ) {
        this.currentSchema = newestCollection.schema;
        this.database = newestCollection.database;
        this.name = newestCollection.name;
    }

    /**
     * @param {number} [batchSize=10] amount of documents handled in parallel
     * @return {Observable} emits the migration-state
     */
    private _migrated: boolean;
    migrate(batchSize: number = 10): Observable<MigrationState> {
        if (this._migrated)
            throw newRxError('DM1');
        this._migrated = true;

        const state = {
            done: false, // true if finished
            total: null, // will be the doc-count
            handled: 0, // amount of handled docs
            success: 0, // handled docs which successed
            deleted: 0, // handled docs which got deleted
            percent: 0 // percentage
        };

        const observer = new Subject();

        /**
         * TODO this is a side-effect which might throw
         * We did this because it is not possible to create new Observer(async(...))
         * @link https://github.com/ReactiveX/rxjs/issues/4074
         */
        (() => {
            let oldCols;
            return _getOldCollections(this)
                .then(ret => {
                    oldCols = ret;
                    return Promise.all(
                        oldCols.map(oldCol => oldCol.countAllUndeleted())
                    );
                })
                .then(countAll => {
                    const totalCount = countAll.reduce((cur, prev) => prev = cur + prev, 0);
                    state.total = totalCount;
                    observer.next(clone(state));
                }).then(() => {
                    let currentCol = oldCols.shift();

                    let currentPromise = Promise.resolve();
                    while (currentCol) {
                        const migrationState$ = currentCol.migrate(batchSize);
                        currentPromise = currentPromise.then(() => {
                            return new Promise(res => {
                                const sub = migrationState$.subscribe(
                                    subState => {
                                        state.handled++;
                                        state[subState.type] = state[subState.type] + 1;
                                        state.percent = Math.round(state.handled / state.total * 100);
                                        observer.next(clone(state));
                                    },
                                    e => {
                                        sub.unsubscribe();
                                        observer.error(e);
                                    }, () => {
                                        sub.unsubscribe();
                                        res();
                                    });
                            });
                        });
                        currentCol = oldCols.shift();
                    }
                    return currentPromise;
                })
                .then(() => {
                    state.done = true;
                    state.percent = 100;
                    observer.next(clone(state));
                    observer.complete();
                });
        })();


        return observer.asObservable();
    }

    private _migratePromise: Promise<any>;
    migratePromise(batchSize): Promise<any> {
        if (!this._migratePromise) {
            this._migratePromise = mustMigrate(this)
                .then(must => {
                    if (!must) return Promise.resolve(false);
                    else return new Promise((res, rej) => {
                        const state$ = this.migrate(batchSize);
                        state$.subscribe(null, rej, res);
                    });
                });
        }
        return this._migratePromise;
    }
}

class OldCollection {
    public newestCollection: RxCollection;
    public database: RxDatabase;
    constructor(
        public version: number,
        public schemaObj,
        public dataMigrator: DataMigrator
    ) {
        this.newestCollection = dataMigrator.newestCollection;
        this.database = dataMigrator.newestCollection.database;
    }

    private _schema: RxSchema;
    get schema() {
        if (!this._schema) {
            //            delete this.schemaObj._id;
            this._schema = createRxSchema(this.schemaObj, false);
        }
        return this._schema;
    }

    private _keyCompressor: KeyCompressor;
    get keyCompressor() {
        if (!this._keyCompressor)
            this._keyCompressor = overwritable.createKeyCompressor(this.schema);
        return this._keyCompressor;
    }

    private _crypter: Crypter;
    get crypter() {
        if (!this._crypter)
            this._crypter = createCrypter(this.database.password, this.schema);
        return this._crypter;
    }

    private _pouchdb;
    get pouchdb() {
        if (!this._pouchdb) {
            this._pouchdb = this.database._spawnPouchDB(
                this.newestCollection.name,
                this.version,
                this.newestCollection.pouchSettings
            );
        }
        return this._pouchdb;
    }

    /**
     * @return {Promise}
     */
    countAllUndeleted() {
        return countAllUndeleted(this.pouchdb);
    }

    getBatch(batchSize: number) {
        return getBatch(this.pouchdb, batchSize)
            .then(docs => docs
                .map(doc => this._handleFromPouch(doc))
            );
    }

    /**
     * handles a document from the pouchdb-instance
     */
    _handleFromPouch(docData) {
        let data = clone(docData);
        data = this.schema.swapIdToPrimary(docData);
        if (this.schema.doKeyCompression())
            data = this.keyCompressor.decompress(data);
        data = this.crypter.decrypt(data);
        return data;
    }

    /**
     * wrappers for Pouch.put/get to handle keycompression etc
     */
    _handleToPouch(docData) {
        let data = clone(docData);
        data = this.crypter.encrypt(data);
        data = this.schema.swapPrimaryToId(data);
        if (this.schema.doKeyCompression())
            data = this.keyCompressor.compress(data);
        return data;
    }

    /**
     * @return {Promise<object|null>}
     */
    _runStrategyIfNotNull(version, docOrNull) {
        if (docOrNull === null) return Promise.resolve(null);
        const ret = this.dataMigrator.migrationStrategies[version + ''](docOrNull);
        const retPromise = toPromise(ret);
        return retPromise;
    }

    /**
     * runs the doc-data through all following migrationStrategies
     * so it will match the newest schema.
     * @throws Error if final doc does not match final schema or migrationStrategy crashes
     * @return {Promise<Object|null>} final object or null if migrationStrategy deleted it
     */
    migrateDocumentData(doc) {
        doc = clone(doc);
        let nextVersion = this.version + 1;

        // run the document throught migrationStrategies
        let currentPromise = Promise.resolve(doc);
        while (nextVersion <= this.newestCollection.schema.version) {
            const version = nextVersion;
            currentPromise = currentPromise.then(docOrNull => this._runStrategyIfNotNull(version, docOrNull));
            nextVersion++;
        }

        return currentPromise.then(doc => {
            if (doc === null) return Promise.resolve(null);

            // check final schema
            try {
                this.newestCollection.schema.validate(doc);
            } catch (e) {
                throw newRxError('DM2', {
                    fromVersion: this.version,
                    toVersion: this.newestCollection.schema.version,
                    finalDoc: doc
                });
            }
            return doc;
        });
    }



    /**
     * transform docdata and save to new collection
     * @return {Promise<{type: string, doc: {}}>} status-action with status and migrated document
     */
    _migrateDocument(doc) {
        const action = {
            res: null,
            type: null,
            migrated: null,
            doc,
            oldCollection: this,
            newestCollection: this.newestCollection
        };
        return this.migrateDocumentData(doc)
            .then(migrated => {
                action.migrated = migrated;
                if (migrated) {
                    runPluginHooks(
                        'preMigrateDocument',
                        action
                    );

                    // save to newest collection
                    delete migrated._rev;
                    return this.newestCollection._pouchPut(migrated, true)
                        .then(res => {
                            action.res = res;
                            action.type = 'success';
                            return runAsyncPluginHooks(
                                'postMigrateDocument',
                                action
                            );
                        });
                } else action.type = 'deleted';
            })
            .then(() => {
                // remove from old collection
                return this.pouchdb.remove(this._handleToPouch(doc)).catch(() => { });
            })
            .then(() => action);
    }


    /**
     * deletes this.pouchdb and removes it from the database.collectionsCollection
     * @return {Promise}
     */
    delete() {
        return this
            .pouchdb.destroy()
            .then(() => this.database.removeCollectionDoc(this.dataMigrator.name, this.schema));
    }


    /**
     * runs the migration on all documents and deletes the pouchdb afterwards
     */
    private _migrate: boolean;
    migrate(batchSize = 10): Observable<any> {
        if (this._migrate)
            throw newRxError('DM3');
        this._migrate = true;

        const observer = new Subject();

        /**
         * TODO this is a side-effect which might throw
         * @see DataMigrator.migrate()
         */
        (() => {
            let error;
            const handleOneBatch = () => {
                return this.getBatch(batchSize)
                    .then(batch => {
                        if (batch.length === 0) {
                            allBatchesDone();
                            return false;
                        } else {
                            return Promise.all(
                                batch.map(doc => this._migrateDocument(doc)
                                    .then(action => observer.next(action))
                                )
                            ).catch(e => error = e).then(() => true);
                        }
                    })
                    .then(next => {
                        if (!next) return;
                        if (error)
                            observer.error(error);
                        else handleOneBatch();
                    });
            };
            handleOneBatch();

            const allBatchesDone = () => {
                // remove this oldCollection
                return this.delete()
                    .then(() => observer.complete());
            };
        })();

        return observer.asObservable();
    }

    private _migratePromise: Promise<any>
    migratePromise(batchSize: number): Promise<any> {
        if (!this._migratePromise) {
            this._migratePromise = new Promise((res, rej) => {
                const state$ = this.migrate(batchSize);
                state$.subscribe(null, rej, res);
            });
        }
        return this._migratePromise;
    }
}


/**
 * get an array with OldCollection-instances from all existing old pouchdb-instance
 * @return {Promise<OldCollection[]>}
 */
export function _getOldCollections(
    dataMigrator: DataMigrator
) {
    return Promise
        .all(
            dataMigrator.currentSchema.previousVersions
                .map(v => dataMigrator.database._collectionsPouch.get(dataMigrator.name + '-' + v))
                .map(fun => fun.catch(() => null)) // auto-catch so Promise.all continues
        )
        .then(oldColDocs => oldColDocs
            .filter(colDoc => colDoc !== null)
            .map(colDoc => new OldCollection(colDoc.schema.version, colDoc.schema, dataMigrator))
        );
}


/**
 * returns true if a migration is needed
 * @return {Promise<boolean>}
 */
export function mustMigrate(dataMigrator) {
    if (dataMigrator.currentSchema.version === 0) return Promise.resolve(false);
    return _getOldCollections(dataMigrator)
        .then(oldCols => {
            if (oldCols.length === 0) return false;
            else return true;
        });
}

export function createDataMigrator(newestCollection, migrationStrategies) {
    return new DataMigrator(newestCollection, migrationStrategies);
}