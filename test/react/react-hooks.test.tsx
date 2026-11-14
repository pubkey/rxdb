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
    countRxQuerySubscribers,
} from '../../plugins/core/index.mjs';

import { RxDBDevModePlugin } from '../../plugins/dev-mode/index.mjs';
import { getRxStorageMemory } from '../../plugins/storage-memory/index.mjs';
import { wrappedValidateAjvStorage } from '../../plugins/validate-ajv/index.mjs';

import {
    RxDatabaseProvider,
    useRxDatabase,
    useRxCollection,
    useRxDocument,
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
    return function Wrapper({ children }: { children: React.ReactNode; }) {
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
                    wrapper: ({ children }: { children: React.ReactNode; }) => (
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

    describe('useRxCollection', () => {
        it('should return the collection by name', async () => {
            const db = await createDatabase();
            const { result } = renderHook(
                () => useRxCollection<SimpleHumanDocumentType>('humans'),
                { wrapper: createWrapper(db) }
            );
            await waitFor(() => {
                assert.strictEqual(result.current, db.collections.humans);
            });
            await db.close();
        });

        it('should not return the previous collection when the name changes to a collection that does not exist', async () => {
            const db = await createDatabase();
            const { result, rerender } = renderHook(
                (props: { name: string; }) => useRxCollection<SimpleHumanDocumentType>(props.name),
                {
                    wrapper: createWrapper(db),
                    initialProps: { name: 'humans' }
                }
            );
            await waitFor(() => {
                assert.strictEqual(result.current, db.collections.humans);
            });

            rerender({ name: 'humans2' });
            assert.strictEqual(result.current === null, true, 'must not return a collection for a name that does not exist');

            await act(async () => {
                await db.addCollections({
                    humans2: {
                        schema: schemas.simpleHuman
                    }
                });
            });
            await waitFor(() => {
                assert.strictEqual(result.current, db.collections.humans2);
            });

            await db.close();
        });

        it('should keep returning the current collection when the collection of a previous name is closed', async () => {
            const db = await createDatabase();
            await db.addCollections({
                humans2: {
                    schema: schemas.simpleHuman
                }
            });
            const humansCollection: RxCollection<SimpleHumanDocumentType> = db.collections.humans;
            const { result, rerender } = renderHook(
                (props: { name: string; }) => useRxCollection<SimpleHumanDocumentType>(props.name),
                {
                    wrapper: createWrapper(db),
                    initialProps: { name: 'humans' }
                }
            );
            await waitFor(() => {
                assert.strictEqual(result.current, humansCollection);
            });

            rerender({ name: 'humans2' });
            await waitFor(() => {
                assert.strictEqual(result.current, db.collections.humans2);
            });

            await act(async () => {
                await humansCollection.close();
            });
            assert.strictEqual(result.current === db.collections.humans2, true, 'must still return the collection of the current name');

            await db.close();
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

        /**
         * useLiveRxQuery must return unsubscribe from useEffect.
         * If the subscription is created inside an async callback,
         * React drops that cleanup and the live query stays subscribed
         * after unmount.
         * @link https://github.com/pubkey/rxdb/issues/8964
         */
        it('should unsubscribe from the live query when the hook is unmounted', async () => {
            const db = await createDatabase();
            const collection: RxCollection<SimpleHumanDocumentType> = db.collections.humans;

            const { result, unmount } = renderHook(
                () => useLiveRxQuery({
                    collection,
                    query: allDocsQuery
                }),
                { wrapper: createWrapper(db) }
            );

            await waitFor(() => {
                assert.strictEqual(result.current.loading, false);
            });

            const rxQuery = collection.find(allDocsQuery);
            assert.strictEqual(countRxQuerySubscribers(rxQuery), 1);

            unmount();

            assert.strictEqual(countRxQuerySubscribers(rxQuery), 0);

            await db.close();
        });
    });

    describe('useRxDocument', () => {
        it('should start with loading state as true when collection and primaryKey are provided', async () => {
            const db = await createDatabase();
            const collection: RxCollection<SimpleHumanDocumentType> = db.collections.humans;
            const doc = schemaObjects.simpleHumanAge();
            await collection.insert(doc);

            const { result } = renderHook(
                () => useRxDocument(collection, doc.passportId),
                { wrapper: createWrapper(db) }
            );

            /**
             * The initial loading state must be true because
             * the subscription has not resolved yet.
             * @link https://github.com/pubkey/rxdb/issues/8965
             */
            assert.strictEqual(result.current.loading, true);

            await db.close();
        });

        it('should start with loading state as false when collection is null', () => {
            const { result } = renderHook(
                () => useRxDocument(null as any, 'some-id')
            );
            assert.strictEqual(result.current.loading, false);
            assert.strictEqual(result.current.result, null);
        });

        it('should start with loading state as false when primaryKey is undefined', async () => {
            const db = await createDatabase();
            const collection: RxCollection<SimpleHumanDocumentType> = db.collections.humans;

            const { result } = renderHook(
                () => useRxDocument(collection, undefined),
                { wrapper: createWrapper(db) }
            );
            assert.strictEqual(result.current.loading, false);
            assert.strictEqual(result.current.result, null);

            await db.close();
        });

        it('should return the document and set loading to false after subscription resolves', async () => {
            const db = await createDatabase();
            const collection: RxCollection<SimpleHumanDocumentType> = db.collections.humans;
            const doc = schemaObjects.simpleHumanAge();
            await collection.insert(doc);

            const { result } = renderHook(
                () => useRxDocument(collection, doc.passportId),
                { wrapper: createWrapper(db) }
            );

            await waitFor(() => {
                assert.strictEqual(result.current.loading, false);
            });

            assert.strictEqual(result.current.result?.passportId, doc.passportId);
            assert.strictEqual(result.current.error, null);

            await db.close();
        });

        it('should return null result with loading false when document does not exist', async () => {
            const db = await createDatabase();
            const collection: RxCollection<SimpleHumanDocumentType> = db.collections.humans;

            const { result } = renderHook(
                () => useRxDocument(collection, 'non-existent-id'),
                { wrapper: createWrapper(db) }
            );

            await waitFor(() => {
                assert.strictEqual(result.current.loading, false);
            });

            assert.strictEqual(result.current.result, null);
            assert.strictEqual(result.current.error, null);

            await db.close();
        });
    });
});
