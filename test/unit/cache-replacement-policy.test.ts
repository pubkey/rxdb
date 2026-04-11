import assert from 'assert';
import AsyncTestUtil, { wait, waitUntil } from 'async-test-util';
import { describeParallel } from './config.ts';
import {
    schemaObjects,
    humansCollection
} from '../../plugins/test-utils/index.mjs';
import {
    defaultCacheReplacementPolicyMonad,
    countRxQuerySubscribers,
    RxCollection,
    QueryCache,
    triggerCacheReplacement,
    RxQuery,
} from '../../plugins/core/index.mjs';
import { BehaviorSubject, Subscription } from 'rxjs';
import { mergeMap, shareReplay, switchMap } from 'rxjs/operators';

describeParallel('cache-replacement-policy.test.js', () => {
    function clearQueryCache(collection: RxCollection) {
        const queryCache = collection._queryCache;
        queryCache._map = new Map();
    }

    // before we start clearing the cache, we should ensure a cleared query behaves as intended
    describe('uncached RxQuery', () => {
        it('should still get the correct results on exec', async () => {
            const col = await humansCollection.create(0);
            const uncachedQuery = col.find();
            await uncachedQuery.exec();
            clearQueryCache(col);

            await col.insert(schemaObjects.humanData());
            const res = await uncachedQuery.exec();
            assert.strictEqual(res.length, 1);
            col.database.close();
        });
        it('should still emit on new results', async () => {
            const col = await humansCollection.create(0);
            const uncachedQuery = col.find();
            await uncachedQuery.exec();

            const emitted: any[][] = [];
            const sub = uncachedQuery.$.subscribe((x: any) => emitted.push(x));
            clearQueryCache(col);

            await AsyncTestUtil.waitUntil(() => emitted.length === 1);
            await col.insert(schemaObjects.humanData());
            await AsyncTestUtil.waitUntil(() => emitted.length === 2);
            sub.unsubscribe();
            col.database.close();
        });
    });
    describe('.countRxQuerySubscribers()', () => {
        it('should have the correct amount', async () => {
            const col = await humansCollection.create(0);
            const subs: Subscription[] = [];

            const noSub = col.find({
                selector: {
                    firstName: 'bar1'
                }
            });
            const oneSub = col.find({
                selector: {
                    firstName: 'bar2'
                }
            });
            subs.push(oneSub.$.subscribe());
            const twoSub = col.find({
                selector: {
                    firstName: 'bar3'
                }
            });
            subs.push(twoSub.$.subscribe());
            subs.push(twoSub.$.subscribe());

            const stillOneSub = col.find({
                selector: {
                    firstName: 'bar4'
                }
            });
            subs.push(stillOneSub.$.subscribe());
            const removeAgain = stillOneSub.$.subscribe();
            removeAgain.unsubscribe();

            const noMoreSub = col.find({
                selector: {
                    firstName: 'bar5'
                }
            });
            const removeMe = noMoreSub.$.subscribe();
            removeMe.unsubscribe();


            assert.strictEqual(countRxQuerySubscribers(noSub), 0);
            assert.strictEqual(countRxQuerySubscribers(oneSub), 1);
            assert.strictEqual(countRxQuerySubscribers(twoSub), 2);
            assert.strictEqual(countRxQuerySubscribers(stillOneSub), 1);
            assert.strictEqual(countRxQuerySubscribers(noMoreSub), 0);

            subs.forEach(sub => sub.unsubscribe());
            col.database.close();
        });
        it('BUG wrong count when used with switch map', async () => {
            const col = await humansCollection.create(0);
            const root$ = new BehaviorSubject(1);
            let query: RxQuery | null = null;
            const nested = root$.pipe(
                mergeMap((id: number) => {
                    return Promise.resolve(id);
                }),
                switchMap(() => {
                    query = col.findOne('foobar');
                    return query.$;
                }),
                /**
                 * This shareReplay made
                 * having countRxQuerySubscribers() return more than 0
                 * we have to set refCount: true so it will unsubscribe from the root
                 * when has no longer any subscribing children.
                 * @link https://cartant.medium.com/rxjs-whats-changed-with-sharereplay-65c098843e95
                 */
                shareReplay({
                    bufferSize: 1,
                    refCount: true
                })
            );
            let emitted = 0;
            const sub = nested.subscribe(() => emitted++);
            await waitUntil(() => !!query && emitted === 1);

            if (!query) {
                throw new Error('query undefined');
            }

            sub.unsubscribe();
            assert.strictEqual(countRxQuerySubscribers(query), 0);

            col.database.close();
        });
    });
    describe('.defaultCacheReplacementPolicyMonad()', () => {
        it('should not crash', async () => {
            const col = await humansCollection.create(0);
            // exec one query
            await col.find().exec();
            // have one unexecuted
            col.find({
                selector: {
                    firstName: 'bar'
                }
            });
            // have one with subscription
            const sub = col.find({
                selector: {
                    firstName: 'bar2'
                }
            }).$.subscribe();

            defaultCacheReplacementPolicyMonad(0, 0)(col, col._queryCache);

            sub.unsubscribe();
            col.database.close();
        });
        it('should not remove queries that have subscribers', async () => {
            const amount = 4;
            const col = await humansCollection.create(0);
            const subs: Subscription[] = new Array(amount).fill(0).map((_v, i) => {
                return col.find({
                    selector: {
                        firstName: 'bar' + i
                    }
                }).$.subscribe();
            });

            defaultCacheReplacementPolicyMonad(0, 0)(col, col._queryCache);

            const cachedQueries = Array.from(col._queryCache._map.values());
            assert.strictEqual(cachedQueries.length, amount);


            subs.forEach(sub => sub.unsubscribe());
            col.database.remove();
        });
        it('should remove the unexecuted ones after unExecutedLifetime', async () => {
            const amount = 4;
            const col = await humansCollection.create(0);

            new Array(amount).fill(0).map((_v, i) => {
                return col.find({
                    selector: {
                        firstName: 'bar' + i
                    }
                });
            });

            await wait(10);
            defaultCacheReplacementPolicyMonad(0, 0)(col, col._queryCache);
            const cachedQueries = Array.from(col._queryCache._map.values());
            assert.strictEqual(cachedQueries.length, 0);

            col.database.remove();
        });
        it('should evict executed unsubscribed queries when subscribed queries push total cache over tryToKeepMax', async () => {
            const tryToKeepMax = 5;
            const col = await humansCollection.create(0);

            // Set no-op policy to prevent automatic cleanup during setup
            col.cacheReplacementPolicy = () => { };

            // Create 6 subscribed queries (more than tryToKeepMax alone)
            const subs: Subscription[] = [];
            for (let i = 0; i < 6; i++) {
                subs.push(col.find({
                    selector: { firstName: 'sub' + i }
                }).$.subscribe());
            }

            // Create 3 executed queries without subscribers
            const executedQueries: RxQuery[] = [];
            for (let i = 0; i < 3; i++) {
                const q = col.find({
                    selector: { firstName: 'exec' + i }
                });
                await q.exec();
                executedQueries.push(q);
            }

            // Total in cache: 6 subscribed + 3 executed = 9 > tryToKeepMax (5)
            // After policy: subscribed queries cannot be removed,
            // so the 3 executed unsubscribed ones should be evicted.

            // Wait for any pending automatic cache replacement to finish
            await wait(500);

            // Set the real policy and trigger
            let policyRan = false;
            const realPolicy = defaultCacheReplacementPolicyMonad(tryToKeepMax, 0);
            col.cacheReplacementPolicy = (collection, queryCache) => {
                realPolicy(collection, queryCache);
                policyRan = true;
            };

            triggerCacheReplacement(col);
            await waitUntil(() => policyRan);

            // Re-create the same queries.
            // If properly evicted, these will be NEW objects (different reference).
            // If the bug is present, they stay cached (same reference).
            for (let i = 0; i < 3; i++) {
                const newQ = col.find({
                    selector: { firstName: 'exec' + i }
                });
                assert.notStrictEqual(
                    newQ,
                    executedQueries[i],
                    'Expected executed query exec' + i + ' to be evicted from cache'
                );
            }

            subs.forEach(sub => sub.unsubscribe());
            col.database.close();
        });
        it('should remove the oldest ones', async () => {
            const col = await humansCollection.create(0);
            const amount = 10;
            await Promise.all(
                new Array(amount).fill(0)
                    .map(async (_v, i) => {
                        const q = col.find({
                            selector: {
                                passportId: 'old-bar' + i
                            }
                        });
                        await q.exec();
                        return q;
                    })
            );
            await wait(10);
            const newerQueries = await Promise.all(
                new Array(amount).fill(0).map(async (_v, i) => {
                    const q = col.find({
                        selector: {
                            passportId: 'new-bar' + i
                        }
                    });
                    await q.exec();
                    return q;
                })
            );

            defaultCacheReplacementPolicyMonad(amount, 0)(col, col._queryCache);
            const cachedQueries = Array.from(col._queryCache._map.values());
            assert.deepStrictEqual(cachedQueries, newerQueries);
            assert.strictEqual(cachedQueries.length, amount);

            col.database.remove();
        });
    });
    describe('.triggerCacheReplacement()', () => {
        it('should run exactly once', async () => {
            const col = await humansCollection.create(0);

            let runs = 0;
            const policy = defaultCacheReplacementPolicyMonad(0, 0);
            function trackingPolicy(
                collection: RxCollection,
                queryCache: QueryCache
            ) {
                runs = runs + 1;
                policy(collection, queryCache);
            }
            col.cacheReplacementPolicy = trackingPolicy;

            new Array(5).fill(0).forEach(() => {
                triggerCacheReplacement(col);
            });

            await waitUntil(() => {
                if (runs > 1) {
                    throw new Error('too many runs ' + runs);
                }
                if (runs === 1) {
                    return true;
                } else {
                    return false;
                }
            });
            assert.strictEqual(runs, 1);

            // run again when first was done
            triggerCacheReplacement(col);
            await waitUntil(() => {
                if (runs > 2) {
                    throw new Error('too many runs ' + runs);
                }
                if (runs === 2) {
                    return true;
                } else {
                    return false;
                }
            });
            assert.strictEqual(runs, 2);

            col.database.remove();
        });
    });
});
