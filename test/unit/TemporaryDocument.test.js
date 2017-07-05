import assert from 'assert';
const platform = require('platform');

import * as RxDB from '../../dist/lib/index';
import * as util from '../../dist/lib/util';
import * as testUtil from '../helper/test-util';
import * as RxBroadcastChannel from '../../dist/lib/RxBroadcastChannel';

import * as schemas from '../helper/schemas';
import * as schemaObjects from '../helper/schema-objects';
import * as humansCollection from '../helper/humans-collection';

describe('TemporaryDocument.test.js', () => {
    describe('RxCollection.newDocument()', () => {
        it('should create a new document', async() => {
            const c = await humansCollection.create(0);
            const newDoc = c.newDocument();
            c.database.destroy();
        });
        it('should have initial data', async() => {
            const c = await humansCollection.create(0);
            const newDoc = c.newDocument({
                firstName: 'foobar'
            });
            assert.equal(newDoc.firstName, 'foobar');
            c.database.destroy();
        });
        it('should not check the schema on changing values', async() => {
            const c = await humansCollection.create(0);
            const newDoc = c.newDocument({
                firstName: 'foobar'
            });
            newDoc.lastName = 1337;
            assert.equal(newDoc.firstName, 'foobar');
            c.database.destroy();
        });
        it('should be possible to set the primary', async()=>{
            const c = await humansCollection.createPrimary(0);
            const newDoc = c.newDocument();
            newDoc.passportId = 'foobar';
            assert.equal(newDoc.passportId, 'foobar');
            c.database.destroy();
        });
    });
    describe('.save()', () => {
        describe('positive', () => {
            it('should save the document', async() => {
                const c = await humansCollection.create(0);
                const newDoc = c.newDocument(schemaObjects.human());
                await newDoc.save();
                c.database.destroy();
            });
            it('should have cached the new doc', async() => {
                const c = await humansCollection.create(0);
                const newDoc = c.newDocument(schemaObjects.human());
                await newDoc.save();
                const sameDoc = await c.findOne().exec();
                assert.ok(newDoc == sameDoc);
                c.database.destroy();
            });
            it('should be able to save again', async() => {
                const c = await humansCollection.create(0);
                const newDoc = c.newDocument(schemaObjects.human());
                await newDoc.save();
                newDoc.firstName = 'foobar';
                await newDoc.save();
                assert.equal('foobar', newDoc.firstName);
                const allDocs = await c.find().exec();
                assert.equal(allDocs.length, 1);
                c.database.destroy();
            });
        });
        describe('negative', () => {
            it('throw if schema missmatch', async() => {
                const c = await humansCollection.create(0);
                const docData = schemaObjects.human();
                docData.foo = 'bar';
                const newDoc = c.newDocument(docData);
                await testUtil.assertThrowsAsync(
                    () => newDoc.save(),
                    Error
                );
                c.database.destroy();
            });
        });
    });
    describe('ORM', () => {
        it('should be able to use ORM-functions', async() => {
            const db = await RxDB.create({
                name: testUtil.randomCouchString(10),
                adapter: 'memory'
            });
            const c = await db.collection({
                name: 'humans',
                schema: schemas.human,
                methods: {
                    foobar: function() {
                        return 'test';
                    }
                }
            });
            const newDoc = c.newDocument(schemaObjects.human());
            assert.equal(newDoc.foobar(), 'test');
            db.destroy();
        });
    });
    describe('reactive', () => {
        it('should be emit the correct values', async() => {
            const c = await humansCollection.create(0);
            const newDoc = c.newDocument(schemaObjects.human());
            await newDoc.save();
            const emitted = [];
            const sub = newDoc.firstName$.subscribe(val => emitted.push(val));
            newDoc.firstName = 'foobar1';
            await newDoc.save();
            newDoc.firstName = 'foobar2';
            await newDoc.save();
            await testUtil.waitUntil(() => emitted.length == 3);
            assert.equal('foobar2', emitted.pop());
            c.database.destroy();
        });
    });
});
