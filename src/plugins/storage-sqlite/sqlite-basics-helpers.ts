import {
    ensureNotFalsy,
    PROMISE_RESOLVE_VOID,
    getFromMapOrCreate,
    randomToken,
    promiseWait
} from '../../index.ts';
import type {
    Sqlite3Type,
    SQLiteBasics,
    SQLiteDatabaseClass,
    SQLiteQueryWithParams
} from './sqlite-types.ts';
import { boolParamsToInt } from './sqlite-helpers.ts';


const BASICS_BY_SQLITE_LIB = new WeakMap();
export function getSQLiteBasicsNode(
    sqlite3: Sqlite3Type
): SQLiteBasics<SQLiteDatabaseClass> {
    let basics: SQLiteBasics<SQLiteDatabaseClass> = BASICS_BY_SQLITE_LIB.get(sqlite3);
    if (!basics) {
        basics = {
            open: (name: string) => Promise.resolve(new sqlite3.Database(name)),
            async run(
                db: SQLiteDatabaseClass,
                queryWithParams: SQLiteQueryWithParams
            ) {
                if (!Array.isArray(queryWithParams.params)) {
                    console.dir(queryWithParams);
                    throw new Error('no params array given for query: ' + queryWithParams.query);
                }
                await execSqlSQLiteNode(
                    db,
                    queryWithParams,
                    'run'
                );
            },
            async all(
                db: SQLiteDatabaseClass,
                queryWithParams: SQLiteQueryWithParams
            ) {
                const result = await execSqlSQLiteNode(
                    db,
                    queryWithParams,
                    'all'
                );
                return result;
            },
            async setPragma(db, key, value) {
                return await execSqlSQLiteNode(
                    db,
                    {
                        query: 'PRAGMA ' + key + ' = ' + value,
                        params: [],
                        context: {
                            method: 'setPragma',
                            data: {
                                key,
                                value
                            }
                        }
                    },
                    'run'
                );
            },
            async close(db: SQLiteDatabaseClass) {
                return await closeSQLiteDatabaseNode(db);
            },
            journalMode: 'WAL2'
        };
        BASICS_BY_SQLITE_LIB.set(sqlite3, basics);
    }
    return basics;
}



/**
 * Uses the native sqlite that comes sshipped with node version 22+
 * @link https://nodejs.org/api/sqlite.html
 */
export function getSQLiteBasicsNodeNative(
    // Pass the `sqlite.DatabaseSync` method here
    constructor: any
): SQLiteBasics<any> {
    return {
        open: async (name: string) => {
            const db = new constructor(name);
            return db;
        },
        all: async (db: any, queryWithParams: SQLiteQueryWithParams) => {
            await promiseWait(0); // TODO we should not need this
            const prepared = db.prepare(queryWithParams.query);
            const result = await prepared.all(...mapNodeNativeParams(queryWithParams.params));
            return result;
        },
        run: async (db: any, queryWithParams: SQLiteQueryWithParams) => {
            const prepared = db.prepare(queryWithParams.query);
            await prepared.run(...mapNodeNativeParams(queryWithParams.params));
        },
        setPragma: async (db, key, value) => {
            await db.exec(`pragma ${key} = ${value};`);
        },
        close: async (db: any) => {
            return db.close();
        },
        journalMode: 'WAL',
    };
};

/**
 * For unknown reason we cannot bind boolean values
 * and have to map them to one and zero.
 * TODO create an issue at Node.js
 */
export function mapNodeNativeParams(params: SQLiteQueryWithParams['params']): SQLiteQueryWithParams['params'] {
    return params.map(param => {
        if (typeof param === 'boolean') {
            if (param) {
                return 1;
            } else {
                return 0;
            }
        } else {
            return param;
        }
    });
}


/**
 * Promisified version of db.run()
 */
export function execSqlSQLiteNode(
    database: SQLiteDatabaseClass,
    queryWithParams: SQLiteQueryWithParams,
    operator: 'run' | 'all'
): any {
    const debug = false;
    let resolved = false;
    return new Promise((res, rej) => {
        if (debug) {
            console.log('# execSqlSQLiteNode() ' + queryWithParams.query);
        }
        database[operator](
            queryWithParams.query,
            queryWithParams.params,
            ((err: any, result: any) => {
                if (resolved) {
                    throw new Error('callback called multiple times ' + queryWithParams.query);
                }
                resolved = true;
                if (err) {
                    if (debug) {
                        console.log('---- ERROR RUNNING SQL:');
                        console.log(queryWithParams.query);
                        console.dir(queryWithParams.params);
                        console.dir(err);
                        console.log('----');
                    }
                    rej(err);
                } else {
                    if (debug) {
                        console.log('execSql() result: ' + database.eventNames());
                        console.log(queryWithParams.query);
                        console.dir(result);
                        console.log('execSql() result:');
                        console.log(queryWithParams.query);
                        console.dir(queryWithParams.params);
                        console.log('execSql() result -------------------------');
                    }
                    res(result);
                }
            })
        );
    });
}


