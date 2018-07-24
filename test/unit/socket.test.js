import assert from 'assert';
import config from './config';
import AsyncTestUtil from 'async-test-util';

import * as RxDatabase from '../../dist/lib/index';
import * as Socket from '../../dist/lib/socket';
import * as RxChangeEvent from '../../dist/lib/rx-change-event';
import * as util from '../../dist/lib/util';

config.parallel('socket.test.js', () => {
    it('socket2 should be able to get docs inserted from socket1', async () => {
        await AsyncTestUtil.wait(1000);
        const name = util.randomCouchString(10);
        const db = await RxDatabase.create({
            name,
            adapter: 'memory',
            multiInstance: true,
            ignoreDuplicate: true
        });
        const db2 = await RxDatabase.create({
            name,
            adapter: 'memory',
            multiInstance: true,
            ignoreDuplicate: true
        });
        const socket1 = await Socket.create(db);
        const socket2 = await Socket.create(db2);

        const emitted = [];
        const sub = socket2.$.subscribe(msg => {
            emitted.push(msg);
        });

        await socket1.write(RxChangeEvent.create('test', db));
        await AsyncTestUtil.waitUntil(() => emitted.length >= 1);
        assert.equal(emitted.length, 1);
        const cE = emitted[0];

        assert.equal(cE.data.op, 'test');
        sub.unsubscribe();
        await db.destroy();
        await db2.destroy();
        await socket1.destroy();
        await socket2.destroy();
    });
});
