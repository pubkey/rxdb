import assert from 'assert';
import React from 'react';
import { renderHook, act, waitFor } from '@testing-library/react';

import {
    schemaObjects,
    schemas,
} from '../../plugins/test-utils/index.mjs';

import {
    createRxDatabase,
    randomToken,
    addRxPlugin,
    RxDatabase,
    RxCollection,
} from '../../plugins/core/index.mjs';

import { RxDBDevModePlugin } from '../../plugins/dev-mode/index.mjs';
import { getRxStorageMemory } from '../../plugins/storage-memory/index.mjs';
import { wrappedValidateAjvStorage } from '../../plugins/validate-ajv/index.mjs';

import {
    RxDatabaseProvider,
    useRxDatabase,
    useRxQuery,
    useLiveRxQuery,
} from '../../plugins/react/index.mjs';

addRxPlugin(RxDBDevModePlugin);

type SimpleHumanDocumentType = {
    passportId: string;
    age: string;
    oneOptional?: string;
};

async function createDatabase(): Promise<RxDatabase> {
    const db = await createRxDatabase({
        name: randomToken(10),
        storage: wrappedValidateAjvStorage({ storage: getRxStorageMemory() }),
    });
    await db.addCollections({
        humans: {
            schema: schemas.simpleHuman
        }
    });
    return db;
}

function createWrapper(db: RxDatabase) {
    return function Wrapper({ children }: { children: React.ReactNode }) {
        return <RxDatabaseProvider database={db}>{children}</RxDatabaseProvider>;
    };
}

describe('react-hooks.test.tsx', () => {
    /**
     * Query objects must be defined outside the renderHook callback
     * so they maintain the same reference across re-renders.
     * Otherwise, the useCallback dependency array in useRxQueryBase
     * sees a new query object each render and triggers an infinite loop.
     */
    const allDocsQuery = { selector: {} };

    describe('RxDatabaseProvider', () => {
        it('should throw when given an invalid database', () => {
            assert.throws(() => {
                renderHook(() => { }, {
                    wrapper: ({ children }: { children: React.ReactNode }) => (
                        <RxDatabaseProvider database={'not-a-db' as any}>{children}</RxDatabaseProvider>
                    )
                });
            });
        });
    });

    describe('useRxDatabase', () => {
        it('should return the database from context', async () => {
            const db = await createDatabase();
            const { result } = renderHook(() => useRxDatabase(), {
                wrapper: createWrapper(db)
            });
            assert.ok(result.current);
            assert.strictEqual(result.current.name, db.name);
            await db.close();
        });

        it('should throw when used outside of RxDatabaseProvider', () => {
            assert.throws(() => {
                renderHook(() => useRxDatabase());
            });
        });
    });

    describe('useRxQuery', () => {
        it('should start with loading state as true', async () => {
            const db = await createDatabase();
            const collection: RxCollection<SimpleHumanDocumentType> = db.collections.humans;
            const { result } = renderHook(
                () => useRxQuery({
                    collection,
                    query: allDocsQuery
                }),
                { wrapper: createWrapper(db) }
            );

            /**
             * The initial loading state must be true because
             * the query has not resolved yet.
             * @link https://github.com/pubkey/rxdb/pull/8292
             */
            assert.strictEqual(result.current.loading, true);

            await db.close();
        });

        it('should return results after query execution', async () => {
            const db = await createDatabase();
            const collection: RxCollection<SimpleHumanDocumentType> = db.collections.humans;

            await collection.insert(schemaObjects.simpleHumanAge());
            await collection.insert(schemaObjects.simpleHumanAge());

            const { result } = renderHook(
                () => useRxQuery({
                    collection,
                    query: allDocsQuery
                }),
                { wrapper: createWrapper(db) }
            );

            await waitFor(() => {
                assert.strictEqual(result.current.loading, false);
            });

            assert.strictEqual(result.current.results.length, 2);
            assert.strictEqual(result.current.error, null);

            await db.close();
        });

        it('should return empty results when collection is empty', async () => {
            const db = await createDatabase();
            const collection: RxCollection<SimpleHumanDocumentType> = db.collections.humans;

            const { result } = renderHook(
                () => useRxQuery({
                    collection,
                    query: allDocsQuery
                }),
                { wrapper: createWrapper(db) }
            );

            await waitFor(() => {
                assert.strictEqual(result.current.loading, false);
            });

            assert.strictEqual(result.current.results.length, 0);
            assert.strictEqual(result.current.error, null);

            await db.close();
        });

        it('should throw when given an invalid collection', () => {
            assert.throws(() => {
                renderHook(
                    () => useRxQuery({
                        collection: 'not-a-collection' as any,
                        query: allDocsQuery
                    })
                );
            });
        });
    });

    describe('useLiveRxQuery', () => {
        it('should start with loading state as true', async () => {
            const db = await createDatabase();
            const collection: RxCollection<SimpleHumanDocumentType> = db.collections.humans;
            const { result } = renderHook(
                () => useLiveRxQuery({
                    collection,
                    query: allDocsQuery
                }),
                { wrapper: createWrapper(db) }
            );

            /**
             * The initial loading state must be true.
             * @link https://github.com/pubkey/rxdb/pull/8292
             */
            assert.strictEqual(result.current.loading, true);

            await db.close();
        });

        it('should return results from a live query', async () => {
            const db = await createDatabase();
            const collection: RxCollection<SimpleHumanDocumentType> = db.collections.humans;

            await collection.insert(schemaObjects.simpleHumanAge());

            const { result } = renderHook(
                () => useLiveRxQuery({
                    collection,
                    query: allDocsQuery
                }),
                { wrapper: createWrapper(db) }
            );

            await waitFor(() => {
                assert.strictEqual(result.current.loading, false);
            });

            assert.strictEqual(result.current.results.length, 1);
            assert.strictEqual(result.current.error, null);

            await db.close();
        });

        it('should update results when documents are inserted', async () => {
            const db = await createDatabase();
            const collection: RxCollection<SimpleHumanDocumentType> = db.collections.humans;

            const { result } = renderHook(
                () => useLiveRxQuery({
                    collection,
                    query: allDocsQuery
                }),
                { wrapper: createWrapper(db) }
            );

            await waitFor(() => {
                assert.strictEqual(result.current.loading, false);
            });
            assert.strictEqual(result.current.results.length, 0);

            // insert a document and check that live query updates
            await act(async () => {
                await collection.insert(schemaObjects.simpleHumanAge());
            });

            await waitFor(() => {
                assert.strictEqual(result.current.results.length, 1);
            });
            assert.strictEqual(result.current.error, null);

            await db.close();
        });
    });
});
