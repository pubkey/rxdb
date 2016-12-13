import assert from 'assert';
import {
    default as randomToken
} from 'random-token';
import {
    default as memdown
} from 'memdown';
import * as _ from 'lodash';

import * as schemas from '../helper/schemas';
import * as schemaObjects from '../helper/schema-objects';
import * as humansCollection from '../helper/humans-collection';

import * as RxDatabase from '../../dist/lib/RxDatabase';
import * as RxSchema from '../../dist/lib/RxSchema';
import * as RxCollection from '../../dist/lib/RxCollection';
import * as util from '../../dist/lib/util';

process.on('unhandledRejection', function(err) {
    throw err;
});

describe('LeaderElection.test.js', () => {
    describe('messaging', () => {
        it('should recieve a Leader-message over the socket', async() => {
            const name = randomToken(10);
            const c1 = await humansCollection.createMultiInstance(name);
            const c2 = await humansCollection.createMultiInstance(name);
            const db1 = c1.database;
            const db2 = c2.database;

            const pW = util.promiseWaitResolveable(1000);
            const recieved = [];
            const sub = db1.leaderElector.socketMessages$
                .subscribe(message => {
                    recieved.push(message);
                    pW.resolve();
                });
            const sub2 = db2.leaderElector.socketMessages$
                .subscribe(message => recieved.push(message));

            db2.leaderElector.socketMessage('tell');
            await pW.promise;
            assert.equal(recieved.length, 1);
            assert.equal(recieved[0].type, 'tell');
            assert.equal(recieved[0].token, db2.token);
            assert.ok(recieved[0].time > 100);
            assert.ok(recieved[0].time < new Date().getTime());
            sub.unsubscribe();
            sub2.unsubscribe();
        });
        it('leader should reply with tell when apply comes in', async() => {
            const name = randomToken(10);
            const c1 = await humansCollection.createMultiInstance(name);
            const c2 = await humansCollection.createMultiInstance(name);
            const db1 = c1.database;
            const db2 = c2.database;

            db1.leaderElector.beLeader();

            const pW = util.promiseWaitResolveable(1000);
            const recieved = [];
            const sub = db2.leaderElector.socketMessages$
                .subscribe(message => {
                    recieved.push(message);
                    pW.resolve();
                    sub.unsubscribe();
                });
            db2.leaderElector.socketMessage('apply');

            await pW.promise;
            assert.equal(recieved.length, 1);
            assert.equal(recieved[0].type, 'tell');
            assert.equal(recieved[0].token, db1.token);
        });
    });

    describe('election', () => {

        it('a single instance should always elect itself as leader', async() => {
            const name = randomToken(10);
            const c1 = await humansCollection.createMultiInstance(name);
            const db1 = c1.database;
            await db1.leaderElector.startApplying();
            assert.equal(db1.leaderElector.isLeader, true);
        });
        it('should not elect as leader if other instance is leader', async() => {
            const name = randomToken(10);
            const c1 = await humansCollection.createMultiInstance(name);
            const c2 = await humansCollection.createMultiInstance(name);
            const db1 = c1.database;
            const db2 = c2.database;

            await db1.leaderElector.beLeader();
            await db2.leaderElector.startApplying();

            assert.equal(db2.leaderElector.isLeader, false);
        });

        it('exit', () => {
            console.log('exit');
            process.exit();
        });

    });

});
