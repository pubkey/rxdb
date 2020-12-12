/**
 * when the same data-source is used by 2 instance of the same database,
 * than they should emit ChangeEvents to each other
 * This is important if 2 Windows/Tabs of the same website is open and one changes data
 * The tests for this behaviour are done here
 */

import assert from 'assert';
import AsyncTestUtil from 'async-test-util';

import config from './config';
import {
    isRxDatabase,
    createRxDatabase,
    randomCouchString,
    promiseWait
} from '../../plugins/core';
import * as schemas from './../helper/schemas';
import * as schemaObjects from './../helper/schema-objects';
import * as humansCollection from './../helper/humans-collection';

config.parallel('cross-instance.test.js', () => {
    describe('create database', () => {
        it('create a multiInstance database', async () => {
            const db = await createRxDatabase({
                name: randomCouchString(10),
                adapter: 'memory',
                multiInstance: true
            });
            assert.ok(isRxDatabase(db));
            db.destroy();
        });
        it('create a 2 multiInstance databases', async () => {
            const name = randomCouchString(10);
            const db = await createRxDatabase({
                name,
                adapter: 'memory',
                multiInstance: true,
                ignoreDuplicate: true
            });
            const db2 = await createRxDatabase({
                name,
                adapter: 'memory',
                multiInstance: true,
                ignoreDuplicate: true
            });
            assert.ok(isRxDatabase(db));
            assert.ok(isRxDatabase(db2));
            db.destroy();
            db2.destroy();
        });
    });
    describe('RxDatabase.$', () => {
        describe('positive', () => {
            it('get event on db2 when db1 fires', async () => {
                const name = randomCouchString(10);
                const c1 = await humansCollection.createMultiInstance(name);
                const c2 = await humansCollection.createMultiInstance(name);
                const db1 = c1.database;
                const db2 = c2.database;

                let recieved = 0;
                db2.$.subscribe(cEvent => {
                    recieved++;
                    assert.strictEqual(cEvent.constructor.name, 'RxChangeEvent');
                });
                await c1.insert(schemaObjects.human());
                await AsyncTestUtil.waitUntil(async () => {
                    return recieved > 0;
                });

                db1.destroy();
                db2.destroy();
            });
        });
        describe('negative', () => {
            it('should not get the same events twice', async () => {
                const name = randomCouchString(10);
                const c1 = await humansCollection.createMultiInstance(name);
                const c2 = await humansCollection.createMultiInstance(name);
                const db1 = c1.database;
                const db2 = c2.database;
                let recieved = 0;
                db2.$.subscribe(cEvent => {
                    recieved++;
                    assert.strictEqual(cEvent.constructor.name, 'RxChangeEvent');
                });
                await c1.insert(schemaObjects.human());

                await AsyncTestUtil.waitUntil(async () => {
                    return recieved === 1;
                });

                db1.destroy();
                db2.destroy();
            });
        });
    });
    describe('Collection.$', () => {
        it('get event on db2 when db1 fires', async () => {
            const name = randomCouchString(10);
            const c1 = await humansCollection.createMultiInstance(name);
            const c2 = await humansCollection.createMultiInstance(name);
            let recieved = 0;
            c2.$.subscribe(cEvent => {
                recieved++;
                assert.strictEqual(cEvent.constructor.name, 'RxChangeEvent');
            });
            await c1.insert(schemaObjects.human());

            await AsyncTestUtil.waitUntil(async () => {
                return recieved > 0;
            });

            c1.database.destroy();
            c2.database.destroy();
        });
        it('get no changes via pouchdb on different dbs', async () => {
            const c1 = await humansCollection.create(0);
            const c2 = await humansCollection.create(0);
            let got;
            c2.pouch.changes({
                since: 'now',
                live: true,
                include_docs: true
            }).on('change', function (change: any) {
                if (!change.id.startsWith('_'))
                    got = change;
            });
            await c1.insert(schemaObjects.human());

            await promiseWait(50);
            assert.strictEqual(got, undefined);
            c1.database.destroy();
            c2.database.destroy();
        });
    });

    describe('Document.$', () => {
        it('get event on doc2 when doc1 is changed', async () => {
            const name = randomCouchString(10);
            const c1 = await humansCollection.createMultiInstance(name);
            const c2 = await humansCollection.createMultiInstance(name);
            await c1.insert(schemaObjects.human());

            const doc1 = await c1.findOne().exec(true);
            const doc2 = await c2.findOne().exec(true);

            let recieved = 0;
            doc2.$.subscribe(() => {
                recieved = recieved + 1;
            });

            let firstNameAfter: any;
            doc2.get$('firstName').subscribe((newValue: any) => {
                firstNameAfter = newValue;
            });

            await doc1.atomicSet('firstName', 'foobar');

            await promiseWait(10);
            await AsyncTestUtil.waitUntil(() => firstNameAfter === 'foobar');

            assert.strictEqual(firstNameAfter, 'foobar');
            c1.database.destroy();
            c2.database.destroy();
        });
        it('should work with encrypted fields', async () => {
            const name = randomCouchString(10);
            const password = randomCouchString(10);
            const db1 = await createRxDatabase({
                name,
                adapter: 'memory',
                password,
                multiInstance: true,
                ignoreDuplicate: true
            });
            const db2 = await createRxDatabase({
                name,
                adapter: 'memory',
                password,
                multiInstance: true,
                ignoreDuplicate: true
            });
            const c1 = await db1.collection({
                name: 'human',
                schema: schemas.encryptedHuman
            });
            const c2 = await db2.collection({
                name: 'human',
                schema: schemas.encryptedHuman
            });
            await c1.insert(schemaObjects.encryptedHuman());

            const doc1 = await c1.findOne().exec(true);
            const doc2 = await c2.findOne().exec(true);

            let recievedCollection = 0;
            c2.$.subscribe(() => {
                recievedCollection = recievedCollection + 1;
            });

            let recieved = 0;
            doc2.$.subscribe(() => {
                recieved = recieved + 1;
            });

            let secretAfter: any;
            doc2.get$('secret').subscribe((newValue: any) => {
                secretAfter = newValue;
            });

            await doc1.atomicSet('secret', 'foobar');

            await AsyncTestUtil.waitUntil(() => secretAfter === 'foobar');
            assert.strictEqual(secretAfter, 'foobar');

            db1.destroy();
            db2.destroy();
        });
        it('should work with nested encrypted fields', async () => {
            const name = randomCouchString(10);
            const password = randomCouchString(10);
            const db1 = await createRxDatabase({
                name,
                adapter: 'memory',
                password,
                multiInstance: true,
                ignoreDuplicate: true
            });
            const db2 = await createRxDatabase({
                name,
                adapter: 'memory',
                password,
                multiInstance: true,
                ignoreDuplicate: true
            });
            const c1 = await db1.collection({
                name: 'human',
                schema: schemas.encryptedObjectHuman
            });
            const c2 = await db2.collection({
                name: 'human',
                schema: schemas.encryptedObjectHuman
            });
            await c1.insert(schemaObjects.encryptedObjectHuman());

            const doc1 = await c1.findOne().exec(true);
            const doc2 = await c2.findOne().exec(true);

            let recievedCollection = 0;
            c2.$.subscribe(() => {
                recievedCollection = recievedCollection + 1;
            });

            let recieved = 0;
            doc2.$.subscribe(() => {
                recieved = recieved + 1;
            });

            let secretAfter: any;
            doc2.get$('secret').subscribe((newValue: any) => {
                secretAfter = newValue;
            });

            await doc1.atomicSet('secret', {
                name: 'foo',
                subname: 'bar'
            });

            await AsyncTestUtil.waitUntil(() => secretAfter.name === 'foo');
            assert.deepStrictEqual(secretAfter, {
                name: 'foo',
                subname: 'bar'
            });

            db1.destroy();
            db2.destroy();
        });
    });
    describe('AutoPull', () => {
        describe('positive', () => {
            it('should recieve events without calling .socket.pull()', async () => {
                const name = randomCouchString(10);
                const c1 = await humansCollection.createMultiInstance(name);
                const c2 = await humansCollection.createMultiInstance(name);
                const waitPromise = AsyncTestUtil.waitResolveable(500);

                let recieved = 0;
                c2.$.subscribe(cEvent => {
                    recieved++;
                    assert.strictEqual(cEvent.constructor.name, 'RxChangeEvent');
                    waitPromise.resolve();
                });
                await c1.insert(schemaObjects.human());

                await waitPromise.promise;
                assert.strictEqual(recieved, 1);
                c1.database.destroy();
                c2.database.destroy();
            });
            it('should recieve 2 events', async () => {
                const name = randomCouchString(10);
                const c1 = await humansCollection.createMultiInstance(name);
                const c2 = await humansCollection.createMultiInstance(name);
                let recieved = 0;
                c2.$.subscribe(cEvent => {
                    recieved++;
                    assert.strictEqual(cEvent.constructor.name, 'RxChangeEvent');
                });

                await c1.insert(schemaObjects.human());
                await c1.insert(schemaObjects.human());

                await AsyncTestUtil.waitUntil(() => recieved === 2);
                assert.strictEqual(recieved, 2);
                c1.database.destroy();
                c2.database.destroy();
            });
        });
    });
});
