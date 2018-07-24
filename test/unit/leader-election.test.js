import assert from 'assert';
import config from './config';

import * as schemas from '../helper/schemas';
import * as humansCollection from '../helper/humans-collection';

import * as RxDatabase from '../../dist/lib/rx-database';
import * as util from '../../dist/lib/util';
import AsyncTestUtil from 'async-test-util';

config.parallel('leader-election.test.js', () => {
    describe('.die()', () => {
        it('other instance applies on death of leader', async () => {
            const name = util.randomCouchString(10);
            const c = await humansCollection.createMultiInstance(name);
            const leaderElector = c.database.leaderElector;

            await leaderElector.waitForLeadership();
            await leaderElector.die();

            const c2 = await humansCollection.createMultiInstance(name);
            await c2.database.leaderElector.waitForLeadership();

            c.database.destroy();
            c2.database.destroy();
        });
    });

    describe('election', () => {
        it('a single instance should always elect itself as leader', async () => {
            const c1 = await humansCollection.createMultiInstance(util.randomCouchString(10));
            const db1 = c1.database;
            await db1.leaderElector.waitForLeadership();
            c1.database.destroy();
        });
        it('should not elect as leader if other instance is leader', async () => {
            const name = util.randomCouchString(10);
            const c1 = await humansCollection.createMultiInstance(name);
            const c2 = await humansCollection.createMultiInstance(name);
            const db1 = c1.database;
            const db2 = c2.database;

            await db1.leaderElector.waitForLeadership();
            await AsyncTestUtil.wait(150);
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
                const le1 = c1.database.leaderElector;
                const le2 = c2.database.leaderElector;

                le1.waitForLeadership();
                le2.waitForLeadership();

                await AsyncTestUtil.waitUntil(() => {
                    const leaders = [
                        le1.isLeader,
                        le2.isLeader
                    ].filter(x => x);
                    return leaders.length === 1;
                });
                await AsyncTestUtil.wait(50);

                assert.notEqual(le1.isLeader, le2.isLeader);

                await c1.database.destroy();
                await c2.database.destroy();
            }
        });
        it('when many instances apply, one should win', async () => {
            const name = util.randomCouchString(10);
            const dbs = [];
            while (dbs.length < 10) {
                const c = await humansCollection.createMultiInstance(name);
                dbs.push(c.database);
            }
            dbs.forEach(db => db.leaderElector.waitForLeadership());

            await AsyncTestUtil.waitUntil(() => {
                const leaderCount = dbs
                    .map(db => db.leaderElector.isLeader)
                    .filter(is => is === true)
                    .length;
                return leaderCount === 1;
            });
            await AsyncTestUtil.wait(100);

            const leaderCount = dbs
                .map(db => db.leaderElector.isLeader)
                .filter(is => is === true)
                .length;
            assert.equal(leaderCount, 1);
            await Promise.all(dbs.map(db => db.destroy()));
        });
        it('when the leader dies, a new one should be elected', async function () {
            this.timeout(5 * 1000);
            const name = util.randomCouchString(10);
            let dbs = [];
            while (dbs.length < 6) {
                const c = await humansCollection.createMultiInstance(name);
                dbs.push(c.database);
            }
            dbs.forEach(db => db.leaderElector.waitForLeadership());

            await AsyncTestUtil.waitUntil(async () => {
                const leaderCount = dbs
                    .filter(db => db.leaderElector.isLeader === true)
                    .length;
                return leaderCount === 1;
            });
            await AsyncTestUtil.wait(100);
            const leaderCount = dbs
                .filter(db => db.leaderElector.isLeader === true)
                .length;
            assert.equal(leaderCount, 1);

            // let leader die
            const leader = dbs
                .filter(db => db.leaderElector.isLeader === true)[0];
            const leaderToken = leader.token;
            await leader.destroy();
            dbs = dbs.filter(db => db !== leader);


            await AsyncTestUtil.waitUntil(async () => {
                const leaderCount = dbs
                    .filter(db => db.leaderElector.isLeader === true)
                    .length;
                return leaderCount === 1;
            });
            const leaderCount2 = dbs
                .filter(db => db.leaderElector.isLeader === true)
                .length;
            assert.equal(leaderCount2, 1);

            const leader2 = dbs
                .filter(db => db.token !== leaderToken)
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