export function closeSQLiteDatabaseNode(
    database: SQLiteDatabaseClass
): Promise<void> {
    return new Promise((res, rej) => {
        let resolved = false;
        database.close((err: any) => {
            if (resolved) {
                throw new Error('close() callback called multiple times');
            }
            resolved = true;
            if (
                err &&
                !err.message.includes('Database is closed')
            ) {
                rej(err);
            } else {
                res();
            }
        });
    });
}








type SQLiteCapacitorDatabase = any;
type SQLiteConnection = any;

const BASICS_BY_SQLITE_LIB_CAPACITOR: WeakMap<SQLiteConnection, SQLiteBasics<SQLiteCapacitorDatabase>> = new WeakMap();
const CAPACITOR_CONNECTION_BY_NAME = new Map();
/**
 * In capacitor it is not allowed to reopen an already
 * open database connection. So we have to queue the open-close
 * calls so that they do not run in parallel and we do not open&close
 * database connections at the same time.
 */
let capacitorOpenCloseQueue = PROMISE_RESOLVE_VOID;

export function getSQLiteBasicsCapacitor(
    sqlite: SQLiteConnection,
    capacitorCore: any
): SQLiteBasics<SQLiteCapacitorDatabase> {
    const basics = getFromMapOrCreate<SQLiteConnection, SQLiteBasics<SQLiteCapacitorDatabase>>(
        BASICS_BY_SQLITE_LIB_CAPACITOR,
        sqlite,
        () => {
            const innerBasics: SQLiteBasics<SQLiteCapacitorDatabase> = {
                open(dbName: string) {
                    capacitorOpenCloseQueue = capacitorOpenCloseQueue.then(async () => {
                        const db = await getFromMapOrCreate(
                            CAPACITOR_CONNECTION_BY_NAME,
                            dbName,
                            () => sqlite.createConnection(dbName, false, 'no-encryption', 1)
                        );
                        await db.open();
                        return db;
                    });
                    return capacitorOpenCloseQueue;
                },
                async run(
                    db: SQLiteCapacitorDatabase,
                    queryWithParams: SQLiteQueryWithParams
                ) {
                    await db.run(
                        queryWithParams.query,
                        queryWithParams.params,
                        false
                    );
                },
                async all(
                    db: SQLiteCapacitorDatabase,
                    queryWithParams: SQLiteQueryWithParams
                ) {
                    const result: any = await db.query(
                        queryWithParams.query,
                        queryWithParams.params
                    );
                    return ensureNotFalsy(result.values);
                },
                setPragma(db, key, value) {
                    return db.execute('PRAGMA ' + key + ' = ' + value, false);
                },
                close(db: SQLiteCapacitorDatabase) {
                    capacitorOpenCloseQueue = capacitorOpenCloseQueue.then(() => {
                        return db.close();
                    });
                    return capacitorOpenCloseQueue;
                },
                /**
                 * On android, there is already WAL mode set.
                 * So we do not have to set it by our own.
                 * @link https://github.com/capacitor-community/sqlite/issues/258#issuecomment-1102966087
                 */
                journalMode: capacitorCore.getPlatform() === 'android' ? '' : 'WAL'
            };
            return innerBasics;
        }
    );
    return basics;
}





type SQLiteQuickDatabase = any;
type SQLiteQuickConnection = any;
export const EMPTY_FUNCTION = () => { };

export function getSQLiteBasicsQuickSQLite(
    openDB: any
): SQLiteBasics<SQLiteQuickDatabase> {
    return {
        open: async (name: string) => {
            return await openDB(
                { name }
            );
        },
        all: async (db: SQLiteQuickConnection, queryWithParams: SQLiteQueryWithParams) => {
            const result = await db.executeAsync(
                queryWithParams.query,
                queryWithParams.params
            );
            return result.rows._array;
        },
        run: (db: SQLiteQuickConnection, queryWithParams: SQLiteQueryWithParams) => {
            return db.executeAsync(
                queryWithParams.query,
                queryWithParams.params
            );
        },
        setPragma(db, key, value) {
            return db.executeAsync(
                'PRAGMA ' + key + ' = ' + value,
                []
            );
        },
        close: async (db: SQLiteQuickConnection) => {
            return await db.close(
                EMPTY_FUNCTION,
                EMPTY_FUNCTION,
            );
        },
        journalMode: '',
    };
}




