import {
    BulkWriteRow,
    RxDocumentData,
    PROMISE_RESOLVE_VOID,
    promiseWait,
    errorToPlainJson,
    MaybePromise
} from '../../index.ts';
import type {
    SQLResultRow,
    SQLiteBasics,
    SQLiteDatabaseClass,
    SQLiteQueryWithParams
} from './sqlite-types.ts';

export const NON_IMPLEMENTED_OPERATOR_QUERY_BATCH_SIZE = 50;

declare type DatabaseState = {
    database: Promise<SQLiteDatabaseClass>;
    openConnections: number;
    sqliteBasics: SQLiteBasics<SQLiteDatabaseClass>;
}
const DATABASE_STATE_BY_NAME: Map<string, DatabaseState> = new Map();

export const RX_STORAGE_NAME_SQLITE = 'sqlite';


/**
 * @link https://www.sqlite.org/inmemorydb.html
 */
export const SQLITE_IN_MEMORY_DB_NAME = ':memory:';

export function getDatabaseConnection(
    sqliteBasics: SQLiteBasics<any>,
    databaseName: string
): Promise<SQLiteDatabaseClass> {
    let state = DATABASE_STATE_BY_NAME.get(databaseName);
    if (!state) {
        state = {
            database: sqliteBasics.open(databaseName),
            sqliteBasics,
            openConnections: 1
        };
        DATABASE_STATE_BY_NAME.set(databaseName, state);
    } else {
        if (state.sqliteBasics !== sqliteBasics && databaseName !== SQLITE_IN_MEMORY_DB_NAME) {
            throw new Error('opened db with different creator method ' + databaseName + ' ' + state.sqliteBasics.debugId + ' ' + sqliteBasics.debugId);
        }
        state.openConnections = state.openConnections + 1;
    }
    return state.database;
}

export function closeDatabaseConnection(
    databaseName: string,
    sqliteBasics: SQLiteBasics<any>
): MaybePromise<void> {
    const state = DATABASE_STATE_BY_NAME.get(databaseName);
    if (state) {
        state.openConnections = state.openConnections - 1;
        if (state.openConnections === 0) {
            DATABASE_STATE_BY_NAME.delete(databaseName);
            return state.database.then(db => sqliteBasics.close(db));
        }
    }
}

export function getDataFromResultRow(row: SQLResultRow): string {
    if (!row) {
        return row;
    }
    if (Array.isArray(row)) {
        if (row[4]) {
            return row[4];
        } else {
            return row[0];
        }
    } else {
        return row.data;
    }
}

export function getSQLiteInsertSQL<RxDocType>(
    collectionName: string,
    primaryPath: keyof RxDocType,
    docData: RxDocumentData<RxDocType>
): SQLiteQueryWithParams {
    // language=SQL
    const query = `
        INSERT INTO "${collectionName}" (
            id,
            revision,
            deleted,
            lastWriteTime,
            data
        ) VALUES (
            ?,
            ?,
            ?,
            ?,
            ?
        );
    `;
    const params = [
        docData[primaryPath] as string,
        docData._rev,
        docData._deleted ? 1 : 0,
        docData._meta.lwt,
        JSON.stringify(docData)
    ];
    return {
        query,
        params,
        context: {
            method: 'getSQLiteInsertSQL',
            data: {
                collectionName,
                primaryPath
            }
        }
    };
}

export function getSQLiteUpdateSQL<RxDocType>(
    tableName: string,
    primaryPath: keyof RxDocType,
    writeRow: BulkWriteRow<RxDocType>
): SQLiteQueryWithParams {
    const docData = writeRow.document;
    // language=SQL
    const query = `
    UPDATE "${tableName}"
    SET 
        revision = ?,
        deleted = ?,
        lastWriteTime = ?,
        data = json(?)
    WHERE
        id = ?
    `;
    const params = [
        docData._rev,
        docData._deleted ? 1 : 0,
        docData._meta.lwt,
        JSON.stringify(docData),
        docData[primaryPath] as string,
    ];
    return {
        query,
        params,
        context: {
            method: 'getSQLiteUpdateSQL',
            data: {
                tableName,
                primaryPath
            }
        }
    };
};


const TX_QUEUE_BY_DATABASE: WeakMap<SQLiteDatabaseClass, Promise<void>> = new WeakMap();
export function sqliteTransaction(
    database: SQLiteDatabaseClass,
    sqliteBasics: SQLiteBasics<any>,
    handler: () => Promise<'COMMIT' | 'ROLLBACK'>,
    /**
     * Context will be logged
     * if the commit does error.
     */
    context?: any
) {
    let queue = TX_QUEUE_BY_DATABASE.get(database);
    if (!queue) {
        queue = PROMISE_RESOLVE_VOID;
    }
    queue = queue.then(async () => {
        await openSqliteTransaction(database, sqliteBasics);
        const handlerResult = await handler();
        await finishSqliteTransaction(database, sqliteBasics, handlerResult, context);
    });
    TX_QUEUE_BY_DATABASE.set(database, queue);
    return queue;
}

/**
 * TODO instead of doing a while loop, we should find a way to listen when the
 * other transaction is committed.
 */
export async function openSqliteTransaction(
    database: SQLiteDatabaseClass,
    sqliteBasics: SQLiteBasics<any>
) {
    let openedTransaction = false;
    while (!openedTransaction) {
        try {
            await sqliteBasics.run(
                database,
                {
                    query: 'BEGIN;',
                    params: [],
                    context: {
                        method: 'openSqliteTransaction',
                        data: ''
                    }
                }
            );
            openedTransaction = true;
        } catch (err: any) {
            console.log('open transaction error (will retry):');
            const errorAsJson = errorToPlainJson(err);
            console.log(errorAsJson);
            console.dir(err);
            if (
                err.message && (
                    err.message.includes('Database is closed') ||
                    err.message.includes('API misuse')
                )
            ) {
                throw err;
            }
            // wait one tick to not fully block the cpu on errors.
            await promiseWait(0);
        }
    }
    return;
}
export function finishSqliteTransaction(
    database: SQLiteDatabaseClass,
    sqliteBasics: SQLiteBasics<any>,
    mode: 'COMMIT' | 'ROLLBACK',
    /**
     * Context will be logged
     * if the commit does error.
     */
    context?: any
) {
    return sqliteBasics.run(
        database,
        {
            query: mode + ';',
            params: [],
            context: {
                method: 'finishSqliteTransaction',
                data: mode
            }
        }
    ).catch(err => {
        if (context) {
            console.error('cannot close transaction (mode: ' + mode + ')');
            console.log(JSON.stringify(context, null, 4));
        }
        throw err;
    });
}


export const PARAM_KEY = '?';


export function ensureParamsCountIsCorrect(queryWithParams: SQLiteQueryWithParams) {
    const paramsCount = queryWithParams.params.length;
    const paramKeyCount = queryWithParams.query.split(PARAM_KEY).length - 1;
    if (paramsCount !== paramKeyCount) {
        throw new Error('ensureParamsCountIsCorrect() wrong param count: ' + JSON.stringify(queryWithParams));
    }
}

/**
 * SQLite itself does not know about boolean types
 * and uses integers instead.
 * So some libraries need to bind integers and fail on booleans.
 * @link https://stackoverflow.com/a/2452569/3443137
 * This method transforms all boolean params to the
 * correct int representation.
 */
export function boolParamsToInt(params: any[]): any[] {
    return params.map(p => {
        if (typeof p === 'boolean') {
            if (p) {
                return 1;
            } else {
                return 0;
            }
        } else {
            return p;
        }
    });
}
