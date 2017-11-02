/**
 * this test is to the in-memory-plugin
 */
import assert from 'assert';

// import * as schemas from './../helper/schemas';
// import * as schemaObjects from './../helper/schema-objects';
import * as humansCollection from './../helper/humans-collection';

// import * as RxDatabase from '../../dist/lib/rx-database';
// import * as util from '../../dist/lib/util';
// import AsyncTestUtil from 'async-test-util';

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
            console.log('------------------');

            const col = await humansCollection.create(5);
            const memCol = await col.inMemory();
            const docs = await memCol.find().exec();

            console.log('docs:');
            console.dir(docs.map(doc => doc._data));
            assert.ok(docs.length, 5);

            col.database.destroy();
        });
    });
    describe('e', () => {
        // TODO remove this
        it('e', () => process.exit());
    });
});