/**
 * @deprecated Use getSQLiteBasicsExpoSQLiteAsync() instead
 */
export function getSQLiteBasicsExpoSQLite(
    openDB: any,
    options?: any,
    directory?: any
): SQLiteBasics<any> {
    return {
        open: async (name: string,) => {
            return await openDB(name, options, directory);
        },
        all: (db: any, queryWithParams: SQLiteQueryWithParams) => {
            const result = new Promise<any>((resolve, reject) => {
                db.exec(
                    [{ sql: queryWithParams.query, args: queryWithParams.params }],
                    false,
                    (err: any, res: any) => {
                        if (err) {
                            return reject(err);
                        }
                        if (Array.isArray(res)) {
                            const queryResult = res[0]; // there is only one query
                            if (Object.prototype.hasOwnProperty.call(queryResult, 'rows')) {
                                return resolve(queryResult.rows);
                            }
                            return reject(queryResult.error);
                        }
                        return reject(new Error(`getSQLiteBasicsExpoSQLite.all() response is not an array: ${res}`));
                    }
                );
            });
            return result;
        },
        run: (db: any, queryWithParams: SQLiteQueryWithParams) => {
            return new Promise<any>((resolve, reject) => {
                db.exec([{ sql: queryWithParams.query, args: queryWithParams.params }], false, (err: any, res: any) => {
                    if (err) {
                        return reject(err);
                    }
                    if (Array.isArray(res) && res[0] && res[0].error) {
                        return reject(res);
                    } else {
                        resolve(res);
                    };
                });
            });
        },
        setPragma(db, key, value) {
            return new Promise<any>((resolve, reject) => {
                db.exec([{ sql: `pragma ${key} = ${value};`, args: [] }], false, (err: any, res: any) => {
                    if (err) {
                        return reject(err);
                    }
                    if (Array.isArray(res) && res[0] && res[0].error) {
                        return reject(res);
                    } else {
                        resolve(res);
                    };
                });
            });
        },
        close: async (db: any) => {
            return await db.closeAsync();
        },
        journalMode: '',
    };
};


/**
 * @link https://docs.expo.dev/versions/latest/sdk/sqlite/
 */
export function getSQLiteBasicsExpoSQLiteAsync(
    openDB: any,
    options?: any,
    directory?: any
): SQLiteBasics<any> {
    return {
        open: async (name: string) => {
            return await openDB(name, options, directory);
        },
        all: async (db: any, queryWithParams: SQLiteQueryWithParams) => {
            const result = await db.getAllAsync(
                queryWithParams.query,
                queryWithParams.params
            );
            return result as any;
        },
        run: async (db: any, queryWithParams: SQLiteQueryWithParams) => {
            const ret = await db.runAsync(
                queryWithParams.query,
                queryWithParams.params
            );
            return ret as any;
        },
        async setPragma(db, key, value) {
            await db.execAsync('PRAGMA ' + key + ' = ' + value);
        },
        close: async (db: any) => {
            return await db.closeAsync();
        },
        journalMode: '',
    };
};



/**
 * Build to be compatible with packages
 * that use the websql npm package like:
 * @link https://www.npmjs.com/package/react-native-sqlite-2
 * @link https://www.npmjs.com/package/websql
 * Use like:
 * import SQLite from 'react-native-sqlite-2';
 * getRxStorageSQLite({
 *   sqliteBasics: getSQLiteBasicsWebSQL(SQLite.openDatabase)
 * });
 *
 */
