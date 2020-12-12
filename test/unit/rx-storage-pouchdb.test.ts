import assert from 'assert';

import config from './config';
import * as humansCollection from './../helper/humans-collection';
import * as schemaObjects from '../helper/schema-objects';
import {
    getRxStoragePouchDb,
    RxStorage,
    addRxPlugin
} from '../../plugins/core';

import { RxDBKeyCompressionPlugin } from '../../plugins/key-compression';
addRxPlugin(RxDBKeyCompressionPlugin);
import { RxDBValidatePlugin } from '../../plugins/validate';
addRxPlugin(RxDBValidatePlugin);

import { RxDBQueryBuilderPlugin } from '../../plugins/query-builder';
addRxPlugin(RxDBQueryBuilderPlugin);

config.parallel('rx-storage-pouchdb.test.js', () => {
    describe('.getSortComparator()', () => {
        it('should sort in the correct order', async () => {
            const col = await humansCollection.create(1);
            const storage: RxStorage = getRxStoragePouchDb('memory');

            const query = col
                .find()
                .limit(1000)
                .sort('age')
                .toJSON();
            const comparator = storage.getSortComparator(
                col.schema.primaryPath,
                query
            );
            const doc1: any = schemaObjects.human();
            doc1._id = 'aa';
            doc1.age = 1;
            const doc2: any = schemaObjects.human();
            doc2._id = 'bb';
            doc2.age = 100;

            // should sort in the correct order
            assert.deepStrictEqual(
                [doc1, doc2],
                [doc1, doc2].sort(comparator)
            );
            col.database.destroy();
        });
    });
    describe('.getQueryMatcher()', () => {
        it('should match the right docs', async () => {
            const col = await humansCollection.create(1);

            const storage: RxStorage = getRxStoragePouchDb('memory');
            const queryMatcher = storage.getQueryMatcher(
                col.schema.primaryPath,
                col.find({
                    selector: {
                        age: {
                            $gt: 10,
                            $ne: 50
                        }
                    }
                }).toJSON()
            );

            const doc1: any = schemaObjects.human();
            doc1._id = 'aa';
            doc1.age = 1;
            const doc2: any = schemaObjects.human();
            doc2._id = 'bb';
            doc2.age = 100;

            assert.strictEqual(queryMatcher(doc1), false);
            assert.strictEqual(queryMatcher(doc2), true);

            col.database.destroy();
        });
    });
});
