import assert from 'assert';
import config from './config';
import AsyncTestUtil from 'async-test-util';
import * as humansCollection from '../helper/humans-collection';
import * as schemaObjects from '../helper/schema-objects';

config.parallel('idle-queue.test.js', () => {
    describe('integration', () => {
        it('should be able to call queue on database', async () => {
            const c = await humansCollection.create(0);
            await c.database.requestIdlePromise();
            c.database.destroy();
        });
        it('inserts should always be faster than idle-call', async () => {
            const c = await humansCollection.create(0);
            const data = new Array(10).fill(0).map(() => schemaObjects.human());
            const order: any[] = [];

            Promise.all(data.map(
                doc => c.insert(doc)
            )).then(() => order.push(0));
            c.database.requestIdlePromise().then(() => order.push(1));

            await AsyncTestUtil.waitUntil(() => order.length === 2);
            assert.deepStrictEqual(order, [0, 1]);

            c.database.destroy();
        });
    });
});
