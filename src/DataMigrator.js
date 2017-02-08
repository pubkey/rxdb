/**
 * The DataMigrator handles the documents from collections with older schemas
 * and transforms/saves them into the newest collection
 */

import {
    default as PouchDB
} from './PouchDB';

import {
    default as clone
} from 'clone';

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
    async _getOldCollections() {
        const oldColDocs = await Promise.all(
            this.currentSchema.previousVersions
            .map(v => this.database._collectionsPouch.get(this.name + '-' + v))
            .map(fun => fun.catch(e => null)) // auto-catch so Promise.all continues
        );
        // spawn OldCollection-instances
        return oldColDocs
            .filter(colDoc => colDoc != null)
            .map(colDoc => new OldCollection(colDoc.schema.version, colDoc.schema, this));
    }

    /**
     * @param {number} [batchSize=10] amount of documents handled in parallel
     * @return {Observable} emits the migration-status
     */
    migrate(batchSize = 10) {
        if (this._migrated)
            throw new Error('Migration has already run');
        this._migrated = true;

        const status = {
            total: null, // will be the doc-count
            handled: 0, // amount of handled docs
            success: 0, // handled docs which successed
            deleted: 0, // handled docs which got deleted
            failed: 0, // handled docs which failed
            percent: 0 // percentage
        };

        const migrationState$ = new util.Rx.Observable(async(observer) => {
            const oldCols = await this._getOldCollections();

            const countAll = await Promise.all(
                oldCols.map(oldCol => oldCol.countAllUndeleted())
            );
            const total_count = countAll.reduce((cur, prev) => prev = cur + prev, 0);

            status.total = total_count;
            observer.next(status);

            let currentCol = null;
            while (currentCol = oldCols.shift()) {
                const migrationState$ = currentCol.migrate(batchSize);
                await new Promise(res => {
                    const sub = migrationState$.subscribe(addType => {
                        status.handled++;
                        status[addType] = status[addType] + 1;
                        status.percent = Math.round(status.total / status.handled);
                        observer.next(status);
                    }, null, () => {
                        sub.unsubscribe();
                        res();
                    });
                });
            }
        });
        return migrationState$;
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
        if (!this._schema)
            this._schema = RxSchema.create(this.schemaObj, false);
        return this._schema;
    }
    get keyCompressor() {
        if (!this._keyCompressor)
            this._keyCompressor = KeyCompressor.create(this.schema);
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

    async countAllUndeleted() {
        return PouchDB.countAllUndeleted(this.pouchdb);
    }
    async getBatch(batchSize) {
        const docs = await PouchDB.getBatch(this.pouchdb, batchSize);
        return docs
            .map(doc => this._handleFromPouch(doc));
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
     * @throws Error if final doc does not match final schema
     * @return {Object|null} final object or null if migrationStrategy deleted it
     */
    async migrateDocumentData(doc) {
        doc = clone(doc);
        let nextVersion = this.version + 1;

        // run throught migrationStrategies
        while (nextVersion <= this.newestCollection.schema.version) {
            doc = await this.dataMigrator.migrationStrategies[nextVersion + ''](doc);
            nextVersion++;
            if (doc == null)
                return null;
        }

        // check final schema
        try {
            this.newestCollection.schema.validate(doc);
        } catch (e) {
            throw new Error(`
              migration of document from v${this.version} to v${this.newestCollection.schema.version} failed
              - final document does not match final schema
              - final doc: ${JSON.stringify(doc)}
            `);
        }
        return doc;
    }

    migrate(batchSize) {
        const stateStream$ = new util.Rx.Observable(async(observer) => {
            let batch = [];
            do {
                batch = await currentCol.getBatch(batchSize);
                const batchT = batch.map(doc => currentCol.handleFromPouch(doc));

                // transform to newest version
                let transformed = await Promise.all(
                    batchT
                    .map(doc => currentCol
                        .migrateDocumentData(doc)
                        .then(doc => {
                            if (doc) return doc;
                            observer.next('deleted');
                            return null;
                        })
                        .catch(e => {
                            observer.next('failed');
                            return null;
                        })
                    )
                );

                // save to newest collection
                await Promise.all(
                    transformed
                    .filter(doc => doc != null)
                    .map(doc => this.newestCollection.insert(doc)
                        .then(success => observer.next('success')))
                );

                // remove from old collection
                await Promise.all(
                    batch.map(doc => this.pouchdb.remove(doc))
                );
            }
            while (batch.length > 0);

            // remove this oldCollection
            await this.delete();
        });
        return stateStream$;
    }

    /**
     * deletes this.pouchdb and removes it from the database.collectionsCollection
     */
    async delete() {
        await this.pouchdb.destroy();
        const colDocId = this.database._collectionNamePrimary(this.dataMigrator.name, this.schema);
    }
}


export function create(newestCollection, migrationStrategies) {
    return new DataMigrator(newestCollection, migrationStrategies);
}
