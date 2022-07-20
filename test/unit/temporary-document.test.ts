import assert from 'assert';
import AsyncTestUtil from 'async-test-util';
import config from './config';

import {
    createRxDatabase,
    randomCouchString
} from '../../';

import {
    getRxStoragePouch,
} from '../../plugins/pouchdb';


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
                storage: getRxStoragePouch('memory'),
            });
            const cols = await db.addCollections({
                nestedhuman: {
                    schema: schemas.humanDefault
                }
            });
            const c = cols.nestedhuman;
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

                await newDoc.atomicPatch({ firstName: 'foobar' });
                assert.strictEqual('foobar', newDoc.firstName);
                const allDocs = await c.find().exec();
                assert.strictEqual(allDocs.length, 1);
                c.database.destroy();
            });
        });
    });
    describe('ORM', () => {
        it('should be able to use ORM-functions', async () => {
            const db = await createRxDatabase({
                name: randomCouchString(10),
                storage: getRxStoragePouch('memory'),
            });
            const cols = await db.addCollections({
                humans: {
                    schema: schemas.human,
                    methods: {
                        foobar: function () {
                            return 'test';
                        }
                    }
                }
            });
            const c = cols.humans;
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

            await newDoc.atomicPatch({ firstName: 'foobar1' });
            await newDoc.atomicPatch({ firstName: 'foobar2' });

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
