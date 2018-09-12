/**
 * The DataMigrator handles the documents from collections with older schemas
 * and transforms/saves them into the newest collection
 */

import PouchDB from './pouch-db';
import {
    clone
} from './util';

import RxSchema from './rx-schema';
import Crypter from './crypter';
import RxError from './rx-error';
import overwritable from './overwritable';
import hooks from './hooks';

import {
    Subject
} from 'rxjs';

class DataMigrator {
    constructor(newestCollection, migrationStrategies) {
        this.newestCollection = newestCollection;
        this.migrationStrategies = migrationStrategies;
        this.currentSchema = newestCollection.schema;
        this.database = newestCollection.database;
        this.name = newestCollection.name;
    }

    /**
     * @param {number} [batchSize=10] amount of documents handled in parallel
     * @return {Observable} emits the migration-state
     */
    migrate(batchSize = 10) {
        if (this._migrated)
            throw RxError.newRxError('DM1');
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
        (async () => {
            const oldCols = await _getOldCollections(this);

            const countAll = await Promise.all(
                oldCols.map(oldCol => oldCol.countAllUndeleted())
            );
            const totalCount = countAll.reduce((cur, prev) => prev = cur + prev, 0);

            state.total = totalCount;
            observer.next(clone(state));

            let currentCol = oldCols.shift();
            while (currentCol) {
                const migrationState$ = currentCol.migrate(batchSize);
                await new Promise(res => {
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
                currentCol = oldCols.shift();
            }

            state.done = true;
            state.percent = 100;
            observer.next(clone(state));

            observer.complete();
        })();


        return observer.asObservable();
    }

    async migratePromise(batchSize) {
        if (!this._migratePromise) {

            const must = await mustMigrate(this);
            if (!must) return Promise.resolve(false);

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
        if (!this._keyCompressor)
            this._keyCompressor = overwritable.createKeyCompressor(this.schema);
        return this._keyCompressor;
    }
    get crypter() {
        if (!this._crypter)
            this._crypter = Crypter.create(this.database.password, this.schema);
        return this._crypter;
    }
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
        return PouchDB.countAllUndeleted(this.pouchdb);
    }

    getBatch(batchSize) {
        return PouchDB
            .getBatch(this.pouchdb, batchSize)
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
     * runs the doc-data through all following migrationStrategies
     * so it will match the newest schema.
     * @throws Error if final doc does not match final schema or migrationStrategy crashes
     * @return {Object|null} final object or null if migrationStrategy deleted it
     */
    async migrateDocumentData(doc) {
        doc = clone(doc);
        let nextVersion = this.version + 1;

        // run throught migrationStrategies
        while (nextVersion <= this.newestCollection.schema.version) {
            doc = await this.dataMigrator.migrationStrategies[nextVersion + ''](doc);
            nextVersion++;
            if (doc === null)
                return null;
        }

        // check final schema
        try {
            this.newestCollection.schema.validate(doc);
        } catch (e) {
            throw RxError.newRxError('DM2', {
                fromVersion: this.version,
                toVersion: this.newestCollection.schema.version,
                finalDoc: doc
            });
        }
        return doc;
    }



    /**
     * transform docdata and save to new collection
     * @return {{type: string, doc: {}}} status-action with status and migrated document
     */
    async _migrateDocument(doc) {
        const migrated = await this.migrateDocumentData(doc);
        const action = {
            doc,
            migrated,
            oldCollection: this,
            newestCollection: this.newestCollection
        };

        if (migrated) {
            hooks.runPluginHooks(
                'preMigrateDocument',
                action
            );

            // save to newest collection
            delete migrated._rev;
            const res = await this.newestCollection._pouchPut(migrated, true);
            action.res = res;
            action.type = 'success';

            await hooks.runAsyncPluginHooks(
                'postMigrateDocument',
                action
            );
        } else action.type = 'deleted';


        // remove from old collection
        try {
            await this.pouchdb.remove(this._handleToPouch(doc));
        } catch (e) {}

        return action;
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
    migrate(batchSize = 10) {
        if (this._migrate)
            throw RxError.newRxError('DM3');
        this._migrate = true;

        const observer = new Subject();

        /**
         * TODO this is a side-effect which might throw
         * @see DataMigrator.migrate()
         */
        (async () => {
            let batch = await this.getBatch(batchSize);
            let error;
            do {
                await Promise.all(
                    batch.map(doc => this._migrateDocument(doc)
                        .then(action => observer.next(action))
                    )
                ).catch(e => error = e);

                if (error) {
                    observer.error(error);
                    return;
                }

                // reset batch so loop can run again
                batch = await this.getBatch(batchSize);
            } while (!error && batch.length > 0);

            // remove this oldCollection
            await this.delete();

            observer.complete();
        })();

        return observer.asObservable();
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


/**
 * get an array with OldCollection-instances from all existing old pouchdb-instance
 * @return {Promise<OldCollection[]>}
 */
export function _getOldCollections(dataMigrator) {
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

export function create(newestCollection, migrationStrategies) {
    return new DataMigrator(newestCollection, migrationStrategies);
}

export default {
    create
};
