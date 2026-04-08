import assert from 'assert';
import React from 'react';
import { renderHook, act, waitFor } from '@testing-library/react';
import { Subject } from 'rxjs';

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
import { replicateRxCollection } from '../../plugins/replication/index.mjs';

import {
    RxDatabaseProvider,
    useRxDatabase,
    useRxQuery,
    useLiveRxQuery,
    useRxDocument,
    useReplicationStatus,
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

    describe('useRxDocument', () => {
        it('should start with loading=true and result=null', async () => {
            const db = await createDatabase();
            const collection: RxCollection<SimpleHumanDocumentType> = db.collections.humans;
            const { result } = renderHook(
                () => useRxDocument(collection, 'non-existent-id'),
                { wrapper: createWrapper(db) }
            );
            assert.strictEqual(result.current.loading, true);
            assert.strictEqual(result.current.result, null);
            await db.close();
        });

        it('should return null when document does not exist', async () => {
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

        it('should return document when it exists', async () => {
            const db = await createDatabase();
            const collection: RxCollection<SimpleHumanDocumentType> = db.collections.humans;
            const human = schemaObjects.simpleHumanAge();
            await collection.insert(human);
            const { result } = renderHook(
                () => useRxDocument(collection, human.passportId),
                { wrapper: createWrapper(db) }
            );
            await waitFor(() => {
                assert.ok(result.current.result);
            });
            assert.strictEqual(
                result.current.result.passportId,
                human.passportId
            );
            assert.strictEqual(result.current.loading, false);
            assert.strictEqual(result.current.error, null);
            await db.close();
        });

        it('should update when document changes', async () => {
            const db = await createDatabase();
            const collection: RxCollection<SimpleHumanDocumentType> = db.collections.humans;
            const human = schemaObjects.simpleHumanAge();
            const doc = await collection.insert(human);
            const { result } = renderHook(
                () => useRxDocument(collection, human.passportId),
                { wrapper: createWrapper(db) }
            );
            await waitFor(() => {
                assert.ok(result.current.result);
            });
            const newAge = String(Number(human.age) + 1);
            await act(async () => {
                await doc.incrementalPatch({ age: newAge });
            });
            await waitFor(() => {
                assert.strictEqual(
                    result.current.result?.age,
                    newAge
                );
            });
            await db.close();
        });

        it('should return null after document is removed', async () => {
            const db = await createDatabase();
            const collection: RxCollection<SimpleHumanDocumentType> = db.collections.humans;
            const human = schemaObjects.simpleHumanAge();
            const doc = await collection.insert(human);
            const { result } = renderHook(
                () => useRxDocument(collection, human.passportId),
                { wrapper: createWrapper(db) }
            );
            await waitFor(() => {
                assert.ok(result.current.result);
            });
            await act(async () => {
                await doc.remove();
            });
            await waitFor(() => {
                assert.strictEqual(result.current.result, null);
            });
            await db.close();
        });

        it('should do nothing when collection is null', () => {
            const { result } = renderHook(
                () => useRxDocument(null, 'some-id')
            );
            assert.strictEqual(result.current.result, null);
            assert.strictEqual(result.current.loading, false);
        });
    });

    describe('useReplicationStatus', () => {
        it('should return default state when replicationState is null', () => {
            const { result } = renderHook(
                () => useReplicationStatus(null)
            );
            assert.strictEqual(result.current.syncing, false);
            assert.strictEqual(result.current.error, null);
            assert.strictEqual(result.current.lastSyncedAt, null);
            assert.strictEqual(result.current.canceled, false);
        });

        it('should reflect syncing state from active$', async () => {
            const db = await createDatabase();
            const collection: RxCollection<SimpleHumanDocumentType> = db.collections.humans;
            const pullStream$ = new Subject<any>();
            const replicationState = replicateRxCollection({
                collection,
                replicationIdentifier: randomToken(10),
                pull: {
                    handler: () => Promise.resolve({
                        documents: [],
                        checkpoint: null
                    }),
                    stream$: pullStream$.asObservable()
                }
            });
            const { result } = renderHook(
                () => useReplicationStatus(replicationState)
            );
            await waitFor(() => {
                assert.strictEqual(result.current.syncing, false);
            });
            assert.strictEqual(result.current.error, null);
            assert.strictEqual(result.current.canceled, false);
            await replicationState.cancel();
            await db.close();
        });

        it('should set canceled=true after replication is canceled', async () => {
            const db = await createDatabase();
            const collection: RxCollection<SimpleHumanDocumentType> = db.collections.humans;
            const pullStream$ = new Subject<any>();
            const replicationState = replicateRxCollection({
                collection,
                replicationIdentifier: randomToken(10),
                pull: {
                    handler: () => Promise.resolve({
                        documents: [],
                        checkpoint: null
                    }),
                    stream$: pullStream$.asObservable()
                }
            });
            const { result } = renderHook(
                () => useReplicationStatus(replicationState)
            );
            await act(async () => {
                await replicationState.cancel();
            });
            await waitFor(() => {
                assert.strictEqual(result.current.canceled, true);
            });
            await db.close();
        });
    });
});
