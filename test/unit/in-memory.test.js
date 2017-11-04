/**
 * this test is to the in-memory-plugin
 */
import assert from 'assert';

// import * as schemas from './../helper/schemas';
// import * as schemaObjects from './../helper/schema-objects';
import * as humansCollection from './../helper/humans-collection';

// import * as RxDatabase from '../../dist/lib/rx-database';
// import * as util from '../../dist/lib/util';
import AsyncTestUtil from 'async-test-util';

describe('in-memory.test.js', () => {
    describe('.inMemory()', () => {
        it('should spawn an in-memory collection', async () => {
            const col = await humansCollection.create(5);
            const memCol = await col.inMemory();
            assert.ok(memCol.database);
            assert.ok(memCol.pouch);
            col.database.destroy();
        });
        it('should contain the initial documents', async () => {
            const col = await humansCollection.create(5);
            const memCol = await col.inMemory();
            const docs = await memCol.find().exec();
            assert.ok(docs.length, 5);
            const firstDoc = await memCol.findOne().exec();
            assert.ok(firstDoc.firstName);
            col.database.destroy();
        });
    });
    describe('changes', () => {
        it('should replicate change from memory to original', async () => {
            const col = await humansCollection.create(5);
            const memCol = await col.inMemory();
            const memDoc = await memCol.findOne().exec();
            memDoc.firstName = 'foobar';
            await memDoc.save();

            await AsyncTestUtil.waitUntil(async () => {
                const doc = await col.findOne()
                    .where('passportId')
                    .eq(memDoc.passportId)
                    .exec();
                return !!doc && doc.firstName === 'foobar';
            });
            col.database.destroy();
        });
        it('should replicate change from original to memory', async () => {
            const col = await humansCollection.create(5);
            const memCol = await col.inMemory();

            const doc = await col.findOne().exec();
            doc.firstName = 'foobar';
            await doc.save();

            await AsyncTestUtil.waitUntil(async () => {
                const memDoc = await memCol.findOne()
                    .where('passportId')
                    .eq(doc.passportId)
                    .exec();
                return !!memDoc && memDoc.firstName === 'foobar';
            });
            col.database.destroy();
        });
    });
    describe('e', () => {
        // TODO remove this
        it('e', () => process.exit());
    });
});
