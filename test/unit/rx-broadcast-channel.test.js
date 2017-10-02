import assert from 'assert';

import * as RxDB from '../../dist/lib/index';
import * as util from '../../dist/lib/util';
import AsyncTestUtil from 'async-test-util';
import * as RxBroadcastChannel from '../../dist/lib/rx-broadcast-channel';

describe('rx-broadcast-channel.test.js', () => {
    if (!RxBroadcastChannel.canIUse()) return;
    const state = {
        dbs: []
    };
    it('init', async() => {
        const name = util.randomCouchString(10);
        state.dbs = await Promise.all([
            RxDB.create({
                name,
                adapter: 'memory',
                ignoreDuplicate: true
            }),
            RxDB.create({
                name,
                adapter: 'memory',
                ignoreDuplicate: true
            })
        ]);
        state.otherDB = await RxDB.create({
            name: util.randomCouchString(10),
            adapter: 'memory'
        });
        util.promiseWait(10);
        assert.equal(state.dbs.length, 2);
    });
    it('should create a channel', async() => {
        const bc = RxBroadcastChannel.create(state.dbs[0], 'foobar');
        assert.equal(bc.constructor.name, 'RxBroadcastChannel');
        bc.destroy();
    });
    it('should send a message from bc1 to bc2', async() => {
        const bc1 = RxBroadcastChannel.create(state.dbs[0], 'foobar');
        const bc2 = RxBroadcastChannel.create(state.dbs[1], 'foobar');
        const msgs = [];
        const sub = bc2.$.subscribe(msg => msgs.push(msg));
        await bc1.write('test');
        await AsyncTestUtil.waitUntil(() => msgs.length === 1);
        assert.equal(msgs[0].type, 'test');
        sub.unsubscribe();
        bc1.destroy();
        bc2.destroy();
    });
    it('should not get a message from other db', async() => {
        const bc1 = RxBroadcastChannel.create(state.dbs[0], 'foobar');
        const bc2 = RxBroadcastChannel.create(state.otherDB, 'foobar');
        const msgs = [];
        const sub = bc2.$.subscribe(msg => msgs.push(msg));
        await bc1.write('test');
        await util.promiseWait(10);
        assert.equal(msgs.length, 0);
        sub.unsubscribe();
        bc1.destroy();
        bc2.destroy();
    });
    it('should send a message from bc1 to bc2 and bc3', async() => {
        const bc1 = RxBroadcastChannel.create(state.dbs[0], 'foobar');
        const bc2 = RxBroadcastChannel.create(state.dbs[1], 'foobar');
        const bc3 = RxBroadcastChannel.create(state.dbs[1], 'foobar');
        const msgs2 = [];
        const msgs3 = [];
        const sub2 = bc2.$.subscribe(msg => msgs2.push(msg));
        const sub3 = bc3.$.subscribe(msg => msgs3.push(msg));

        await bc1.write('test');
        await AsyncTestUtil.waitUntil(() => msgs2.length === 1);
        assert.equal(msgs2[0].type, 'test');
        await AsyncTestUtil.waitUntil(() => msgs3.length === 1);
        assert.equal(msgs3[0].type, 'test');

        sub2.unsubscribe();
        sub3.unsubscribe();
        bc1.destroy();
        bc2.destroy();
        bc3.destroy();
    });
    it('cleanup', async() => {
        state.dbs.map(db => db.destroy());
    });
});
