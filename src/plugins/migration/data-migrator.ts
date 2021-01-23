/**
 * The DataMigrator handles the documents from collections with older schemas
 * and transforms/saves them into the newest collection
 */
/**
 * TODO this should be completely rewritten because:
 * - The current implemetation does not use pouchdb'S bulkDocs which is much faster
 * - This could have been done in much less code which would be easier to uderstand
 *
 */
import {
    Subject,
    Observable
} from 'rxjs';

import {
    countAllUndeleted,
    getBatch
} from '../../pouch-db';
import {
    clone,
    toPromise,
    flatClone
} from '../../util';
import {
    createRxSchema
} from '../../rx-schema';
import {
    newRxError
} from '../../rx-error';
import { overwritable } from '../../overwritable';
import {
    runPluginHooks,
    runAsyncPluginHooks
} from '../../hooks';
import type {
    RxCollection,
    RxDatabase,
    MigrationState,
    PouchDBInstance,
    NumberFunctionMap
} from '../../types';
import {
    RxSchema,
    getPreviousVersions
} from '../../rx-schema';
import type {
    KeyCompressor
} from '../key-compression';
import {
    Crypter,
    createCrypter
} from '../../crypter';
import {
    _handleToPouch,
    _handleFromPouch
} from '../../rx-collection-helper';

export class DataMigrator {

    constructor(
        public newestCollection: RxCollection,
        public migrationStrategies: NumberFunctionMap
    ) {
        this.currentSchema = newestCollection.schema;
        this.database = newestCollection.database;
        this.name = newestCollection.name;
    }

    public currentSchema: RxSchema;
    public database: RxDatabase;
    public name: string;


