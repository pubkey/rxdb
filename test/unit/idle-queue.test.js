import assert from 'assert';
import AsyncTestUtil from 'async-test-util';
import IdleQueue from '../../dist/lib/idle-queue';
import * as humansCollection from '../helper/humans-collection';
import * as schemaObjects from '../helper/schema-objects';

describe('idle-queue.test.js', () => {

    describe('statics', () => {
        describe('create()', () => {
            it('should create a queue', () => {
                const queue = IdleQueue.create();
                assert.ok(queue);
            });
        });
    });
    describe('instance', () => {
        describe('.lock()', () => {
            it('should get a unlock-function while increasing the _queueCounter', () => {
                const queue = IdleQueue.create();
                const unlock1 = queue.lock();
                const unlock2 = queue.lock();
                assert.equal(typeof unlock1, 'function');
                assert.equal(typeof unlock2, 'function');
                assert.equal(queue._queueCounter, 2);
            });
            it('should have the correct lock-amount queue', () => {
                const queue = IdleQueue.create();
                new Array(50)
                    .fill(0)
                    .map(() => queue.lock());
                assert.equal(queue._queueCounter, 50);
            });
        });
        describe('.unlock()', () => {
            it('should not crash when calling unlock', async() => {
                const queue = IdleQueue.create();
                const unlock = queue.lock();
                unlock();
            });
            it('should have an empty queue when unlocked', () => {
                const queue = IdleQueue.create();
                const unlocks = new Array(10)
                    .fill(0)
                    .map(() => queue.lock());
                assert.equal(queue._queueCounter, 10);
                unlocks.forEach(unlock => unlock());
                assert.equal(queue._queueCounter, 0);
            });
            it('should not contain the single unlocked nr', () => {
                const queue = IdleQueue.create();
                new Array(10)
                    .fill(0)
                    .map(() => queue.lock());
                const unlock = queue.lock();
                new Array(10)
                    .fill(0)
                    .map(() => queue.lock());

                assert.equal(queue._queueCounter, 21);
                unlock();
                assert.equal(queue._queueCounter, 20);
            });
        });
        describe('.wrapFunctionWithLocking()', () => {
            it('should call the given function and returns the value', async() => {
                const queue = IdleQueue.create();
                const res = await queue.wrapFunctionWithLocking(
                    () => 21 + 21
                );
                assert.equal(res, 42);
            });
            it('should have a lock while running the function', async() => {
                const queue = IdleQueue.create();
                const promise = queue.wrapFunctionWithLocking(
                    async() => {
                        await AsyncTestUtil.wait(20);
                        return 42;
                    }
                );
                assert.equal(queue._queueCounter, 1);
                const res = await promise;
                assert.equal(res, 42);
                assert.equal(queue._queueCounter, 0);
            });
            it('should pass the error if function throws', async() => {
                const queue = IdleQueue.create();
                let thrown = false;
                try {
                    await queue.wrapFunctionWithLocking(
                        async() => {
                            const throwMe = new Error('foobar');
                            throwMe.flag = true;
                            throw throwMe;
                        }
                    );
                } catch (err) {
                    thrown = true;
                    assert.ok(err.flag);
                }
                assert.ok(thrown);
                assert.equal(queue._queueCounter, 0);
            });
        });
        describe('.requestIdlePromise()', () => {
            it('should resolve the promise', async() => {
                const queue = IdleQueue.create();
                await queue.requestIdlePromise();
                await AsyncTestUtil.wait(10);
            });
            it('should resolve the oldest first', async() => {
                const queue = IdleQueue.create();
                const order = [];
                queue.requestIdlePromise().then(() => order.push(0));
                queue.requestIdlePromise().then(() => order.push(1));
                await AsyncTestUtil.wait();
                queue.requestIdlePromise().then(() => order.push(2));
                await AsyncTestUtil.waitUntil(() => order.length === 3);
                assert.deepEqual(order, [0, 1, 2]);
            });
            it('should resolve after timeout', async() => {
                const queue = IdleQueue.create();
                queue.wrapFunctionWithLocking(
                    () => AsyncTestUtil.wait(200000)
                );
                let done = false;
                queue.requestIdlePromise(50).then(() => done = true);
                await AsyncTestUtil.waitUntil(() => done === true);
            });
            it('should not exec twice when timeout set', async() => {
                const queue = IdleQueue.create();
                queue.wrapFunctionWithLocking(
                    () => AsyncTestUtil.wait(100)
                );
                let done = 0;
                queue.requestIdlePromise(50).then(() => done = done + 1);
                await AsyncTestUtil.wait(150);
                assert.equal(done, 1);
            });
        });
    });
    describe('integration', () => {
        it('should be able to call queue on database', async() => {
            const c = await humansCollection.create(0);
            await c.database.requestIdlePromise();
            c.database.destroy();
        });
        it('inserts should always be faster than idle-call', async() => {
            const c = await humansCollection.create(0);
            const data = new Array(10).fill(0).map(() => schemaObjects.human());
            const order = [];

            Promise.all(data.map(
                doc => c.insert(doc)
            )).then(() => order.push(0));
            c.database.requestIdlePromise().then(() => order.push(1));

            await AsyncTestUtil.waitUntil(() => order.length == 2);
            assert.deepEqual(order, [0, 1]);

            c.database.destroy();
        });
    });
    describe('e', () => {
        //        it('exit', () => process.exit());
    });
});
