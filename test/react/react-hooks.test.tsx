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
import { replicateRxCollection } from '../../plugins/replication/index.mjs';

import {
    RxDatabaseProvider,
    useRxDatabase,
    useRxDocument,
    useRxQuery,
    useLiveRxQuery,
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

    describe('useReplicationStatus', () => {
        it('should clear the error after the replication has recovered', async () => {
            const db = await createDatabase();
            const collection: RxCollection<SimpleHumanDocumentType> = db.collections.humans;
            let fail = true;
            const replicationState = replicateRxCollection<SimpleHumanDocumentType, { id: string; } | undefined>({
                collection,
                replicationIdentifier: 'recovering-' + randomToken(10),
                live: true,
                retryTime: 20,
                pull: {
                    handler: (checkpoint) => {
                        if (fail) {
                            return Promise.reject(new Error('offline'));
                        }
                        return Promise.resolve({ documents: [], checkpoint });
                    }
                }
            });
            const { result } = renderHook(() => useReplicationStatus(replicationState));

            await waitFor(() => {
                assert.ok(result.current.error);
            });

            fail = false;
            await act(async () => {
                await replicationState.awaitInSync();
            });
            await waitFor(() => {
                assert.strictEqual(result.current.syncing, false);
                assert.strictEqual(result.current.error ? result.current.error.code : null, null);
            });

            await replicationState.cancel();
            await db.close();
        });

        it('should clear the error of a handler call that was retried when the replication gets idle', async () => {
            const db = await createDatabase();
            await db.addCollections({
                server: {
                    schema: schemas.simpleHuman
                }
            });
            const collection: RxCollection<SimpleHumanDocumentType> = db.collections.humans;
            const serverCollection: RxCollection<SimpleHumanDocumentType> = db.collections.server;
            await serverCollection.insert({ passportId: 'existing', age: '20' });

            /**
             * The handler rejects once with a plain Error
             * or with the RxError of a failed write to another collection.
             * The replication calls the handler again, the second call works.
             */
            type FailingHandler = {
                direction: 'pull' | 'push';
                errorKind: 'error' | 'rxerror';
                /**
                 * An RxError that is rejected by the push handler is emitted unchanged,
                 * so it cannot be told apart from an error that is not retried.
                 * It is kept until a later replication cycle has run without an error.
                 */
                errorCodeWhenIdle: string | null;
            };
            const failingHandlers: FailingHandler[] = [
                { direction: 'pull', errorKind: 'error', errorCodeWhenIdle: null },
                { direction: 'pull', errorKind: 'rxerror', errorCodeWhenIdle: null },
                { direction: 'push', errorKind: 'error', errorCodeWhenIdle: null },
                { direction: 'push', errorKind: 'rxerror', errorCodeWhenIdle: 'CONFLICT' }
            ];
            for (const failingHandler of failingHandlers) {
                const name = failingHandler.direction + '-' + failingHandler.errorKind;
                let fail: 'pull' | 'push' | null = null;
                const failOnce = async (direction: 'pull' | 'push') => {
                    if (fail !== direction) {
                        return;
                    }
                    fail = null;
                    if (failingHandler.errorKind === 'rxerror') {
                        await serverCollection.insert({ passportId: 'existing', age: '20' });
                    }
                    throw new Error('offline');
                };
                const replicationState = replicateRxCollection<SimpleHumanDocumentType, { id: string; } | undefined>({
                    collection,
                    replicationIdentifier: 'handler-' + name + '-' + randomToken(10),
                    live: true,
                    retryTime: 20,
                    pull: {
                        handler: async (checkpoint) => {
                            await failOnce('pull');
                            return { documents: [], checkpoint };
                        }
                    },
                    push: {
                        handler: async () => {
                            await failOnce('push');
                            return [];
                        }
                    }
                });
                const emittedErrorCodes: string[] = [];
                const errorSub = replicationState.error$.subscribe(err => emittedErrorCodes.push(err.code));
                const { result, unmount } = renderHook(() => useReplicationStatus(replicationState));
                await act(async () => {
                    await replicationState.awaitInSync();
                });
                assert.deepStrictEqual(emittedErrorCodes, [], name);

                fail = failingHandler.direction;
                await act(async () => {
                    if (failingHandler.direction === 'pull') {
                        replicationState.reSync();
                    } else {
                        await collection.insert({ passportId: name + '-first', age: '20' });
                    }
                    await replicationState.awaitInSync();
                });
                await waitFor(() => {
                    assert.strictEqual(result.current.syncing, false);
                    assert.strictEqual(
                        result.current.error ? result.current.error.code : null,
                        failingHandler.errorCodeWhenIdle,
                        name
                    );
                });
                assert.strictEqual(emittedErrorCodes.length, 1, name);

                await act(async () => {
                    await collection.insert({ passportId: name + '-second', age: '20' });
                    await replicationState.awaitInSync();
                });
                await waitFor(() => {
                    assert.strictEqual(result.current.syncing, false);
                    assert.strictEqual(result.current.error ? result.current.error.code : null, null, name);
                });
                assert.strictEqual(emittedErrorCodes.length, 1, name);

                errorSub.unsubscribe();
                unmount();
                await replicationState.cancel();
            }
            await db.close();
        });

        it('should not return the state of the previous replication when the replicationState changes', async () => {
            const db = await createDatabase();
            await db.addCollections({
                humans2: {
                    schema: schemas.simpleHuman
                }
            });
            const collection: RxCollection<SimpleHumanDocumentType> = db.collections.humans;
            const collection2: RxCollection<SimpleHumanDocumentType> = db.collections.humans2;

            const workingReplicationState = replicateRxCollection<SimpleHumanDocumentType, { id: string; } | undefined>({
                collection: collection2,
                replicationIdentifier: 'working-' + randomToken(10),
                live: true,
                pull: {
                    handler: (checkpoint) => Promise.resolve({ documents: [], checkpoint })
                }
            });
            await workingReplicationState.awaitInSync();

            /**
             * This replication pulls one document
             * and fails on each call afterwards.
             */
            let calls = 0;
            const failingReplicationState = replicateRxCollection<SimpleHumanDocumentType, { id: string; } | undefined>({
                collection,
                replicationIdentifier: 'failing-' + randomToken(10),
                live: true,
                retryTime: 20,
                pull: {
                    batchSize: 1,
                    handler: () => {
                        calls = calls + 1;
                        if (calls > 1) {
                            return Promise.reject(new Error('offline'));
                        }
                        return Promise.resolve({
                            documents: [{
                                passportId: 'pulled',
                                age: '20',
                                _deleted: false
                            }],
                            checkpoint: { id: 'pulled' }
                        });
                    }
                }
            });
            type Props = {
                replicationState: typeof failingReplicationState | null;
            };
            const initialProps: Props = { replicationState: failingReplicationState };
            const { result, rerender } = renderHook(
                (props: Props) => useReplicationStatus(props.replicationState),
                { initialProps }
            );
            await waitFor(() => {
                assert.ok(result.current.error);
                assert.ok(result.current.lastSyncedAt);
            });

            rerender({ replicationState: workingReplicationState });
            assert.deepStrictEqual({
                ...result.current,
                error: result.current.error ? result.current.error.code : null
            }, {
                syncing: false,
                error: null,
                lastSyncedAt: null,
                canceled: false
            });

            rerender({ replicationState: failingReplicationState });
            await waitFor(() => {
                assert.ok(result.current.error);
            });
            rerender({ replicationState: null });
            assert.deepStrictEqual({
                ...result.current,
                error: result.current.error ? result.current.error.code : null
            }, {
                syncing: false,
                error: null,
                lastSyncedAt: null,
                canceled: false
            });

            await failingReplicationState.cancel();
            await workingReplicationState.cancel();
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
