import assert from 'assert';
import AsyncTestUtil from 'async-test-util';
import {
    schemaObjects,
    humansCollection
} from '../../plugins/test-utils/index.mjs';
import { describeParallel } from './config.ts';
describeParallel('idle-queue.test.js', () => {
    describe('integration', () => {
        it('should be able to call queue on database', async () => {
            const c = await humansCollection.create(0);
            await c.database.requestIdlePromise();
            c.database.close();
        });
        it('inserts should always be faster than idle-call', async () => {
            const c = await humansCollection.create(0);
            const data = new Array(10).fill(0).map(() => schemaObjects.humanData());
            const order: any[] = [];

            Promise.all(data.map(
                doc => c.insert(doc)
            )).then(() => order.push(0));
            c.database.requestIdlePromise().then(() => order.push(1));

            await AsyncTestUtil.waitUntil(() => order.length === 2);
            assert.deepStrictEqual(order, [0, 1]);

            c.database.close();
        });
    });
});
