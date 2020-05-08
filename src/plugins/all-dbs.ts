import * as PouchDB from 'pouchdb-core';
import {defer, from, Observable, of as obsOf, Subject, throwError} from 'rxjs';
import {catchError, concatMap, map, shareReplay, switchMap, withLatestFrom, take} from 'rxjs/operators';

const PREFIX = 'db_';
const ALL_DBS_NAME = 'pouch__all_dbs__';

/**
 * PouchDB interface extended by all dbs plugin.
 */
interface PouchDBWithAllDbs extends PouchDB.Static {
    allDbs(callback?: (err: any, dbs: string[]) => any): Promise<string[]>|void;
    resetAllDbs(callback?: (err: any) => any): Promise<void>|void;
}

/**
 * Used to cache all available databases.
 */
interface DbsCache {
    [key: string]: boolean;
}

/**
 * Dependent dbs created to store indexes must be ignored.
 */
function canIgnore(dbName: string): boolean {
    return (dbName === ALL_DBS_NAME) ||
        // TODO: get rid of this when we have a real 'onDependentDbRegistered'
        // event (pouchdb/pouchdb#2438)
        (dbName.indexOf('-mrview-') !== -1) ||
        // TODO: might be a better way to detect remote DBs
        (/^https?:\/\//.test(dbName));
}

function normalize(name: string): string {
    return name.replace(/^_pouch_/, '');
}

/*
 * A database name starting with an underscore is valid, but a document
 * id starting with an underscore is not in most cases. Because of
 * that, they're prefixed in the all dbs database.
 */
function prefixed(dbName: string): string {
    return `${PREFIX}${dbName}`;
}

/**
 * Removes prefix from database name.
 */
function unprefixed(dbName: string): string {
    return dbName.slice(PREFIX.length);
}

/**
 * This plugin exposes the PouchDB.allDbs() function, which you can use to list
 * all local databases. It works by listening for PouchDB.on('created') and
 * PouchDB.on('destroyed') events, and maintaining a separate database to store
 * the names of those databases.
 */
export function PouchDbAllDbsPlugin(Pouch: PouchDB.Static) {
    /**
     * The database used to store the names of all databases.
     */
    const pouch: Observable<PouchDB.Database> = defer(() => obsOf(new Pouch(ALL_DBS_NAME))).pipe(
        shareReplay(1),
    );

    /**
     * The task queue.
     */
    const queue = new Subject<(db: PouchDB.Database) => Observable<Function|void>>();

    /**
     * Used to keep in memory the names of all databases.
     */
    let cache: DbsCache|null = null;

    /**
     * Whether the plugin has been initialized.
     */
    let isInit = false;

    /**
     * Init the plugin subscribing to the task queue stream.
     */
    function init() {
        if (isInit) {
            return;
        }
        isInit = true;
        queue.pipe(
            withLatestFrom(pouch),
            concatMap(([op, db]) => op(db)),
        ).subscribe(cb => {
            if (cb) {
                cb();
            }
        });
    }

    /**
     * Listens for PouchDB `created` event and adds a record with the name of
     * the database created.
     */
    Pouch.on('created', (dbName: string) => {
        dbName = normalize(dbName);
        if (canIgnore(dbName)) {
            return;
        }
        dbName = prefixed(dbName);
        init();
        queue.next(
            (db: PouchDB.Database) => from(db.get(dbName)).pipe(
                catchError(err => {
                    if (err.name !== 'not_found') {
                        return throwError(err);
                    }
                    return from(db.put({_id: dbName}));
                }),
                map(() => {
                    if (cache) {
                        cache[dbName] = true;
                    }
                }),
            )
        );
    });

    /**
     * Listens for PouchDB `destroyed` event and removes the corresponding
     * record from the database.
     */
    Pouch.on('destroyed', (dbName: string) => {
        dbName = normalize(dbName);
        if (canIgnore(dbName)) {
            return;
        }
        dbName = prefixed(dbName);
        init();
        queue.next(
            (db: PouchDB.Database) => from(db.get(dbName)).pipe(
                switchMap(doc => from(db.remove(doc))),
                catchError(err => {
                    if (err.name !== 'not_found') {
                        return throwError(err);
                    }
                    return obsOf();
                }),
                map(() => {
                    if (cache) {
                        delete cache[dbName];
                    }
                }),
            )
        );
    });

    function allDbs(successHandler: (dbs: string[]) => void, errorHandler: (err: any) => any) {
        queue.next(
            (db: PouchDB.Database) => {
                if (cache) {
                    return obsOf(() => successHandler(Object.keys(cache as DbsCache).map(unprefixed)));
                }

                // older versions of this module didn't have prefixes, so check here
                const opts = {startkey: PREFIX, endkey: (PREFIX + '\uffff')};
                return from(db.allDocs(opts)).pipe(
                    map(res => {
                        cache = {};
                        const dbs = res.rows.map(row => {
                            (cache as DbsCache)[row.key] = true;
                            return unprefixed(row.key);
                        });
                        return () => successHandler(dbs);
                    }),
                    catchError(err => () => errorHandler(err)),
                );
            }
        );
    }

    /**
     * Returns a list of all non-deleted databases.
     */
    (Pouch as PouchDBWithAllDbs).allDbs = (callback?) => {
        if (callback != null) {
            allDbs(
                (dbs: string[]) => callback(null, dbs),
                (err: any) => callback(err, [])
            );
        }
        return new Promise<string[]>((resolve, reject) => {
            allDbs(resolve, reject);
        });
    };

    /**
     * Destroys the separate allDbs database. You should never need to call
     * this function, it's just for tests.
     */
    (Pouch as PouchDBWithAllDbs).resetAllDbs = (callback?: (err: any) => any): Promise<void>|void => {
        const promise = pouch.pipe(
            switchMap(db => from(db.destroy())),
            catchError(err => obsOf(err)),
            take(1),
        ).toPromise();
        if (callback) {
            promise.then(callback).catch(callback);
        } else {
            return promise;
        }
    };
}
