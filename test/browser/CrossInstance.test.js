import assert from 'assert';
import {
    default as randomToken
} from 'random-token';

import * as RxDB from '../../dist/lib/index';
import * as util from '../../dist/lib/util';

import * as schemas from '../helper/schemas';
import * as schemaObjects from '../helper/schema-objects';
import * as humansCollection from '../helper/humans-collection';

describe('CrossInstance.test.js', () => {
    describe('create database', () => {
        it('create a multiInstance database', async() => {
            const db = await RxDB.create(randomToken(10), 'memory', null, true);
            assert.equal(db.constructor.name, 'RxDatabase');
            db.destroy();
        });
        it('create a 2 multiInstance databases', async() => {
            const name = randomToken(10);
            const db = await RxDB.create(name, 'memory', null, true);
            const db2 = await RxDB.create(name, 'memory', null, true);
            assert.equal(db.constructor.name, 'RxDatabase');
            assert.equal(db2.constructor.name, 'RxDatabase');
            db.destroy();
            db2.destroy();
        });
    });

    describe('Collection.$', () => {
        it('get event on db2 when db1 fires', async() => {
            const name = 'foobar';
            const c1 = await humansCollection.createMultiInstance(name);
            const c2 = await humansCollection.createMultiInstance(name);
            let recieved = 0;
            c2.$.subscribe(cEvent => {
                recieved++;
                assert.equal(cEvent.constructor.name, 'RxChangeEvent');
            });
            await c1.insert(schemaObjects.human());
            await c2.database.socket.pull();
            assert.ok(recieved > 0);
            c1.database.destroy();
            c2.database.destroy();
        });
    });

    describe('Document.$', () => {
        it('get event on doc2 when doc1 is changed', async() => {
            const name = 'foobar';
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
            await c2.database.socket.pull();
            await util.promiseWait(100);

            assert.equal(firstNameAfter, 'foobar');
            c1.database.destroy();
            c2.database.destroy();
        });
        it('should work with encrypted fields', async() => {
            const name = randomToken(10);
            const password = randomToken(10);
            const db1 = await RxDB.create(name, 'memory', password, true);
            const db2 = await RxDB.create(name, 'memory', password, true);
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
            await c2.database.socket.pull();
            await util.promiseWait(10);
            assert.equal(secretAfter, 'foobar');
            c1.database.destroy();
            c2.database.destroy();
        });
        it('should work with nested encrypted fields', async() => {
            const name = randomToken(10);
            const password = randomToken(10);
            const db1 = await RxDB.create(name, 'memory', password, true);
            const db2 = await RxDB.create(name, 'memory', password, true);
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
            await c2.database.socket.pull();
            await util.promiseWait(10);
            assert.deepEqual(secretAfter, {
                name: 'foo',
                subname: 'bar'
            });
            c1.database.destroy();
            c2.database.destroy();
        });
    });
});
