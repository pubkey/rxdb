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

        it('should not return the results of the previous collection with loading false', async () => {
            const db = await createDatabase();
            await db.addCollections({
                humans2: {
                    schema: schemas.simpleHuman
                }
            });
            const collection: RxCollection<SimpleHumanDocumentType> = db.collections.humans;
            const collection2: RxCollection<SimpleHumanDocumentType> = db.collections.humans2;
            await collection.insert({ passportId: 'first', age: '20' });
            await collection2.insert({ passportId: 'second', age: '20' });

            type Props = {
                collection: string | RxCollection<SimpleHumanDocumentType>;
                expected: string;
            };
            const propsLists: [Props, Props][] = [
                [
                    { collection, expected: 'first' },
                    { collection: collection2, expected: 'second' }
                ],
                [
                    { collection: 'humans', expected: 'first' },
                    { collection: 'humans2', expected: 'second' }
                ]
            ];
            for (const hook of [useRxQuery, useLiveRxQuery]) {
                for (const propsList of propsLists) {
                    /**
                     * Contains each render that returned loading=false
                     * together with other documents than the ones of its collection.
                     */
                    const wrongRenders: string[] = [];
                    const { result, rerender, unmount } = renderHook(
                        (props: Props) => {
                            const res = hook<SimpleHumanDocumentType>({
                                collection: props.collection,
                                query: allDocsQuery
                            });
                            const ids = res.results.map(doc => doc.passportId).join(',');
                            if (!res.loading && ids !== props.expected) {
                                wrongRenders.push(props.expected + ' got ' + ids);
                            }
                            return res;
                        },
                        {
                            wrapper: createWrapper(db),
                            initialProps: propsList[0]
                        }
                    );
                    await waitFor(() => {
                        assert.strictEqual(result.current.loading, false);
                    });

                    rerender(propsList[1]);
                    assert.deepStrictEqual(wrongRenders, []);
                    await waitFor(() => {
                        assert.strictEqual(result.current.loading, false);
                    });
                    assert.deepStrictEqual(result.current.results.map(doc => doc.passportId), ['second']);
                    assert.deepStrictEqual(wrongRenders, []);

                    unmount();
                }
            }

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

        it('should not return the document of the previous collection or primaryKey with loading false', async () => {
            const db = await createDatabase();
            await db.addCollections({
                humans2: {
                    schema: schemas.simpleHuman
                }
            });
            const collection: RxCollection<SimpleHumanDocumentType> = db.collections.humans;
            const collection2: RxCollection<SimpleHumanDocumentType> = db.collections.humans2;
            await collection.bulkInsert([
                { passportId: 'first', age: '20' },
                { passportId: 'second', age: '20' }
            ]);
            await collection2.insert({ passportId: 'first', age: '30' });

            type Props = {
                collection: RxCollection<SimpleHumanDocumentType> | null;
                primaryKey: string | undefined;
                expected: string | null;
            };
            const propsList: Props[] = [
                { collection, primaryKey: 'first', expected: 'first|20' },
                { collection, primaryKey: 'second', expected: 'second|20' },
                { collection, primaryKey: undefined, expected: null },
                { collection, primaryKey: 'missing', expected: null },
                { collection, primaryKey: 'first', expected: 'first|20' },
                { collection: collection2, primaryKey: 'first', expected: 'first|30' },
                { collection: null, primaryKey: 'first', expected: null }
            ];

            /**
             * Contains each render that returned loading=false
             * together with another result than the one of its collection and primaryKey.
             */
            const wrongRenders: string[] = [];
            const { result, rerender } = renderHook(
                (props: Props) => {
                    const res = useRxDocument(props.collection, props.primaryKey);
                    const doc = res.result ? res.result.passportId + '|' + res.result.age : null;
                    if (!res.loading && doc !== props.expected) {
                        wrongRenders.push(props.expected + ' got ' + doc);
                    }
                    return res;
                },
                {
                    wrapper: createWrapper(db),
                    initialProps: propsList[0]
                }
            );
            for (const props of propsList) {
                rerender(props);
                assert.deepStrictEqual(wrongRenders, []);
                await waitFor(() => {
                    assert.strictEqual(result.current.loading, false);
                });
                assert.strictEqual(
                    result.current.result ? result.current.result.passportId + '|' + result.current.result.age : null,
                    props.expected
                );
                assert.deepStrictEqual(wrongRenders, []);
            }

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
