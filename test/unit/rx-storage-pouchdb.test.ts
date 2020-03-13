import assert from 'assert';
import AsyncTestUtil from 'async-test-util';

import config from './config';
import * as humansCollection from './../helper/humans-collection';
import * as schemaObjects from '../helper/schema-objects';
import { RxStoragePouchDb } from '../../dist/lib/rx-storage-pouchdb';


config.parallel('rx-storage-pouchdb.test.js', () => {
    config.parallel('.getSortComparator()', () => {
        it('should sort in the correct order', async () => {
            const col = await humansCollection.create(1);
            const comparator = RxStoragePouchDb.getSortComparator(
                col.schema.primaryPath,
                col.find().sort('age').toJSON()
            );
            const doc1 = schemaObjects.human();
            doc1['_id'] = 'aa';
            doc1.age = 1;
            const doc2 = schemaObjects.human();
            doc2['_id'] = 'bb';
            doc2.age = 100;


            // should sort in the correct order
            assert.deepStrictEqual(
                [doc1, doc2],
                [doc1, doc2].sort(comparator)
            );
            col.database.destroy();
        });
    });
    config.parallel('.getQueryMatcher()', () => {
        it('should match the right docs', async () => {
            const col = await humansCollection.create(1);

            const queryMatcher = RxStoragePouchDb.getQueryMatcher(
                col.schema.primaryPath,
                col.find({
                    age: {
                        $gt: 10,
                        $ne: 50
                    }
                }).toJSON()
            );

            const doc1 = schemaObjects.human();
            doc1['_id'] = 'aa';
            doc1.age = 1;
            const doc2 = schemaObjects.human();
            doc2['_id'] = 'bb';
            doc2.age = 100;

            assert.strictEqual(queryMatcher(doc1), false);
            assert.strictEqual(queryMatcher(doc2), true);

            col.database.destroy();
        });
    });
});
