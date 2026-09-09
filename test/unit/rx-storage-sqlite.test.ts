import assert from 'assert';
import './config.ts';

import {
    addRxPlugin,
    createRxDatabase,
    promiseWait,
    randomToken
} from '../../plugins/core/index.mjs';
import { isNode } from '../../plugins/test-utils/index.mjs';
import { RxDBMigrationPlugin } from '../../plugins/migration-schema/index.mjs';
import { wrappedValidateAjvStorage } from '../../plugins/validate-ajv/index.mjs';
import {
    getRxStorageSQLiteTrial,
    getSQLiteBasicsNodeNative
} from '../../plugins/storage-sqlite/index.mjs';
import type {
    SQLiteBasics,
    SQLiteQueryWithParams
} from '../../plugins/storage-sqlite/index.mjs';

type ConcurrencyTracker = {
    basics: SQLiteBasics<any>;
    /**
     * Contains one entry for each statement that was started
     * while at least one other statement was still running
     * on the same connection.
     */
    overlaps: string[];
};

/**
 * Wraps a SQLiteBasics so that every statement takes at least one tick,
 * like it does on react-native adapters like expo-sqlite where each
 * statement is sent over an async bridge to the native side.
 * All statements that run at the same time on the same connection
 * are tracked, so a test can detect statements that do not go
 * through TX_QUEUE_BY_DATABASE.
 */
function getConcurrencyTrackingBasics(
    basics: SQLiteBasics<any>
): ConcurrencyTracker {
    const overlaps: string[] = [];
    const runningByConnection: WeakMap<any, Map<number, string>> = new WeakMap();
    let statementId = 0;

    function track<T>(
        database: any,
        queryWithParams: SQLiteQueryWithParams,
        operation: () => Promise<T>
    ): Promise<T> {
        let running = runningByConnection.get(database);
        if (!running) {
            running = new Map();
            runningByConnection.set(database, running);
        }
        const runningStatements = running;
        const query = queryWithParams.query;
        if (runningStatements.size > 0) {
            overlaps.push(
                query + ' ran at the same time as: ' +
                Array.from(runningStatements.values()).join(' , ')
            );
        }
        const id = statementId++;
        runningStatements.set(id, query);
        return (async () => {
            try {
                await promiseWait(0);
                return await operation();
            } finally {
                runningStatements.delete(id);
            }
        })();
    }

    return {
        overlaps,
        basics: Object.assign({}, basics, {
            all: (database: any, queryWithParams: SQLiteQueryWithParams) => track(
                database,
                queryWithParams,
                () => basics.all(database, queryWithParams)
            ),
            run: (database: any, queryWithParams: SQLiteQueryWithParams) => track(
                database,
                queryWithParams,
                () => basics.run(database, queryWithParams)
            )
        })
    };
}

const HEROES_SCHEMA_V0 = {
    version: 0,
    primaryKey: 'id',
    type: 'object',
    properties: {
        id: {
            type: 'string',
            maxLength: 100
        },
        name: {
            type: 'string'
        }
    },
    required: ['id', 'name']
} as const;

const HEROES_SCHEMA_V1 = {
    version: 1,
    primaryKey: 'id',
    type: 'object',
    properties: {
        id: {
            type: 'string',
            maxLength: 100
        },
        name: {
            type: 'string'
        },
        age: {
            type: 'number'
        }
    },
    required: ['id', 'name']
} as const;

describe('rx-storage-sqlite.test.ts', function () {
    this.timeout(1000 * 60);

    if (!isNode) {
        // the node:sqlite module is only available in Node.js
        return;
    }

    addRxPlugin(RxDBMigrationPlugin);

    async function getTracker(): Promise<ConcurrencyTracker> {
        const DatabaseSync = await import('node:sqlite').then(module => module.DatabaseSync);
        return getConcurrencyTrackingBasics(getSQLiteBasicsNodeNative(DatabaseSync));
    }

    describe('issue #9024', () => {
        /**
         * The SQLite RxStorage shares one connection between all storage
         * instances of a database and serializes the statements with
         * TX_QUEUE_BY_DATABASE. Async single-connection adapters like
         * expo-sqlite throw SQLITE_LOCKED "database is locked" when two
         * statements run on that connection at the same time, so the
         * cleanup at the end of a schema migration must not remove the old
         * storage and the migration meta storage in parallel.
         * @link https://github.com/pubkey/rxdb/issues/9024
         */
        it('must not run the DROP TABLE of a migration at the same time as other statements', async () => {
            const tracker = await getTracker();
            const storage = wrappedValidateAjvStorage({
                storage: getRxStorageSQLiteTrial({
                    sqliteBasics: tracker.basics,
                    databaseNamePrefix: './test_tmp/'
                })
            });
            const databaseName = 'migration-drop-table-' + randomToken(10);

            const dbV0 = await createRxDatabase({
                name: databaseName,
                storage,
                multiInstance: false
            });
            await dbV0.addCollections({
                heroes: {
                    schema: HEROES_SCHEMA_V0
                }
            });
            await dbV0.heroes.insert({
                id: 'hero-1',
                name: 'alice'
            });
            await dbV0.close();

            /**
             * Only the statements of the migration itself are relevant here.
             */
            tracker.overlaps.length = 0;

            const dbV1 = await createRxDatabase({
                name: databaseName,
                storage,
                multiInstance: false
            });
            await dbV1.addCollections({
                heroes: {
                    schema: HEROES_SCHEMA_V1,
                    autoMigrate: true,
                    migrationStrategies: {
                        1: (doc: any) => {
                            doc.age = 10;
                            return doc;
                        }
                    }
                }
            });

            const docs = await dbV1.heroes.find().exec();
            assert.strictEqual(docs.length, 1);
            assert.strictEqual(docs[0].age, 10);

            /**
             * Reading in parallel is fine, only the statements that
             * drop a table must not overlap with anything else.
             */
            const dropTableOverlaps = tracker.overlaps.filter(overlap => overlap.includes('DROP TABLE'));
            assert.deepStrictEqual(
                dropTableOverlaps,
                [],
                'DROP TABLE must not run at the same time as another statement on the same connection'
            );

            await dbV1.close();
        });
    });
});