    private _migrated: boolean = false;
    private _migratePromise?: Promise<any>;
    migrate(batchSize: number = 10): Observable<MigrationState> {
        if (this._migrated)
            throw newRxError('DM1');
        this._migrated = true;

        const state = {
            done: false, // true if finished
            total: 0, // will be the doc-count
            handled: 0, // amount of handled docs
            success: 0, // handled docs which successed
            deleted: 0, // handled docs which got deleted
            percent: 0 // percentage
        };

        const observer: Subject<MigrationState> = new Subject();

        /**
         * TODO this is a side-effect which might throw
         * We did this because it is not possible to create new Observer(async(...))
         * @link https://github.com/ReactiveX/rxjs/issues/4074
         */
        (() => {
            let oldCols: OldCollection[];
            return _getOldCollections(this)
                .then(ret => {
                    oldCols = ret;
                    const countAll: Promise<number[]> = Promise.all(
                        oldCols.map(oldCol => countAllUndeleted(oldCol.pouchdb))
                    );
                    return countAll;
                })
                .then(countAll => {
                    const totalCount: number = countAll
                        .reduce((cur, prev) => prev = cur + prev, 0);
                    state.total = totalCount;
                    observer.next(flatClone(state));
                    let currentCol = oldCols.shift();

                    let currentPromise = Promise.resolve();
                    while (currentCol) {
                        const migrationState$ = migrateOldCollection(
                            currentCol,
                            batchSize
                        );
                        currentPromise = currentPromise.then(() => {
                            return new Promise(res => {
                                const sub = migrationState$.subscribe(
                                    (subState: any) => {
                                        state.handled++;
                                        (state as any)[subState.type] = (state as any)[subState.type] + 1;
                                        state.percent = Math.round(state.handled / state.total * 100);
                                        observer.next(flatClone(state));
                                    },
                                    (e: any) => {
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
                    observer.next(flatClone(state));
                    observer.complete();
                });
        })();


        return observer.asObservable();
    }

    migratePromise(batchSize: number): Promise<any> {
        if (!this._migratePromise) {
            this._migratePromise = mustMigrate(this)
                .then(must => {
                    if (!must) return Promise.resolve(false);
                    else return new Promise((res, rej) => {
                        const state$ = this.migrate(batchSize);
                        (state$ as any).subscribe(null, rej, res);
                    });
                });
        }
        return this._migratePromise;
    }
}

export interface OldCollection {
    version: number;
    schema: RxSchema;
    pouchdb: PouchDBInstance;
    dataMigrator: DataMigrator;
    _crypter: Crypter;
    _keyCompressor?: KeyCompressor;
    newestCollection: RxCollection;
    database: RxDatabase;
    _migrate?: boolean;
    _migratePromise?: Promise<any>;
}

export function createOldCollection(
    version: number,
    schemaObj: any,
    dataMigrator: DataMigrator
): OldCollection {
    const database = dataMigrator.newestCollection.database;
    const schema = createRxSchema(schemaObj, false);
    const ret: OldCollection = {
        version,
        dataMigrator,
        newestCollection: dataMigrator.newestCollection,
        database,
        schema: createRxSchema(schemaObj, false),
        pouchdb: database._spawnPouchDB(
            dataMigrator.newestCollection.name,
            version,
            dataMigrator.newestCollection.pouchSettings
        ),
        _crypter: createCrypter(
            database.password,
            schema
        )
    };

    if (schema.doKeyCompression()) {
        ret._keyCompressor = overwritable.createKeyCompressor(schema);
    }

    return ret;
}

/**
 * get an array with OldCollection-instances from all existing old pouchdb-instance
 */
export function _getOldCollections(
    dataMigrator: DataMigrator
): Promise<OldCollection[]> {
    return Promise
        .all(
            getPreviousVersions(dataMigrator.currentSchema.jsonSchema)
                .map(v => (dataMigrator.database.internalStore as any).get(dataMigrator.name + '-' + v))
                .map(fun => fun.catch(() => null)) // auto-catch so Promise.all continues
        )
        .then(oldColDocs => oldColDocs
            .filter(colDoc => colDoc !== null)
            .map(colDoc => {
                return createOldCollection(
                    colDoc.schema.version,
                    colDoc.schema,
                    dataMigrator
                );
            })
        );
}


/**
 * returns true if a migration is needed
 */
export function mustMigrate(dataMigrator: DataMigrator): Promise<boolean> {
    if (dataMigrator.currentSchema.version === 0) {
        return Promise.resolve(false);
    }
    return _getOldCollections(dataMigrator)
        .then(oldCols => {
            if (oldCols.length === 0) return false;
            else return true;
        });
}

export function createDataMigrator(
    newestCollection: RxCollection,
    migrationStrategies: NumberFunctionMap
): DataMigrator {
    return new DataMigrator(newestCollection, migrationStrategies);
}

export function _runStrategyIfNotNull(
    oldCollection: OldCollection,
    version: number,
    docOrNull: any | null
): Promise<object | null> {
    if (docOrNull === null) {
        return Promise.resolve(null);
    } else {
        const ret = oldCollection.dataMigrator.migrationStrategies[version](docOrNull);
        const retPromise = toPromise(ret);
        return retPromise;
    }
}

export function getBatchOfOldCollection(
    oldCollection: OldCollection,
    batchSize: number
): Promise<any[]> {
    return getBatch(oldCollection.pouchdb, batchSize)
        .then(docs => docs
            .map(doc => _handleFromPouch(oldCollection, doc))
        );
}

/**
 * runs the doc-data through all following migrationStrategies
 * so it will match the newest schema.
 * @throws Error if final doc does not match final schema or migrationStrategy crashes
 * @return final object or null if migrationStrategy deleted it
 */
export function migrateDocumentData(
    oldCollection: OldCollection,
    docData: any
): Promise<any | null> {
    docData = clone(docData);
    let nextVersion = oldCollection.version + 1;

    // run the document throught migrationStrategies
    let currentPromise = Promise.resolve(docData);
    while (nextVersion <= oldCollection.newestCollection.schema.version) {
        const version = nextVersion;
        currentPromise = currentPromise.then(docOrNull => _runStrategyIfNotNull(
            oldCollection,
            version,
            docOrNull
        ));
        nextVersion++;
    }

    return currentPromise.then(doc => {
        if (doc === null) return Promise.resolve(null);

        // check final schema
        try {
            oldCollection.newestCollection.schema.validate(doc);
        } catch (e) {
            throw newRxError('DM2', {
                fromVersion: oldCollection.version,
                toVersion: oldCollection.newestCollection.schema.version,
                finalDoc: doc
            });
        }
        return doc;
    });
}

/**
 * transform docdata and save to new collection
 * @return status-action with status and migrated document
 */
export function _migrateDocument(
    oldCollection: OldCollection,
    doc: any
): Promise<{ type: string, doc: {} }> {
    const action = {
        res: null,
        type: '',
        migrated: null,
        doc,
        oldCollection,
        newestCollection: oldCollection.newestCollection
    };
    return migrateDocumentData(oldCollection, doc)
        .then(migrated => {
            action.migrated = migrated;
            if (migrated) {
                runPluginHooks(
                    'preMigrateDocument',
                    action
                );

                // save to newest collection
                delete migrated._rev;
                return oldCollection.newestCollection._pouchPut(migrated, true)
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
            return oldCollection.pouchdb.remove(
                _handleToPouch(oldCollection, doc)
            ).catch(() => { });
        })
        .then(() => action) as any;
}


/**
 * deletes this.pouchdb and removes it from the database.collectionsCollection
 */
export function deleteOldCollection(
    oldCollection: OldCollection
): Promise<void> {
    return oldCollection
        .pouchdb.destroy()
        .then(
            () => oldCollection.database.removeCollectionDoc(
                oldCollection.dataMigrator.name,
                oldCollection.schema
            )
        );
}

/**
 * runs the migration on all documents and deletes the pouchdb afterwards
 */
export function migrateOldCollection(
    oldCollection: OldCollection,
    batchSize = 10
): Observable<any> {
    if (oldCollection._migrate) {
        // already running
        throw newRxError('DM3');
    }
    oldCollection._migrate = true;

    const observer = new Subject();

    /**
     * TODO this is a side-effect which might throw
     * @see DataMigrator.migrate()
     */
    (() => {
        let error: any;
        const allBatchesDone = () => {
            // remove this oldCollection
            return deleteOldCollection(oldCollection)
                .then(() => observer.complete());
        };
        const handleOneBatch = () => {
            return getBatchOfOldCollection(oldCollection, batchSize)
                .then(batch => {
                    if (batch.length === 0) {
                        allBatchesDone();
                        return false;
                    } else {
                        return Promise.all(
                            batch.map(doc => _migrateDocument(oldCollection, doc)
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
    })();

    return observer.asObservable();
}

export function migratePromise(
    oldCollection: OldCollection,
    batchSize?: number
): Promise<any> {
    if (!oldCollection._migratePromise) {
        oldCollection._migratePromise = new Promise((res, rej) => {
            const state$ = migrateOldCollection(oldCollection, batchSize);
            (state$ as any).subscribe(null, rej, res);
        });
    }
    return oldCollection._migratePromise;
}
