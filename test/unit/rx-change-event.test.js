import assert from 'assert';
import config from './config';
import AsyncTestUtil from 'async-test-util';

import * as humansCollection from '../helper/humans-collection';

config.parallel('rx-change-event.test.js', () => {
    it('should only have doc-data on local remove', async () => {
        return;
        const col = await humansCollection.create(5);

        const emitted = [];
        const sub = col.$.subscribe(cE => emitted.push(cE));

        const doc1 = await col.findOne().exec();
        await doc1.remove();

        await AsyncTestUtil.waitUntil(() => emitted.length === 1);
        const cE = emitted.pop();
        assert.equal(cE.data.op, 'REMOVE');
        assert.ok(cE.data.v.age);

        // check on remote
        const remoteCol = await humansCollection.create(0);
        await remoteCol.sync({
            remote: col,
            waitForLeadership: false
        });
        await AsyncTestUtil.waitUntil(async () => {
            const docs = await remoteCol.find().exec();
            return docs.length === 4;
        });
        const doc2 = await remoteCol.findOne().exec();
        await doc2.remove();
        await AsyncTestUtil.waitUntil(() => emitted.length === 1);
        const cE2 = emitted.pop();
        assert.equal(cE2.data.op, 'REMOVE');
        assert.equal(typeof cE2.data.v.age, 'undefined');

        sub.unsubscribe();
        col.database.destroy();
        remoteCol.database.destroy();
    });
});
