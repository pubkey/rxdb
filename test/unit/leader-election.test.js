import assert from 'assert';
import config from './config';

import * as schemas from '../helper/schemas';
import * as humansCollection from '../helper/humans-collection';

import * as RxDatabase from '../../dist/lib/rx-database';
import * as util from '../../dist/lib/util';
import AsyncTestUtil from 'async-test-util';
import * as RxBroadcastChannel from '../../dist/lib/rx-broadcast-channel';

import * as LeaderElector from '../../dist/lib/plugins/leader-election';

import {
    filter
} from 'rxjs/operators';

config.parallel('leader-election.test.js', () => {
    describe('leaderObject', () => {
        it('should not have a leaderObject', async () => {
            const c = await humansCollection.createMultiInstance(util.randomCouchString(10));
            const db = c.database;
            await AsyncTestUtil.assertThrows(
                () => db._adminPouch.get(LeaderElector.documentID),
                'PouchError'
            );
            db.destroy();
        });
        it('should get an empty leaderObject', async () => {
            const c = await humansCollection.createMultiInstance(util.randomCouchString(10));
            const leaderElector = c.database.leaderElector;
            const obj = await leaderElector.getLeaderObject();
            delete obj._rev;
            assert.deepEqual(obj, leaderElector.createLeaderObject());
            assert.equal(obj._id, LeaderElector.documentID);

            // make sure its also in db
            const dbObj = await c.database._adminPouch.get(LeaderElector.documentID);
            delete dbObj._rev;
            assert.deepEqual(obj, dbObj);
            c.database.destroy();
        });
    });
    describe('.beLeader()', () => {
        it('.leaderSignal()', async () => {
            // not run on BroadcastChannel
            if (RxBroadcastChannel.canIUse()) return;

            const c = await humansCollection.createMultiInstance(util.randomCouchString(10));
            const leaderElector = c.database.leaderElector;
            await leaderElector.leaderSignal();
            const dbObj = await c.database._adminPouch.get(LeaderElector.documentID);
            assert.equal(dbObj.is, leaderElector.token);
            assert.equal(dbObj.apply, leaderElector.token);
            assert.ok(dbObj.t > new Date().getTime() - 1000);
            c.database.destroy();
        });
        it('assign self to leader', async () => {
            // not run on BroadcastChannel
            if (RxBroadcastChannel.canIUse()) return;

            const c = await humansCollection.createMultiInstance(util.randomCouchString(10));
            const leaderElector = c.database.leaderElector;
            const is = await leaderElector.beLeader();
            assert.ok(is);

            const dbObj = await c.database._adminPouch.get(LeaderElector.documentID);
            assert.equal(dbObj.is, leaderElector.token);
            c.database.destroy();
        });
        it('should signal after time', async () => {
            // not run on BroadcastChannel
            if (RxBroadcastChannel.canIUse()) return;

            const c = await humansCollection.createMultiInstance(util.randomCouchString(10));
            const leaderElector = c.database.leaderElector;
            await leaderElector.beLeader();
            const dbObj = await c.database._adminPouch.get(LeaderElector.documentID);
            const t = dbObj.t;

            let dbObj2;
            await AsyncTestUtil.waitUntil(async () => {
                dbObj2 = await c.database._adminPouch.get(LeaderElector.documentID);
                return dbObj2.t > t;
            });

            assert.ok(dbObj2.t > t);
            c.database.destroy();
        });
    });
    describe('.applyOnce()', () => {
        it('should apply', async () => {
            const c = await humansCollection.createMultiInstance(util.randomCouchString(10));
            const leaderElector = c.database.leaderElector;
            const is = await leaderElector.applyOnce();
            assert.ok(is);
            c.database.destroy();
        });
        it('should assign self to leader', async () => {
            const c = await humansCollection.createMultiInstance(util.randomCouchString(10));
            const leaderElector = c.database.leaderElector;
            await leaderElector.applyOnce();
            await AsyncTestUtil.wait();
            assert.ok(leaderElector.isLeader);
            c.database.destroy();
        });
        it('should not apply when other is leader', async () => {
            const name = util.randomCouchString(10);
            const c = await humansCollection.createMultiInstance(name);
            const leaderElector = c.database.leaderElector;
            await leaderElector.beLeader();

            const c2 = await humansCollection.createMultiInstance(name);
            const is = await leaderElector.applyOnce();
            assert.equal(is, false);
            c.database.destroy();
            c2.database.destroy();
        });
    });

    describe('.die()', () => {
        it('leader: write status on death', async () => {
            // not run on BroadcastChannel
            if (RxBroadcastChannel.canIUse()) return;

            const c = await humansCollection.createMultiInstance(util.randomCouchString(10));
            const leaderElector = c.database.leaderElector;
            await leaderElector.beLeader();
            const is = await leaderElector.die();
            assert.ok(is);

            const dbObj = await c.database._adminPouch.get(LeaderElector.documentID);
            assert.equal(dbObj.t, 0);
            c.database.destroy();
        });
        it('leader: send message on death', async () => {
            if (!RxBroadcastChannel.canIUse()) return;

            const name = util.randomCouchString(10);
            const c = await humansCollection.createMultiInstance(name);
            const leaderElector = c.database.leaderElector;
            const c2 = await humansCollection.createMultiInstance(name);
            const leaderElector2 = c2.database.leaderElector;
            await leaderElector.beLeader();

            const msgs = [];
            const sub = leaderElector2.bc.$
                .pipe(
                    filter(msg => msg.type === 'death')
                )
                .subscribe(msg => msgs.push(msg));
            const is = await leaderElector.die();
            assert.ok(is);

            await AsyncTestUtil.waitUntil(() => msgs.length === 1);
            assert.equal(msgs.length, 1);

            sub.unsubscribe();
            c.database.destroy();
            c2.database.destroy();
        });
        it('other instance applies on death of leader', async () => {
            const name = util.randomCouchString(10);
            const c = await humansCollection.createMultiInstance(name);
            const leaderElector = c.database.leaderElector;
            await leaderElector.beLeader();
            await leaderElector.die();

            const c2 = await humansCollection.createMultiInstance(name);
            const leaderElector2 = c2.database.leaderElector;
            await leaderElector2.applyOnce();
            assert.ok(leaderElector2.isLeader);
            c.database.destroy();
            c2.database.destroy();
        });
    });

    describe('election', () => {
        it('a single instance should always elect itself as leader', async () => {
            const name = util.randomCouchString(10);
            const c1 = await humansCollection.createMultiInstance(name);
            const db1 = c1.database;
            await db1.leaderElector.applyOnce();
            assert.equal(db1.leaderElector.isLeader, true);
            c1.database.destroy();
        });
        it('should not elect as leader if other instance is leader', async () => {
            const name = util.randomCouchString(10);
            const c1 = await humansCollection.createMultiInstance(name);
            const c2 = await humansCollection.createMultiInstance(name);
            const db1 = c1.database;
            const db2 = c2.database;

            await db1.leaderElector.beLeader();
            await db2.leaderElector.applyOnce();

            assert.equal(db2.leaderElector.isLeader, false);
            c1.database.destroy();
            c2.database.destroy();
        });
        it('when 2 instances apply at the same time, one should win', async () => {
            if (!config.platform.isNode()) return;

            // run often
            let tries = 0;
            while (tries < 3) {
                tries++;
                const name = util.randomCouchString(10);
                const c1 = await humansCollection.createMultiInstance(name);
                const c2 = await humansCollection.createMultiInstance(name);
                const db1 = c1.database;
                const db2 = c2.database;
                await db1.leaderElector.applyOnce();
                await db2.leaderElector.applyOnce();
                assert.ok(db1.leaderElector.isLeader !== db2.leaderElector.isLeader);
                await db1.destroy();
                await db2.destroy();
            }
        });
        it('when many instances apply, one should win', async () => {
            const name = util.randomCouchString(10);
            const dbs = [];
            while (dbs.length < 10) {
                const c = await humansCollection.createMultiInstance(name);
                dbs.push(c.database);
            }
            await Promise.all(
                dbs.map(db => db.leaderElector.applyOnce())
            );

            const leaderCount = dbs
                .map(db => db.leaderElector.isLeader)
                .filter(is => is === true)
                .length;
            assert.equal(leaderCount, 1);
            await Promise.all(dbs.map(db => db.destroy()));
        });
        it('when the leader dies, a new one should be elected', async function() {
            this.timeout(5 * 1000);
            const name = util.randomCouchString(10);
            const dbs = [];
            while (dbs.length < 6) {
                const c = await humansCollection.createMultiInstance(name);
                dbs.push(c.database);
            }
            await Promise.all(
                dbs.map(db => db.leaderElector.applyOnce())
            );

            let leaderCount;
            await AsyncTestUtil.waitUntil(async () => {
                leaderCount = dbs
                    .filter(db => db.leaderElector.isLeader === true)
                    .length;
                return leaderCount === 1;
            });
            assert.equal(leaderCount, 1);

            // let leader die
            const leader = dbs
                .filter(db => db.leaderElector.isLeader === true)[0];
            const leaderToken = leader.token;
            await leader.destroy();

            // noone should be leader
            await AsyncTestUtil.waitUntil(async () => {
                leaderCount = dbs
                    .filter(db => db.leaderElector.isLeader === true)
                    .length;
                return leaderCount === 0;
            });
            assert.equal(leaderCount, 0);

            // restart election
            await Promise.all(
                dbs.map(db => db.leaderElector.applyOnce())
            );

            await AsyncTestUtil.waitUntil(async () => {
                leaderCount = dbs
                    .filter(db => db.leaderElector.isLeader === true)
                    .length;
                return leaderCount === 1;
            });
            assert.equal(leaderCount, 1);

            const leader2 = dbs
                .filter(db => db.leaderElector.isLeader === true)[0];
            const leaderToken2 = leader2.token;

            assert.notEqual(leaderToken, leaderToken2);
            await Promise.all(dbs.map(db => db.destroy()));
        });
    });
    describe('integration', () => {
        it('non-multiInstance should always be leader', async () => {
            const db = await RxDatabase.create({
                name: util.randomCouchString(10),
                adapter: 'memory',
                multiInstance: false
            });
            // setTimeout(() => db.destroy(), dbLifetime);
            await db.collection({
                name: 'human',
                schema: schemas.human
            });
            assert.equal(db.isLeader, true);
            db.destroy();
        });
        it('non-multiInstance: waitForLeadership should instant', async () => {
            const c = await humansCollection.create(0);
            const db = c.database;
            await db.waitForLeadership();
            db.destroy();
        });

        it('waitForLeadership: run once when instance becomes leader', async () => {
            const name = util.randomCouchString(10);
            const cols = await Promise.all(
                new Array(5)
                .fill(0)
                .map(() => humansCollection.createMultiInstance(name))
            );
            const dbs = cols.map(col => col.database);


            let count = 0;
            dbs.forEach(db => db.waitForLeadership().then(() => count++));
            await AsyncTestUtil.waitUntil(() => count === 1);

            // let leader die
            await dbs
                .filter(db => db.isLeader)[0]
                .leaderElector.die();

            await AsyncTestUtil.waitUntil(() => count === 2);
            await Promise.all(dbs.map(db => db.destroy()));
        });
    });
});
