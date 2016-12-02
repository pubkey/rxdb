/**
 * when the same data-source is used by 2 instance of the same database,
 * than they should emit ChangeEvents to each other
 * This is important if 2 Windows/Tabs of the same website is open and one changes data
 * The tests for this behaviour are done here
 */

import assert from 'assert';
import {
    default as randomToken
} from 'random-token';

import {
    default as memdown
} from 'memdown';
import {
    default as leveldown
} from 'leveldown';

import * as RxDatabase from '../lib/index';
import * as util from '../lib/util';
import * as schemas from './helper/schemas';
import * as schemaObjects from './helper/schema-objects';
import * as humansCollection from './helper/humans-collection';

process.on('unhandledRejection', function(err) {
    throw err;
});


describe('CrossInstance.test.js', () => {
    describe('create database', () => {
        it('create a multiInstance database', async() => {
            const db = await RxDatabase.create(randomToken(10), memdown, null, true);
            assert.equal(db.constructor.name, 'RxDatabase');
        });
        it('create a 2 multiInstance databases', async() => {
            const name = randomToken(10);
            const db = await RxDatabase.create(name, memdown, null, true);
            const db2 = await RxDatabase.create(name, memdown, null, true);
            assert.equal(db.constructor.name, 'RxDatabase');
            assert.equal(db2.constructor.name, 'RxDatabase');
        });
    });
    describe('RxDatabase.$', () => {
        describe('positive', () => {
            it('get event on db2 when db1 fires', async() => {
                const name = randomToken(10);
                const c1 = await humansCollection.createMultiInstance(name);
                const c2 = await humansCollection.createMultiInstance(name);
                const db1 = c1.database;
                const db2 = c2.database;

                let recieved = 0;
                db2.$.subscribe(cEvent => {
                    recieved++;
                    assert.equal(cEvent.constructor.name, 'RxChangeEvent');
                });
                await c1.insert(schemaObjects.human());
                await db2.$pull();
                assert.ok(recieved > 0);
            });
        });
        describe('negative', () => {
            it('should not get the same events twice', async() => {
                const name = randomToken(10);
                const c1 = await humansCollection.createMultiInstance(name);
                const c2 = await humansCollection.createMultiInstance(name);
                const db1 = c1.database;
                const db2 = c2.database;
                let recieved = 0;
                db2.$.subscribe(cEvent => {
                    recieved++;
                    assert.equal(cEvent.constructor.name, 'RxChangeEvent');
                });
                await c1.insert(schemaObjects.human());
                await db2.$pull();
                await db2.$pull();
                assert.equal(recieved, 1);
            });
        });
    });
    describe('Collection.$', () => {
        it('get event on db2 when db1 fires', async() => {
            const name = randomToken(10);
            const c1 = await humansCollection.createMultiInstance(name);
            const c2 = await humansCollection.createMultiInstance(name);
            let recieved = 0;
            c2.$.subscribe(cEvent => {
                recieved++;
                assert.equal(cEvent.constructor.name, 'RxChangeEvent');
            });
            await c1.insert(schemaObjects.human());
            await c2.database.$pull();
            assert.ok(recieved > 0);
        });
        it('get no changes via pouchdb on different dbs', async() => {
            const name = randomToken(10);
            const c1 = await humansCollection.create(0);
            const c2 = await humansCollection.create(0);
            let got;
            c2.pouch.changes({
                since: 'now',
                live: true,
                include_docs: true
            }).on('change', function(change) {
                got = change;
            });
            await c1.insert(schemaObjects.human());
            await util.promiseWait(50);
            assert.equal(got, null);
        });
    });

    describe('Document.$', () => {
        it('get event on doc2 when doc1 is changed', async() => {
            const name = randomToken(10);
            const c1 = await humansCollection.createMultiInstance(name);
            const c2 = await humansCollection.createMultiInstance(name);
            await c1.insert(schemaObjects.human());

            const doc1 = await c1.findOne().exec();
            const doc2 = await c2.findOne().exec();

            let recieved = 0;
            doc2.$.subscribe(cEvent => {
                recieved++;
            });

            let firstNameAfter;
            doc2.get$('firstName').subscribe(newValue => {
                firstNameAfter = newValue;
            });

            doc1.set('firstName', 'foobar');
            await doc1.save();
            await c2.database.$pull();
            await util.promiseWait(100);

            assert.equal(firstNameAfter, 'foobar');
        });
        it('should work with encrypted fields', async() => {
            const name = randomToken(10);
            const password = randomToken(10);
            const db1 = await RxDatabase.create(name, memdown, password, true);
            const db2 = await RxDatabase.create(name, memdown, password, true);
            const c1 = await db1.collection('human', schemas.encryptedHuman);
            const c2 = await db2.collection('human', schemas.encryptedHuman);
            await c1.insert(schemaObjects.encryptedHuman());

            const doc1 = await c1.findOne().exec();
            const doc2 = await c2.findOne().exec();

            let recievedCollection = 0;
            c2.$.subscribe(cEvent => {
                recievedCollection++;
            });

            let recieved = 0;
            doc2.$.subscribe(cEvent => {
                recieved++;
            });

            let secretAfter;
            doc2.get$('secret').subscribe(newValue => {
                secretAfter = newValue;
            });

            doc1.set('secret', 'foobar');
            await doc1.save();
            await c2.database.$pull();
            assert.equal(secretAfter, 'foobar');
        });
        it('should work with nested encrypted fields', async() => {
            const name = randomToken(10);
            const password = randomToken(10);
            const db1 = await RxDatabase.create(name, memdown, password, true);
            const db2 = await RxDatabase.create(name, memdown, password, true);
            const c1 = await db1.collection('human', schemas.encryptedObjectHuman);
            const c2 = await db2.collection('human', schemas.encryptedObjectHuman);
            await c1.insert(schemaObjects.encryptedObjectHuman());

            const doc1 = await c1.findOne().exec();
            const doc2 = await c2.findOne().exec();

            let recievedCollection = 0;
            c2.$.subscribe(cEvent => {
                recievedCollection++;
            });

            let recieved = 0;
            doc2.$.subscribe(cEvent => {
                recieved++;
            });

            let secretAfter;
            doc2.get$('secret').subscribe(newValue => {
                secretAfter = newValue;
            });

            doc1.set('secret', {
                name: 'foo',
                subname: 'bar'
            });
            await doc1.save();
            await c2.database.$pull();
            assert.deepEqual(secretAfter, {
                name: 'foo',
                subname: 'bar'
            });
        });
    });
    describe('AutoPull', () => {
        describe('positive', () => {
            it('should recieve events without calling .$pull()', async() => {
                const name = randomToken(10);
                const c1 = await humansCollection.createMultiInstance(name);
                const c2 = await humansCollection.createMultiInstance(name);
                const waitPromise = util.promiseWaitResolveable(500);

                let recieved = 0;
                c2.$.subscribe(cEvent => {
                    recieved++;
                    assert.equal(cEvent.constructor.name, 'RxChangeEvent');
                    waitPromise.resolve();
                });
                await c1.insert(schemaObjects.human());

                await waitPromise.promise;
                assert.equal(recieved, 1);
            });
            it('should recieve 2 events', async() => {
                const name = randomToken(10);
                const c1 = await humansCollection.createMultiInstance(name);
                const c2 = await humansCollection.createMultiInstance(name);
                const waitPromise = util.promiseWaitResolveable(500);
                let recieved = 0;
                c2.$.subscribe(cEvent => {
                    recieved++;
                    assert.equal(cEvent.constructor.name, 'RxChangeEvent');
                    if (recieved == 2) waitPromise.resolve();
                });
                await c1.insert(schemaObjects.human());
                await c1.insert(schemaObjects.human());

                await waitPromise.promise;
                assert.equal(recieved, 2);
            });
        });
    });



    /**
     * pouchdb stores all docs forever
     * but the socked should be cleaned up to not overfill the database
     * this will test this behaviour
     * @link https://pouchdb.com/guides/compact-and-destroy.html
     */
    describe('_socket-CleanUp', () => {
        it('should also get the deleted docs', async function() {
            this.timeout(5000);

            const name = randomToken(10);
            const collection = await humansCollection.createMultiInstance(name);
            const collection2 = await humansCollection.createMultiInstance(name);
            const collection3 = await humansCollection.createMultiInstance(name);

            const db = collection.database;

            // add many docs
            const amount = 100;
            let fns = [];
            for (let i = 0; i < amount; i++)
                fns.push(collection.insert(schemaObjects.human()));
            await Promise.all(fns);
            await util.promiseWait(1600);

            // insert again to trigger cleanup
            fns = [];
            for (let i = 0; i < amount; i++)
                fns.push(collection.insert(schemaObjects.human()));
            await Promise.all(fns);

            // get socket-docs
            const socketDocs = await db.socketCollection.find().exec();

            assert.ok(socketDocs.length < (amount * 2));
        });
    });

});
