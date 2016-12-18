import assert from 'assert';
import {
    default as randomToken
} from 'random-token';

import * as RxDB from '../../dist/lib/index';
import * as util from '../../dist/lib/util';
import * as LeaderElector from '../../dist/lib/LeaderElector';

import * as schemas from '../helper/schemas';
import * as schemaObjects from '../helper/schema-objects';
import * as humansCollection from '../helper/humans-collection';


describe('LeaderElection.test.js', () => {
    describe('leaderObject', () => {
        it('should not have a leaderObject', async() => {
            const c = await humansCollection.createMultiInstance(randomToken(10));
            const db = c.database;
            await util.assertThrowsAsync(
                () => db.administrationCollection.pouch.get('_local/leader'),
                Error
            );
            db.destroy();
        });
        it('should get an empty leaderObject', async() => {
            const c = await humansCollection.createMultiInstance(randomToken(10));
            const leaderElector = c.database.leaderElector;
            const obj = await leaderElector.getLeaderObject();
            delete obj._rev;
            assert.deepEqual(obj, leaderElector.createLeaderObject());
            assert.equal(obj._id, '_local/leader');

            // make sure its also in db
            const dbObj = await c.database.administrationCollection.pouch.get('_local/leader');
            delete dbObj._rev;
            assert.deepEqual(obj, dbObj);
            c.database.destroy();
        });
    });
    describe('beLeader()', () => {
        it('leaderSignal()', async() => {
            const name = randomToken(10);
            const c = await humansCollection.createMultiInstance(name);
            const c2 = await humansCollection.createMultiInstance(name);

            const leaderElector = c.database.leaderElector;
            const leaderElector2 = c2.database.leaderElector;

            const msgs = [];
            const sub = leaderElector2.bc.$
                .filter(msg => msg.type == 'tell')
                .subscribe(msg => msgs.push(msg));
            await leaderElector.leaderSignal();
            await util.promiseWait(50);
            assert.equal(msgs.length, 1);
            sub.unsubscribe();
            c.database.destroy();
            c2.database.destroy();
        });
        it('assing self to leader', async() => {
            const c = await humansCollection.createMultiInstance(randomToken(10));
            const leaderElector = c.database.leaderElector;
            const is = await leaderElector.beLeader();
            assert.ok(is);
            c.database.destroy();
        });
    });
    describe('applyOnce()', () => {
        it('should apply', async() => {
            const c = await humansCollection.createMultiInstance(randomToken(10));
            const leaderElector = c.database.leaderElector;
            const is = await leaderElector.applyOnce();
            assert.ok(is);
            c.database.destroy();
        });
        it('should assing self to leader', async() => {
            const c = await humansCollection.createMultiInstance(randomToken(10));
            const leaderElector = c.database.leaderElector;
            await leaderElector.applyOnce();
            assert.ok(leaderElector.isLeader);
            c.database.destroy();
        });
        it('should not apply when other is leader', async() => {
            const name = randomToken(10);
            const c = await humansCollection.createMultiInstance(name);
            const leaderElector = c.database.leaderElector;
            await leaderElector.beLeader();

            const c2 = await humansCollection.createMultiInstance(name);
            const leaderElector2 = c2.database.leaderElector;
            const is = await leaderElector.applyOnce();
            assert.equal(is, false);
            c.database.destroy();
            c2.database.destroy();
        });
    });

    describe('.die()', () => {
        it('leader: send message on death', async() => {
            const name = randomToken(10);
            const c = await humansCollection.createMultiInstance(name);
            const leaderElector = c.database.leaderElector;
            const c2 = await humansCollection.createMultiInstance(name);
            const leaderElector2 = c2.database.leaderElector;
            await leaderElector.beLeader();

            const msgs = [];
            const sub = leaderElector2.bc.$
                .filter(msg => msg.type == 'death')
                .subscribe(msg => msgs.push(msg));
            const is = await leaderElector.die();
            assert.ok(is);
            await util.promiseWait(500);
            assert.equal(msgs.length, 1);

            sub.unsubscribe();
            c.database.destroy();
            c2.database.destroy();
        });
        it('other instance applies on death of leader', async() => {
            const name = randomToken(10);
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
        it('a single instance should always elect itself as leader', async() => {
            const name = randomToken(10);
            const c1 = await humansCollection.createMultiInstance(name);
            const db1 = c1.database;
            await db1.leaderElector.applyOnce();
            assert.equal(db1.leaderElector.isLeader, true);
            db1.destroy();
        });
        it('should not elect as leader if other instance is leader', async() => {
            const name = randomToken(10);
            const c1 = await humansCollection.createMultiInstance(name);
            const c2 = await humansCollection.createMultiInstance(name);
            const db1 = c1.database;
            const db2 = c2.database;

            await db1.leaderElector.beLeader();
            await db2.leaderElector.applyOnce();

            assert.equal(db2.leaderElector.isLeader, false);
            db1.destroy();
            db2.destroy();
        });
        it('when 2 instances apply at the same time, one should win', async function() {
            this.timeout(5000);
            // run often
            let tries = 0;
            while (tries < 3) {
                tries++;
                const name = randomToken(10);
                const c1 = await humansCollection.createMultiInstance(name);
                const c2 = await humansCollection.createMultiInstance(name);
                const db1 = c1.database;
                const db2 = c2.database;
                await db1.leaderElector.applyOnce();
                await db2.leaderElector.applyOnce();
                assert.ok(db1.leaderElector.isLeader != db2.leaderElector.isLeader);
                await db1.destroy();
                await db2.destroy();
            }
        });
        it('when many instances apply, one should win', async() => {
            const name = randomToken(10);
            const dbs = [];
            while (dbs.length < 10) {
                const c = await humansCollection.createMultiInstance(name);
                dbs.push(c.database);
            }
            await Promise.all(
                dbs.map(db => db.leaderElector.applyOnce())
            );
            await Promise.all(
                dbs.map(db => db.leaderElector.applyOnce())
            );
            const leaderCount = dbs
                .map(db => db.leaderElector.isLeader)
                .filter(is => is == true)
                .length;
            assert.equal(leaderCount, 1);
        });
        it('when leader dies, other should apply', async() => {
            const name = randomToken(10);
            const c1 = await humansCollection.createMultiInstance(name);
            const c2 = await humansCollection.createMultiInstance(name);
            const leaderElector1 = c1.database.leaderElector;
            const leaderElector2 = c2.database.leaderElector;

            await leaderElector1.applyOnce();
            assert.ok(leaderElector1);

            c2.database.waitForLeadership();
            await leaderElector1.die();

            await util.promiseWait(1000);
            assert.ok(leaderElector2.isLeader);

            c1.database.destroy();
            c2.database.destroy();
        });
        it('when the leader dies, a new one should be elected', async() => {
            const name = randomToken(10);
            const dbs = [];
            while (dbs.length < 6) {
                const c = await humansCollection.createMultiInstance(name);
                dbs.push(c.database);
            }
            await Promise.all(
                dbs.map(db => db.leaderElector.applyOnce())
            );

            let leaderCount = dbs
                .filter(db => db.leaderElector.isLeader == true)
                .length;
            assert.equal(leaderCount, 1);

            // let leader die
            let leader = dbs
                .filter(db => db.leaderElector.isLeader == true)[0];
            let leaderToken = leader.token;
            await leader.destroy();

            // noone should be leader
            leaderCount = dbs
                .filter(db => db.leaderElector.isLeader == true)
                .length;
            assert.equal(leaderCount, 0);

            // restart election
            await Promise.all(
                dbs.map(db => db.leaderElector.applyOnce())
            );
            leaderCount = dbs
                .filter(db => db.leaderElector.isLeader == true)
                .length;
            assert.equal(leaderCount, 1);

            let leader2 = dbs
                .filter(db => db.leaderElector.isLeader == true)[0];
            let leaderToken2 = leader2.token;

            assert.notEqual(leaderToken, leaderToken2);
            await Promise.all(dbs.map(db => db.destroy()));
        });
    });

    describe('integration', () => {
        it('non-multiInstance should always be leader', async() => {
            const c = await humansCollection.create(0);
            const db = c.database;
            assert.equal(db.isLeader, true);
            db.destroy();
        });
        it('non-multiInstance: waitForLeadership should instant', async() => {
            const c = await humansCollection.create(0);
            const db = c.database;
            await db.waitForLeadership();
            db.destroy();
        });
        it('waitForLeadership: run once when instance becomes leader', async() => {
            const c = await humansCollection.createMultiInstance(randomToken(10));
            const db = c.database;
            await db.waitForLeadership();
            db.destroy();
        });

        it('waitForLeadership(multi): run once when instance becomes leader', async function() {
            this.timeout(10000);
            const name = randomToken(10);
            const cols = await Promise.all(
                util.filledArray(5)
                .map(i => humansCollection.createMultiInstance(name))
            );
            const dbs = cols.map(col => col.database);

            let count = 0;
            dbs.forEach(db => db.waitForLeadership().then(is => count++));

            await util.promiseWait(1500);
            assert.equal(count, 1);

            const leaderToken = dbs.filter(db => !!db.leaderElector.isLeader)[0].token;

            // let leader die
            await dbs
                .filter(db => db.isLeader)[0]
                .leaderElector.die();

            await util.promiseWait(3500);

            assert.equal(count, 2);
            await Promise.all(dbs.map(db => db.destroy()));
        });
    });
});