export function getSQLiteBasicsWebSQL(
    openDB: any,
): SQLiteBasics<any> {
    return {
        open: async (name: string) => {
            const webSQLDatabase = await openDB(name, '1.0', '', 1);
            return ensureNotFalsy(webSQLDatabase._db);
        },
        all: async (db: any, queryWithParams: SQLiteQueryWithParams) => {
            const rawResult = await webSQLExecuteQuery(db, queryWithParams);
            const rows = Array.from(rawResult.rows);
            return rows as any;
        },
        run: async (db: any, queryWithParams: SQLiteQueryWithParams) => {
            await webSQLExecuteQuery(db, queryWithParams);
        },
        setPragma: async (db, key, value) => {
            await webSQLExecuteQuery(db, {
                query: `pragma ${key} = ${value};`,
                params: [],
                context: {
                    method: 'setPragma',
                    data: {
                        key,
                        value
                    }
                }
            }).catch(err => {
                /**
                 * WebSQL in the browser does not allow us to set any pragma
                 * so we have to catch the error.
                 * @link https://stackoverflow.com/a/10298712/3443137
                 */
                if (err.message.includes('23 not authorized')) {
                    return;
                }
                throw err;
            });
        },
        close: async (db: any) => {
            /**
             * The WebSQL API itself has no close() method.
             * But some libraries have different custom close methods.
             */
            if (typeof db.closeAsync === 'function') {
                return await db.closeAsync();
            }
            if (typeof db.close === 'function') {
                return await db.close();
            }
        },
        journalMode: '',
    };
};

export function webSQLExecuteQuery(
    db: any,
    queryWithParams: SQLiteQueryWithParams
): Promise<any> {
    return new Promise<any>((resolve, reject) => {
        db.exec(
            [{ sql: queryWithParams.query, args: queryWithParams.params }],
            false,
            (err: any, res: any) => {
                if (err) {
                    return reject(err);
                }
                if (Array.isArray(res) && res[0] && res[0].error) {
                    return reject(res[0].error);
                } else {
                    return resolve(res[0]);
                };
            }
        );
    });
}



/**
 * Build to be compatible with packages
 * that use SQLite compiled to webassembly:
 * @link https://github.com/rhashimoto/wa-sqlite
 * Use like:
 * ```ts
 * import sqlite3InitModule from '@sqlite.org/sqlite-wasm';
 * const sqliteWasm = await sqlite3InitModule();
 * getSQLiteBasicsWasm({ dbConstructor: sqliteWasm.oo1.DB });
 * ```
 *
 */


/**
 * TODO the wa-sqlite module has problems
 * when running prepared statements with params
 * in parallel. So we de-parrallel the runs here.
 * This is bad for performance and should be fixed at the
 * wa-sqlite repo.
 */
let runQueueWasmSQLite: Promise<any> = PROMISE_RESOLVE_VOID;
export type WasmSqliteDb = { nr: number; name: string; };
export function getSQLiteBasicsWasm(
    sqlite3: any,
): SQLiteBasics<WasmSqliteDb> {
    const debugId = randomToken(5);
    console.log('getSQLiteBasicsWasm() debugId: ' + debugId);
    return {
        debugId,
        open: (name: string) => {
            const newQueue = runQueueWasmSQLite.then(async () => {
                const dbNr = await sqlite3.open_v2(name);
                return { nr: dbNr, name };
            });
            runQueueWasmSQLite = newQueue.catch(() => { });
            return newQueue as any;
        },
        all: (db, queryWithParams: SQLiteQueryWithParams) => {
            const newQueue = runQueueWasmSQLite.then(async () => {
                const result = await sqlite3.execWithParams(
                    db.nr,
                    queryWithParams.query,
                    boolParamsToInt(queryWithParams.params)
                );
                return result.rows;
            });
            runQueueWasmSQLite = newQueue.catch(() => { });
            return newQueue as any;
        },
        run: (db, queryWithParams: SQLiteQueryWithParams) => {
            const newQueue = runQueueWasmSQLite.then(async () => {
                await sqlite3.run(db.nr, queryWithParams.query, queryWithParams.params);
                // return new Promise(async (res) => {
                //     console.log('run start! ' + queryWithParams.query);
                //     const runResult = await sqlite3.run(db.nr, queryWithParams, (a1: any, a2: any) => {
                //         console.log('run result ccallback:');
                //         console.log(JSON.stringify({ a1, a2 }));
                //         res();
                //     });
                //     console.log('runResult:');
                //     console.log(JSON.stringify(runResult));
                // });
            });
            runQueueWasmSQLite = newQueue.catch(() => { });
            return newQueue as any;
        },
        setPragma: (db, key, value) => {
            const newQueue = runQueueWasmSQLite.then(async () => {
                await sqlite3.exec(db.nr, `pragma ${key} = ${value};`);
            });
            runQueueWasmSQLite = newQueue.catch(() => { });
            return newQueue as any;
        },
        close: (db) => {
            const newQueue = runQueueWasmSQLite.then(async () => {
                await sqlite3.close(db.nr);
            });
            runQueueWasmSQLite = newQueue.catch(() => { });
            return newQueue as any;
        },
        journalMode: 'WAL',
    };
};
