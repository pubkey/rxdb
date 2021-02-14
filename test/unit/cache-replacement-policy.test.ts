import assert from 'assert';
import config from './config';
import AsyncTestUtil, { wait } from 'async-test-util';

import * as humansCollection from '../helper/humans-collection';
import * as schemaObjects from '../helper/schema-objects';
import {
    defaultCacheReplacementPolicyMonad,
    countRxQuerySubscribers,
    RxCollection,
    QueryCache,
    triggerCacheReplacement,
} from '../../plugins/core';
import { Subscription } from 'rxjs';

config.parallel('cache-replacement-policy.test.js', () => {
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

            await col.insert(schemaObjects.human());
            const res = await uncachedQuery.exec();
            assert.strictEqual(res.length, 1);
            col.database.destroy();
        });
        it('should still emit on new results', async () => {
            const col = await humansCollection.create(0);
            const uncachedQuery = col.find();
            await uncachedQuery.exec();

            const emitted: any[][] = [];
            const sub = uncachedQuery.$.subscribe((x: any) => emitted.push(x));
            clearQueryCache(col);

            await AsyncTestUtil.waitUntil(() => emitted.length === 1);
            await col.insert(schemaObjects.human());
            await AsyncTestUtil.waitUntil(() => emitted.length === 2);
            sub.unsubscribe();
            col.database.destroy();
        });
    });
    describe('.countRxQuerySubscribers()', () => {
        it('should have the correct amount', async () => {
            const col = await humansCollection.create(0);
            const subs: Subscription[] = [];

            const noSub = col.find({
                selector: {
                    foo: 'bar1'
                }
            });
            const oneSub = col.find({
                selector: {
                    foo: 'bar2'
                }
            });
            subs.push(oneSub.$.subscribe());
            const twoSub = col.find({
                selector: {
                    foo: 'bar3'
                }
            });
            subs.push(twoSub.$.subscribe());
            subs.push(twoSub.$.subscribe());

            const stillOneSub = col.find({
                selector: {
                    foo: 'bar4'
                }
            });
            subs.push(stillOneSub.$.subscribe());
            const removeAgain = stillOneSub.$.subscribe();
            removeAgain.unsubscribe();

            assert.strictEqual(countRxQuerySubscribers(noSub), 0);
            assert.strictEqual(countRxQuerySubscribers(oneSub), 1);
            assert.strictEqual(countRxQuerySubscribers(twoSub), 2);
            assert.strictEqual(countRxQuerySubscribers(stillOneSub), 1);

            subs.forEach(sub => sub.unsubscribe());
            col.database.destroy();
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
                    foo: 'bar'
                }
            });
            // have one with subscription
            const sub = col.find({
                selector: {
                    foo: 'bar2'
                }
            }).$.subscribe();

            defaultCacheReplacementPolicyMonad(0, 0)(col, col._queryCache);

            sub.unsubscribe();
            col.database.destroy();
        });
        it('should not remove queries that have subscribers', async () => {
            const amount = 4;
            const col = await humansCollection.create(0);
            const subs: Subscription[] = new Array(amount).fill(0).map((_v, i) => {
                return col.find({
                    selector: {
                        foo: 'bar' + i
                    }
                }).$.subscribe();
            });

            defaultCacheReplacementPolicyMonad(0, 0)(col, col._queryCache);

            const cachedQueries = Array.from(col._queryCache._map.values());
            assert.strictEqual(cachedQueries.length, amount);


            subs.forEach(sub => sub.unsubscribe());
            col.database.destroy();
        });
        it('should remove the unexecuted ones after unExecutedLifetime', async () => {
            const amount = 4;
            const col = await humansCollection.create(0);

            new Array(amount).fill(0).map((_v, i) => {
                return col.find({
                    selector: {
                        foo: 'bar' + i
                    }
                });
            });

            await wait(10);
            defaultCacheReplacementPolicyMonad(0, 0)(col, col._queryCache);
            const cachedQueries = Array.from(col._queryCache._map.values());
            assert.strictEqual(cachedQueries.length, 0);

            col.database.destroy();
        });
        it('should remove the oldest ones', async () => {
            const col = await humansCollection.create(0);
            const amount = 10;
            await Promise.all(
                new Array(amount).fill(0)
                    .map(async (_v, i) => {
                        const q = col.find({
                            selector: {
                                foo: 'old-bar' + i
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
                            foo: 'new-bar' + i
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

            col.database.destroy();
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

            await wait(150);
            assert.strictEqual(runs, 1);

            // run again when first was done
            triggerCacheReplacement(col);
            await wait(20);
            assert.strictEqual(runs, 2);

            col.database.destroy();
        });
    });
});
