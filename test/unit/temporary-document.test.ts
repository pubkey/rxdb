import assert from 'assert';
import AsyncTestUtil from 'async-test-util';
import config from './config';

import {
    createRxDatabase,
    randomCouchString
} from '../../plugins/core';

import * as schemas from '../helper/schemas';
import * as schemaObjects from '../helper/schema-objects';
import * as humansCollection from '../helper/humans-collection';

config.parallel('temporary-document.test.js', () => {
    describe('RxCollection.newDocument()', () => {
        it('should create a new document', async () => {
            const c = await humansCollection.create(0);
            const newDoc = c.newDocument();
            assert.ok(newDoc);
            c.database.destroy();
        });
        it('should have initial data', async () => {
            const c = await humansCollection.create(0);
            const newDoc = c.newDocument({
                firstName: 'foobar'
            });
            assert.strictEqual(newDoc.firstName, 'foobar');
            c.database.destroy();
        });
        it('should not check the schema on changing values', async () => {
            const c = await humansCollection.create(0);
            const newDoc: any = c.newDocument({
                firstName: 'foobar'
            });
            newDoc.lastName = 1337;
            assert.strictEqual(newDoc.firstName, 'foobar');
            c.database.destroy();
        });
        it('should be possible to set the primary', async () => {
            const c = await humansCollection.createPrimary(0);
            const newDoc = c.newDocument();
            newDoc.passportId = 'foobar';
            assert.strictEqual(newDoc.passportId, 'foobar');
            c.database.destroy();
        });
        it('should have default-values', async () => {
            const db = await createRxDatabase({
                name: randomCouchString(10),
                adapter: 'memory'
            });
            const c = await db.collection({
                name: 'nestedhuman',
                schema: schemas.humanDefault
            });
            const newDoc = c.newDocument();
            assert.strictEqual(newDoc.age, 20);

            db.destroy();
        });
    });
    describe('.save()', () => {
        describe('positive', () => {
            it('should save the document', async () => {
                const c = await humansCollection.create(0);
                const newDoc = c.newDocument(schemaObjects.human());
                await newDoc.save();
                c.database.destroy();
            });
            it('should have cached the new doc', async () => {
                const c = await humansCollection.create(0);
                const newDoc = c.newDocument(schemaObjects.human());
                await newDoc.save();
                const sameDoc = await c.findOne().exec();
                assert.ok(newDoc === sameDoc);
                c.database.destroy();
            });
            it('should be able to save again', async () => {
                const c = await humansCollection.create(0);
                const newDoc = c.newDocument(schemaObjects.human());
                await newDoc.save();

                await newDoc.atomicSet('firstName', 'foobar');
                assert.strictEqual('foobar', newDoc.firstName);
                const allDocs = await c.find().exec();
                assert.strictEqual(allDocs.length, 1);
                c.database.destroy();
            });
        });
        describe('negative', () => {
            it('throw if schema missmatch', async () => {
                const c = await humansCollection.create(0);
                const docData: any = schemaObjects.human();
                docData['foo'] = 'bar';
                const newDoc = c.newDocument(docData);
                await AsyncTestUtil.assertThrows(
                    () => newDoc.save(),
                    'RxError',
                    'does not match'
                );
                c.database.destroy();
            });
        });
    });
    describe('ORM', () => {
        it('should be able to use ORM-functions', async () => {
            const db = await createRxDatabase({
                name: randomCouchString(10),
                adapter: 'memory'
            });
            const c = await db.collection({
                name: 'humans',
                schema: schemas.human,
                methods: {
                    foobar: function () {
                        return 'test';
                    }
                }
            });
            const newDoc = c.newDocument(schemaObjects.human());
            assert.strictEqual(newDoc.foobar(), 'test');
            db.destroy();
        });
    });
    describe('reactive', () => {
        it('should be emit the correct values', async () => {
            const c = await humansCollection.create(0);
            const newDoc: any = c.newDocument(schemaObjects.human());
            await newDoc.save();
            const emitted: any[] = [];
            const sub = newDoc.firstName$.subscribe((val: any) => emitted.push(val));

            await newDoc.atomicSet('firstName', 'foobar1');
            await newDoc.atomicSet('firstName', 'foobar2');

            await AsyncTestUtil.waitUntil(() => emitted.length === 3);
            assert.strictEqual('foobar2', emitted.pop());
            sub.unsubscribe();
            c.database.destroy();
        });
    });
    describe('ISSUES', () => {
        describe('#215 setting field to null throws', () => {
            it('reproduce', async () => {
                const c = await humansCollection.create(0);
                const newDoc: any = c.newDocument();
                newDoc.age = null;
                newDoc.age = 10;
                assert.strictEqual(newDoc.age, 10);
                c.database.destroy();
            });
        });
    });
});
