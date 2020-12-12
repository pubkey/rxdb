import assert from 'assert';
import AsyncTestUtil from 'async-test-util';
import config from './config';

import * as schemas from '../helper/schemas';
import * as humansCollection from '../helper/humans-collection';

import {
    createRxDatabase,
    randomCouchString
} from '../../plugins/core';

config.parallel('leader-election.test.js', () => {
    describe('.die()', () => {
        it('other instance applies on death of leader', async () => {
            const name = randomCouchString(10);
            const c = await humansCollection.createMultiInstance(name);
            const leaderElector = c.database.leaderElector();

            await leaderElector.waitForLeadership();
            await leaderElector.die();

            const c2 = await humansCollection.createMultiInstance(name);
            await c2.database.leaderElector().waitForLeadership();

            c.database.destroy();
            c2.database.destroy();
        });
    });

    describe('election', () => {
        it('a single instance should always elect itself as leader', async () => {
            const c1 = await humansCollection.createMultiInstance(randomCouchString(10));
            const db1 = c1.database;
            await db1.leaderElector().waitForLeadership();
            c1.database.destroy();
        });
        it('should not elect as leader if other instance is leader', async () => {
            const name = randomCouchString(10);
            const c1 = await humansCollection.createMultiInstance(name);
            const c2 = await humansCollection.createMultiInstance(name);
            const db1 = c1.database;
            const db2 = c2.database;

            await db1.leaderElector().waitForLeadership();
            await AsyncTestUtil.wait(150);
            assert.strictEqual(db2.isLeader(), false);

            c1.database.destroy();
            c2.database.destroy();
        });
        it('when 2 instances apply at the same time, one should win', async () => {
            if (!config.platform.isNode()) return;

            // run often
            let tries = 0;
            while (tries < 3) {
                tries++;
                const name = randomCouchString(10);
                const c1 = await humansCollection.createMultiInstance(name);
                const c2 = await humansCollection.createMultiInstance(name);
                const le1 = c1.database.leaderElector();
                const le2 = c2.database.leaderElector();

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

                assert.notStrictEqual(le1.isLeader, le2.isLeader);

                await c1.database.destroy();
                await c2.database.destroy();
            }
        });
        it('when many instances apply, one should win', async () => {
            const name = randomCouchString(10);
            const dbs: any[] = [];
            while (dbs.length < 10) {
                const c = await humansCollection.createMultiInstance(name);
                dbs.push(c.database);
            }
            dbs.forEach(db => db.leaderElector().waitForLeadership());

            await AsyncTestUtil.waitUntil(() => {
                const count = dbs
                    .map(db => db.leaderElector().isLeader)
                    .filter(is => is === true)
                    .length;
                return count === 1;
            });
            await AsyncTestUtil.wait(100);

            const leaderCount = dbs
                .map(db => db.leaderElector().isLeader)
                .filter(is => is === true)
                .length;
            assert.strictEqual(leaderCount, 1);
            await Promise.all(dbs.map(db => db.destroy()));
        });
        it('when the leader dies, a new one should be elected', async function () {
            this.timeout(5 * 1000);
            const name = randomCouchString(10);
            const dbs: any[] = [];
            while (dbs.length < 6) {
                const c = await humansCollection.createMultiInstance(name);
                dbs.push(c.database);
            }
            dbs.forEach(db => db.leaderElector().waitForLeadership());

            await AsyncTestUtil.waitUntil(async () => {
                const count = dbs
                    .filter(db => db.leaderElector().isLeader === true)
                    .length;
                return count === 1;
            });
            await AsyncTestUtil.wait(100);
            const leaderCount = dbs
                .filter(db => db.leaderElector().isLeader === true)
                .length;
            assert.strictEqual(leaderCount, 1);

            // let leader die
            const leader = dbs
                .filter(db => db.leaderElector().isLeader === true)[0];
            const leaderToken = leader.token;
            await leader.destroy();
            const nonDeadDbs = dbs.filter(db => db !== leader);

            await AsyncTestUtil.waitUntil(async () => {
                const count = nonDeadDbs
                    .filter(db => db.leaderElector().isLeader === true)
                    .length;
                return count === 1;
            });
            const leaderCount2 = nonDeadDbs
                .filter(db => db.leaderElector().isLeader === true)
                .length;
            assert.strictEqual(leaderCount2, 1);

            const leader2 = nonDeadDbs
                .filter(db => db.token !== leaderToken)
                .filter(db => db.leaderElector().isLeader === true)[0];
            const leaderToken2 = leader2.token;

            assert.notStrictEqual(leaderToken, leaderToken2);
            await Promise.all(nonDeadDbs.map(db => db.destroy()));
        });
    });
    describe('integration', () => {
        it('non-multiInstance should always be leader', async () => {
            const db = await createRxDatabase({
                name: randomCouchString(10),
                adapter: 'memory',
                multiInstance: false
            });
            // setTimeout(() => db.destroy(), dbLifetime);
            await db.collection({
                name: 'human',
                schema: schemas.human
            });
            assert.strictEqual(db.isLeader(), true);
            db.destroy();
        });
        it('non-multiInstance: waitForLeadership should instant', async () => {
            const c = await humansCollection.create(0);
            const db = c.database;
            await db.waitForLeadership();
            db.destroy();
        });

        it('waitForLeadership: run once when instance becomes leader', async () => {
            const name = randomCouchString(10);
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
                .filter(db => db.isLeader())[0]
                .leaderElector().die();

            await AsyncTestUtil.waitUntil(() => count === 2);
            await Promise.all(dbs.map(db => db.destroy()));
        });
    });
});
